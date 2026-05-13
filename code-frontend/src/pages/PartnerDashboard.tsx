import { useEffect, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { Building, UserPlus, Trash2, RefreshCw, ClipboardList, Send, Activity, Pencil, X, Check, Mail, User } from 'lucide-react';
import { createAgency, createClient, getAgencyProgress, getAgencies, deleteAgency, updateAgency } from '../api';
import Select from 'react-select';
import CreatableDropdown from '../components/CreatableDropdown';

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '46px',
    borderRadius: '12px',
    border: state.isFocused ? '1px solid var(--primary)' : '1px solid #e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 3px var(--primary-light)' : 'none',
    transition: 'all 0.2s',
    '&:hover': { border: state.isFocused ? '1px solid var(--primary)' : '1px solid #cbd5e1' }
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? 'var(--primary-light)' : 'transparent',
    color: state.isSelected ? '#fff' : 'var(--text-main)',
    cursor: 'pointer',
    padding: '10px 14px'
  })
};

const agencySchema = Yup.object({
  agency_name: Yup.string().required('Agency name is required'),
  category: Yup.string().required('Category is required'),
  main_contact_name: Yup.string().required('Contact person is required'),
  contact_email: Yup.string().email('Enter a valid email').required('Contact email is required'),
});

const clientSchema = Yup.object({
  referral_agency_id: Yup.number().moreThan(0, 'Select an agency').required('Agency is required'),
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  phone_number: Yup.string(),
  email: Yup.string().email('Enter a valid email'),
  job_status: Yup.string().required('Job status is required'),
});

const PartnerDashboard = () => {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [agencyProgress, setAgencyProgress] = useState<any[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ agency_name: '', category: '', main_contact_name: '', contact_email: '' });

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const res = await getAgencies();
      setAgencies(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAgencyProgress = async (agencyId: number) => {
    if (!agencyId) {
      setAgencyProgress([]);
      return;
    }
    setLoadingProgress(true);
    try {
      const res = await getAgencyProgress(agencyId);
      setAgencyProgress(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load agency progress data');
    } finally {
      setLoadingProgress(false);
    }
  };

  const startEdit = (agency: any) => {
    setEditingId(agency.agency_id);
    setEditValues({
      agency_name: agency.agency_name,
      category: agency.category,
      main_contact_name: agency.main_contact_name || '',
      contact_email: agency.contact_email || '',
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (agencyId: number) => {
    try {
      await updateAgency(agencyId, editValues);
      toast.success('Agency updated successfully');
      setEditingId(null);
      loadAgencies();
    } catch {
      toast.error('Failed to update agency');
    }
  };

  const handleDeleteAgency = async (agencyId: number, agencyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${agencyName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteAgency(agencyId);
      toast.success('Agency deleted successfully');
      loadAgencies();
      if (selectedAgencyId === agencyId) {
        setSelectedAgencyId(0);
        setAgencyProgress([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete agency');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1>Partner Portal</h1>
        <p>Onboard specialized organizations and streamline referral pipelines.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Building size={24} color="var(--primary)" />
            <h2 style={{ marginBottom: 0, borderBottom: 'none' }}>Register Agency</h2>
          </div>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Add new community outreach partners to the ecosystem.</p>
          
          <Formik
            initialValues={{ agency_name: '', category: 'employment_center', main_contact_name: '', contact_email: '' }}
            validationSchema={agencySchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                const res = await createAgency(values);
                toast.success(res.data.message || 'Agency registered successfully!');
                resetForm();
                loadAgencies();
              } catch (error) {
                toast.error('Failed to register agency.');
              }
            }}
          >
            <Form className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                Agency Name
                <Field name="agency_name" placeholder="e.g. Goodwill Support Services" />
                <ErrorMessage name="agency_name" component="div" className="field-error" />
              </label>
              <label>
                Category
                <Field name="category">
                  {({ field, form }: any) => (
                    <CreatableDropdown
                      field="category"
                      value={field.value}
                      onChange={(val) => form.setFieldValue(field.name, val)}
                      placeholder="Select or add a category…"
                    />
                  )}
                </Field>
                <ErrorMessage name="category" component="div" className="field-error" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  Primary Contact
                  <Field name="main_contact_name" placeholder="Full Name" />
                  <ErrorMessage name="main_contact_name" component="div" className="field-error" />
                </label>
                <label>
                  Contact Email
                  <Field type="email" name="contact_email" placeholder="email@org.com" />
                  <ErrorMessage name="contact_email" component="div" className="field-error" />
                </label>
              </div>
              <button type="submit" style={{ marginTop: '12px' }}>
                <Building size={18} /> Create Partner Account
              </button>
            </Form>
          </Formik>
        </section>

        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <UserPlus size={24} color="var(--primary)" />
            <h2 style={{ marginBottom: 0, borderBottom: 'none' }}>Refer a Client</h2>
          </div>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Submit candidates recommended for DFS programming.</p>
          
          <Formik
            initialValues={{ referral_agency_id: 0, first_name: '', last_name: '', phone_number: '', email: '', job_status: 'unemployed' }}
            validationSchema={clientSchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                const res = await createClient(values);
                toast.success(res.data.message || 'Client referred successfully!');
                resetForm();
              } catch (error) {
                toast.error('Failed to refer client.');
              }
            }}
          >
            <Form className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                Affiliated Agency
                <Field name="referral_agency_id">
                  {({ field, form }: any) => {
                    const options = [
                      { value: 0, label: 'Select which agency referred them...' },
                      ...agencies.map(agency => ({ value: agency.agency_id, label: agency.agency_name }))
                    ];
                    return (
                      <Select
                        options={options}
                        value={options.find(o => o.value === field.value) || null}
                        onChange={(option: any) => form.setFieldValue(field.name, option?.value)}
                        styles={selectStyles}
                      />
                    );
                  }}
                </Field>
                <ErrorMessage name="referral_agency_id" component="div" className="field-error" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  First Name
                  <Field name="first_name" />
                  <ErrorMessage name="first_name" component="div" className="field-error" />
                </label>
                <label>
                  Last Name
                  <Field name="last_name" />
                  <ErrorMessage name="last_name" component="div" className="field-error" />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  Mobile Phone
                  <Field name="phone_number" type="tel" placeholder="(555) 000-0000" />
                </label>
                <label>
                  Email
                  <Field type="email" name="email" placeholder="client@mail.com" />
                  <ErrorMessage name="email" component="div" className="field-error" />
                </label>
              </div>
              <label>
                Current Employment Status
                <Field name="job_status">
                  {({ field, form }: any) => (
                    <CreatableDropdown
                      field="job_status"
                      value={field.value}
                      onChange={(val) => form.setFieldValue(field.name, val)}
                      placeholder="Select or add a status…"
                    />
                  )}
                </Field>
                <ErrorMessage name="job_status" component="div" className="field-error" />
              </label>
              <button type="submit" style={{ marginTop: '12px' }}>
                <Send size={18} /> Submit Referral
              </button>
            </Form>
          </Formik>
        </section>
      </div>

      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <ClipboardList size={22} color="var(--text-muted)" />
            <h3 style={{ margin: 0 }}>Active Partners List</h3>
          </div>
          {agencies.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>No registered agencies.</p>
          ) : (
            <div className="list-group">
              {agencies.map((agency) => (
                <div key={agency.agency_id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
                  {editingId === agency.agency_id ? (
                    <div style={{ padding: '14px 16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        value={editValues.agency_name}
                        onChange={e => setEditValues(v => ({ ...v, agency_name: e.target.value }))}
                        placeholder="Agency name"
                        style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '7px 10px', fontSize: '0.9rem' }}
                      />
                      <input
                        value={editValues.category}
                        onChange={e => setEditValues(v => ({ ...v, category: e.target.value }))}
                        placeholder="Category"
                        style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '7px 10px', fontSize: '0.9rem' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input
                          value={editValues.main_contact_name}
                          onChange={e => setEditValues(v => ({ ...v, main_contact_name: e.target.value }))}
                          placeholder="Contact name"
                          style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '7px 10px', fontSize: '0.9rem' }}
                        />
                        <input
                          type="email"
                          value={editValues.contact_email}
                          onChange={e => setEditValues(v => ({ ...v, contact_email: e.target.value }))}
                          placeholder="Contact email"
                          style={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '7px 10px', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={cancelEdit}>
                          <X size={14} /> Cancel
                        </button>
                        <button type="button" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => saveEdit(agency.agency_id)}>
                          <Check size={14} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{agency.agency_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.04em' }}>
                            {agency.category.replace(/_/g, ' ')}
                          </div>
                          {(agency.main_contact_name || agency.contact_email) && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {agency.main_contact_name && (
                                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <User size={11} /> {agency.main_contact_name}
                                </div>
                              )}
                              {agency.contact_email && (
                                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Mail size={11} /> {agency.contact_email}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => startEdit(agency)}
                            style={{ padding: '7px', borderRadius: '8px' }}
                            title="Edit Agency"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteAgency(agency.agency_id, agency.agency_name)}
                            style={{ padding: '7px', borderRadius: '8px' }}
                            title="Delete Agency"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={22} color="var(--text-muted)" />
              <h3 style={{ margin: 0 }}>Agency Progress Feed</h3>
            </div>
            {selectedAgencyId > 0 && (
              <button 
                className="secondary" 
                style={{ padding: '8px 12px', fontSize: '0.8rem' }} 
                onClick={() => loadAgencyProgress(selectedAgencyId)}
                disabled={loadingProgress}
              >
                <RefreshCw size={14} className={loadingProgress ? 'animate-spin' : ''} /> Refresh
              </button>
            )}
          </div>

          <label style={{ marginBottom: '20px' }}>
            View Performance Insights
            <Select
              options={[
                { value: 0, label: '— Select an agency to analyze —' },
                ...agencies.map(agency => ({ value: agency.agency_id, label: agency.agency_name }))
              ]}
              value={
                [{ value: 0, label: '— Select an agency to analyze —' }, ...agencies.map(a => ({ value: a.agency_id, label: a.agency_name }))]
                  .find(o => o.value === selectedAgencyId) || null
              }
              onChange={(option: any) => {
                const id = Number(option?.value);
                setSelectedAgencyId(id);
                loadAgencyProgress(id);
              }}
              styles={selectStyles}
            />
          </label>

          {selectedAgencyId > 0 && agencyProgress.length === 0 && !loadingProgress ? (
            <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
              No recorded client progress for this agency yet.
            </div>
          ) : null}

          {agencyProgress.length > 0 && (
            <div>
              <div style={{ background: 'var(--primary-light)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', opacity: 0.8 }}>Total Clients</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{agencyProgress.length}</div>
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', opacity: 0.8 }}>Engagements</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {agencyProgress.reduce((sum, client) => sum + (client.appointments ? client.appointments.length : 0), 0)}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Clients & Service History</h4>
              <div className="list-group">
                {agencyProgress.map((client) => (
                  <div key={client.client_id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{client.name}</strong>
                      <span className="badge neutral">{client.job_status}</span>
                    </div>
                    <div style={{ padding: '16px', background: '#fff' }}>
                      {!client.appointments || client.appointments.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sessions scheduled.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {client.appointments.map((appt: any) => (
                            <div key={appt.appt_id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(0,0,0,0.08)' }}>
                              <span>
                                <span style={{ fontWeight: 600 }}>{appt.service_type.replace('_', ' ')}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                                  {appt.schedule_time ? new Date(appt.schedule_time).toLocaleDateString() : '(Time Pending)'}
                                </span>
                              </span>
                              <span className={`badge ${appt.status === 'completed' ? 'success' : appt.status === 'pending' ? 'warning' : 'neutral'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                {appt.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PartnerDashboard;
