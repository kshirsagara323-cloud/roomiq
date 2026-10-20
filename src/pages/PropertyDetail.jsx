import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, increment, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { BadgeCheck, Check, Heart, MapPin, MessageCircle, Pencil, Star } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLive, useLiveDoc } from '../lib/hooks';
import { avgRating, clean, formatINR, friendlyError, ms, timeAgo, todayISO } from '../lib/utils';
import Gallery from '../components/Gallery';
import { LocationMap } from '../components/MapView';
import { Empty, Field, Loader, Stars } from '../components/Ui';

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile, role } = useAuth();
  const { savedIds, toggleSave } = useData();
  const { data: p, loading } = useLiveDoc(() => doc(db, 'properties', id), [id]);
  const { data: reviewsRaw } = useLive(() => query(collection(db, 'properties', id, 'reviews')), [id]);
  const reviews = [...reviewsRaw].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

  const [visit, setVisit] = useState({ date: '', message: '' });
  const [booking, setBooking] = useState(false);
  const [rev, setRev] = useState({ rating: 5, comment: '' });
  const [sending, setSending] = useState(false);

  if (loading) return <Loader />;
  if (!p) return <div className="container page"><Empty title="Listing not found" text="It may have been removed or paused by the owner."><Link className="btn primary" to="/explore">Back to stays</Link></Empty></div>;

  const isMine = user && p.ownerId === user.uid;
  const full = (Number(p.beds) || 0) < 1;
  const isTenant = role === 'tenant';
  const alreadyReviewed = user && reviews.some((r) => r.id === user.uid);
  const needLogin = () => nav('/login', { state: { from: `/property/${id}` } });

  const save = async () => {
    if (!isTenant) return needLogin();
    try { await toggleSave(id); } catch (e) { toast(friendlyError(e), 'err'); }
  };

  const chat = async () => {
    if (!isTenant) return needLogin();
    try {
      const cid = `${id}_${user.uid}`;
      const ref = doc(db, 'conversations', cid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          propertyId: id,
          propertyName: p.name,
          ownerId: p.ownerId,
          ownerName: p.ownerName,
          tenantId: user.uid,
          tenantName: profile?.name || 'Tenant',
          participants: [user.uid, p.ownerId],
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      nav(`/chat/${cid}`);
    } catch (e) {
      toast(friendlyError(e), 'err');
    }
  };

  const bookTour = async (e) => {
    e.preventDefault();
    if (full) return toast('This place is fully booked.', 'err');
    if (!visit.date || visit.date < todayISO()) return toast('Pick a visit date from today onwards.', 'err');
    setBooking(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        propertyId: id,
        propertyName: p.name,
        ownerId: p.ownerId,
        tenantId: user.uid,
        tenantName: profile?.name || 'Tenant',
        ...(profile?.phone ? { tenantPhone: profile.phone } : {}),
        visitDate: visit.date,
        message: clean(visit.message, 500),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setVisit({ date: '', message: '' });
      toast('Tour request sent! Track it in your dashboard.');
    } catch (ex) {
      toast(friendlyError(ex), 'err');
    } finally {
      setBooking(false);
    }
  };

  const postReview = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'properties', id, 'reviews', user.uid), {
        uid: user.uid,
        name: profile?.name || 'Tenant',
        rating: rev.rating,
        comment: clean(rev.comment, 500),
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'properties', id), { ratingCount: increment(1), ratingSum: increment(rev.rating) });
      await batch.commit();
      setRev({ rating: 5, comment: '' });
      toast('Thanks for your review!');
    } catch (ex) {
      toast(friendlyError(ex), 'err');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container page">
      <Gallery images={p.images} alt={p.name} />
      <div className="detail">
        <div>
          <div className="row gap wrap">
            <span className="pill">{p.type}</span>
            {p.gender !== 'Any' && <span className="pill">{p.gender} only</span>}
            {p.verified && <span className="pill ok"><BadgeCheck size={14} /> Verified</span>}
            {full && <span className="pill warn">Fully booked</span>}
            {p.status !== 'active' && <span className="pill warn">Paused – only you can see this</span>}
          </div>
          <h1>{p.name}</h1>
          <p className="muted row gap4"><MapPin size={15} /> {p.area}, {p.city}</p>
          <p className="row gap4"><Star size={16} className="on" /> {p.ratingCount ? `${avgRating(p).toFixed(1)} · ${p.ratingCount} review${p.ratingCount > 1 ? 's' : ''}` : 'No reviews yet'}</p>

          <h2>About this place</h2>
          <p className="prewrap">{p.description || 'The owner has not added a description yet.'}</p>

          <div className="facts">
            <div><small>Monthly rent</small><b>{formatINR(p.price)}</b></div>
            <div><small>Deposit</small><b>{p.deposit ? formatINR(p.deposit) : '—'}</b></div>
            <div><small>Beds free</small><b>{full ? 'Fully booked' : p.beds}</b></div>
            <div><small>Availability</small><b>{p.available || 'Ask owner'}</b></div>
          </div>

          <h2>Amenities</h2>
          {p.amenities?.length ? <div className="chips">{p.amenities.map((a) => <span key={a} className="chip on static"><Check size={13} /> {a}</span>)}</div> : <p className="muted">Not listed.</p>}

          <h2>Location</h2>
          <LocationMap lat={p.lat} lng={p.lng} />

          <h2>Resident reviews</h2>
          {isTenant && !alreadyReviewed && !isMine && (
            <form className="card pad" onSubmit={postReview}>
              <strong>Share your experience</strong>
              <Stars value={rev.rating} size={24} onChange={(n) => setRev({ ...rev, rating: n })} />
              <textarea rows={3} maxLength={500} placeholder="What was it like to live here?" value={rev.comment} onChange={(e) => setRev({ ...rev, comment: e.target.value })} />
              <button className="btn primary" disabled={sending}>{sending ? 'Posting…' : 'Post review'}</button>
            </form>
          )}
          {reviews.length ? reviews.map((r) => (
            <div className="review" key={r.id}>
              <div className="row between"><strong>{r.name}</strong><small className="muted">{timeAgo(r.createdAt)}</small></div>
              <Stars value={r.rating} size={14} />
              {r.comment && <p>{r.comment}</p>}
            </div>
          )) : <p className="muted">Be the first to review this place.</p>}
        </div>

        <aside className="side card pad">
          <div className="price big">{formatINR(p.price)}<small>/month</small></div>
          <p className="muted">Listed by {p.ownerName}</p>

          {isMine ? (
            <Link to={`/owner/property/${id}`} className="btn primary block"><Pencil size={16} /> Edit this listing</Link>
          ) : role === 'owner' ? (
            <p className="muted">You are logged in as an owner. Log in as a tenant to book tours or chat.</p>
          ) : (
            <>
              <button className="btn primary block" onClick={chat}><MessageCircle size={16} /> Chat with owner</button>
              <button className={`btn ghost block ${savedIds.has(id) ? 'saved' : ''}`} onClick={save}>
                <Heart size={16} /> {savedIds.has(id) ? 'Saved' : 'Save stay'}
              </button>
              <hr />
              <strong>Book a tour</strong>
              {isTenant && full ? (
                <p className="muted">This place is fully booked right now. You can still chat with the owner or save it for later.</p>
              ) : isTenant ? (
                <form onSubmit={bookTour} className="stack">
                  <Field label="Visit date"><input type="date" min={todayISO()} value={visit.date} onChange={(e) => setVisit({ ...visit, date: e.target.value })} required /></Field>
                  <Field label="Message (optional)"><textarea rows={3} maxLength={500} value={visit.message} onChange={(e) => setVisit({ ...visit, message: e.target.value })} placeholder="Preferred time, questions…" /></Field>
                  <button className="btn primary block" disabled={booking}>{booking ? 'Sending…' : 'Request tour'}</button>
                </form>
              ) : (
                <button className="btn ghost block" onClick={needLogin}>Log in to request a tour</button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
