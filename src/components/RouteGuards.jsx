import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from './Ui';

// Only lets the right kind of account through; everyone else is sent to the matching login page.
export function RequireRole({ role: needed, children }) {
  const { user, role, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader />;
  if (!user || !role) return <Navigate to={needed === 'owner' ? '/owner/login' : '/login'} state={{ from: loc.pathname }} replace />;
  if (needed && role !== needed) return <Navigate to={role === 'owner' ? '/owner' : '/dashboard'} replace />;
  return children;
}

// Login / register pages: bounce signed-in people to their dashboard.
export function GuestOnly({ children }) {
  const { user, role, loading, checking } = useAuth();
  if (checking) return children; // wrong-role logins are rejected before any redirect happens
  if (loading) return <Loader />;
  if (user && role) return <Navigate to={role === 'owner' ? '/owner' : '/dashboard'} replace />;
  return children;
}
