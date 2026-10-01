import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, LogOut, Menu, MessageCircle, Plus, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, profile, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const close = () => setOpen(false);
  const dash = role === 'owner' ? '/owner' : '/dashboard';

  const out = async () => {
    close();
    await logout();
    nav('/');
  };

  return (
    <header className="nav">
      <div className="container nav-in">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark"><Home size={20} /></span>
          <span className="brand-words">
            <span className="brand-word">ROOM<em>IQ</em></span>
            <span className="brand-tag">Smart stays. Better living.</span>
          </span>
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>Home</NavLink>
          <NavLink to="/explore" onClick={close}>Browse stays</NavLink>
          <NavLink to="/roommates" onClick={close}>Roommate match <span className="pill new">New</span></NavLink>
          {user && role && (
            <>
              <NavLink to={dash} end onClick={close}>{role === 'owner' ? 'Owner dashboard' : 'My dashboard'}</NavLink>
              <NavLink to="/chat" onClick={close}><MessageCircle size={15} /> Messages</NavLink>
            </>
          )}
          <div className="nav-cta">
            {!user ? (
              <>
                <Link className="btn ghost list-link" to="/owner/login" onClick={close}><Plus size={15} /> List your property</Link>
                <Link className="btn ghost" to="/login" onClick={close}>Log in</Link>
                <Link className="btn primary" to="/register" onClick={close}>Sign up</Link>
              </>
            ) : (
              <>
                <span className="who" title={profile?.email}>
                  <span className="avatar">{(profile?.name || 'U')[0].toUpperCase()}</span>
                  {profile?.name?.split(' ')[0]}
                  <span className="pill">{role === 'owner' ? 'Owner' : 'Tenant'}</span>
                </span>
                <button className="btn ghost" onClick={out}><LogOut size={16} /> Log out</button>
              </>
            )}
          </div>
        </nav>

        <button className="burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}