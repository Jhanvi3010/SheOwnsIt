import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Heart, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

type Application = {
  application_id: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
};

const VolunteerApply = ({ clientId }: { clientId?: number }) => {
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    motivation: '',
    skills: '',
    availability: '',
    has_completed_session: false,
  });

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    axios.get(`/api/volunteer-applications/client/${clientId}`)
      .then(r => {
        const apps: Application[] = r.data;
        if (apps.length > 0) setExisting(apps[apps.length - 1]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.motivation.trim()) { toast.error('Please tell us your motivation'); return; }
    setSubmitting(true);
    try {
      await axios.post('/api/volunteer-applications', { client_id: clientId, ...form });
      toast.success('Application submitted! The owner will review it shortly.');
      setExisting({ application_id: 0, status: 'pending', submitted_at: new Date().toISOString(), reviewed_at: null });
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const statusInfo = {
    pending:  { icon: <Clock size={18} color="#f59e0b" />,    bg: '#fef9c3', color: '#854d0e', text: 'Your application is under review' },
    approved: { icon: <CheckCircle size={18} color="#10b981" />, bg: '#dcfce7', color: '#166534', text: 'Approved! You are now a SheOwnsIt volunteer' },
    rejected: { icon: <XCircle size={18} color="#ef4444" />,  bg: '#fee2e2', color: '#991b1b', text: 'Application not approved this time. You may reapply.' },
  };

  return (
    <div style={{ background: 'white', borderRadius: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '20px 24px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Heart size={22} color="white" fill="rgba(255,255,255,0.4)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Become a Volunteer</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
            Give back by helping other women on their journey
          </div>
        </div>
        {open ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>

      {open && (
        <div style={{ padding: '0 24px 24px', borderTop: '1px solid #f1f5f9' }}>

          {/* Existing application status */}
          {existing && existing.status !== 'rejected' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px', borderRadius: '12px', marginTop: '16px',
              background: statusInfo[existing.status].bg,
            }}>
              {statusInfo[existing.status].icon}
              <div>
                <div style={{ fontWeight: 700, color: statusInfo[existing.status].color, fontSize: '0.9rem' }}>
                  {statusInfo[existing.status].text}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  Submitted {new Date(existing.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Why volunteer */}
              <div style={{ marginTop: '16px', padding: '14px 18px', background: 'linear-gradient(135deg, #fdf4ff, #fce7f3)', borderRadius: '12px', fontSize: '0.85rem', color: '#7c3aed', lineHeight: 1.6 }}>
                <strong>Why volunteer?</strong> You've walked this journey — now you can guide others. As a SheOwnsIt volunteer, you'll support women with styling sessions, career prep, and confidence building.
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>Why do you want to volunteer? <span style={{ color: '#ef4444' }}>*</span></span>
                  <textarea
                    value={form.motivation}
                    onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
                    placeholder="Share your story and why you'd like to give back…"
                    rows={3}
                    style={{
                      padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px',
                      fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit',
                      outline: 'none', background: '#f8fafc',
                    }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>Skills or experience</span>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. Styling, Career coaching, Emotional support…"
                    style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>Availability</span>
                  <input
                    type="text"
                    value={form.availability}
                    onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}
                    placeholder="e.g. Weekday mornings, Saturday afternoons…"
                    style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.has_completed_session}
                    onChange={e => setForm(f => ({ ...f, has_completed_session: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  <span style={{ fontSize: '0.88rem', color: '#374151' }}>
                    I have completed at least one session with SheOwnsIt
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '13px', border: 'none', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: 'white', fontWeight: 700, fontSize: '0.95rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  <Heart size={16} /> {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VolunteerApply;
