import { useState } from 'react';
import { Route, Routes, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck, Sparkles,
  ShieldCheck, LogOut, Camera, Heart,
} from 'lucide-react';
import PartnerDashboard from './pages/PartnerDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ClientScheduler from './pages/ClientScheduler';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import OwnerDashboard from './pages/OwnerDashboard';
import StylingPage from './pages/StylingPage';
import VolunteerPage from './pages/VolunteerPage';
import Chatbot from './components/Chatbot';
import './App.css';

type AuthUser = {
  role: string;
  name: string;
  email: string;
  client_id?: number;
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('dfs_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const handleLogin = (u: AuthUser) => setUser(u);

  const handleLogout = () => {
    localStorage.removeItem('dfs_user');
    setUser(null);
  };

  // Nav tabs visible per role
  const ownerNav: { to: string; label: string; icon: React.ReactNode; end?: boolean }[] = [
    { to: '/owner',    label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { to: '/',         label: 'Partner',   icon: <Users size={17} />,        end: true },
    { to: '/volunteer',label: 'Volunteer', icon: <ClipboardCheck size={17} /> },
    { to: '/client',   label: 'Client',    icon: <Calendar size={17} /> },
  ];

  const clientNav: { to: string; label: string; icon: React.ReactNode; end?: boolean }[] = [
    { to: '/client',    label: 'Book Session',  icon: <Calendar size={17} /> },
    { to: '/dashboard', label: 'My Progress',   icon: <LayoutDashboard size={17} /> },
    { to: '/styling',   label: 'AI Styling',    icon: <Camera size={17} /> },
    { to: '/volunteer-apply', label: 'Volunteer', icon: <Heart size={17} /> },
  ];

  const navItems = user?.role === 'owner' ? ownerNav : clientNav;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar — only when logged in */}
      {user && !isLoginPage && (
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <Sparkles size={26} color="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>SheOwnsIt</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)', letterSpacing: '0.01em', lineHeight: 1 }}>
                  Rise with her · Her confidence · Her life
                </div>
              </div>
            </div>

            <nav>
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.icon} {item.label}
                  </div>
                </NavLink>
              ))}

              {/* User chip + logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
                <span style={{
                  fontSize: '0.82rem', fontWeight: 600,
                  background: user.role === 'owner' ? 'linear-gradient(135deg,#e0e7ff,#ede9fe)' : '#f0fdf4',
                  color: user.role === 'owner' ? '#4338ca' : '#166534',
                  padding: '5px 13px', borderRadius: '20px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  {user.role === 'owner' ? <ShieldCheck size={12} /> : null}
                  {user.name}
                </span>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', padding: '6px 13px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                }}>
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </nav>
          </div>
        </header>
      )}

      <div className={isLoginPage ? '' : 'app-shell'}>
        <main style={isLoginPage ? {} : { marginTop: '40px' }}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

            {/* All other routes require login */}
            <Route path="/" element={
              !user ? <Navigate to="/login" replace /> : <PartnerDashboard />
            } />
            <Route path="/volunteer" element={
              !user ? <Navigate to="/login" replace /> : <VolunteerDashboard />
            } />
            <Route path="/client" element={
              !user ? <Navigate to="/login" replace /> : <ClientScheduler />
            } />
            <Route path="/dashboard" element={
              !user ? <Navigate to="/login" replace />
              : user.role === 'owner' ? <Navigate to="/owner" replace />
              : <Dashboard />
            } />
            <Route path="/styling" element={
              !user ? <Navigate to="/login" replace /> : <StylingPage clientId={user.client_id} />
            } />
            <Route path="/volunteer-apply" element={
              !user ? <Navigate to="/login" replace /> : <VolunteerPage clientId={user.client_id} />
            } />
            <Route path="/owner" element={
              !user
                ? <Navigate to="/login" replace />
                : user.role === 'owner'
                  ? <OwnerDashboard user={user} onLogout={handleLogout} />
                  : <NotOwner />
            } />

            {/* Catch-all → login if not logged in, else home */}
            <Route path="*" element={
              <Navigate to={user ? '/' : '/login'} replace />
            } />
          </Routes>
        </main>
      </div>

      {/* Chatbot only when logged in */}
      {user && !isLoginPage && <Chatbot />}

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lift)',
            border: '1px solid rgba(0,0,0,0.05)',
            padding: '16px 20px',
            fontWeight: 500,
          },
        }}
      />
    </div>
  );
}

const NotOwner = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '20px', textAlign: 'center',
    }}>
      <ShieldCheck size={60} color="#c7d2fe" />
      <h2 style={{ color: '#4f46e5' }}>Admin Access Only</h2>
      <p>This page is restricted to SheOwnsIt admins.</p>
      <button onClick={() => navigate('/')} style={{
        padding: '12px 28px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: 'white', border: 'none', borderRadius: '12px',
        fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
      }}>
        Go Back
      </button>
    </div>
  );
};

export default App;
