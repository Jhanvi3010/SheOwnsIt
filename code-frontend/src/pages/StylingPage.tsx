import { useState } from 'react';
import { Camera, Sparkles, ShieldCheck } from 'lucide-react';
import PhotoAnalysis from '../components/PhotoAnalysis';

const StylingPage = ({ clientId }: { clientId?: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {open && <PhotoAnalysis clientId={clientId} onClose={() => setOpen(false)} />}

      <header style={{ marginBottom: '32px' }}>
        <h1>AI Styling Guide</h1>
        <p>Upload a photo or video and get personalised fashion recommendations powered by AI.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { icon: '📸', title: 'Upload a photo or video', desc: 'A clear full-length photo or short video gives the best recommendations.' },
          { icon: '🤖', title: 'AI analyses your style', desc: 'Claude AI reviews your profile — body shape, colour season, and occasion — to craft advice just for you.' },
          { icon: '✨', title: 'Get your personalised look', desc: 'Receive outfit suggestions, colour palette, and what to avoid — all tailored specifically to you.' },
          { icon: '🔒', title: 'Your privacy is protected', desc: 'Your photo is analysed and immediately deleted. Only text results are saved — never the image.' },
        ].map(card => (
          <div key={card.title} style={{
            background: '#fff', borderRadius: '18px', padding: '28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ fontSize: '2rem' }}>{card.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{card.title}</div>
            <div style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Privacy notice */}
      <div style={{
        background: 'linear-gradient(135deg, #fefce8, #fffbeb)',
        border: '1px solid #fde68a', borderRadius: '16px',
        padding: '20px 28px', marginBottom: '32px',
        display: 'flex', gap: '14px', alignItems: 'flex-start',
      }}>
        <ShieldCheck size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>Privacy Promise</div>
          <ul style={{ margin: 0, paddingLeft: '18px', color: '#78350f', fontSize: '0.87rem', lineHeight: 2 }}>
            <li>Photos and videos are <strong>analysed then deleted immediately</strong> — never stored</li>
            <li>Only <strong>text-based style notes</strong> are saved to your profile</li>
            <li>Volunteers can only see your profile <strong>if assigned to your session</strong></li>
            <li>You can <strong>delete all your data</strong> at any time from your portal</li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '48px 20px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '24px' }}>
        <Sparkles size={40} color="rgba(255,255,255,0.8)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'white', margin: '0 0 10px', fontSize: '1.8rem', borderBottom: 'none' }}>
          Ready to discover your style?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 28px' }}>
          Upload your photo or video and get AI-powered fashion advice in seconds.
        </p>
        <button onClick={() => setOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '16px 36px', background: 'white', border: 'none',
          borderRadius: '14px', fontWeight: 800, fontSize: '1rem',
          color: '#4f46e5', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <Camera size={20} /> Get My Styling Guide
        </button>
      </div>
    </div>
  );
};

export default StylingPage;
