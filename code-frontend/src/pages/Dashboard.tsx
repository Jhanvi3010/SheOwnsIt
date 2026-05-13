import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CheckCircle, Circle, Calendar, Sparkles, Briefcase, Mic2,
  UserCheck, Clock, Star, ChevronRight, Palette,
} from 'lucide-react';

type Milestone = {
  registered: boolean;
  appointment_booked: boolean;
  styling_session: boolean;
  career_prep: boolean;
  mock_interview: boolean;
  session_completed: boolean;
};

type Appointment = {
  appt_id: number;
  service_type: string;
  schedule_time: string;
  status: string;
  volunteer_name: string | null;
  outcome_notes: string | null;
};

type ClientInfo = {
  name: string;
  email: string;
  body_shape: string | null;
  color_season: string | null;
  size: string | null;
  job_status: string | null;
  style_notes: string | null;
  occasion_tip: string | null;
  color_recommendations: string[];
  outfit_suggestions: { tops: string[]; bottoms: string[]; avoid: string[] } | null;
  styling_analysed_at: string | null;
};

type ProgressData = {
  client: ClientInfo;
  milestones: Milestone;
  appointments: Appointment[];
};

const SERVICE_LABELS: Record<string, string> = {
  styling: 'Styling Session',
  career_training: 'Career Preparation',
  mock_interview: 'Mock Interview',
  general: 'General Session',
};

const STATUS_COLOURS: Record<string, { bg: string; color: string; label: string }> = {
  pending_assignment: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  matched:            { bg: '#dbeafe', color: '#1e40af', label: 'Confirmed' },
  completed:          { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  cancelled:          { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

const MILESTONES = [
  { key: 'registered',         label: 'Registered',          icon: <UserCheck size={18} />,  desc: 'Your profile is set up' },
  { key: 'appointment_booked', label: 'Session Booked',       icon: <Calendar size={18} />,   desc: 'First appointment scheduled' },
  { key: 'styling_session',    label: 'Styling Session',      icon: <Sparkles size={18} />,   desc: 'Personalised styling advice' },
  { key: 'career_prep',        label: 'Career Preparation',   icon: <Briefcase size={18} />,  desc: 'Career coaching session' },
  { key: 'mock_interview',     label: 'Mock Interview',       icon: <Mic2 size={18} />,       desc: 'Interview practice completed' },
  { key: 'session_completed',  label: 'Session Completed',    icon: <Star size={18} />,       desc: 'You did it!' },
];

const Dashboard = () => {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem('dfs_user') || '{}');
  const clientId: number = storedUser?.client_id || 0;

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    axios.get(`/api/clients/${clientId}/progress`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Could not load your progress.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
      Loading your progress…
    </div>
  );

  if (!data) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
      Could not load your profile. Please try again.
    </div>
  );

  const completedCount = Object.values(data.milestones).filter(Boolean).length;
  const totalCount = MILESTONES.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const upcoming = data.appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const past     = data.appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1>My Progress</h1>
        <p>Track your journey with SheOwnsIt — every step forward counts.</p>
      </header>

      {/* Profile + progress bar */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        borderRadius: '20px', padding: '28px 32px', marginBottom: '28px',
        color: 'white', display: 'flex', alignItems: 'center', gap: '28px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: '28px',
        }}>
          👩
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '4px' }}>{data.client.name}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '14px' }}>{data.client.email}</div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: 'white', borderRadius: '100px',
              transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '6px', opacity: 0.85 }}>
            {completedCount} of {totalCount} milestones completed · {pct}%
          </div>
        </div>
        {data.client.job_status && (
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: '12px',
            padding: '10px 18px', fontSize: '0.85rem', fontWeight: 600,
            textTransform: 'capitalize',
          }}>
            {data.client.job_status.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '28px' }}>

        {/* Milestones */}
        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '1rem', borderBottom: 'none' }}>Your Journey</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {MILESTONES.map((m, i) => {
              const done = data.milestones[m.key as keyof Milestone];
              return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0',
                  borderBottom: i < MILESTONES.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: done ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9',
                    color: done ? 'white' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: done ? '#0f172a' : '#94a3b8' }}>{m.label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{m.desc}</div>
                  </div>
                  {done && <CheckCircle size={16} color="#10b981" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', borderBottom: 'none' }}>Style Profile</h2>
            {[
              { label: 'Body Shape',    value: data.client.body_shape },
              { label: 'Colour Season', value: data.client.color_season },
              { label: 'Size',          value: data.client.size },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #f1f5f9',
              }}>
                <span style={{ fontSize: '0.88rem', color: '#64748b' }}>{row.label}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: row.value ? '#0f172a' : '#cbd5e1' }}>
                  {row.value || 'Not set'}
                </span>
              </div>
            ))}
            <div style={{ marginTop: '14px', fontSize: '0.82rem', color: '#94a3b8' }}>
              Complete your style profile via <strong>AI Styling</strong> to get personalised recommendations.
            </div>
          </div>

          {/* AI Styling results */}
          {data.client.styling_analysed_at && (
            <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: '1rem', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={18} color="#7c3aed" /> AI Styling Results
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
                Analysed {new Date(data.client.styling_analysed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {data.client.style_notes && (
                <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 12px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                  {data.client.style_notes}
                </p>
              )}
              {data.client.occasion_tip && (
                <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6, margin: '0 0 12px', padding: '12px', background: '#fefce8', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  {data.client.occasion_tip}
                </p>
              )}
              {data.client.color_recommendations.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {data.client.color_recommendations.map(c => (
                    <span key={c} style={{ padding: '4px 10px', borderRadius: '20px', background: '#ede9fe', color: '#5b21b6', fontSize: '0.78rem', fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <MiniStat label="Total Sessions" value={data.appointments.length} color="#4f46e5" />
            <MiniStat label="Completed" value={past.filter(a => a.status === 'completed').length} color="#10b981" />
            <MiniStat label="Upcoming" value={upcoming.length} color="#f59e0b" />
            <MiniStat label="Journey %" value={`${pct}%`} color="#7c3aed" />
          </div>
        </div>
      </div>

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: '1rem', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#4f46e5" /> Upcoming Sessions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.map(a => <AppointmentCard key={a.appt_id} appt={a} />)}
          </div>
        </div>
      )}

      {/* Past appointments */}
      {past.length > 0 && (
        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: '1rem', borderBottom: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#10b981" /> Past Sessions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {past.map(a => <AppointmentCard key={a.appt_id} appt={a} />)}
          </div>
        </div>
      )}

      {data.appointments.length === 0 && (
        <div style={{
          background: 'white', borderRadius: '18px', padding: '48px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center',
        }}>
          <Calendar size={48} color="#e0e7ff" style={{ marginBottom: '16px' }} />
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#374151', marginBottom: '8px' }}>No sessions yet</div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Head to <strong>Book Session</strong> to schedule your first appointment.</div>
        </div>
      )}

    </div>
  );
};

const AppointmentCard = ({ appt }: { appt: Appointment }) => {
  const status = STATUS_COLOURS[appt.status] || { bg: '#f1f5f9', color: '#64748b', label: appt.status };
  const date = new Date(appt.schedule_time);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '14px 18px', borderRadius: '12px', background: '#f8fafc',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
        background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{date.getDate()}</div>
        <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase' }}>
          {date.toLocaleString('default', { month: 'short' })}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
          {SERVICE_LABELS[appt.service_type] || appt.service_type}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {appt.volunteer_name ? ` · with ${appt.volunteer_name}` : ''}
        </div>
        {appt.outcome_notes && (
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
            "{appt.outcome_notes}"
          </div>
        )}
      </div>
      <span style={{
        padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem',
        fontWeight: 700, background: status.bg, color: status.color, flexShrink: 0,
      }}>
        {status.label}
      </span>
      <ChevronRight size={16} color="#cbd5e1" />
    </div>
  );
};

const MiniStat = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{
    background: 'white', borderRadius: '14px', padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center',
  }}>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{label}</div>
  </div>
);

export default Dashboard;
