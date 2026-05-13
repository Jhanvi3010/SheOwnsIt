import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList, RadialBarChart, RadialBar,
  ComposedChart,
} from 'recharts';
import {
  Users, CheckCircle, Clock, Heart, Building2, Calendar,
  ChevronLeft, ChevronRight, Mail, TrendingUp, TrendingDown,
  BarChart2, Star, AlertTriangle, Info,
  ShieldCheck, Zap, Award, ArrowUpRight, UserPlus, XCircle,
} from 'lucide-react';
import axios from 'axios';

type OwnerDashboardProps = {
  user: { role: string; name: string; email: string };
  onLogout: () => void;
};

const PALETTE = {
  indigo:  '#4f46e5',
  violet:  '#7c3aed',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  purple:  '#a855f7',
  teal:    '#14b8a6',
};
const CHART_COLORS = Object.values(PALETTE);
const PIE_COLORS   = [PALETTE.indigo, PALETTE.emerald, PALETTE.amber];

const fmtService = (s: string) =>
  s === 'career_training' ? 'Career Training' : s === 'mock_interview' ? 'Mock Interview' : 'Styling';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', minWidth:'140px' }}>
      {label && <div style={{ fontWeight:700, marginBottom:'8px', color:'#374151', fontSize:'0.85rem' }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.83rem', marginBottom:'4px' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:p.color || p.fill }} />
          <span style={{ color:'#64748b' }}>{p.name}:</span>
          <span style={{ fontWeight:700, color:'#0f172a' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const OwnerDashboard = ({ user, onLogout }: OwnerDashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [roster, setRoster] = useState<Record<string, any[]>>({});
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'clients' | 'roster' | 'applications' | 'emails'>('overview');
  const [calMonth, setCalMonth]   = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadRoster = async (month: Date) => {
    const key = month.toISOString().slice(0, 7);
    const res = await axios.get(`/api/roster?month=${key}`);
    setRoster(res.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [fullRes, emailRes, appsRes] = await Promise.all([
          axios.get('/api/dashboard/owner-full'),
          axios.get('/api/dashboard/email-log'),
          axios.get('/api/volunteer-applications'),
        ]);
        setData(fullRes.data);
        setEmailLogs(emailRes.data);
        setApplications(appsRes.data);
        await loadRoster(calMonth);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const changeMonth = (dir: number) => {
    setSelectedDay(null);
    const d = new Date(calMonth);
    d.setMonth(d.getMonth() + dir);
    setCalMonth(d);
    loadRoster(d);
  };

  const buildCalDays = () => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const getDateKey = (day: number) => {
    const y = calMonth.getFullYear();
    const m = String(calMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-${String(day).padStart(2, '0')}`;
  };

  const today = new Date().toISOString().split('T')[0];

  const SERVICE_COLORS: Record<string, string> = {
    styling: PALETTE.indigo,
    career_training: PALETTE.emerald,
    mock_interview: PALETTE.amber,
  };

  if (loading) return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'52px', height:'52px', border:'5px solid #e0e7ff', borderTopColor:'#4f46e5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#64748b' }}>Loading owner dashboard…</p>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'20px', textAlign:'center' }}>
      <div style={{ fontSize:'3rem' }}>⚠️</div>
      <h2 style={{ color:'#f43f5e' }}>Could not load dashboard data</h2>
      <p style={{ color:'#64748b', maxWidth:'400px' }}>
        The backend server may not be running or needs a restart.<br/>
        Please run <code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:'6px' }}>npm start</code> in the backend folder, then refresh.
      </p>
      <button onClick={() => window.location.reload()} style={{
        padding:'12px 28px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
        color:'white', border:'none', borderRadius:'12px', fontWeight:700, cursor:'pointer',
      }}>
        Retry
      </button>
    </div>
  );

  const { kpis, journeyData, pipeline, monthlyTrend, serviceBreakdown, agencyLeaderboard, volunteerPerf, pendingActions, recentClients } = data;

  const tabs = [
    { key: 'overview',      label: 'Overview',     icon: <TrendingUp size={15} /> },
    { key: 'charts',        label: 'Analytics',    icon: <BarChart2 size={15} /> },
    { key: 'clients',       label: 'All Clients',  icon: <Users size={15} /> },
    { key: 'roster',        label: 'Roster',       icon: <Calendar size={15} /> },
    { key: 'applications',  label: 'Applications', icon: <UserPlus size={15} /> },
    { key: 'emails',        label: 'Emails',       icon: <Mail size={15} /> },
  ] as const;

  return (
    <div style={{ animation:'fadeIn 0.4s ease-out' }}>

      {/* ── Hero header ────────────────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%)',
        borderRadius:'24px', padding:'36px 40px', marginBottom:'28px',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px',
        position:'relative', overflow:'hidden',
      }}>
        {/* decorative circles */}
        {[120,200,280].map((s,i) => (
          <div key={i} style={{ position:'absolute', borderRadius:'50%', background:'rgba(255,255,255,0.05)',
            width:s, height:s, right:i*80-40, top:i%2===0?-s/3:-s/2 }} />
        ))}
        <div style={{ position:'relative' }}>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', marginBottom:'6px', fontWeight:500 }}>
            Admin Dashboard — {new Date().toLocaleDateString('default',{weekday:'long',month:'long',day:'numeric'})}
          </div>
          <h1 style={{ color:'white', margin:0, fontSize:'2rem', letterSpacing:'-0.02em' }}>
            Welcome back, Jhanvi 👋
          </h1>
          <p style={{ color:'rgba(255,255,255,0.7)', margin:'8px 0 0', fontSize:'0.9rem' }}>
            Here's everything happening across your DFS operations today.
          </p>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'28px', flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px',
            borderRadius:'12px', border:'none', cursor:'pointer',
            background: activeTab === t.key ? '#4f46e5' : '#ffffff',
            color:       activeTab === t.key ? 'white'   : '#64748b',
            fontWeight:  activeTab === t.key ? 700       : 500,
            fontSize:'0.88rem',
            boxShadow: activeTab === t.key
              ? '0 4px 14px rgba(79,70,229,0.35)'
              : '0 2px 8px rgba(0,0,0,0.06)',
            transition:'all 0.2s ease',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>

          {/* KPI cards — row 1 */}
          <div style={{ display:'grid', gap:'16px', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))' }}>
            <KpiCard label="Total Clients"     value={kpis.total_clients}       sub="registered"      icon={<Users size={20}/>}       color="#4f46e5" bg="linear-gradient(135deg,#4f46e5,#7c3aed)" />
            <KpiCard label="Completed Sessions" value={kpis.completed_sessions}  sub="sessions done"   icon={<CheckCircle size={20}/>} color="#10b981" bg="linear-gradient(135deg,#10b981,#059669)" />
            <KpiCard label="Active Volunteers"  value={kpis.total_volunteers}    sub="on roster"       icon={<Heart size={20}/>}       color="#f59e0b" bg="linear-gradient(135deg,#f59e0b,#d97706)" />
            <KpiCard label="Partner Agencies"   value={kpis.total_agencies}      sub="active partners" icon={<Building2 size={20}/>}   color="#0ea5e9" bg="linear-gradient(135deg,#0ea5e9,#0284c7)" />
            <KpiCard label="Pending Assignment" value={kpis.pending_assign}      sub="need a volunteer" icon={<Clock size={20}/>}      color="#f43f5e" bg="linear-gradient(135deg,#f43f5e,#e11d48)" />
            <KpiCard label="Matched & Ready"    value={kpis.matched}             sub="upcoming sessions" icon={<Zap size={20}/>}       color="#a855f7" bg="linear-gradient(135deg,#a855f7,#9333ea)" />
          </div>

          {/* Confidence improvement banner */}
          {kpis.confidence_improvement > 0 && (
            <div style={{
              background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0',
              borderRadius:'16px', padding:'20px 28px', display:'flex', alignItems:'center',
              gap:'16px', flexWrap:'wrap',
            }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <TrendingUp size={24} color="white" />
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#166534', fontSize:'1rem' }}>
                  Average Client Confidence improves by +{kpis.confidence_improvement} points after sessions
                </div>
                <div style={{ color:'#16a34a', fontSize:'0.85rem', marginTop:'2px' }}>
                  Pre-session avg: <strong>{kpis.avg_confidence_pre}</strong> → Post-session avg: <strong>{kpis.avg_confidence_post}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Pending actions + Journey summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
            {/* Pending actions */}
            <div className="card">
              <h2 style={{ marginBottom:'16px', borderBottom:'none', fontSize:'1.1rem' }}>
                <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <AlertTriangle size={18} color="#f59e0b" /> Needs Attention
                </span>
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {pendingActions.map((a: any, i: number) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px 14px',
                    borderRadius:'10px',
                    background: a.type==='danger'?'#fff1f2':a.type==='warning'?'#fffbeb':a.type==='success'?'#f0fdf4':'#eff6ff',
                    border: `1px solid ${a.type==='danger'?'#fecdd3':a.type==='warning'?'#fde68a':a.type==='success'?'#bbf7d0':'#bfdbfe'}`,
                  }}>
                    <span style={{ fontSize:'1rem', flexShrink:0 }}>
                      {a.type==='danger'?'🔴':a.type==='warning'?'🟡':a.type==='success'?'✅':'🔵'}
                    </span>
                    <span style={{ fontSize:'0.85rem', color:'#374151', lineHeight:1.5 }}>{a.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Client journey radial */}
            <div className="card">
              <h2 style={{ marginBottom:'4px', borderBottom:'none', fontSize:'1.1rem' }}>Client Journey Progress</h2>
              <p style={{ fontSize:'0.82rem', marginBottom:'8px' }}>How many services each client has completed</p>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart innerRadius="30%" outerRadius="90%" data={journeyData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={6} label={{ position:'insideStart', fill:'#fff', fontSize:11, fontWeight:700 }}>
                    {journeyData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                  </RadialBar>
                  <Tooltip content={<CustomTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginTop:'4px' }}>
                {journeyData.map((d: any) => (
                  <div key={d.label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.78rem' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:d.fill }} />
                    <span style={{ color:'#64748b' }}>{d.label}</span>
                    <strong style={{ color:'#0f172a' }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline funnel */}
          <div className="card">
            <h2 style={{ marginBottom:'4px', borderBottom:'none', fontSize:'1.1rem' }}>Client Pipeline Funnel</h2>
            <p style={{ fontSize:'0.82rem', marginBottom:'16px' }}>How many clients progress through each stage</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
              {pipeline.map((stage: any, i: number) => {
                const pct = pipeline[0].count > 0 ? Math.round((stage.count / pipeline[0].count) * 100) : 0;
                return (
                  <div key={stage.stage} style={{ textAlign:'center' }}>
                    <div style={{ position:'relative', height:'120px', display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:'8px' }}>
                      <div style={{
                        width:'70%', borderRadius:'10px 10px 0 0',
                        height:`${Math.max(pct, 8)}%`,
                        background:`linear-gradient(180deg,${CHART_COLORS[i]},${CHART_COLORS[i]}88)`,
                        transition:'height 1s ease',
                      }} />
                    </div>
                    <div style={{ fontWeight:800, fontSize:'1.6rem', color:CHART_COLORS[i] }}>{stage.count}</div>
                    <div style={{ fontSize:'0.78rem', color:'#64748b', fontWeight:600 }}>{stage.stage}</div>
                    <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{pct}% of registered</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service breakdown mini cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
            {serviceBreakdown.map((s: any) => {
              const pct = s.total > 0 ? Math.round((s.completed/s.total)*100) : 0;
              const col = s.name==='Styling'?PALETTE.indigo:s.name==='Career Training'?PALETTE.emerald:PALETTE.amber;
              return (
                <div key={s.name} style={{ background:'#fff', borderRadius:'16px', padding:'22px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', borderTop:`4px solid ${col}` }}>
                  <div style={{ fontWeight:700, marginBottom:'14px', color:'#0f172a' }}>{s.name}</div>
                  <div style={{ fontSize:'2.4rem', fontWeight:800, color:col, lineHeight:1 }}>{s.total}</div>
                  <div style={{ fontSize:'0.8rem', color:'#64748b', margin:'6px 0 12px' }}>total appointments</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', marginBottom:'8px' }}>
                    <span style={{ color:'#10b981', fontWeight:600 }}>✓ {s.completed} done</span>
                    <span style={{ color:'#f59e0b', fontWeight:600 }}>⏳ {s.pending} pending</span>
                  </div>
                  <div style={{ height:'8px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:'4px', transition:'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:'6px', textAlign:'right' }}>{pct}% completion rate</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ANALYTICS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'charts' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>

          {/* Area chart — monthly trend */}
          <div className="card">
            <h2 style={{ marginBottom:'4px', borderBottom:'none' }}>Growth Trend — Last 6 Months</h2>
            <p style={{ fontSize:'0.88rem', marginBottom:'20px' }}>New clients, appointments booked, and sessions completed</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend} margin={{ top:5, right:20, left:0, bottom:5 }}>
                <defs>
                  <linearGradient id="gradClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.indigo} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PALETTE.indigo} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradAppts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.sky} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PALETTE.sky} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.emerald} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize:12, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:12, fill:'#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize:'0.85rem' }} />
                <Area type="monotone" dataKey="clients"      stroke={PALETTE.indigo}  fill="url(#gradClients)" strokeWidth={2.5} name="New Clients"   dot={{ r:4, fill:PALETTE.indigo }} />
                <Area type="monotone" dataKey="appointments" stroke={PALETTE.sky}     fill="url(#gradAppts)"  strokeWidth={2.5} name="Appointments" dot={{ r:4, fill:PALETTE.sky }} />
                <Area type="monotone" dataKey="completed"    stroke={PALETTE.emerald} fill="url(#gradDone)"   strokeWidth={2.5} name="Completed"    dot={{ r:4, fill:PALETTE.emerald }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Agency comparison + Service pie */}
          <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:'24px' }}>
            <div className="card">
              <h2 style={{ marginBottom:'4px', borderBottom:'none' }}>Agency Performance</h2>
              <p style={{ fontSize:'0.88rem', marginBottom:'16px' }}>Clients referred vs sessions completed per agency</p>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={agencyLeaderboard} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} />
                  <YAxis yAxisId="left"  tick={{ fontSize:11, fill:'#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize:11, fill:'#94a3b8' }} unit="%" domain={[0,100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:'0.82rem' }} />
                  <Bar yAxisId="left" dataKey="clients"   fill={PALETTE.indigo}  name="Clients"   radius={[6,6,0,0]} />
                  <Bar yAxisId="left" dataKey="completed" fill={PALETTE.emerald} name="Completed" radius={[6,6,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke={PALETTE.amber} strokeWidth={2.5} dot={{ r:4 }} name="Rate %" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 style={{ marginBottom:'4px', borderBottom:'none' }}>Service Mix</h2>
              <p style={{ fontSize:'0.88rem', marginBottom:'8px' }}>Proportion of each service type</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={4}
                    label={({ name, percent }: any) => `${name.split(' ')[0]} ${((percent??0)*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {serviceBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volunteer charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
            <div className="card">
              <h2 style={{ marginBottom:'4px', borderBottom:'none' }}>Volunteer Sessions</h2>
              <p style={{ fontSize:'0.88rem', marginBottom:'12px' }}>Total completed sessions per volunteer</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volunteerPerf} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} />
                  <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sessions" name="Sessions" radius={[8,8,0,0]}>
                    {volunteerPerf.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 style={{ marginBottom:'4px', borderBottom:'none' }}>Volunteer Reliability</h2>
              <p style={{ fontSize:'0.88rem', marginBottom:'12px' }}>Reliability score (green ≥80, amber ≥60, red &lt;60)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volunteerPerf} layout="vertical" margin={{ left:10, right:24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                  <XAxis type="number" domain={[0,100]} tick={{ fontSize:11, fill:'#94a3b8' }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} width={62} />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Reliability']} content={<CustomTooltip />} />
                  <Bar dataKey="reliability" name="Reliability" radius={[0,8,8,0]}>
                    {volunteerPerf.map((v: any, i: number) => (
                      <Cell key={i} fill={v.reliability>=80?PALETTE.emerald:v.reliability>=60?PALETTE.amber:PALETTE.rose} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Agency leaderboard table */}
          <div className="card">
            <h2 style={{ marginBottom:'20px', borderBottom:'none' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'8px' }}><Award size={20} color={PALETTE.amber} /> Agency Leaderboard</span>
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Agency</th>
                    <th style={{ textAlign:'center' }}>Clients Referred</th>
                    <th style={{ textAlign:'center' }}>Sessions Done</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agencyLeaderboard.map((ag: any, i: number) => (
                    <tr key={ag.name}>
                      <td style={{ fontWeight:800, color:i<3?PALETTE.amber:'#94a3b8', fontSize:'1.1rem' }}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                      </td>
                      <td style={{ fontWeight:600 }}>{ag.name}</td>
                      <td style={{ textAlign:'center', fontWeight:700, color:PALETTE.indigo, fontSize:'1.05rem' }}>{ag.clients}</td>
                      <td style={{ textAlign:'center', fontWeight:700, color:PALETTE.emerald }}>{ag.completed}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ flex:1, height:'8px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${ag.rate}%`, background:ag.rate>=60?PALETTE.emerald:ag.rate>=30?PALETTE.amber:PALETTE.rose, borderRadius:'4px' }} />
                          </div>
                          <span style={{ fontSize:'0.82rem', fontWeight:700, color:ag.rate>=60?PALETTE.emerald:ag.rate>=30?PALETTE.amber:PALETTE.rose, minWidth:'36px' }}>{ag.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ALL CLIENTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'clients' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ margin:0, borderBottom:'none' }}>All Registered Clients</h2>
              <span style={{ background:'#e0e7ff', color:'#4338ca', padding:'5px 14px', borderRadius:'20px', fontSize:'0.82rem', fontWeight:700 }}>
                {recentClients.length} shown
              </span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Referred by</th>
                    <th style={{ textAlign:'center' }}>Has Appt</th>
                    <th>Services Done</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClients.map((c: any) => (
                    <tr key={c.client_id}>
                      <td style={{ fontWeight:600 }}>{c.name}</td>
                      <td style={{ color:'#64748b', fontSize:'0.85rem' }}>{c.email || '—'}</td>
                      <td>
                        <span style={{ display:'flex', alignItems:'center', gap:'5px', color:'#64748b', fontSize:'0.85rem' }}>
                          <Building2 size={12} /> {c.agency}
                        </span>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        {c.has_appointment
                          ? <span style={{ color:PALETTE.emerald }}>✓</span>
                          : <span style={{ color:'#94a3b8' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:'4px' }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{
                              width:'20px', height:'20px', borderRadius:'50%', fontSize:'0.65rem',
                              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
                              background: i < c.services_done ? PALETTE.indigo : '#e2e8f0',
                              color: i < c.services_done ? 'white' : '#94a3b8',
                            }}>{i+1}</div>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize:'0.82rem', color:'#94a3b8' }}>
                        {c.joined ? new Date(c.joined).toLocaleDateString('default',{month:'short',day:'numeric',year:'2-digit'}) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ROSTER CALENDAR TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roster' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'24px', alignItems:'start' }}>
          <div className="card">
            {/* Month nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
              <button onClick={() => changeMonth(-1)} style={calBtn}><ChevronLeft size={20}/></button>
              <h2 style={{ margin:0, borderBottom:'none', fontSize:'1.2rem' }}>
                {calMonth.toLocaleString('default',{ month:'long', year:'numeric' })}
              </h2>
              <button onClick={() => changeMonth(1)} style={calBtn}><ChevronRight size={20}/></button>
            </div>
            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'6px' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:'0.75rem', fontWeight:700, color:'#94a3b8', padding:'6px 0' }}>{d}</div>
              ))}
            </div>
            {/* Days */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
              {buildCalDays().map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const key   = getDateKey(day);
                const appts = roster[key] || [];
                const isTod = key === today;
                const isSel = key === selectedDay;
                return (
                  <button key={key} onClick={() => setSelectedDay(isSel ? null : key)} style={{
                    aspectRatio:'1', borderRadius:'10px', cursor:'pointer',
                    border: isSel ? `2px solid ${PALETTE.indigo}` : isTod ? `2px solid #c7d2fe` : '2px solid transparent',
                    background: isSel ? '#e0e7ff' : isTod ? '#f5f3ff' : '#f8fafc',
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'flex-start', padding:'7px 3px 3px',
                    transition:'all 0.15s ease', minHeight:'54px',
                  }}>
                    <span style={{ fontSize:'0.82rem', fontWeight: isTod||isSel?800:500, color:isSel||isTod?PALETTE.indigo:'#374151' }}>{day}</span>
                    {appts.length > 0 && (
                      <div style={{ display:'flex', gap:'2px', flexWrap:'wrap', justifyContent:'center', marginTop:'3px' }}>
                        {appts.slice(0,3).map((a: any, di: number) => (
                          <div key={di} style={{ width:'6px', height:'6px', borderRadius:'50%', background:SERVICE_COLORS[a.service_type]||'#94a3b8' }} />
                        ))}
                        {appts.length > 3 && <span style={{ fontSize:'0.55rem', color:'#64748b' }}>+{appts.length-3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display:'flex', gap:'14px', marginTop:'16px', paddingTop:'14px', borderTop:'1px solid #f1f5f9' }}>
              {Object.entries(SERVICE_COLORS).map(([k, color]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.78rem', color:'#64748b' }}>
                  <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:color }} />
                  {fmtService(k)}
                </div>
              ))}
            </div>
          </div>

          {/* Day detail */}
          <div style={{ position:'sticky', top:'80px' }}>
            {selectedDay ? (
              <div className="card">
                <h3 style={{ marginBottom:'14px', color:PALETTE.indigo }}>
                  {new Date(selectedDay+'T00:00:00').toLocaleDateString('default',{weekday:'long',month:'long',day:'numeric'})}
                </h3>
                {(roster[selectedDay]||[]).length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
                    <Calendar size={36} style={{ marginBottom:'10px', opacity:0.4 }} />
                    <p style={{ margin:0 }}>No events this day</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {(roster[selectedDay]||[]).map((appt: any) => (
                      <div key={appt.appt_id} style={{ padding:'14px', borderRadius:'12px', background:'#f8fafc', borderLeft:`4px solid ${SERVICE_COLORS[appt.service_type]||'#94a3b8'}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                          <span style={{ fontSize:'0.75rem', fontWeight:700, padding:'2px 9px', borderRadius:'20px', background:(SERVICE_COLORS[appt.service_type]||'#94a3b8')+'20', color:SERVICE_COLORS[appt.service_type]||'#4f46e5' }}>
                            {fmtService(appt.service_type)}
                          </span>
                          <span style={{ fontSize:'0.72rem', padding:'2px 9px', borderRadius:'20px', fontWeight:600,
                            background:appt.status==='completed'?'#dcfce7':appt.status==='matched'?'#e0e7ff':appt.status==='cancelled'?'#fee2e2':'#fef3c7',
                            color:appt.status==='completed'?'#166534':appt.status==='matched'?'#4338ca':appt.status==='cancelled'?'#991b1b':'#92400e',
                          }}>{appt.status.replace(/_/g,' ')}</span>
                        </div>
                        {appt.is_unscheduled && (
                          <div style={{ fontSize:'0.72rem', fontWeight:600, color:'#b45309', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:'6px', padding:'3px 8px', marginBottom:'8px', display:'inline-block' }}>
                            ⚠ No slot confirmed — showing target date
                          </div>
                        )}
                        <div style={{ fontSize:'0.85rem', color:'#374151', marginBottom:'3px' }}><strong>Client:</strong> {appt.client_name}</div>
                        <div style={{ fontSize:'0.85rem', color:'#374151', marginBottom:'3px' }}><strong>Volunteer:</strong> {appt.volunteer_name}</div>
                        <div style={{ fontSize:'0.78rem', color:'#94a3b8', marginTop:'6px' }}>
                          {new Date(appt.schedule_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        </div>
                        {appt.status === 'matched' && (
                          <button
                            onClick={async () => {
                              try {
                                await axios.put(`/api/appointments/${appt.appt_id}/complete`, { confidence_score_pre: null, confidence_score_post: null, outcome_notes: '' });
                                toast.success(`Session marked as completed!`);
                                await loadRoster(calMonth);
                              } catch { toast.error('Could not update session.'); }
                            }}
                            style={{
                              marginTop:'10px', width:'100%', padding:'8px', border:'none',
                              borderRadius:'8px', background:'linear-gradient(135deg,#10b981,#059669)',
                              color:'white', fontWeight:700, fontSize:'0.82rem', cursor:'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                            }}
                          >
                            <CheckCircle size={14} /> Mark as Completed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign:'center', padding:'48px 20px' }}>
                <Calendar size={44} color="#c7d2fe" style={{ marginBottom:'14px' }} />
                <h3 style={{ color:'#64748b', fontWeight:500, marginBottom:'8px' }}>Select a day</h3>
                <p style={{ margin:0, fontSize:'0.85rem' }}>Click any date to see who is volunteering, what service, and what time.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EMAIL LOG TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <h2 style={{ margin:0, borderBottom:'none', display:'flex', alignItems:'center', gap:'8px' }}>
              <UserPlus size={20} color="#4f46e5" /> Volunteer Applications
            </h2>
            <span style={{ background:'#f1f5f9', color:'#64748b', padding:'5px 14px', borderRadius:'20px', fontSize:'0.82rem' }}>
              {applications.filter(a => a.status === 'pending').length} pending
            </span>
          </div>
          {applications.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>
              <UserPlus size={40} color="#e0e7ff" style={{ marginBottom:'12px' }} />
              <div>No volunteer applications yet.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {applications.sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()).map((app: any) => {
                const isPending = app.status === 'pending';
                const statusStyle =
                  app.status === 'approved' ? { bg:'#dcfce7', color:'#166534', label:'Approved' } :
                  app.status === 'rejected' ? { bg:'#fee2e2', color:'#991b1b', label:'Rejected' } :
                  { bg:'#fef9c3', color:'#854d0e', label:'Pending Review' };
                return (
                  <div key={app.application_id} style={{
                    padding:'18px 20px', borderRadius:'14px', background:'#f8fafc',
                    border:`1px solid ${isPending ? '#e0e7ff' : '#e2e8f0'}`,
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{
                          width:'44px', height:'44px', borderRadius:'50%', flexShrink:0,
                          background:'linear-gradient(135deg, #ec4899, #8b5cf6)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'white', fontWeight:800, fontSize:'1rem',
                        }}>
                          {app.client_name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#0f172a' }}>{app.client_name}</div>
                          <div style={{ fontSize:'0.8rem', color:'#64748b' }}>{app.client_email}</div>
                          <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:'2px' }}>
                            Submitted {new Date(app.submitted_at).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span style={{ padding:'4px 14px', borderRadius:'20px', fontSize:'0.78rem', fontWeight:700, background:statusStyle.bg, color:statusStyle.color, flexShrink:0 }}>
                        {statusStyle.label}
                      </span>
                    </div>

                    {app.motivation && (
                      <div style={{ marginTop:'12px', padding:'12px', background:'white', borderRadius:'10px', fontSize:'0.85rem', color:'#374151', lineHeight:1.6 }}>
                        <span style={{ fontWeight:600, color:'#4f46e5' }}>Motivation: </span>{app.motivation}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:'16px', marginTop:'10px', flexWrap:'wrap' }}>
                      {app.skills && <div style={{ fontSize:'0.8rem', color:'#64748b' }}><strong>Skills:</strong> {app.skills}</div>}
                      {app.availability && <div style={{ fontSize:'0.8rem', color:'#64748b' }}><strong>Availability:</strong> {app.availability}</div>}
                      {app.has_completed_session && <div style={{ fontSize:'0.8rem', color:'#10b981', fontWeight:600 }}>✓ Completed a session</div>}
                    </div>

                    {isPending && (
                      <div style={{ display:'flex', gap:'10px', marginTop:'14px' }}>
                        <button
                          onClick={async () => {
                            await axios.put(`/api/volunteer-applications/${app.application_id}/approve`);
                            toast.success(`${app.client_name} approved as volunteer!`);
                            setApplications(prev => prev.map(a => a.application_id === app.application_id ? { ...a, status:'approved' } : a));
                          }}
                          style={{ flex:1, padding:'10px', border:'none', borderRadius:'10px', background:'linear-gradient(135deg,#10b981,#059669)', color:'white', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
                        >
                          <CheckCircle size={15} /> Approve
                        </button>
                        <button
                          onClick={async () => {
                            await axios.put(`/api/volunteer-applications/${app.application_id}/reject`);
                            toast.success('Application rejected.');
                            setApplications(prev => prev.map(a => a.application_id === app.application_id ? { ...a, status:'rejected' } : a));
                          }}
                          style={{ flex:1, padding:'10px', border:'1px solid #fca5a5', borderRadius:'10px', background:'white', color:'#ef4444', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
            <h2 style={{ margin:0, borderBottom:'none' }}>Automated Email Log</h2>
            <span style={{ background:'#f1f5f9', color:'#64748b', padding:'5px 14px', borderRadius:'20px', fontSize:'0.82rem' }}>
              {emailLogs.length} records
            </span>
          </div>
          {emailLogs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>
              <Mail size={44} style={{ marginBottom:'12px', opacity:0.3 }} />
              <p>No email logs yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Type</th><th>Recipient</th><th>Subject</th><th>Sent</th><th>Status</th></tr></thead>
                <tbody>
                  {emailLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td>
                        <span style={{ fontSize:'0.75rem', fontWeight:700, padding:'3px 9px', borderRadius:'20px',
                          background: log.type==='Appointment Confirmation'?'#e0e7ff':log.type==='Reminder'?'#fef3c7':'#dcfce7',
                          color:      log.type==='Appointment Confirmation'?'#4338ca':log.type==='Reminder'?'#92400e':'#166534',
                        }}>{log.type}</span>
                      </td>
                      <td style={{ fontWeight:600, fontSize:'0.88rem' }}>{log.recipient||'—'}</td>
                      <td style={{ fontSize:'0.82rem', color:'#64748b', maxWidth:'240px' }}>{log.subject}</td>
                      <td style={{ fontSize:'0.8rem', color:'#94a3b8', whiteSpace:'nowrap' }}>
                        {log.sent_at ? new Date(log.sent_at).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                      </td>
                      <td><span className="badge success">{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, bg }: { label:string; value:number; sub:string; icon:React.ReactNode; bg:string; color:string }) => (
  <div style={{
    background:bg, color:'white', padding:'24px', borderRadius:'18px',
    display:'flex', flexDirection:'column', gap:'10px', position:'relative',
    overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
  }}>
    <div style={{ position:'absolute', right:'-8px', bottom:'-8px', opacity:0.12, transform:'scale(4)' }}>{icon}</div>
    <div style={{ opacity:0.85, fontWeight:500, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'7px' }}>{icon} {label}</div>
    <div style={{ fontSize:'2.4rem', fontWeight:800, lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:'0.78rem', opacity:0.75 }}>{sub}</div>
  </div>
);

const calBtn: React.CSSProperties = {
  background:'none', border:'none',
  width:'32px', height:'32px', display:'flex', alignItems:'center',
  justifyContent:'center', cursor:'pointer', color:'#7c3aed',
  padding:0,
};

export default OwnerDashboard;
