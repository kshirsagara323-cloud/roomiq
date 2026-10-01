import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, KeyRound, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { clean, friendlyError, isEmail, isPhone, strongPassword } from '../lib/utils';

// One form, four pages: tenant login/register and owner login/register.
export default function AuthPage({ role, mode }) {
  const isOwner = role === 'owner';
  const isRegister = mode === 'register';
  const { login, register, googleLogin, resetPassword } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const go = () => nav(loc.state?.from || (isOwner ? '/owner' : '/dashboard'), { replace: true });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const email = clean(f.email, 160).toLowerCase();
    const name = clean(f.name, 80);
    const phone = clean(f.phone, 20);
    if (!isEmail(email)) return setErr('Enter a valid email address.');
    if (isRegister) {
      if (name.length < 2) return setErr('Please enter your full name.');
      if (!isPhone(phone)) return setErr('Enter a valid phone number.');
      if (!strongPassword(f.password)) return setErr('Password needs 8+ characters with letters and numbers.');
    } else if (!f.password) return setErr('Enter your password.');
    setBusy(true);
    try {
      if (isRegister) await register(role, { name, email, password: f.password, phone });
      else await login(role, email, f.password);
      toast(isRegister ? 'Welcome to RoomIQ!' : 'Welcome back!');
      go();
    } catch (ex) {
      setErr(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr('');
    setBusy(true);
    try {
      await googleLogin(role, isRegister);
      go();
    } catch (ex) {
      setErr(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    const email = clean(f.email, 160).toLowerCase();
    if (!isEmail(email)) return setErr('Type your email above first, then press "Forgot password".');
    try {
      await resetPassword(email);
    } catch {
      /* same message either way so accounts cannot be guessed */
    }
    toast('If that email has an account, a reset link is on its way.');
  };

  const base = isOwner ? '/owner' : '';
  return (
    <div className="auth">
      <aside className={`auth-side ${isOwner ? 'owner' : ''}`}>
        <div>
          {isOwner ? <Building2 size={40} /> : <KeyRound size={40} />}
          <h1>{isOwner ? 'List your property. Reach the right tenants.' : 'Find a place that feels like home.'}</h1>
          <ul>
            {(isOwner
              ? ['Add photos, map pin and rent in minutes', 'Tour requests and messages arrive live', 'Pause or edit a listing – it updates everywhere at once']
              : ['Browse real listings on a live map', 'Save stays and book tours in one tap', 'Chat with owners and match with roommates']
            ).map((t) => <li key={t}><ShieldCheck size={16} /> {t}</li>)}
          </ul>
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <span className="pill">{isOwner ? 'House owner' : 'Tenant'}</span>
          <h2>{isRegister ? (isOwner ? 'Create owner account' : 'Create your account') : isOwner ? 'Owner login' : 'Welcome back'}</h2>

          {isRegister && (
            <label className="input"><User size={16} /><input placeholder="Full name" value={f.name} onChange={set('name')} autoComplete="name" maxLength={80} /></label>
          )}
          <label className="input"><Mail size={16} /><input type="email" placeholder="Email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={160} /></label>
          {isRegister && (
            <label className="input"><Phone size={16} /><input placeholder="Phone (optional)" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={20} /></label>
          )}
          <label className="input">
            <Lock size={16} />
            <input type={show ? 'text' : 'password'} placeholder="Password" value={f.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength={128} />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </label>

          {err && <div className="alert" role="alert">{err}</div>}

          <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button>
          {!isRegister && <button type="button" className="link-btn" onClick={forgot}>Forgot password?</button>}

          <div className="or"><span>or</span></div>
          <button type="button" className="btn ghost block" onClick={google} disabled={busy}>Continue with Google</button>

          <p className="switch">
            {isRegister ? 'Already have an account? ' : 'New to RoomIQ? '}
            <Link to={`${base}/${isRegister ? 'login' : 'register'}`}>{isRegister ? 'Log in' : 'Sign up'}</Link>
          </p>
          <p className="switch small">
            {isOwner ? <>Looking for a place? <Link to="/login">Tenant login</Link></> : <>Own a property? <Link to="/owner/login">House owner login</Link></>}
          </p>
        </form>
      </main>
    </div>
  );
}
