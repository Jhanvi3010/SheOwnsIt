import { Heart, Users, Star, Clock } from 'lucide-react';
import VolunteerApply from '../components/VolunteerApply';

const VolunteerPage = ({ clientId }: { clientId?: number }) => {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1>Volunteer with SheOwnsIt</h1>
        <p>You've walked this journey — now help guide others. Give back by becoming a SheOwnsIt volunteer.</p>
      </header>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        {[
          { icon: <Heart size={24} color="#ec4899" />, bg: '#fdf4ff', title: 'Give Back', desc: 'Support other women on their empowerment journey, just like you were supported.' },
          { icon: <Users size={24} color="#4f46e5" />, bg: '#eff6ff', title: 'Join the Team', desc: 'Work alongside our dedicated volunteers and make a real difference in your community.' },
          { icon: <Star size={24} color="#f59e0b" />, bg: '#fefce8', title: 'Build Skills', desc: 'Develop your coaching, styling, and mentoring skills while helping others grow.' },
          { icon: <Clock size={24} color="#10b981" />, bg: '#f0fdf4', title: 'Flexible Hours', desc: 'Volunteer on your own schedule — mornings, evenings, or weekends.' },
        ].map(card => (
          <div key={card.title} style={{
            background: card.bg, borderRadius: '16px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {card.icon}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{card.title}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* What volunteers do */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        borderRadius: '20px', padding: '28px 32px', marginBottom: '32px', color: 'white',
      }}>
        <h2 style={{ color: 'white', margin: '0 0 16px', borderBottom: 'none', fontSize: '1.2rem' }}>What volunteers do</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            '👗 Styling sessions — help clients find their look',
            '💼 Career coaching — prepare for interviews',
            '🎤 Mock interviews — build confidence',
            '🤝 General support — listening and guidance',
          ].map(item => (
            <div key={item} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 16px', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Application form */}
      <VolunteerApply clientId={clientId} />
    </div>
  );
};

export default VolunteerPage;
