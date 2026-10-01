import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'roomiq123@gmail.com';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container foot-in">
        <div>
          <strong className="brand-text">ROOMIQ</strong>
          <p>Verified stays, compatible roommates, and owners you can talk to.</p>
          <a className="foot-email" href={`mailto:${SUPPORT_EMAIL}`}><Mail size={15} /> {SUPPORT_EMAIL}</a>
        </div>
        <div className="foot-links">
          <Link to="/explore">Explore stays</Link>
          <Link to="/roommates">Find roommates</Link>
          <Link to="/login">Tenant login</Link>
          <Link to="/owner/login">Owner login</Link>
        </div>
        <small>© {new Date().getFullYear()} ROOMIQ. Map data © OpenStreetMap contributors. Questions? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</small>
      </div>
    </footer>
  );
}