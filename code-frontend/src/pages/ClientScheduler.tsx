import { useEffect, useState } from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  CalendarDays, User, Search, Trash2, Loader2, Check,
  CalendarClock, MapPin, Clock, Camera, XCircle, UserCheck, ChevronRight
} from 'lucide-react';
import {
  createAppointment, getAvailableSlots, getClients,
  deleteClient, type ClientSummary
} from '../api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PhotoAnalysis from '../components/PhotoAnalysis';
import CreatableDropdown from '../components/CreatableDropdown';

type MyAppointment = {
  appt_id: number;
  service_type: string;
  schedule_time: string | null;
  interview_time: string | null;
  status: string;
  volunteer_name: string | null;
};

const SERVICE_LABELS: Record<string, string> = {
  styling: 'Styling Session',
  career_training: 'Career Training',
  mock_interview: 'Mock Interview',
  general: 'General Session',
};

const STATUS_COLOURS: Record<string, { bg: string; color: string; label: string }> = {
  pending_assignment:   { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  pending_confirmation: { bg: '#ffe4e6', color: '#9f1239', label: 'Unconfirmed' },
  matched:              { bg: '#dbeafe', color: '#1e40af', label: 'Confirmed' },
  completed:            { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  cancelled:            { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
};

const appointmentSchema = Yup.object({
  client_id: Yup.number().positive('Please select a client to proceed').required('Selection required'),
  service_type: Yup.string().required('Service type required'),
  interview_time: Yup.string().required('Target interval needed'),
  schedule_time: Yup.string(),
});

const ClientScheduler = () => {
  const [slots, setSlots] = useState<Array<{ schedule_time: string }>>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [showPhotoAnalysis, setShowPhotoAnalysis] = useState(false);
  const [myAppointments, setMyAppointments] = useState<MyAppointment[]>([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; subText?: string; danger?: boolean; onConfirm: () => void } | null>(null);

  // Detect logged-in user role
  const storedUser = JSON.parse(localStorage.getItem('dfs_user') || '{}');
  const isClient = storedUser?.role === 'client';
  const loggedClientId: number = storedUser?.client_id || 0;

  const normalizeText = (value: unknown) => String(value ?? '').toLowerCase();

  const loadClients = async () => {
    try {
      const res = await getClients();
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contact roster.');
    }
  };

  const loadMyAppointments = async () => {
    if (!loggedClientId) return;
    try {
      const res = await axios.get(`/api/clients/${loggedClientId}/progress`);
      setMyAppointments(res.data.appointments || []);
    } catch { /* silent */ }
  };

  const handleCancel = (apptId: number) => {
    setConfirmModal({
      message: 'Cancel this session booking?',
      subText: 'This will notify the team and the slot will be freed up.',
      danger: true,
      onConfirm: async () => {
        setCancellingId(apptId);
        try {
          await axios.post(`/api/appointments/${apptId}/cancel-by-client`);
          toast.success('Session cancelled.');
          loadMyAppointments();
        } catch {
          toast.error('Could not cancel. Please try again.');
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  useEffect(() => {
    if (!isClient) loadClients();
    if (isClient) loadMyAppointments();
  }, []);

  const filteredClients = clients.filter((client) => {
    const keyword = normalizeText(clientSearch.trim());
    if (!keyword) return true;
    const fullName = normalizeText(`${client.first_name} ${client.last_name}`);
    return (
      fullName.includes(keyword)
      || normalizeText(client.phone_number).includes(keyword)
      || normalizeText(client.email).includes(keyword)
      || normalizeText(client.agency_name).includes(keyword)
    );
  });

  const handleFetchSlots = async (values: { service_type: string; interview_time: string }) => {
    if (!values.service_type || !values.interview_time) {
      toast.error('Target service & date required to fetch availability');
      return;
    }
    setIsSlotsLoading(true);
    try {
      const res = await getAvailableSlots(values.service_type, values.interview_time);
      setSlots(res.data);
      if (res.data.length > 0) {
        toast.success(`${res.data.length} timeslots synchronized!`);
      } else {
        toast.error('No free slots found for specified parameters.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network issue retrieving slots.');
    } finally {
      setIsSlotsLoading(false);
    }
  };

  const handleDeleteClient = (clientId: number, clientName: string) => {
    setConfirmModal({
      message: `Remove "${clientName}"?`,
      subText: 'Their profile and all associated session records will be permanently deleted. This cannot be undone.',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteClient(clientId);
          toast.success('Deleted successfully');
          loadClients();
        } catch (error) {
          console.error(error);
          toast.error('Critical fault deleting records.');
        }
      },
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {showPhotoAnalysis && <PhotoAnalysis onClose={() => setShowPhotoAnalysis(false)} />}

      {/* ── Custom confirm modal ──────────────────────────────────────────── */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '32px 28px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.2s ease-out',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: confirmModal.danger ? '#fee2e2' : '#e0e7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', marginBottom: '18px',
            }}>
              {confirmModal.danger ? '🗑️' : '❓'}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
              {confirmModal.message}
            </h3>
            {confirmModal.subText && (
              <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
                {confirmModal.subText}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1.5px solid #e2e8f0', background: 'white',
                  color: '#374151', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.92rem', transition: 'all 0.15s',
                }}
              >
                Keep it
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: 'none',
                  background: confirmModal.danger
                    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                    : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: 'white', fontWeight: 700, cursor: 'pointer',
                  fontSize: '0.92rem', boxShadow: confirmModal.danger
                    ? '0 4px 12px rgba(239,68,68,0.35)'
                    : '0 4px 12px rgba(79,70,229,0.35)',
                }}
              >
                {confirmModal.subText?.includes('slot') ? 'Yes, cancel booking' : confirmModal.danger ? 'Yes, delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Session Scheduler</h1>
          <p style={{ margin: 0 }}>Coordinate client support trajectories with matching service capacities.</p>
        </div>
        <button onClick={() => setShowPhotoAnalysis(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 20px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(79,70,229,0.3)', whiteSpace: 'nowrap',
        }}>
          <Camera size={16} /> AI Styling Guide
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '32px', alignItems: 'start' }}>
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <CalendarDays size={24} color="var(--primary)" />
            <h2 style={{ marginBottom: 0, borderBottom: 'none' }}>Book New Session</h2>
          </div>

          <Formik
            initialValues={{ client_id: isClient ? loggedClientId : 0, service_type: 'career_training', interview_time: '', schedule_time: '' }}
            validationSchema={appointmentSchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                const payload = {
                  client_id: values.client_id,
                  service_type: values.service_type,
                  interview_time: values.interview_time,
                  schedule_time: values.schedule_time || undefined,
                };
                await createAppointment(payload);
                toast.success('Session booked successfully!');
                resetForm({ values: { client_id: isClient ? loggedClientId : 0, service_type: 'career_training', interview_time: '', schedule_time: '' } });
                setClientSearch('');
                setSlots([]);
                if (isClient) loadMyAppointments();
              } catch (error) {
                console.error(error);
                toast.error('Could not book session. Please try again.');
              }
            }}
          >
            {({ values, setFieldValue }) => (
              <>
                <Form className="form-grid" style={{ gridTemplateColumns: '1fr' }}>

                  {/* Owner only: search & select any client */}
                  {!isClient && (
                    <>
                      <label>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Search size={14} /> Lookup & Select Candidate
                        </span>
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          placeholder="Search name, email, or origin..."
                          style={{ background: '#f8fafc' }}
                        />
                      </label>
                      <div style={{ marginTop: '-8px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', background: '#f1f5f9', borderRadius: 'var(--radius-md)', minHeight: filteredClients.slice(0, 6).length ? 'auto' : '45px' }}>
                          {filteredClients.length === 0 && (
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px' }}>
                              {clientSearch ? 'No matches...' : 'Loading roster...'}
                            </span>
                          )}
                          {filteredClients.slice(0, 8).map((client) => {
                            const isSelected = values.client_id === client.client_id;
                            return (
                              <button
                                key={client.client_id}
                                type="button"
                                onClick={() => {
                                  setFieldValue('client_id', client.client_id);
                                  setClientSearch(`${client.first_name} ${client.last_name}`);
                                }}
                                style={{
                                  background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                                  color: isSelected ? '#fff' : 'var(--text-main)',
                                  border: `1.5px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                                  borderRadius: '99px',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  boxShadow: isSelected ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'none',
                                  gap: '6px',
                                }}
                              >
                                {isSelected ? <Check size={12} /> : <User size={12} color="#94a3b8" />}
                                {client.first_name} {client.last_name}
                              </button>
                            );
                          })}
                        </div>
                        <ErrorMessage name="client_id" component="div" className="field-error" />
                      </div>
                    </>
                  )}

                  {/* Client view: show their own name, no search */}
                  {isClient && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 18px', background: '#f0fdf4',
                      borderRadius: '12px', border: '1px solid #bbf7d0',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                      }}>
                        {storedUser.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#166534' }}>{storedUser.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>Booking for yourself</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '8px', alignItems: 'end' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Service Type</span>
                      <CreatableDropdown
                        field="service_type"
                        value={values.service_type}
                        onChange={(val) => setFieldValue('service_type', val)}
                        placeholder="Select or add a service…"
                      />
                      <ErrorMessage name="service_type" component="div" className="field-error" />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>Session Date & Time</span>
                      <div className="custom-datepicker-wrapper">
                        <DatePicker
                          selected={values.interview_time ? new Date(values.interview_time) : null}
                          onChange={(date: Date | null) => {
                            if (date) {
                              const tzOffset = date.getTimezoneOffset() * 60000;
                              const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                              setFieldValue('interview_time', localISOTime);
                            } else {
                              setFieldValue('interview_time', '');
                            }
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="dd/MM/yyyy h:mm aa"
                          placeholderText="Click to pick date & time"
                          minDate={new Date()}
                          placeholderText="Select date & time"
                          className="modern-date-picker"
                          calendarClassName="modern-calendar"
                        />
                      </div>
                      <ErrorMessage name="interview_time" component="div" className="field-error" />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      className="secondary" 
                      style={{ flex: 1 }} 
                      onClick={() => handleFetchSlots(values)}
                      disabled={isSlotsLoading}
                    >
                      {isSlotsLoading ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}
                      {isClient ? 'Check Available Times' : 'Find Available Slots'}
                    </button>
                    <button type="submit" style={{ flex: 1.5 }} disabled={!values.client_id}>
                      {isClient ? 'Book Session' : 'Book & Assign'}
                    </button>
                  </div>

                  {slots.length > 0 && (
                    <div style={{ marginTop: '20px', border: '1.5px solid var(--primary-light)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'var(--bg-page)' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} /> Available Volunteer Slots
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {slots.map((slot) => {
                          const slotFormatted = new Date(slot.schedule_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                          const isSelectedSlot = values.schedule_time === slot.schedule_time;
                          return (
                            <div 
                              key={slot.schedule_time} 
                              onClick={() => setFieldValue('schedule_time', slot.schedule_time)}
                              style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '12px', borderRadius: '8px', border: `1px solid ${isSelectedSlot ? 'var(--primary)' : '#f1f5f9'}`, 
                                cursor: 'pointer', background: isSelectedSlot ? 'var(--primary-light)' : '#fff', transition: 'var(--transition)'
                              }}
                            >
                              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isSelectedSlot ? 'var(--primary)' : 'var(--text-main)' }}>{slotFormatted}</span>
                              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSelectedSlot ? 'var(--primary)' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isSelectedSlot && <div style={{ width: 10, height: 10, background: 'var(--primary)', borderRadius: '50%' }} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Form>
              </>
            )}
          </Formik>
        </section>

        {/* Client: My Sessions panel */}
        {isClient && (
          <section className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Clock size={24} color="var(--primary)" />
              <h2 style={{ marginBottom: 0, borderBottom: 'none' }}>My Sessions</h2>
            </div>
            {myAppointments.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: '12px' }}>
                <CalendarDays size={36} color="#e0e7ff" style={{ marginBottom: '12px' }} />
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>No sessions yet</div>
                <div style={{ fontSize: '0.85rem' }}>Book your first session using the form.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {myAppointments.map(a => {
                  const s = STATUS_COLOURS[a.status] || { bg: '#f1f5f9', color: '#64748b', label: a.status };
                  const rawTime = a.schedule_time || a.interview_time;
                  const date = rawTime ? new Date(rawTime) : null;
                  const canCancel = a.status !== 'completed' && a.status !== 'cancelled';
                  return (
                    <div key={a.appt_id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px', borderRadius: '12px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                    }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {date ? (
                          <>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{date.getDate()}</div>
                            <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>
                              {date.toLocaleString('default', { month: 'short' })}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 700, textAlign: 'center' }}>TBD</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {SERVICE_LABELS[a.service_type] || a.service_type}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          {date
                            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Awaiting time confirmation'}
                          {a.volunteer_name && (
                            <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <UserCheck size={11} /> {a.volunteer_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, flexShrink: 0 }}>
                        {s.label}
                      </span>
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(a.appt_id)}
                          disabled={cancellingId === a.appt_id}
                          title="Cancel session"
                          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#ef4444', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        >
                          {cancellingId === a.appt_id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!isClient && <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <User size={24} color="var(--primary)" />
            <h2 style={{ marginBottom: 0, borderBottom: 'none' }}>Participant Directory</h2>
          </div>
          {clients.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: 'var(--radius-md)' }}>
              No registered profiles found. Use Partner module to onboard.
            </div>
          ) : (
            <div className="list-group" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '6px' }}>
              {clients.map((client) => (
                <div key={client.client_id} className="list-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{client.first_name} {client.last_name}</div>
                      {client.agency_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <MapPin size={10} /> {client.agency_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="danger" 
                    style={{ padding: '8px', borderRadius: '8px', height: '36px', width: '36px' }}
                    onClick={() => handleDeleteClient(client.client_id, `${client.first_name} ${client.last_name}`)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        
        .custom-datepicker-wrapper {
          width: 100%;
        }
        
        .custom-datepicker-wrapper .react-datepicker-wrapper {
          width: 100%;
        }
        
        .modern-date-picker {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 0 14px;
          font-family: inherit;
          font-size: 1rem;
          color: var(--text-main);
          background-color: #fff;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        
        .modern-date-picker:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }
        
        .modern-calendar {
          font-family: inherit;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        
        .modern-calendar .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 0 8px;
        }
        
        .modern-calendar .react-datepicker__current-month,
        .modern-calendar .react-datepicker-time__header,
        .modern-calendar .react-datepicker-year-header {
          color: var(--text-main);
          font-weight: 600;
        }
        
        .modern-calendar .react-datepicker__day--selected,
        .modern-calendar .react-datepicker__day--keyboard-selected,
        .modern-calendar .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
          background-color: var(--primary);
        }
        
        .modern-calendar .react-datepicker__day:hover,
        .modern-calendar .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
          background-color: var(--primary-light);
          color: var(--primary-dark);
        }
      `}</style>
    </div>
  );
};

export default ClientScheduler;
