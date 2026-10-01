import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLiveDoc } from '../lib/hooks';
import { processImages, removeImages } from '../lib/images';
import { AMENITIES, CITIES, CITY_CENTER, GENDERS, TYPES } from '../lib/constants';
import { clean, friendlyError } from '../lib/utils';
import ImageUploader from '../components/ImageUploader';
import { LocationMap } from '../components/MapView';
import { Empty, Field, Loader } from '../components/Ui';

const BLANK = { name: '', type: 'PG', gender: 'Any', city: 'Pune', area: '', price: '', deposit: '', beds: '', available: 'Available now', description: '', amenities: [], status: 'active', lat: null, lng: null };

export default function PropertyForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { data: existing, loading } = useLiveDoc(() => (editing ? doc(db, 'properties', id) : null), [id]);
  const [f, setF] = useState(BLANK);
  const [saved, setSaved] = useState([]);
  const [original, setOriginal] = useState([]);
  const [files, setFiles] = useState([]);
  const [focus, setFocus] = useState(CITY_CENTER.Pune);
  const [ready, setReady] = useState(!editing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing || ready || !existing) return;
    setF({ ...BLANK, ...existing, price: existing.price ?? '', deposit: existing.deposit ?? '', beds: existing.beds ?? '' });
    setSaved(existing.images || []);
    setOriginal(existing.images || []);
    setFocus([existing.lat, existing.lng]);
    setReady(true);
  }, [existing, editing, ready]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleAm = (a) => set('amenities', f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a]);
  const pickCity = (c) => { set('city', c); setFocus(CITY_CENTER[c]); };

  if (editing && loading) return <Loader />;
  if (editing && (!existing || existing.ownerId !== user.uid)) return <div className="container page"><Empty title="Listing not found" text="You can only edit your own listings." /></div>;

  const submit = async (e) => {
    e.preventDefault();
    const price = Number(f.price);
    if (clean(f.name, 100).length < 3) return toast('Give the property a name (3+ characters).', 'err');
    if (clean(f.area, 120).length < 2) return toast('Add the area or locality.', 'err');
    if (!(price > 0 && price <= 1000000)) return toast('Enter a valid monthly rent.', 'err');
    if (f.lat == null) return toast('Click the map to drop a pin on your property.', 'err');
    setBusy(true);
    try {
      const pid = editing ? id : doc(collection(db, 'properties')).id;
      const fresh = await processImages(files, user.uid, pid);
      const images = [...saved, ...fresh];
      if (JSON.stringify(images).length > 900000) throw new Error('Photos are too large together. Remove one or use smaller photos.');
      const body = {
        name: clean(f.name, 100),
        description: clean(f.description, 2000),
        city: f.city,
        area: clean(f.area, 120),
        type: f.type,
        gender: f.gender,
        price,
        deposit: Number(f.deposit) || 0,
        beds: Number(f.beds) || 0,
        available: clean(f.available, 40),
        amenities: f.amenities,
        images,
        lat: Number(f.lat),
        lng: Number(f.lng),
        status: f.status,
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, 'properties', pid), body);
        await removeImages(original.filter((u) => !saved.includes(u)));
      } else {
        await setDoc(doc(db, 'properties', pid), {
          ...body,
          ownerId: user.uid,
          ownerName: profile?.name || 'Owner',
          verified: false,
          ratingSum: 0,
          ratingCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      toast(editing ? 'Listing updated everywhere.' : 'Listing published!');
      nav('/owner');
    } catch (ex) {
      toast(friendlyError(ex), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page narrow-page">
      <h1>{editing ? 'Edit property' : 'Add a property'}</h1>
      <form className="stack" onSubmit={submit}>
        <div className="card pad form-grid">
          <Field label="Property name"><input value={f.name} maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder="Sunrise Boys PG" required /></Field>
          <Field label="Type"><select value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Suitable for"><select value={f.gender} onChange={(e) => set('gender', e.target.value)}>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="City"><select value={f.city} onChange={(e) => pickCity(e.target.value)}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Area / locality"><input value={f.area} maxLength={120} onChange={(e) => set('area', e.target.value)} placeholder="Koregaon Park" required /></Field>
          <Field label="Monthly rent (₹)"><input type="number" min="1" max="1000000" value={f.price} onChange={(e) => set('price', e.target.value)} required /></Field>
          <Field label="Security deposit (₹)"><input type="number" min="0" max="5000000" value={f.deposit} onChange={(e) => set('deposit', e.target.value)} /></Field>
          <Field label="Beds available"><input type="number" min="0" max="500" value={f.beds} onChange={(e) => set('beds', e.target.value)} /></Field>
          <Field label="Availability"><input value={f.available} maxLength={40} onChange={(e) => set('available', e.target.value)} placeholder="Available now / From 1 Nov" /></Field>
          <Field label="Status"><select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="active">Live – visible to tenants</option><option value="paused">Paused – hidden</option></select></Field>
          <div className="full"><Field label="Description"><textarea rows={5} maxLength={2000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Rules, food timings, nearby colleges/offices…" /></Field></div>
        </div>

        <div className="card pad">
          <strong>Amenities</strong>
          <div className="chips">{AMENITIES.map((a) => <button type="button" key={a} className={`chip ${f.amenities.includes(a) ? 'on' : ''}`} onClick={() => toggleAm(a)}>{a}</button>)}</div>
        </div>

        <div className="card pad">
          <strong>Photos</strong>
          <ImageUploader existing={saved} setExisting={setSaved} files={files} setFiles={setFiles} onError={(m) => toast(m, 'err')} />
        </div>

        <div className="card pad">
          <strong>Drop a pin on the map</strong>
          <p className="muted">Click the exact location of your building. {f.lat != null && <span>Pin set ✓</span>}</p>
          <LocationMap lat={f.lat} lng={f.lng} center={focus} zoom={13} height={340} onPick={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} />
        </div>

        <div className="row gap">
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}</button>
          <button type="button" className="btn ghost" onClick={() => nav('/owner')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
