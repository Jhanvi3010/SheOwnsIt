import { useEffect, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import {
  UserCheck, Plus, X, Clock, ChevronRight,
  Briefcase, AlertCircle, CheckCircle2, RefreshCcw, Users, CalendarDays,
} from 'lucide-react';
import {
  createVolunteer, getPendingAppointments, getVolunteerTasks,
  getVolunteers, assignAppointment,
} from '../api';
import CreatableSelect from 'react-select/creatable';
import CreatableDropdown from '../components/CreatableDropdown';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// ── Shared select styles ───────────────────────────────────────────────────
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '44px',
    borderRadius: '10px',
    border: state.isFocused ? '2px solid #7c3aed' : '2px solid #e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
    background: '#fafafa',
    transition: 'all 0.2s',
    '&:hover': { borderColor: '#7c3aed' },
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#7c3aed' : state.isFocused ? '#f5f3ff' : 'transparent',
    color: state.isSelected ? '#fff' : '#0f172a',
    cursor: 'pointer',
    padding: '10px 14px',
    fontSize: '0.88rem',
  }),
  placeholder: (base: any) => ({ ...base, color: '#94a3b8', fontSize: '0.88rem' }),
  singleValue: (base: any) => ({ ...base, fontSize: '0.88rem', fontWeight: 600 }),
  menu: (base: any) => ({ ...base, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }),
};

// ── Time options (06:00 – 21:30 every 30 min) ─────────────────────────────
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) continue;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
})();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fmtService = (s: string) =>
  s === 'career_training' ? 'Career Training' : s === 'mock_interview' ? 'Mock Interview' : s === 'styling' ? 'Styling' : s.replace(/_/g, ' ');

interface AvailabilitySlot {
  day: string;       // derived from picked date, e.g. "Wednesday"
  date: Date;        // the specific date the user picked
  start: string;
  end: string;
}

const volunteerSchema = Yup.object({
  full_name: Yup.string().required('Volunteer name is required'),
  specialty: Yup.string().required('Primary domain/specialty required'),
  availabilitySlots: Yup.array().min(1, 'At least one availability slot is required'),
});

const VolunteerDashboard = () => {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<number | null>(null);
  const [volunteerTasks, setVolunteerTasks] = useState<any[]>([]);
  const [creatingVol, setCreatingVol] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = () => { loadVolunteers(); loadPending(); };

  const loadVolunteers = async () => {
    try { const res = await getVolunteers(); setVolunteers(res.data); }
    catch (e) { console.error(e); }
  };

  const loadPending = async () => {
    try { const res = await getPendingAppointments(); setPending(res.data); }
    catch (e) { console.error(e); }
  };

  const loadVolunteerTasks = async (volunteerId: number) => {
    if (!volunteerId) { setVolunteerTasks([]); return; }
    try { const res = await getVolunteerTasks(volunteerId); setVolunteerTasks(res.data); }
    catch (e) { console.error(e); }
  };

  const handleAssign = async (apptId: number, volunteerId: number) => {
    try {
      await assignAppointment(apptId, volunteerId);
      toast.success('Volunteer assigned successfully!');
      loadPending();
      if (selectedVolunteerId === volunteerId) loadVolunteerTasks(volunteerId);
    } catch { toast.error('Failed to assign.'); }
  };

  // Creates a quick volunteer record when typing a new name in the context dropdown
  const handleCreateVolunteer = async (inputValue: string) => {
    setCreatingVol(true);
    try {
      const res = await createVolunteer({ full_name: inputValue, specialty: 'general', availability_pattern: [] });
      await loadVolunteers();
      const newId = res.data.volunteer_id;
      setSelectedVolunteerId(newId);
      loadVolunteerTasks(newId);
      toast.success(`"${inputValue}" added as volunteer!`);
      return { value: newId, label: inputValue };
    } catch {
      toast.error('Could not create volunteer.');
      return null;
    } finally { setCreatingVol(false); }
  };

  const contextOptions = volunteers.map(v => ({
    value: v.volunteer_id,
    label: `${v.full_name}`,
    sub: fmtService(v.specialty),
  }));

  const selectedContextOption = contextOptions.find(o => o.value === selectedVolunteerId) || null;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%)',
        borderRadius: '20px', padding: '28px 36px', marginBottom: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        position: 'relative', overflow: 'hidden',
      }}>
        {[140, 220].map((s, i) => (
          <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', width: s, height: s, right: i * 90 - 30, top: -s / 3 }} />
        ))}
        <div style={{ position: 'relative' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Volunteer Management</div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Onboard & Assign</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: '6px 0 0', fontSize: '0.88rem' }}>
            Manage volunteer schedules and match them to pending sessions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
          {[
            { n: volunteers.length, l: 'Volunteers' },
            { n: pending.length, l: 'Pending' },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '12px 20px', backdropFilter: 'blur(8px)' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem', lineHeight: 1 }}>{n}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>

        {/* ── Onboard Volunteer ── */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Onboard Volunteer</h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Register a new volunteer with their weekly schedule</div>
            </div>
          </div>

          <Formik
            initialValues={{
              full_name: '',
              specialty: 'styling',
              availabilitySlots: [] as AvailabilitySlot[],
              newSlotDate: null as Date | null,
              newSlotStart: '09:00',
              newSlotEnd: '17:00',
            }}
            validationSchema={volunteerSchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                const availability_pattern = values.availabilitySlots.map(slot => ({
                  day: slot.day,
                  start: slot.start,
                  end: slot.end,
                }));
                await createVolunteer({ full_name: values.full_name, specialty: values.specialty, availability_pattern });
                toast.success('Volunteer onboarded!');
                resetForm();
                loadVolunteers();
              } catch { toast.error('Registration error.'); }
            }}
          >
            {({ values, setFieldValue }) => (
              <Form style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Name + Specialty */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={lbl}>Display Name *</label>
                    <Field name="full_name" placeholder="e.g. Jane Smith" style={inp} />
                    <ErrorMessage name="full_name" component="div" style={errStyle} />
                  </div>
                  <div>
                    <label style={lbl}>Specialty / Domain *</label>
                    <Field name="specialty">
                      {({ field, form }: any) => (
                        <CreatableDropdown
                          field="specialty"
                          value={field.value}
                          onChange={(val) => form.setFieldValue(field.name, val)}
                          placeholder="Select or add…"
                        />
                      )}
                    </Field>
                    <ErrorMessage name="specialty" component="div" style={errStyle} />
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Clock size={14} color="#7c3aed" /> Weekly Availability Schedule
                  </label>

                  {/* Added slots */}
                  {values.availabilitySlots.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {values.availabilitySlots.map((slot, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
                          border: '1px solid #c4b5fd', borderRadius: '10px', padding: '6px 12px',
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6' }}>
                            {slot.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} ({slot.day.slice(0,3)}) · {slot.start}–{slot.end}
                          </span>
                          <button type="button" onClick={() => {
                            const updated = [...values.availabilitySlots];
                            updated.splice(idx, 1);
                            setFieldValue('availabilitySlots', updated);
                          }} style={{ background: '#a78bfa', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <X size={10} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1.5px dashed #e2e8f0', marginBottom: '12px' }}>
                      No slots added yet — add the volunteer's recurring weekly availability below.
                    </div>
                  )}
                  <ErrorMessage name="availabilitySlots" component="div" style={errStyle} />

                  {/* Slot picker */}
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e0e7ff', borderRadius: '14px', padding: '16px', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div>
                      <label style={{ ...lbl, fontSize: '0.76rem' }}>Date</label>
                      <DatePicker
                        selected={values.newSlotDate}
                        onChange={(date: Date | null) => setFieldValue('newSlotDate', date)}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Pick a date"
                        minDate={new Date()}
                        className="vol-date-picker"
                      />
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: '0.76rem' }}>Start</label>
                      <select value={values.newSlotStart} onChange={e => setFieldValue('newSlotStart', e.target.value)} style={selStyle}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...lbl, fontSize: '0.76rem' }}>End</label>
                      <select value={values.newSlotEnd} onChange={e => setFieldValue('newSlotEnd', e.target.value)} style={selStyle}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!values.newSlotDate) { toast.error('Please pick a date.'); return; }
                        if (values.newSlotStart >= values.newSlotEnd) { toast.error('End time must be after start time.'); return; }
                        const day = DAYS[values.newSlotDate.getDay() === 0 ? 6 : values.newSlotDate.getDay() - 1];
                        setFieldValue('availabilitySlots', [
                          ...values.availabilitySlots,
                          { day, date: values.newSlotDate, start: values.newSlotStart, end: values.newSlotEnd },
                        ]);
                        setFieldValue('newSlotDate', null);
                      }}
                      style={{
                        height: '44px', border: '1.5px dashed #c4b5fd', borderRadius: '10px',
                        background: 'transparent', color: '#7c3aed',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, padding: '0 10px', gap: '2px',
                      }}
                    >
                      <Plus size={15} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.03em' }}>Add Slot</span>
                    </button>
                  </div>
                  <style>{`
                    .vol-date-picker {
                      width: 100%; padding: 10px 12px; border: 2px solid #e2e8f0;
                      border-radius: 10px; font-size: 0.85rem; color: #0f172a;
                      background: white; outline: none; cursor: pointer; box-sizing: border-box;
                    }
                    .vol-date-picker:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
                    .react-datepicker-wrapper { width: 100%; }
                  `}</style>
                </div>

                <button type="submit" style={{
                  padding: '13px', border: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                }}>
                  Complete Registration
                </button>
              </Form>
            )}
          </Formik>
        </div>

        {/* ── Match & Assign ── */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={18} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Match & Assign</h2>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Select a volunteer then claim pending sessions</div>
              </div>
            </div>
            <button onClick={loadInitialData} style={{
              padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
              background: 'white', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
            }}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>

          {/* Operating Context */}
          <div>
            <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} color="#7c3aed" /> Acting Volunteer
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginLeft: '4px' }}>
                (type to search or add new)
              </span>
            </label>
            <CreatableSelect
              options={contextOptions}
              value={selectedContextOption}
              isLoading={creatingVol}
              placeholder="Search or create a volunteer…"
              formatOptionLabel={(opt: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                    {opt.label?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{opt.label}</div>
                    {opt.sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.sub}</div>}
                  </div>
                </div>
              )}
              onChange={(option: any) => {
                if (!option) { setSelectedVolunteerId(null); setVolunteerTasks([]); return; }
                const id = Number(option.value);
                setSelectedVolunteerId(id);
                loadVolunteerTasks(id);
              }}
              onCreateOption={async (inputValue) => {
                const result = await handleCreateVolunteer(inputValue);
                if (result) {
                  setSelectedVolunteerId(result.value);
                  loadVolunteerTasks(result.value);
                }
              }}
              formatCreateLabel={(input) => `Add "${input}" as new volunteer`}
              styles={selectStyles}
              isClearable
            />
          </div>

          {/* Pending queue */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={15} color="#f59e0b" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Assignment Queue
              </span>
              {pending.length > 0 && (
                <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '20px', padding: '2px 9px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1.5px dashed #e2e8f0', borderRadius: '14px', color: '#94a3b8' }}>
                <CheckCircle2 size={32} color="#bbf7d0" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>All caught up!</div>
                <div style={{ fontSize: '0.82rem' }}>No pending sessions.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {pending.map((appt) => (
                  <div key={appt.appt_id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', borderRadius: '12px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                        {fmtService(appt.service_type)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{appt.first_name} {appt.last_name}</span>
                        <span style={{ color: '#cbd5e1' }}>·</span>
                        <Clock size={11} />
                        <span>{appt.schedule_time ? new Date(appt.schedule_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'TBD'}</span>
                      </div>
                    </div>
                    <button
                      disabled={!selectedVolunteerId}
                      onClick={() => selectedVolunteerId && handleAssign(appt.appt_id, selectedVolunteerId)}
                      style={{
                        padding: '8px 14px', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                        background: selectedVolunteerId ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#f1f5f9',
                        color: selectedVolunteerId ? 'white' : '#94a3b8',
                        cursor: selectedVolunteerId ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                        boxShadow: selectedVolunteerId ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                      }}
                      title={!selectedVolunteerId ? 'Select a volunteer first' : 'Assign to this volunteer'}
                    >
                      Assign <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volunteer's claimed sessions */}
          {selectedVolunteerId && (
            <div style={{ paddingTop: '16px', borderTop: '1.5px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CheckCircle2 size={15} color="#4f46e5" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned to This Volunteer
                </span>
              </div>

              {volunteerTasks.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No sessions assigned yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {volunteerTasks.map((task) => (
                    <div key={task.appt_id} style={{
                      padding: '12px 16px', borderRadius: '12px',
                      background: '#f8fafc', borderLeft: '4px solid #4f46e5',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{fmtService(task.service_type)}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>With {task.first_name} {task.last_name}</div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                        background: task.status === 'completed' ? '#dcfce7' : task.status === 'matched' ? '#e0e7ff' : '#fef3c7',
                        color: task.status === 'completed' ? '#166534' : task.status === 'matched' ? '#4338ca' : '#92400e',
                      }}>
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Style helpers ──────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.82rem', color: '#374151',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px',
  fontSize: '0.88rem', color: '#0f172a', outline: 'none', background: '#fafafa',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const selStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '10px',
  fontSize: '0.85rem', color: '#0f172a', background: '#fafafa', outline: 'none',
  cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
};
const errStyle: React.CSSProperties = {
  color: '#ef4444', fontSize: '0.78rem', marginTop: '4px',
};

export default VolunteerDashboard;
