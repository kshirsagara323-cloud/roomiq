import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useLive } from '../lib/hooks';
import { CITIES } from '../lib/constants';
import { friendlyError, isPhone, ms } from '../lib/utils';
import PropertyCard from '../components/PropertyCard';
import { Empty, Field } from '../components/Ui';

export const StatusPill = ({ s }) => <span className={`pill status ${s}`}>{s}</span>;

export default function TenantDashboard() {
  const { user, profile, updateMyProfile } = useAuth();
  const { properties, savedIds } = useData();
  const toast = useToast();
  const [tab, setTab] = useState('saved');
  const [form, setForm] = useState({ name: '', phone: '', city: '' });
  const [busy, setBusy] = useState(false);
  const { data: bookingsRaw } = useLive(() => query(collection(db, 'bookings'), where('tenantId', '==', user.uid)), [user.uid]);
  const bookings = [...bookingsRaw].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  const saved = properties.filter((p) => savedIds.has(p.id));

  useEffect(() => { if (profile) setForm({ name: profile.name || '', phone: profile.phone || '', city: profile.city || '' }); }, [profile]);

  const cancel = async (id) => {
    try { await updateDoc(doc(db, 'bookings', id), { status: 'cancelled', updatedAt: serverTimestamp() }); toast('Tour request cancelled.'); }
    catch (e) { toast(friendlyError(e), 'err'); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast('Enter your name.', 'err');
    if (!isPhone(form.phone)) return toast('Enter a valid phone number.', 'err');
    setBusy(true);
    try { await updateMyProfile(form); toast('Profile updated.'); } catch (ex) { toast(friendlyError(ex), 'err'); } finally { setBusy(false); }
  };

  return (
    <div className="container page">
      <h1>Hi {profile?.name?.split(' ')[0]} 👋</h1>
      <div className="tabs">
        {[['saved', `Saved stays (${saved.length})`], ['tours', `Tour requests (${bookings.length})`], ['profile', 'Profile']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'saved' && (saved.length
        ? <div className="grid">{saved.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        : <Empty title="Nothing saved yet" text="Tap the heart on any stay to keep it here."><Link to="/explore" className="btn primary">Explore stays</Link></Empty>)}

      {tab === 'tours' && (bookings.length ? (
        <div className="list">
          {bookings.map((b) => (
            <div className="card pad row between wrap gap" key={b.id}>
              <div><Link to={`/property/${b.propertyId}`}><strong>{b.propertyName}</strong></Link><p className="muted">Visit on {b.visitDate}</p>{b.message && <p>“{b.message}”</p>}</div>
              <div className="row gap"><StatusPill s={b.status} />{['pending', 'confirmed'].includes(b.status) && <button className="btn ghost" onClick={() => cancel(b.id)}>Cancel</button>}</div>
            </div>
          ))}
        </div>
      ) : <Empty title="No tour requests" text="Open a listing and choose “Request tour”." />)}

      {tab === 'profile' && (
        <form className="card pad form-grid narrow" onSubmit={saveProfile}>
          <Field label="Full name"><input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input value={profile?.email || ''} disabled /></Field>
          <Field label="Phone"><input value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Home city"><select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}><option value="">—</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      )}
    </div>
  );
}
