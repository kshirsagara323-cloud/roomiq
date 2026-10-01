import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, Sparkles, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive, useLiveDoc } from '../lib/hooks';
import { compatibility } from '../lib/match';
import { CITIES } from '../lib/constants';
import { clean, formatINR, friendlyError } from '../lib/utils';
import { Empty, Field, Loader } from '../components/Ui';

const BLANK = { city: 'Pune', budget: 10000, gender: 'Male', sameGenderOnly: true, sleep: 'flexible', clean: 3, social: 3, smoker: false, diet: 'any', bio: '', contact: '' };
const SLEEP = { early: 'Early bird', night: 'Night owl', flexible: 'Flexible' };
const DIET = { veg: 'Vegetarian', nonveg: 'Non-veg', any: 'No preference' };

export default function Roommates() {
  const { user, profile, role, loading } = useAuth();
  const toast = useToast();
  const isTenant = role === 'tenant';
  const { data: mine, loading: mineLoading } = useLiveDoc(() => (isTenant ? doc(db, 'roommates', user.uid) : null), [user?.uid, isTenant]);
  const { data: all } = useLive(() => (isTenant ? collection(db, 'roommates') : null), [isTenant]);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => { if (mine) setForm({ ...BLANK, ...mine }); }, [mine]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const matches = useMemo(() => {
    if (!mine) return [];
    return all
      .filter((o) => o.id !== user.uid && (!cityFilter || o.city === cityFilter))
      .map((o) => ({ o, m: compatibility(mine, o) }))
      .filter((x) => x.m)
      .sort((a, b) => b.m.score - a.m.score);
  }, [all, mine, user?.uid, cityFilter]);

  if (loading) return <Loader />;
  if (!isTenant) {
    return (
      <div className="container page">
        <Empty title="Find compatible roommates" text="Roommate matching is for tenants. Log in or create a tenant account to answer a few questions and see who fits your lifestyle.">
          <div className="row gap center-row"><Link className="btn primary" to="/login">Tenant login</Link><Link className="btn ghost" to="/register">Sign up</Link></div>
        </Empty>
      </div>
    );
  }

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await setDoc(doc(db, 'roommates', user.uid), {
        uid: user.uid,
        name: profile.name,
        city: form.city,
        budget: Number(form.budget),
        gender: form.gender,
        sameGenderOnly: !!form.sameGenderOnly,
        sleep: form.sleep,
        clean: Number(form.clean),
        social: Number(form.social),
        smoker: !!form.smoker,
        diet: form.diet,
        bio: clean(form.bio, 200),
        contact: clean(form.contact, 60),
        updatedAt: serverTimestamp(),
      });
      setEditing(false);
      toast('Roommate profile saved.');
    } catch (ex) {
      toast(friendlyError(ex), 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try { await deleteDoc(doc(db, 'roommates', user.uid)); setForm(BLANK); toast('You are no longer visible to other tenants.'); }
    catch (ex) { toast(friendlyError(ex), 'err'); }
  };

  const showForm = editing || (!mine && !mineLoading);

  return (
    <div className="container page">
      <h1>Find your people</h1>
      <p className="muted">Answer a few questions. Only tenants who opted in can see your profile – never your email or phone.</p>

      {showForm ? (
        <form className="card pad form-grid" onSubmit={save}>
          <Field label="City"><select value={form.city} onChange={(e) => set('city', e.target.value)}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label={`Monthly budget: ${formatINR(form.budget)}`}><input type="range" min="3000" max="50000" step="500" value={form.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
          <Field label="I am"><select value={form.gender} onChange={(e) => set('gender', e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="Sleep schedule"><select value={form.sleep} onChange={(e) => set('sleep', e.target.value)}>{Object.entries(SLEEP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label={`Cleanliness: ${form.clean}/5`}><input type="range" min="1" max="5" value={form.clean} onChange={(e) => set('clean', e.target.value)} /></Field>
          <Field label={`Social energy: ${form.social}/5`}><input type="range" min="1" max="5" value={form.social} onChange={(e) => set('social', e.target.value)} /></Field>
          <Field label="Food habits"><select value={form.diet} onChange={(e) => set('diet', e.target.value)}>{Object.entries(DIET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="checks">
            <label><input type="checkbox" checked={form.smoker} onChange={(e) => set('smoker', e.target.checked)} /> I smoke</label>
            <label><input type="checkbox" checked={form.sameGenderOnly} onChange={(e) => set('sameGenderOnly', e.target.checked)} /> Same-gender roommates only</label>
          </div>
          <Field label="About me (optional)"><textarea rows={3} maxLength={200} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Student, works in IT, loves cricket…" /></Field>
          <Field label="How matches can reach you (optional)" hint="Shown to other opted-in tenants, e.g. an Instagram handle or email."><input maxLength={60} value={form.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
          <div className="row gap full">
            <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save & find matches'}</button>
            {mine && <button type="button" className="btn ghost" onClick={() => { setEditing(false); setForm({ ...BLANK, ...mine }); }}>Cancel</button>}
          </div>
        </form>
      ) : mineLoading ? (
        <Loader />
      ) : (
        <>
          <div className="row between wrap gap sect">
            <select className="plain w-auto" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="row gap"><button className="btn ghost" onClick={() => setEditing(true)}>Edit my answers</button><button className="btn ghost" onClick={remove}>Hide me</button></div>
          </div>
          {matches.length ? (
            <div className="grid">
              {matches.map(({ o, m }) => (
                <div className="card pad match" key={o.id}>
                  <div className="row between"><div className="avatar lg">{o.name[0]}</div><div className="score"><Sparkles size={14} /> {m.score}% match</div></div>
                  <h3>{o.name}</h3>
                  <p className="muted">{o.city} · up to {formatINR(o.budget)} · {SLEEP[o.sleep]}</p>
                  {o.bio && <p>{o.bio}</p>}
                  <div className="chips">{m.reasons.slice(0, 3).map((r) => <span className="chip on static" key={r}>{r}</span>)}</div>
                  {o.contact && <p className="row gap4 contact"><Mail size={14} /> {o.contact}</p>}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No matches yet" text="You are visible to other tenants in your city. New matches appear here the moment someone joins."><Users /></Empty>
          )}
        </>
      )}
    </div>
  );
}
