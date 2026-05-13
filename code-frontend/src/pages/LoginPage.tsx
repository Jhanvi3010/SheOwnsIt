import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, User, Lock, Mail, ShieldCheck, UserPlus, Phone, MapPin, Heart, Star, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import CreatableDropdown from '../components/CreatableDropdown';

type LoginPageProps = {
  onLogin: (user: { role: string; name: string; email: string; client_id?: number }) => void;
};
type Tab = 'owner' | 'client' | 'register';

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('client');
  const [showPass, setShowPass] = useState(false);
  const [showClientPass, setShowClientPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPass, setClientPass] = useState('');
  const [reg, setReg] = useState({
    first_name: '', last_name: '', email: '', password: '', phone_number: '', postcode: '', occasion: 'Job Interview',
  });

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmail || !ownerPass) { toast.error('Please fill in all fields'); return; }
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/owner/login', { email: ownerEmail, password: ownerPass });
      const user = { role: 'owner', name: res.data.name, email: res.data.email };
      localStorage.setItem('dfs_user', JSON.stringify(user));
      onLogin(user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/owner');
    } catch { toast.error('Invalid credentials.'); }
    finally { setLoading(false); }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientPass) { toast.error('Please enter your email and password'); return; }
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/client/login', { email: clientEmail, password: clientPass });
      const user = { role: 'client', name: res.data.name, email: res.data.email, client_id: res.data.client_id };
      localStorage.setItem('dfs_user', JSON.stringify(user));
      onLogin(user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/client');
    } catch {
      toast.error('Email or password incorrect.');
      setTab('register');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.first_name || !reg.last_name || !reg.email || !reg.password) {
      toast.error('All fields including password are required'); return;
    }
    if (reg.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(reg.email)) { toast.error('Please enter a valid email'); return; }
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/client/register', reg);
      const user = { role: 'client', name: res.data.name, email: res.data.email, client_id: res.data.client_id };
      localStorage.setItem('dfs_user', JSON.stringify(user));
      onLogin(user);
      toast.success('Welcome to SheOwnsIt!');
      navigate('/client');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'client',   label: 'Sign In',  icon: <User size={14} /> },
    { key: 'register', label: 'Register', icon: <UserPlus size={14} /> },
    { key: 'owner',    label: 'Admin',    icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'inherit' }}>

      {/* ── Left panel ── */}
      <div className="login-left" style={{
        flex: '0 0 48%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 35%, #4c1d95 65%, #7c3aed 100%)',
        padding: '48px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(139,92,246,0.15)', top:-120, right:-100, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(236,72,153,0.1)', bottom:40, left:-80, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(99,102,241,0.2)', bottom:200, right:40, pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'auto', position:'relative' }}>
          <div style={{ width:42, height:42, borderRadius:'12px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)' }}>
            <Sparkles size={22} color="white" fill="rgba(255,255,255,0.3)" />
          </div>
          <div>
            <div style={{ color:'white', fontWeight:800, fontSize:'1.25rem', letterSpacing:'-0.02em' }}>SheOwnsIt</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem', letterSpacing:'0.05em', textTransform:'uppercase' }}>Empowering Women</div>
          </div>
        </div>

        {/* Main hero text */}
        <div style={{ position:'relative', margin:'60px 0 48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.1)', backdropFilter:'blur(10px)', borderRadius:'100px', padding:'6px 14px', marginBottom:'20px' }}>
            <Heart size={13} color="#f9a8d4" fill="#f9a8d4" />
            <span style={{ color:'#f9a8d4', fontSize:'0.78rem', fontWeight:600 }}>Rise with her · Her confidence · Her life</span>
          </div>
          <h1 style={{ color:'white', fontSize:'2.6rem', fontWeight:900, lineHeight:1.15, margin:'0 0 16px', letterSpacing:'-0.03em' }}>
            Walk your journey<br />
            <span style={{ background:'linear-gradient(135deg,#f9a8d4,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              on your own terms
            </span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'1rem', lineHeight:1.7, margin:0, maxWidth:'380px' }}>
            Styling sessions, career coaching, and mock interviews — all designed to empower women to thrive.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px', position:'relative', marginBottom:'48px' }}>
          {[
            { icon:'👗', label:'AI Styling Guide',    desc:'Personalised fashion advice powered by AI' },
            { icon:'💼', label:'Career Preparation',  desc:'Interview coaching and confidence building' },
            { icon:'🤝', label:'Volunteer Community', desc:'Give back after your own journey' },
          ].map(f => (
            <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'14px', background:'rgba(255,255,255,0.07)', backdropFilter:'blur(10px)', borderRadius:'14px', padding:'14px 18px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize:'1.4rem' }}>{f.icon}</span>
              <div>
                <div style={{ color:'white', fontWeight:700, fontSize:'0.88rem' }}>{f.label}</div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:'24px', position:'relative' }}>
          {[['200+','Women helped'],['15+','Volunteers'],['3','Service types']].map(([n,l]) => (
            <div key={l}>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.4rem' }}>{n}</div>
              <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.75rem' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1, display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fdf2f8 100%)',
        padding:'40px 24px', overflowY:'auto', position:'relative',
      }}>
        {/* Decorative background dots */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', background:'rgba(139,92,246,0.06)', top:-80, right:-80 }} />
          <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(236,72,153,0.05)', bottom:60, left:-60 }} />
          <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(99,102,241,0.07)', top:'40%', right:'8%' }} />
        </div>

        <div style={{ width:'100%', maxWidth:'440px', position:'relative' }}>

          {/* Form card */}
          <div style={{
            background:'white', borderRadius:'24px',
            boxShadow:'0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.04)',
            padding:'36px 36px 32px',
            border:'1px solid rgba(139,92,246,0.1)',
          }}>
            {/* Header */}
            <div style={{ marginBottom:'28px' }}>
              <h2 style={{ fontSize:'1.65rem', fontWeight:900, color:'#0f172a', margin:'0 0 5px', letterSpacing:'-0.02em' }}>
                {tab === 'register' ? 'Create your account' : tab === 'owner' ? 'Admin access' : 'Welcome back'}
              </h2>
              <p style={{ color:'#64748b', margin:0, fontSize:'0.9rem' }}>
                {tab === 'register' ? 'Join SheOwnsIt and start your journey today.' : tab === 'owner' ? 'Admin sign-in — manage your operations.' : 'Sign in to continue your journey.'}
              </p>
            </div>

            {/* Tab switcher */}
            <div style={{ display:'flex', background:'#f1f5f9', borderRadius:'14px', padding:'4px', marginBottom:'26px', gap:'4px' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex:1, padding:'10px 6px', border:'none', cursor:'pointer',
                  borderRadius:'10px', fontSize:'0.82rem', fontWeight:600,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                  background: tab === t.key ? 'white' : 'transparent',
                  color: tab === t.key ? '#4f46e5' : '#64748b',
                  boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition:'all 0.2s ease',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* CLIENT LOGIN */}
            {tab === 'client' && (
              <form onSubmit={handleClientLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <Field label="Email Address" icon={<Mail size={15} color="#94a3b8" />}>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    placeholder="yourname@email.com" style={inp} />
                </Field>
                <Field label="Password" icon={<Lock size={15} color="#94a3b8" />} right={
                  <button type="button" onClick={() => setShowClientPass(!showClientPass)} style={eyeBtn}>
                    {showClientPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }>
                  <input type={showClientPass ? 'text' : 'password'} value={clientPass} onChange={e => setClientPass(e.target.value)}
                    placeholder="Your password" style={{ ...inp, paddingRight:'42px' }} />
                </Field>
                <SubmitBtn loading={loading} label="Sign In" />
                <p style={{ textAlign:'center', fontSize:'0.85rem', color:'#64748b', margin:0 }}>
                  No account?{' '}
                  <button type="button" onClick={() => setTab('register')} style={linkBtn}>Register free →</button>
                </p>
              </form>
            )}

            {/* REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Field label="First Name *" icon={<User size={14} color="#94a3b8" />}>
                    <input value={reg.first_name} onChange={e => setReg(r=>({...r,first_name:e.target.value}))} placeholder="Jane" style={inp} />
                  </Field>
                  <Field label="Last Name *" icon={<User size={14} color="#94a3b8" />}>
                    <input value={reg.last_name} onChange={e => setReg(r=>({...r,last_name:e.target.value}))} placeholder="Smith" style={inp} />
                  </Field>
                </div>
                <Field label="Email Address *" icon={<Mail size={14} color="#94a3b8" />}>
                  <input type="email" value={reg.email} onChange={e => setReg(r=>({...r,email:e.target.value}))} placeholder="jane@email.com" style={inp} />
                </Field>
                <Field label="Password * (min 6 characters)" icon={<Lock size={14} color="#94a3b8" />} right={
                  <button type="button" onClick={() => setShowRegPass(!showRegPass)} style={eyeBtn}>
                    {showRegPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }>
                  <input type={showRegPass ? 'text' : 'password'} value={reg.password} onChange={e => setReg(r=>({...r,password:e.target.value}))} placeholder="Create a password" style={{ ...inp, paddingRight:'42px' }} />
                </Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Field label="Phone (optional)" icon={<Phone size={14} color="#94a3b8" />}>
                    <input value={reg.phone_number} onChange={e => setReg(r=>({...r,phone_number:e.target.value}))} placeholder="04xx xxx xxx" style={inp} />
                  </Field>
                  <Field label="Postcode (optional)" icon={<MapPin size={14} color="#94a3b8" />}>
                    <input value={reg.postcode} onChange={e => setReg(r=>({...r,postcode:e.target.value}))} placeholder="2000" style={inp} />
                  </Field>
                </div>
                <div>
                  <label style={lbl}>Occasion</label>
                  <CreatableDropdown field="occasion" value={reg.occasion} onChange={val => setReg(r=>({...r,occasion:val}))} placeholder="Select or add an occasion…" />
                </div>
                <SubmitBtn loading={loading} label="Create My Account" color="linear-gradient(135deg,#10b981,#059669)" shadow="rgba(16,185,129,0.3)" />
                <p style={{ textAlign:'center', fontSize:'0.84rem', color:'#64748b', margin:0 }}>
                  Already registered?{' '}
                  <button type="button" onClick={() => setTab('client')} style={linkBtn}>Sign in →</button>
                </p>
              </form>
            )}

            {/* OWNER */}
            {tab === 'owner' && (
              <form onSubmit={handleOwnerLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'13px 15px', background:'linear-gradient(135deg,#eff6ff,#eef2ff)', borderRadius:'12px', border:'1px solid #bfdbfe', marginBottom:'4px' }}>
                  <ShieldCheck size={18} color="#4f46e5" />
                  <span style={{ fontSize:'0.84rem', color:'#3730a3', fontWeight:600 }}>Admin access only — restricted area</span>
                </div>
                <Field label="Email Address" icon={<Mail size={15} color="#94a3b8" />}>
                  <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="sheownsit256@gmail.com" style={inp} />
                </Field>
                <Field label="Password" icon={<Lock size={15} color="#94a3b8" />} right={
                  <button type="button" onClick={() => setShowPass(!showPass)} style={eyeBtn}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }>
                  <input type={showPass ? 'text' : 'password'} value={ownerPass} onChange={e => setOwnerPass(e.target.value)} placeholder="Enter password" style={{ ...inp, paddingRight:'42px' }} />
                </Field>
                <SubmitBtn loading={loading} label="Sign In as Admin" />
              </form>
            )}
          </div>

          {/* Trust badge */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'18px', color:'#94a3b8', fontSize:'0.78rem' }}>
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
            <span>Trusted by 200+ women on their empowerment journey</span>
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
        }
        input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12) !important; outline: none; }
      `}</style>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:'100%', padding:'11px 12px 11px 36px', border:'2px solid #e2e8f0',
  borderRadius:'10px', fontSize:'0.9rem', color:'#0f172a', outline:'none',
  background:'#fafafa', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s',
};
const lbl: React.CSSProperties = {
  display:'block', marginBottom:'6px', fontWeight:600, fontSize:'0.82rem', color:'#374151',
};
const eyeBtn: React.CSSProperties = {
  position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
  background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0,
};
const linkBtn: React.CSSProperties = {
  background:'none', border:'none', color:'#7c3aed', fontWeight:700,
  cursor:'pointer', padding:0, fontSize:'inherit',
};

const Field = ({ label, icon, right, children }: { label: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label style={lbl}>{label}</label>
    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
      <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>{icon}</span>
      {children}
      {right}
    </div>
  </div>
);

const SubmitBtn = ({ loading, label, color = 'linear-gradient(135deg,#7c3aed,#4f46e5)', shadow = 'rgba(124,58,237,0.3)' }: { loading: boolean; label: string; color?: string; shadow?: string }) => (
  <button type="submit" disabled={loading} style={{
    width:'100%', padding:'13px', background: loading ? '#e2e8f0' : color,
    color: loading ? '#94a3b8' : 'white', border:'none', borderRadius:'12px',
    fontSize:'0.95rem', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: loading ? 'none' : `0 4px 16px ${shadow}`,
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
    transition:'all 0.2s ease',
  }}>
    {loading ? 'Please wait…' : <>{label} <ArrowRight size={16} /></>}
  </button>
);

export default LoginPage;
