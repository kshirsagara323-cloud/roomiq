import { Link } from 'react-router-dom';
import { collection, deleteDoc, doc, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { BadgeCheck, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive } from '../lib/hooks';
import { removeImages } from '../lib/images';
import { avgRating, formatINR, friendlyError, ms } from '../lib/utils';
import { Empty, Loader } from '../components/Ui';
import { StatusPill } from './TenantDashboard';

export default function OwnerDashboard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const { data: propsRaw, loading } = useLive(() => query(collection(db, 'properties'), where('ownerId', '==', user.uid)), [user.uid]);
  const { data: bookRaw } = useLive(() => query(collection(db, 'bookings'), where('ownerId', '==', user.uid)), [user.uid]);
  const props = [...propsRaw].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  const bookings = [...bookRaw].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const rated = props.filter((p) => p.ratingCount > 0);
  const avg = rated.length ? rated.reduce((s, p) => s + avgRating(p), 0) / rated.length : 0;

  const run = async (fn, ok) => { try { await fn(); toast(ok); } catch (e) { toast(friendlyError(e), 'err'); } };
  const toggle = (p) => run(() => updateDoc(doc(db, 'properties', p.id), { status: p.status === 'active' ? 'paused' : 'active', updatedAt: serverTimestamp() }), p.status === 'active' ? 'Listing paused – hidden from tenants.' : 'Listing is live.');
  const del = (p) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    run(async () => { await deleteDoc(doc(db, 'properties', p.id)); await removeImages(p.images || []); }, 'Listing deleted.');
  };
  const decline = (b) => run(() => updateDoc(doc(db, 'bookings', b.id), { status: 'declined', updatedAt: serverTimestamp() }), 'Tour declined.');

  // Confirm = ONE atomic transaction: mark this booking confirmed AND take one free bed.
  // If two confirmations race for the last bed, Firestore retries the loser, which then sees 0 beds and fails.
  // When the last bed goes, every other pending request for that listing is declined in the same transaction.
  const confirm = (b) => {
    const otherRefs = bookings.filter((x) => x.propertyId === b.propertyId && x.status === 'pending' && x.id !== b.id).map((x) => doc(db, 'bookings', x.id));
    return run(async () => {
      await runTransaction(db, async (tx) => {
        const bRef = doc(db, 'bookings', b.id);
        const pRef = doc(db, 'properties', b.propertyId);
        const [bSnap, pSnap] = await Promise.all([tx.get(bRef), tx.get(pRef)]);
        const others = await Promise.all(otherRefs.map((r) => tx.get(r)));
        if (!bSnap.exists() || bSnap.data().status !== 'pending') throw new Error('This request was already answered.');
        const beds = pSnap.exists() ? Number(pSnap.data().beds) || 0 : 0;
        if (beds < 1) throw new Error('No free beds left in this listing.');
        tx.update(bRef, { status: 'confirmed', updatedAt: serverTimestamp() });
        tx.update(pRef, { beds: beds - 1, updatedAt: serverTimestamp() });
        if (beds - 1 === 0) {
          others.forEach((s) => {
            if (s.exists() && s.data().status === 'pending') tx.update(s.ref, { status: 'declined', note: 'Room filled', updatedAt: serverTimestamp() });
          });
        }
      });
    }, 'Tour confirmed. One bed reserved.');
  };

  // Owner cancels a confirmed booking -> the bed becomes free again (also one atomic transaction).
  const cancelConfirmed = (b) => {
    if (!window.confirm('Cancel this confirmed booking and free the bed?')) return undefined;
    return run(async () => {
      await runTransaction(db, async (tx) => {
        const bRef = doc(db, 'bookings', b.id);
        const pRef = doc(db, 'properties', b.propertyId);
        const [bSnap, pSnap] = await Promise.all([tx.get(bRef), tx.get(pRef)]);
        if (!bSnap.exists() || bSnap.data().status !== 'confirmed') throw new Error('This booking is no longer confirmed.');
        const beds = pSnap.exists() ? Number(pSnap.data().beds) || 0 : 0;
        if (beds >= 500) throw new Error('Bed count is already at the maximum.');
        tx.update(bRef, { status: 'cancelled', updatedAt: serverTimestamp() });
        tx.update(pRef, { beds: beds + 1, updatedAt: serverTimestamp() });
      });
    }, 'Booking cancelled. Bed is free again.');
  };

  if (loading) return <Loader />;
  return (
    <div className="container page">
      <div className="row between wrap gap">
        <div><h1>Good day, {profile?.name?.split(' ')[0]}</h1><p className="muted">Everything here updates live as tenants act.</p></div>
        <Link to="/owner/property/new" className="btn primary"><Plus size={16} /> Add property</Link>
      </div>

      <div className="stat-cards">
        <div className="card pad"><small>Properties</small><b>{props.length}</b></div>
        <div className="card pad"><small>Live now</small><b>{props.filter((p) => p.status === 'active').length}</b></div>
        <div className="card pad"><small>Pending tours</small><b>{pending}</b></div>
        <div className="card pad"><small>Avg. rating</small><b>{avg ? avg.toFixed(1) : '—'}</b></div>
      </div>

      <h2>Your properties</h2>
      {props.length ? (
        <div className="list">
          {props.map((p) => (
            <div className="card pad owner-row" key={p.id}>
              <div className="thumb-sm">{p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span>No photo</span>}</div>
              <div className="grow">
                <Link to={`/property/${p.id}`}><strong>{p.name}</strong></Link> {p.verified && <BadgeCheck size={16} className="verified" />}
                <p className="muted">{p.area}, {p.city} · {formatINR(p.price)}/month · {p.ratingCount ? `${avgRating(p).toFixed(1)}★ (${p.ratingCount})` : 'no reviews'} · {(p.beds ?? 0) > 0 ? `${p.beds} bed${p.beds > 1 ? 's' : ''} free` : 'Fully booked'}</p>
                <StatusPill s={p.status} />
              </div>
              <div className="row gap wrap">
                <button className="btn ghost" onClick={() => toggle(p)}>{p.status === 'active' ? <><EyeOff size={15} /> Pause</> : <><Eye size={15} /> Go live</>}</button>
                <Link className="btn ghost" to={`/owner/property/${p.id}`}><Pencil size={15} /> Edit</Link>
                <button className="btn ghost danger" onClick={() => del(p)} aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No properties yet" text="Add your first listing – it goes live for tenants instantly."><Link to="/owner/property/new" className="btn primary">Add property</Link></Empty>
      )}

      <h2>Tour requests</h2>
      {bookings.length ? (
        <div className="list">
          {bookings.map((b) => (
            <div className="card pad row between wrap gap" key={b.id}>
              <div>
                <strong>{b.tenantName}</strong> wants to visit <Link to={`/property/${b.propertyId}`}>{b.propertyName}</Link> on {b.visitDate}
                {b.tenantPhone && <p className="muted">Phone: {b.tenantPhone}</p>}
                {b.message && <p>“{b.message}”</p>}
                {b.note && <p className="muted">{b.note}</p>}
              </div>
              <div className="row gap">
                <StatusPill s={b.status} />
                {b.status === 'pending' && <><button className="btn primary" onClick={() => confirm(b)}>Confirm</button><button className="btn ghost" onClick={() => decline(b)}>Decline</button></>}
                {b.status === 'confirmed' && <button className="btn ghost" onClick={() => cancelConfirmed(b)}>Cancel &amp; free bed</button>}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="muted">No requests yet. They appear here the second a tenant books.</p>}
    </div>
  );
}
