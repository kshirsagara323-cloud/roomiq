import { useEffect } from 'react';
import { Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import { GuestOnly, RequireRole } from './components/RouteGuards';
import { isConfigured } from './lib/firebase';
import Home from './pages/Home';
import Explore from './pages/Explore';
import PropertyDetail from './pages/PropertyDetail';
import Roommates from './pages/Roommates';
import AuthPage from './pages/AuthPage';
import TenantDashboard from './pages/TenantDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import PropertyForm from './pages/PropertyForm';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import ChatWidget from './components/ChatWidget';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="main"><Outlet /></main>
      <Footer />
      <ChatWidget />
    </>
  );
}

const NotFound = () => (
  <div className="center-box"><h1>404</h1><p className="muted">That page does not exist.</p><Link className="btn primary" to="/">Go home</Link></div>
);

function SetupNeeded() {
  return (
    <div className="center-box" style={{ minHeight: '100vh', textAlign: 'center', padding: 24 }}>
      <h1>Almost there — connect Firebase</h1>
      <p className="muted" style={{ maxWidth: 520 }}>
        Copy <code>.env.example</code> to <code>.env</code>, paste your Firebase web app keys into it, then restart <code>npm run dev</code>.
        Full steps are in <code>README.md</code>.
      </p>
    </div>
  );
}

export default function App() {
   const { loading } = useAuth();
   const { loading: dataLoading } = useData();
   if (!isConfigured) return <SetupNeeded />;
   return (
     <>
      <LoadingScreen show={loading || dataLoading} />
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="property/:id" element={<PropertyDetail />} />
        <Route path="roommates" element={<Roommates />} />

        <Route path="login" element={<GuestOnly><AuthPage role="tenant" mode="login" /></GuestOnly>} />
        <Route path="register" element={<GuestOnly><AuthPage role="tenant" mode="register" /></GuestOnly>} />
        <Route path="owner/login" element={<GuestOnly><AuthPage role="owner" mode="login" /></GuestOnly>} />
        <Route path="owner/register" element={<GuestOnly><AuthPage role="owner" mode="register" /></GuestOnly>} />

        <Route path="dashboard" element={<RequireRole role="tenant"><TenantDashboard /></RequireRole>} />
        <Route path="owner" element={<RequireRole role="owner"><OwnerDashboard /></RequireRole>} />
        <Route path="owner/property/new" element={<RequireRole role="owner"><PropertyForm /></RequireRole>} />
        <Route path="owner/property/:id" element={<RequireRole role="owner"><PropertyForm /></RequireRole>} />
        <Route path="chat" element={<RequireRole><Chat /></RequireRole>} />
        <Route path="chat/:id" element={<RequireRole><Chat /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
            </Route>
      </Routes>
    </>
  );
}