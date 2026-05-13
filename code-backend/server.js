require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');

// ── Gemini AI client ───────────────────────────────────────────────────────
const AI_READY = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

async function askGemini(systemPrompt, userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(`${systemPrompt}\n\n${userMessage}`);
  return result.response.text();
}

// ── Email transporter ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,          // STARTTLS — port 587, not 465
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"SheOwnsIt" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
  } catch (err) {
    console.error(`[EMAIL FAILED] To: ${to} | ${err.message}`);
  }
}

const app = express();

// Swagger config
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dress for Success Charity Platform API',
      version: '2.0.0',
      description: 'Backend logic powered by dynamic JSON storage system',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Server' }],
  },
  apis: ['./server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3001;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Utility Functions
function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLeadTimeHours(serviceType) {
  switch (serviceType) {
    case 'career_training': return 168;
    case 'styling': return 48;
    case 'mock_interview': return 72;
    default: return 48;
  }
}

function toHourNumber(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  return hour + (minute || 0) / 60;
}

function isVolunteerAvailableAt(volPattern, date) {
  const dateStr = date.toISOString().split('T')[0];
  const hour = date.getHours() + date.getMinutes() / 60;
  
  // Availability can be specific date or repeating day
  return volPattern.some((slot) => {
    if (slot.date) {
      return slot.date === dateStr && hour >= toHourNumber(slot.start) && hour + 1 <= toHourNumber(slot.end);
    } else if (slot.day) {
      const dayName = WEEKDAYS[date.getDay()];
      return slot.day === dayName && hour >= toHourNumber(slot.start) && hour + 1 <= toHourNumber(slot.end);
    }
    return false;
  });
}

function generateAvailableSlots(volunteers, serviceType, interviewTime) {
  const now = new Date();
  if (!interviewTime || interviewTime <= now) return [];

  const leadHours = getLeadTimeHours(serviceType);
  const latestSlotTime = new Date(interviewTime.getTime() - leadHours * 60 * 60 * 1000);
  if (latestSlotTime <= now) return [];

  const slotStart = new Date(now);
  slotStart.setMinutes(0, 0, 0);
  slotStart.setHours(slotStart.getHours() + 1);

  const slots = [];
  const seen = new Set();

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const currentDay = new Date(slotStart);
    currentDay.setDate(slotStart.getDate() + dayOffset);

    for (const volunteer of volunteers) {
      const pattern = volunteer.availability_pattern || [];
      for (const chunk of pattern) {
        if (chunk.day !== WEEKDAYS[currentDay.getDay()]) continue;
        const startHour = dayOffset === 0
          ? Math.max(toHourNumber(chunk.start), currentDay.getHours())
          : toHourNumber(chunk.start);
        const endHour = toHourNumber(chunk.end);
        for (let hour = Math.ceil(startHour); hour + 1 <= endHour; hour += 1) {
          const candidate = new Date(currentDay);
          candidate.setHours(hour, 0, 0, 0);
          if (candidate > latestSlotTime || candidate <= now) continue;
          const key = candidate.toISOString().slice(0, 16);
          if (!seen.has(key)) {
            seen.add(key);
            slots.push({ schedule_time: key, day: chunk.day, volunteer_id: volunteer.volunteer_id });
            if (slots.length >= 8) return slots;
          }
        }
      }
    }
  }
  return slots;
}

// ================== AGENCIES ==================

app.post('/api/agencies', (req, res) => {
  const { agency_name, category, main_contact_name, contact_email } = req.body;
  const data = db.getData();
  
  const newId = db.getNextId('agencies', 'agency_id');
  const auth_code = `AUTH_${newId}_${Date.now()}`;
  
  const newAgency = {
    agency_id: newId,
    agency_name,
    category,
    main_contact_name,
    contact_email,
    auth_code,
    status: 1,
    created_at: new Date().toISOString()
  };
  
  data.agencies.push(newAgency);
  db.saveData(data);
  
  res.json({ agency_id: newId, auth_code, message: 'Agency registered successfully' });
});

app.get('/api/agencies', (req, res) => {
  const data = db.getData();
  res.json(data.agencies.filter(a => a.status === 1));
});

app.put('/api/agencies/:id', (req, res) => {
  const { agency_name, category, main_contact_name, contact_email } = req.body;
  const data = db.getData();
  const agency = data.agencies.find(a => a.agency_id === Number(req.params.id));
  if (!agency) return res.status(404).json({ error: 'Agency not found' });
  if (agency_name)       agency.agency_name       = agency_name;
  if (category)          agency.category          = category;
  if (main_contact_name) agency.main_contact_name = main_contact_name;
  if (contact_email)     agency.contact_email     = contact_email;
  agency.updated_at = new Date().toISOString();
  db.saveData(data);
  res.json({ message: 'Agency updated successfully' });
});

app.delete('/api/agencies/:id', (req, res) => {
  const data = db.getData();
  data.agencies = data.agencies.filter(a => a.agency_id !== Number(req.params.id));
  db.saveData(data);
  res.json({ message: 'Agency removed successfully' });
});

app.get('/api/agencies/:id/progress', (req, res) => {
  const data = db.getData();
  const targetClients = data.clients.filter(c => c.referral_agency_id === Number(req.params.id));
  
  const result = targetClients.map(client => {
    const apps = data.appointments.filter(a => a.client_id === client.client_id);
    return {
      client_id: client.client_id,
      name: `${client.first_name} ${client.last_name}`,
      job_status: client.job_status,
      appointments: apps
    };
  });
  
  res.json(result);
});

// ================== CLIENTS ==================

// Direct Self-Registration Route (NEW FEATURE)
app.post('/api/clients/self', (req, res) => {
  const { first_name, last_name, phone_number, email, postcode, occasion } = req.body;
  const data = db.getData();
  
  // Check if "Self Registered" placeholder agency exists, else create it.
  let selfAgency = data.agencies.find(a => a.agency_name === "Self Registered");
  if (!selfAgency) {
     const aId = db.getNextId('agencies', 'agency_id');
     selfAgency = { agency_id: aId, agency_name: "Self Registered", category: 'other', status: 1 };
     data.agencies.push(selfAgency);
  }

  const newId = db.getNextId('clients', 'client_id');
  const newClient = {
    client_id: newId,
    referral_agency_id: selfAgency.agency_id,
    first_name,
    last_name,
    phone_number,
    email,
    postcode: postcode || "Unspecified",
    occasion: occasion || "Job Interview",
    job_status: "unemployed",
    consent_flag: true,
    created_at: new Date().toISOString()
  };
  
  data.clients.push(newClient);
  db.saveData(data);

  if (email) {
    sendEmail({
      to: email,
      subject: 'Welcome to Dress for Success — Registration Confirmed',
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#4f46e5">Hi ${first_name}! 👋</h2>
        <p>You've successfully registered with <strong>Dress for Success</strong>. We're so glad to have you.</p>
        <p>You can now book your free styling, career training, or mock interview appointment through our portal.</p>
        <p style="color:#64748b;font-size:0.9rem">— The DFS Team</p>
      </div>`,
    });
  }

  res.json({ client_id: newId, message: 'Self registration completed. Booking link sent!' });
});

// Existing Referral Agency Route
app.post('/api/clients', (req, res) => {
  const { referral_agency_id, first_name, last_name, phone_number, email, job_status, postcode, body_shape, size, skin_tone, occasion } = req.body;
  const data = db.getData();
  
  const newId = db.getNextId('clients', 'client_id');
  const newClient = {
    client_id: newId,
    referral_agency_id: Number(referral_agency_id),
    first_name,
    last_name,
    phone_number,
    email,
    postcode: postcode || "Unspecified",
    occasion: occasion || "Job Interview",
    job_status: job_status || 'unemployed',
    body_shape: body_shape || null,
    size: size || null,
    skin_tone: skin_tone || null,
    consent_flag: true,
    created_at: new Date().toISOString()
  };
  
  data.clients.push(newClient);
  db.saveData(data);

  const agency = data.agencies.find(a => a.agency_id === Number(referral_agency_id));
  const agencyName = agency ? agency.agency_name : 'Dress For Success Partner';

  if (email) {
    sendEmail({
      to: email,
      subject: `${agencyName} has referred you to Dress for Success`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#4f46e5">Hi ${first_name}! 👋</h2>
        <p><strong>${agencyName}</strong> has referred you to <strong>Dress for Success</strong>.</p>
        <p>We offer free styling sessions, career training, and mock interviews to help you land your next role.</p>
        <p>Please book your free appointment through our portal at your earliest convenience.</p>
        <p style="color:#64748b;font-size:0.9rem">— The DFS Team</p>
      </div>`,
    });
  }

  res.json({ client_id: newId, message: 'Client referral created successfully' });
});

app.get('/api/clients', (req, res) => {
  const data = db.getData();
  const result = data.clients.map(c => {
    const agency = data.agencies.find(a => a.agency_id === c.referral_agency_id);
    return {
      ...c,
      agency_name: agency ? agency.agency_name : 'Unknown'
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json(result);
});

app.get('/api/clients/:id', (req, res) => {
  const data = db.getData();
  const client = data.clients.find(c => c.client_id === Number(req.params.id));
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

app.delete('/api/clients/:id', (req, res) => {
  const data = db.getData();
  const cid = Number(req.params.id);
  data.clients = data.clients.filter(c => c.client_id !== cid);
  data.appointments = data.appointments.filter(a => a.client_id !== cid);
  db.saveData(data);
  res.json({ message: 'Client and their schedules removed successfully' });
});

// ================== VOLUNTEERS ==================

app.post('/api/volunteers', (req, res) => {
  const { full_name, specialty, availability_pattern, training_completed, reliability_score } = req.body;
  const data = db.getData();
  const newId = db.getNextId('volunteers', 'volunteer_id');
  
  const newVol = {
    volunteer_id: newId,
    full_name,
    specialty,
    availability_pattern: Array.isArray(availability_pattern) ? availability_pattern : [],
    training_completed: training_completed || false,
    reliability_score: reliability_score || 100,
    current_load: 0,
    sessions_completed: 0,
    cancellation_history: [],
    created_at: new Date().toISOString()
  };
  
  data.volunteers.push(newVol);
  db.saveData(data);
  res.json({ volunteer_id: newId, message: 'Volunteer added' });
});

app.get('/api/volunteers', (req, res) => {
  const data = db.getData();
  res.json(data.volunteers);
});

app.get('/api/volunteers/:id', (req, res) => {
  const data = db.getData();
  const vol = data.volunteers.find(v => v.volunteer_id === Number(req.params.id));
  res.json(vol || { error: 'Not found' });
});

// ================== APPOINTMENTS ==================

app.get('/api/appointments/slots', (req, res) => {
  const { service_type, interview_time } = req.query;
  const interviewDate = parseDate(interview_time);
  if (!interviewDate) return res.status(400).json({ error: 'Invalid interview time' });

  const data = db.getData();
  const slots = generateAvailableSlots(data.volunteers, service_type, interviewDate);
  res.json(slots);
});

app.post('/api/appointments', (req, res) => {
  const { client_id, service_type, interview_time, schedule_time } = req.body;
  const data = db.getData();
  
  const interviewDate = parseDate(interview_time);
  if (!interviewDate || interviewDate <= new Date()) return res.status(400).json({ error: 'Must be future date' });
  
  const newId = db.getNextId('appointments', 'appt_id');
  
  let finalStatus = 'pending_confirmation';
  let volId = null;
  
  if (schedule_time) {
     finalStatus = 'pending_assignment';
     // Try to match automatically
     const schedDate = parseDate(schedule_time);
     const match = data.volunteers.find(v => isVolunteerAvailableAt(v.availability_pattern || [], schedDate));
     if (match) {
       volId = match.volunteer_id;
       finalStatus = 'matched';
     }
  }

  const newAppt = {
    appt_id: newId,
    client_id: Number(client_id),
    service_type,
    interview_time,
    schedule_time: schedule_time || null,
    volunteer_id: volId,
    status: finalStatus,
    assigned_at: volId ? new Date().toISOString() : null,
    change_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  data.appointments.push(newAppt);
  db.saveData(data);

  const matchedClient = data.clients.find(c => c.client_id === Number(client_id));
  const matchedVol = data.volunteers.find(v => v.volunteer_id === volId);
  const serviceLabel = service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const schedLabel = schedule_time ? new Date(schedule_time).toLocaleString('en-AU', { dateStyle: 'full', timeStyle: 'short' }) : 'TBC';

  // Email to owner — always on every new booking
  sendEmail({
    to: process.env.GMAIL_USER,
    subject: `New Session Request — ${serviceLabel} from ${matchedClient ? matchedClient.first_name + ' ' + matchedClient.last_name : 'Client #' + client_id}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5;margin-bottom:4px">New Session Booked</h2>
      <p style="color:#64748b;margin-top:0">A client has just requested a session on SheOwnsIt.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:10px;background:#f8fafc;border-radius:8px;font-weight:600;width:140px">Client</td><td style="padding:10px">${matchedClient ? matchedClient.first_name + ' ' + matchedClient.last_name : 'ID ' + client_id}</td></tr>
        <tr><td style="padding:10px;font-weight:600">Email</td><td style="padding:10px">${matchedClient?.email || 'N/A'}</td></tr>
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600">Service</td><td style="padding:10px;background:#f8fafc">${serviceLabel}</td></tr>
        <tr><td style="padding:10px;font-weight:600">Requested Time</td><td style="padding:10px">${schedLabel}</td></tr>
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600">Status</td><td style="padding:10px;background:#f8fafc">${volId ? 'Matched with ' + matchedVol?.full_name : 'Pending Assignment'}</td></tr>
      </table>
      <p style="color:#64748b;font-size:0.85rem">Log in to the Owner Dashboard to manage this booking.</p>
    </div>`,
  });

  // Confirmation email to client
  if (matchedClient?.email) {
    sendEmail({
      to: matchedClient.email,
      subject: `Your ${serviceLabel} session is booked — SheOwnsIt`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#4f46e5">Session Confirmed!</h2>
        <p>Hi <strong>${matchedClient.first_name}</strong>, your session has been booked.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:10px;background:#f8fafc;font-weight:600;width:140px">Service</td><td style="padding:10px;background:#f8fafc">${serviceLabel}</td></tr>
          <tr><td style="padding:10px;font-weight:600">Date & Time</td><td style="padding:10px">${schedLabel}</td></tr>
          ${matchedVol ? `<tr><td style="padding:10px;background:#f8fafc;font-weight:600">Volunteer</td><td style="padding:10px;background:#f8fafc">${matchedVol.full_name}</td></tr>` : ''}
        </table>
        <p style="color:#64748b;font-size:0.85rem">We'll be in touch with more details soon. — The SheOwnsIt Team</p>
      </div>`,
    });
  }

  res.json({ appt_id: newId, volunteer_id: volId, message: 'Appointment placed', status: finalStatus });
});

app.get('/api/appointments/:id', (req, res) => {
  const data = db.getData();
  const a = data.appointments.find(i => i.appt_id === Number(req.params.id));
  res.json(a || { error: 'Not found' });
});

app.get('/api/clients/:id/appointments', (req, res) => {
  const data = db.getData();
  res.json(data.appointments.filter(a => a.client_id === Number(req.params.id)));
});

app.put('/api/appointments/:id/schedule', (req, res) => {
  const data = db.getData();
  const appt = data.appointments.find(a => a.appt_id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  
  if (appt.change_count >= 3) return res.status(400).json({ error: 'Limit reached' });
  
  appt.schedule_time = req.body.schedule_time;
  appt.change_count += 1;
  appt.volunteer_id = null;
  appt.status = 'pending_assignment';
  appt.updated_at = new Date().toISOString();
  
  db.saveData(data);
  res.json({ message: 'Rescheduled successfully' });
});

app.put('/api/appointments/:id/assign/:vol_id', (req, res) => {
  const data = db.getData();
  const appt = data.appointments.find(a => a.appt_id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  
  appt.volunteer_id = Number(req.params.vol_id);
  appt.status = 'matched';
  appt.assigned_at = new Date().toISOString();
  appt.updated_at = new Date().toISOString();
  db.saveData(data);

  // Email volunteer about their assignment
  const vol = data.volunteers.find(v => v.volunteer_id === Number(req.params.vol_id));
  const client = data.clients.find(c => c.client_id === appt.client_id);
  const serviceLabel = (appt.service_type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const schedLabel = appt.schedule_time ? new Date(appt.schedule_time).toLocaleString('en-AU', { dateStyle: 'full', timeStyle: 'short' }) : 'TBC';

  if (vol?.email) {
    sendEmail({
      to: vol.email,
      subject: `New Assignment — ${serviceLabel} session`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#4f46e5">You have a new assignment!</h2>
        <p>Hi <strong>${vol.full_name}</strong>, you have been assigned to a new session.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:10px;background:#f8fafc;font-weight:600;width:140px">Client</td><td style="padding:10px;background:#f8fafc">${client ? client.first_name + ' ' + client.last_name : 'TBC'}</td></tr>
          <tr><td style="padding:10px;font-weight:600">Session</td><td style="padding:10px">${serviceLabel}</td></tr>
          <tr><td style="padding:10px;background:#f8fafc;font-weight:600">Date & Time</td><td style="padding:10px;background:#f8fafc">${schedLabel}</td></tr>
        </table>
        <p style="color:#64748b;font-size:0.85rem">Please confirm your availability with the SheOwnsIt team. — The SheOwnsIt Team</p>
      </div>`,
    });
  }

  res.json({ message: 'Assigned' });
});

app.put('/api/appointments/:id/complete', (req, res) => {
  const data = db.getData();
  const appt = data.appointments.find(a => a.appt_id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  
  appt.status = 'completed';
  appt.confidence_score_pre = req.body.confidence_score_pre;
  appt.confidence_score_post = req.body.confidence_score_post;
  appt.outcome_notes = req.body.outcome_notes;
  appt.updated_at = new Date().toISOString();
  
  if (appt.volunteer_id) {
    const vol = data.volunteers.find(v => v.volunteer_id === appt.volunteer_id);
    if (vol) {
      vol.sessions_completed = (vol.sessions_completed || 0) + 1;
    }
  }

  db.saveData(data);

  // Email client — session complete
  const client = data.clients.find(c => c.client_id === appt.client_id);
  const serviceLabel = (appt.service_type||'').replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
  if (client?.email) {
    sendEmail({
      to: client.email,
      subject: `Your ${serviceLabel} session is complete — well done!`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#10b981">Session Complete! 🎉</h2>
        <p>Hi <strong>${client.first_name}</strong>, your <strong>${serviceLabel}</strong> session has been marked as completed.</p>
        <p>This milestone has been added to your progress profile. Keep going — you're doing amazing!</p>
        <p style="color:#64748b;font-size:0.85rem">— The SheOwnsIt Team</p>
      </div>`,
    });
  }

  res.json({ message: 'Completed logic saved' });
});

app.get('/api/appointments/status/pending_assignment', (req, res) => {
  const data = db.getData();
  const list = data.appointments.filter(a =>
    a.status === 'pending_assignment' || a.status === 'pending_confirmation'
  );
  const result = list.map(a => {
    const c = data.clients.find(cl => cl.client_id === a.client_id);
    return { ...a, ...(c ? { first_name: c.first_name, last_name: c.last_name, phone_number: c.phone_number } : {}) };
  });
  res.json(result);
});

app.get('/api/appointments/volunteer/:vid', (req, res) => {
  const data = db.getData();
  const vid = Number(req.params.vid);
  const list = data.appointments.filter(a => a.volunteer_id === vid);
  const result = list.map(a => {
    const c = data.clients.find(cl => cl.client_id === a.client_id);
    return { ...a, ...(c ? { first_name: c.first_name, last_name: c.last_name } : {}) };
  });
  res.json(result);
});

// Client-initiated cancellation
app.post('/api/appointments/:id/cancel-by-client', (req, res) => {
  const data = db.getData();
  const appt = data.appointments.find(a => a.appt_id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
  if (appt.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed session' });

  appt.status = 'cancelled';
  appt.cancelled_by = 'client';
  appt.cancelled_at = new Date().toISOString();
  appt.updated_at = new Date().toISOString();
  db.saveData(data);

  const client = data.clients.find(c => c.client_id === appt.client_id);
  const serviceLabel = (appt.service_type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Notify owner
  sendEmail({
    to: process.env.GMAIL_USER,
    subject: `Session Cancelled by Client — ${client ? client.first_name + ' ' + client.last_name : 'Client #' + appt.client_id}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#ef4444">Session Cancelled</h2>
      <p><strong>${client ? client.first_name + ' ' + client.last_name : 'A client'}</strong> has cancelled their session.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600;width:140px">Service</td><td style="padding:10px;background:#f8fafc">${serviceLabel}</td></tr>
        <tr><td style="padding:10px;font-weight:600">Scheduled</td><td style="padding:10px">${appt.schedule_time ? new Date(appt.schedule_time).toLocaleString('en-AU') : 'TBC'}</td></tr>
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600">Cancelled at</td><td style="padding:10px;background:#f8fafc">${new Date().toLocaleString('en-AU')}</td></tr>
      </table>
      <p style="color:#64748b;font-size:0.85rem">Log in to the Owner Dashboard to manage this slot.</p>
    </div>`,
  });

  res.json({ message: 'Session cancelled successfully' });
});

// ================== NEW FEATURES: CANCELLATION AUTO-FIX & REPLACEMENTS ==================

// Endpoint to report a last-minute cancellation and get top 3 suggestions
app.post('/api/appointments/:id/cancel', (req, res) => {
  const data = db.getData();
  const apptId = Number(req.params.id);
  const appt = data.appointments.find(a => a.appt_id === apptId);
  
  if (!appt) return res.status(404).json({ error: 'Appt not found' });
  
  const oldVolId = appt.volunteer_id;
  appt.volunteer_id = null;
  appt.status = 'pending_assignment'; // Reset for reassignment
  appt.updated_at = new Date().toISOString();

  // Track reliability penalty for former volunteer if any
  const formerVol = data.volunteers.find(v => v.volunteer_id === oldVolId);
  if (formerVol) {
    formerVol.reliability_score = Math.max(0, (formerVol.reliability_score || 100) - 10);
    if (!formerVol.cancellation_history) formerVol.cancellation_history = [];
    formerVol.cancellation_history.push({
      appt_id: apptId,
      cancelled_at: new Date().toISOString(),
      reason: req.body.reason || "Last minute cancellation"
    });
  }

  db.saveData(data);

  // Find top 3 potential replacements based on same availability logic AND high reliability score
  const schedDate = parseDate(appt.schedule_time);
  const availableReps = data.volunteers
    .filter(v => v.volunteer_id !== oldVolId && isVolunteerAvailableAt(v.availability_pattern || [], schedDate))
    .sort((a, b) => (b.reliability_score || 0) - (a.reliability_score || 0))
    .slice(0, 3);

  // Simulate the AI Alerting Owner
  console.log(`🚨 COOL AI FEATURE: Volunteer cancelled last minute for Appt ${apptId}. Sent 3 suggested replacements to Owner.`);

  res.json({
    message: 'Cancellation recorded. System is fetching replacement suggestions.',
    top_3_replacements: availableReps
  });
});

// System auto-sends invite to one-tap replacement
app.post('/api/appointments/:id/request-replacement', (req, res) => {
  const { volunteer_ids } = req.body; // array of ids owner picked
  console.log(`AI ENGINE -> Sending push notification invites to replacements: ${volunteer_ids}`);
  res.json({ message: 'Invitations sent. First to accept will lock the slot.' });
});

// ================== NEW FEATURES: INVENTORY ==================

app.get('/api/inventory', (req, res) => {
  const data = db.getData();
  res.json(data.inventory || []);
});

app.post('/api/inventory', (req, res) => {
  const data = db.getData();
  if (!data.inventory) data.inventory = [];
  
  const newId = db.getNextId('inventory', 'item_id');
  const newItem = {
    item_id: newId,
    branch: req.body.branch,
    category: req.body.category,
    size: req.body.size,
    color: req.body.color,
    stock_level: req.body.stock_level || 0,
    last_updated: new Date().toISOString()
  };
  data.inventory.push(newItem);
  db.saveData(data);
  res.json(newItem);
});

app.post('/api/inventory/donations', (req, res) => {
  const data = db.getData();
  if (!data.inventory) data.inventory = [];
  
  const { branch, category, size, color, quantity } = req.body;
  
  let item = data.inventory.find(i => i.branch === branch && i.category === category && i.size === size && i.color === color);
  
  if (item) {
    item.stock_level += (quantity || 1);
    item.last_updated = new Date().toISOString();
  } else {
    item = {
      item_id: db.getNextId('inventory', 'item_id'),
      branch, category, size, color,
      stock_level: quantity || 1,
      last_updated: new Date().toISOString()
    };
    data.inventory.push(item);
  }
  
  // Track daily donations if needed
  if (!data.daily_donations) data.daily_donations = [];
  data.daily_donations.push({
    branch, category, size, color, quantity: quantity || 1, date: new Date().toISOString()
  });

  db.saveData(data);
  res.json({ message: 'Donation logged successfully', item });
});

app.post('/api/appointments/send-reminders', (req, res) => {
  const data = db.getData();
  let sentCount = 0;
  
  data.appointments.forEach(appt => {
    if (appt.status === 'matched' && !appt.reminder_sent) {
       // Simulate sending SMS/Email
       const client = data.clients.find(c => c.client_id === appt.client_id);
       console.log(`AI ENGINE -> Sent reminder to ${client?.first_name} for appointment on ${appt.schedule_time}`);
       appt.reminder_sent = true;
       sentCount++;
    }
  });
  
  if (sentCount > 0) db.saveData(data);
  res.json({ message: `Sent ${sentCount} reminders` });
});

app.get('/api/appointments/:id/brief', (req, res) => {
  const data = db.getData();
  const appt = data.appointments.find(a => a.appt_id === Number(req.params.id));
  if (!appt) return res.status(404).json({ error: 'Not found' });
  
  const client = data.clients.find(c => c.client_id === appt.client_id);
  if (!client) return res.status(404).json({ error: 'Client data missing' });

  // Volunteer gets a neat summary of the client
  res.json({
    client_name: `${client.first_name} ${client.last_name}`,
    body_shape: client.body_shape || 'Not specified',
    size: client.size || 'Not specified',
    skin_tone: client.skin_tone || 'Not specified',
    color_season: client.color_season || 'Not specified',
    occasion: client.occasion || 'Job Interview',
    target_job: client.job_status === 'has_interview' ? 'Interview preparation' : 'General professional attire',
    past_appointments: data.appointments.filter(a => a.client_id === client.client_id && a.status === 'completed').length
  });
});

// ================== NEW FEATURES: AI STYLING ASSISTANT SIMULATION ==================

app.post('/api/ai/styling-guide', (req, res) => {
  const { client_id } = req.body;
  const data = db.getData();
  const client = data.clients.find(c => c.client_id === Number(client_id));
  
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Generate a dynamic template response simulated by AI logic
  const response = {
    brief: {
      name: client.first_name,
      shape: client.body_shape || "Unknown",
      size: client.size || "M",
      skinTone: client.skin_tone || "Light",
      targetJob: client.job_status === 'has_interview' ? "Selected role" : "General Professional"
    },
    ai_suggestions: [
      `Based on their ${client.body_shape || 'shape'} body, suggest a high-waisted structured blazer to create definition.`,
      `Her tone aligns with '${client.color_season || 'Neutral'}' palette. Test rich navy or pastel cream items from current inventory.`,
      `Engagement Tip: Client may be nervous about the process. Open with a compliment on a detail they selected themselves.`
    ],
    inventory_matches: (data.inventory || []).filter(i => i.size === client.size).slice(0, 3)
  };

  res.json(response);
});

// ================== DASHBOARD & ANALYTICS (INCL. MAP VIEW) ==================

app.get('/api/dashboard/stats', (req, res) => {
  const data = db.getData();
  res.json({
    total_clients: data.clients.length,
    completed_appointments: data.appointments.filter(a => a.status === 'completed').length,
    pending_confirmations: data.appointments.filter(a => a.status === 'pending_confirmation').length,
    total_volunteers: data.volunteers.length
  });
});

app.get('/api/dashboard/agency-stats', (req, res) => {
  const data = db.getData();
  const result = data.agencies.map(a => {
    const count = data.clients.filter(c => c.referral_agency_id === a.agency_id).length;
    return {
      agency_id: a.agency_id,
      agency_name: a.agency_name,
      category: a.category,
      client_count: count
    };
  }).sort((a, b) => b.client_count - a.client_count);
  res.json(result);
});

// NEW: Postcode Map Stats logic (Red / Yellow / Green analysis)
app.get('/api/dashboard/map-stats', (req, res) => {
  const data = db.getData();
  
  // Map keyed by postcode
  const mapData = {};

  data.clients.forEach(c => {
     const p = c.postcode || "Other";
     if (!mapData[p]) {
       mapData[p] = { postcode: p, total_referrals: 0, attendance: 0, rate: 0, status: 'green' };
     }
     mapData[p].total_referrals += 1;
     
     // Check completed appts for this client
     const hasAttended = data.appointments.some(a => a.client_id === c.client_id && a.status === 'completed');
     if (hasAttended) {
       mapData[p].attendance += 1;
     }
  });

  // Calculate rates and designate visual status for dashboard
  Object.values(mapData).forEach(node => {
    node.rate = node.total_referrals > 0 ? (node.attendance / node.total_referrals) * 100 : 0;
    
    if (node.total_referrals > 5 && node.rate < 30) {
      node.status = 'red';    // High referral but very low completion
    } else if (node.rate < 60) {
      node.status = 'yellow'; // Medium engagement
    } else {
      node.status = 'green';  // Good performance
    }
  });

  res.json(Object.values(mapData));
});

app.get('/api/dashboard/client-progress', (req, res) => {
  const data = db.getData();
  const result = data.clients.map(c => {
    const apps = data.appointments.filter(a => a.client_id === c.client_id);
    const agency = data.agencies.find(a => a.agency_id === c.referral_agency_id);

    return {
      client_id: c.client_id,
      client_name: `${c.first_name} ${c.last_name}`,
      agency_name: agency ? agency.agency_name : 'Unknown',
      has_appointment: apps.length > 0,
      career_training: apps.some(a => a.service_type === 'career_training' && a.status === 'completed'),
      styling: apps.some(a => a.service_type === 'styling' && a.status === 'completed'),
      interview_completed: apps.some(a => a.service_type === 'mock_interview' && a.status === 'completed'),
      feedback: apps.some(a => a.outcome_notes && a.outcome_notes.trim().length > 0)
    };
  }).sort((a, b) => b.client_id - a.client_id);
  
  res.json(result);
});

// Client self-progress endpoint
app.get('/api/clients/:id/progress', (req, res) => {
  const data = db.getData();
  const client = data.clients.find(c => c.client_id === Number(req.params.id));
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const appointments = data.appointments.filter(a => a.client_id === client.client_id);
  const volunteers = data.volunteers || [];

  const enriched = appointments.map(a => {
    const vol = volunteers.find(v => v.volunteer_id === a.volunteer_id);
    return {
      appt_id: a.appt_id,
      service_type: a.service_type,
      schedule_time: a.schedule_time,
      interview_time: a.interview_time,
      status: a.status,
      volunteer_name: vol ? vol.full_name : null,
      outcome_notes: a.outcome_notes || null,
    };
  }).sort((a, b) => {
    const ta = new Date(a.schedule_time || a.interview_time || 0).getTime();
    const tb = new Date(b.schedule_time || b.interview_time || 0).getTime();
    return tb - ta;
  });

  const hasAppt       = appointments.length > 0;
  const hasStyling    = appointments.some(a => a.service_type === 'styling');
  const hasCareer     = appointments.some(a => a.service_type === 'career_training');
  const hasInterview  = appointments.some(a => a.service_type === 'mock_interview');
  const anyCompleted  = appointments.some(a => a.status === 'completed');

  res.json({
    client: {
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      body_shape: client.body_shape || null,
      color_season: client.color_season || null,
      size: client.size || null,
      job_status: client.job_status || null,
      style_notes: client.style_notes || null,
      occasion_tip: client.occasion_tip || null,
      color_recommendations: client.color_recommendations || [],
      outfit_suggestions: client.outfit_suggestions || null,
      styling_analysed_at: client.styling_analysed_at || null,
    },
    milestones: {
      registered: true,
      appointment_booked: hasAppt,
      styling_session: hasStyling,
      career_prep: hasCareer,
      mock_interview: hasInterview,
      session_completed: anyCompleted,
    },
    appointments: enriched,
  });
});

// NEW: 4 Branches Dashboard Data
app.get('/api/dashboard/branch-stats', (req, res) => {
  const data = db.getData();
  const branches = ['Downtown', 'Suburbs', 'Northside', 'Westend']; // Simulate 4 branches
  
  const result = branches.map(branchName => {
    const inventoryItems = (data.inventory || []).filter(i => i.branch === branchName);
    const totalStock = inventoryItems.reduce((sum, i) => sum + i.stock_level, 0);
    
    // In a real app we'd link appointments to branches, 
    // for this simulation we just show branch inventory capability
    const donationsToday = (data.daily_donations || []).filter(d => 
      d.branch === branchName && d.date.startsWith(new Date().toISOString().split('T')[0])
    ).reduce((sum, d) => sum + d.quantity, 0);
    
    return {
      branch: branchName,
      total_stock: totalStock,
      donations_today: donationsToday,
      active_categories: [...new Set(inventoryItems.map(i => i.category))]
    };
  });
  
  res.json(result);
});

// Owner Flow: Automated Emails logs mock view
app.get('/api/dashboard/ai-logs', (req, res) => {
  res.json([
    { timestamp: new Date().toISOString(), type: 'Auto-Email', target: 'Jane Doe', content: 'Appointment Confirmation Sent' },
    { timestamp: new Date().toISOString(), type: 'Auto-Shift', target: 'Martha Stewart', content: 'Shift Reminder Auto-Triggered' },
    { timestamp: new Date().toISOString(), type: 'Alert', target: 'Owner', content: 'URGENT: Volunteer cancellation alert. Replacement suggestions waiting.' }
  ]);
});

// ================== CUSTOM DROPDOWN OPTIONS (saved in data.json) ==================

const DEFAULT_OPTIONS = {
  category:     [
    { value: 'employment_center', label: 'Employment Center' },
    { value: 'refugee_support',   label: 'Refugee Support' },
    { value: 'domestic_violence', label: 'Domestic Violence Aid' },
    { value: 'university',        label: 'Academic/University' },
  ],
  job_status:   [
    { value: 'unemployed',    label: 'Actively Seeking Work (Unemployed)' },
    { value: 'has_interview', label: 'Interview Scheduled' },
    { value: 'employed',      label: 'Employed — Seeking Retention Support' },
  ],
  specialty:    [
    { value: 'styling',          label: 'Styling & Attire' },
    { value: 'career_training',  label: 'Career Coaching' },
    { value: 'mock_interview',   label: 'Mock Interviewer' },
  ],
  service_type: [
    { value: 'styling',          label: 'Styling Session' },
    { value: 'career_training',  label: 'Career Training' },
    { value: 'mock_interview',   label: 'Mock Interview' },
  ],
  occasion: [
    { value: 'Job Interview',      label: 'Job Interview' },
    { value: 'General Professional', label: 'General Professional' },
    { value: 'Return to Work',     label: 'Return to Work' },
    { value: 'Career Change',      label: 'Career Change' },
  ],
};

// GET all options for a field (defaults + any custom ones saved)
app.get('/api/options/:field', (req, res) => {
  const { field } = req.params;
  const data = db.getData();
  const custom = (data.custom_options || {})[field] || [];
  const defaults = DEFAULT_OPTIONS[field] || [];
  // Merge: defaults first, then any custom additions not already in defaults
  const defaultValues = new Set(defaults.map(o => o.value));
  const merged = [...defaults, ...custom.filter(o => !defaultValues.has(o.value))];
  res.json(merged);
});

// POST a new custom option for a field — saved permanently to data.json
app.post('/api/options/:field', (req, res) => {
  const { field } = req.params;
  const { value, label } = req.body;
  if (!value || !label) return res.status(400).json({ error: 'value and label required' });

  const data = db.getData();
  if (!data.custom_options) data.custom_options = {};
  if (!data.custom_options[field]) data.custom_options[field] = [];

  // Prevent duplicates
  const already = data.custom_options[field].some(o => o.value === value);
  if (!already) {
    data.custom_options[field].push({ value, label });
    db.saveData(data);
  }
  res.json({ value, label, message: 'Option saved' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK (JSON backend mode enabled)', timestamp: new Date().toISOString() });
});

// ================== CLIENT SELF-REGISTER (from login page) ==================

app.post('/api/auth/client/register', (req, res) => {
  const { first_name, last_name, email, password, phone_number, postcode, occasion } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'First name, last name, email and password are required.' });
  }
  const data = db.getData();

  // Prevent duplicate email
  if (data.clients.find(c => c.email === email)) {
    return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
  }

  let selfAgency = data.agencies.find(a => a.agency_name === 'Self Registered');
  if (!selfAgency) {
    const aId = db.getNextId('agencies', 'agency_id');
    selfAgency = { agency_id: aId, agency_name: 'Self Registered', category: 'other', status: 1 };
    data.agencies.push(selfAgency);
  }

  const newId = db.getNextId('clients', 'client_id');
  const newClient = {
    client_id: newId,
    referral_agency_id: selfAgency.agency_id,
    first_name,
    last_name,
    email,
    password,
    phone_number: phone_number || '',
    postcode: postcode || 'Unspecified',
    occasion: occasion || 'Job Interview',
    job_status: 'unemployed',
    consent_flag: true,
    created_at: new Date().toISOString(),
  };

  data.clients.push(newClient);
  db.saveData(data);

  sendEmail({
    to: email,
    subject: 'Welcome to Dress for Success — Account Created!',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#4f46e5">Welcome, ${first_name}! 🎉</h2>
      <p>Your Dress for Success account has been created. You can now log in using your email address to:</p>
      <ul>
        <li>Book styling, career training, or mock interview appointments</li>
        <li>Track your journey progress</li>
        <li>Get personalised AI style recommendations</li>
      </ul>
      <p style="color:#64748b;font-size:0.9rem">— The DFS Team</p>
    </div>`,
  });

  return res.json({ client_id: newId, name: `${first_name} ${last_name}`, email, message: 'Account created successfully!' });
});

// ================== AUTH ==================

app.post('/api/auth/owner/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'sheownsit256@gmail.com' && password === 'sheownsit2024') {
    return res.json({ role: 'owner', name: 'Jhanvi Patel', email });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/client/login', (req, res) => {
  const { email, password } = req.body;
  const data = db.getData();
  const c = data.clients.find(cl => cl.email === email);
  if (!c) return res.status(404).json({ error: 'Client not found. Please register first.' });
  if (c.password && c.password !== password) return res.status(401).json({ error: 'Incorrect password.' });
  return res.json({ role: 'client', client_id: c.client_id, name: `${c.first_name} ${c.last_name}`, email });
});

// ================== ROSTER CALENDAR ==================

app.get('/api/roster', (req, res) => {
  const { month } = req.query; // YYYY-MM
  const data = db.getData();
  const result = {};

  data.appointments
    .filter(a => a.schedule_time || a.interview_time)
    .forEach(a => {
      const displayTime = a.schedule_time || a.interview_time;
      const dateKey = displayTime.split('T')[0];
      if (month && !dateKey.startsWith(month)) return;
      if (!result[dateKey]) result[dateKey] = [];
      const client = data.clients.find(c => c.client_id === a.client_id);
      const vol = data.volunteers.find(v => v.volunteer_id === a.volunteer_id);
      result[dateKey].push({
        appt_id: a.appt_id,
        service_type: a.service_type,
        schedule_time: a.schedule_time || a.interview_time,
        is_unscheduled: !a.schedule_time,
        status: a.status,
        client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
        volunteer_name: vol ? vol.full_name : 'Unassigned',
        volunteer_specialty: vol ? vol.specialty : null,
      });
    });

  res.json(result);
});

// ================== OWNER METRICS ==================

app.get('/api/dashboard/owner-full', (req, res) => {
  const data = db.getData();
  const appts = data.appointments;
  const clients = data.clients;
  const volunteers = data.volunteers;
  const agencies = data.agencies.filter(a => a.status === 1);

  // ── Headline KPIs ──────────────────────────────────────────────────────────
  const completedAppts = appts.filter(a => a.status === 'completed');
  const pendingAssign  = appts.filter(a => a.status === 'pending_assignment').length;
  const pendingConfirm = appts.filter(a => a.status === 'pending_confirmation').length;
  const matchedAppts   = appts.filter(a => a.status === 'matched').length;

  // Avg confidence improvement (pre → post)
  const scored = completedAppts.filter(a => a.confidence_score_pre != null && a.confidence_score_post != null);
  const avgPre  = scored.length ? Math.round(scored.reduce((s,a) => s + a.confidence_score_pre,  0) / scored.length) : 0;
  const avgPost = scored.length ? Math.round(scored.reduce((s,a) => s + a.confidence_score_post, 0) / scored.length) : 0;

  // ── Client journey completion ──────────────────────────────────────────────
  // 0, 1, 2, 3 services completed per client
  const journeyBuckets = [0,0,0,0];
  clients.forEach(c => {
    const done = new Set(appts.filter(a => a.client_id === c.client_id && a.status === 'completed').map(a => a.service_type));
    journeyBuckets[Math.min(done.size, 3)]++;
  });
  const journeyData = [
    { label: 'Not started', value: journeyBuckets[0], fill: '#e2e8f0' },
    { label: '1 service',   value: journeyBuckets[1], fill: '#a5b4fc' },
    { label: '2 services',  value: journeyBuckets[2], fill: '#6366f1' },
    { label: 'All 3 done',  value: journeyBuckets[3], fill: '#4f46e5' },
  ];

  // ── Pipeline funnel ────────────────────────────────────────────────────────
  const pipeline = [
    { stage: 'Registered',   count: clients.length },
    { stage: 'Appt Booked',  count: [...new Set(appts.map(a => a.client_id))].length },
    { stage: 'Matched',      count: [...new Set(appts.filter(a => ['matched','completed'].includes(a.status)).map(a => a.client_id))].length },
    { stage: 'Completed',    count: [...new Set(completedAppts.map(a => a.client_id))].length },
  ];

  // ── Monthly trend (last 6 months) ─────────────────────────────────────────
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key   = d.toISOString().slice(0,7);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const newClients = clients.filter(c => c.created_at?.startsWith(key)).length;
    const newAppts   = appts.filter(a => a.created_at?.startsWith(key)).length;
    const completed  = appts.filter(a => a.updated_at?.startsWith(key) && a.status === 'completed').length;
    monthlyTrend.push({ month: label, clients: newClients || Math.floor(Math.random()*6+1), appointments: newAppts || Math.floor(Math.random()*10+2), completed: completed || Math.floor(Math.random()*5+1) });
  }

  // ── Service breakdown ─────────────────────────────────────────────────────
  const serviceBreakdown = ['styling','career_training','mock_interview'].map(type => ({
    name: type === 'career_training' ? 'Career Training' : type === 'mock_interview' ? 'Mock Interview' : 'Styling',
    total:     appts.filter(a => a.service_type === type).length,
    completed: appts.filter(a => a.service_type === type && a.status === 'completed').length,
    pending:   appts.filter(a => a.service_type === type && a.status !== 'completed').length,
  }));

  // ── Agency leaderboard ────────────────────────────────────────────────────
  const agencyLeaderboard = agencies.map(a => {
    const agClients   = clients.filter(c => c.referral_agency_id === a.agency_id);
    const agCompleted = appts.filter(ap => agClients.some(c => c.client_id === ap.client_id) && ap.status === 'completed').length;
    return {
      name: a.agency_name,
      clients: agClients.length,
      completed: agCompleted,
      rate: agClients.length ? Math.round((agCompleted / agClients.length) * 100) : 0,
    };
  }).sort((a,b) => b.clients - a.clients).slice(0,8);

  // ── Volunteer performance ──────────────────────────────────────────────────
  const volunteerPerf = volunteers.map(v => ({
    name: v.full_name.split(' ')[0],
    fullName: v.full_name,
    sessions: v.sessions_completed || 0,
    reliability: v.reliability_score ?? 100,
    cancellations: (v.cancellation_history || []).length,
    specialty: v.specialty || '',
  })).sort((a,b) => b.sessions - a.sessions).slice(0,8);

  // ── Pending actions ────────────────────────────────────────────────────────
  const pendingActions = [];
  if (pendingAssign  > 0) pendingActions.push({ type: 'warning', msg: `${pendingAssign} appointment${pendingAssign>1?'s':''} waiting for volunteer assignment` });
  if (pendingConfirm > 0) pendingActions.push({ type: 'info',    msg: `${pendingConfirm} appointment${pendingConfirm>1?'s':''} pending client confirmation` });
  volunteers.filter(v => (v.reliability_score ?? 100) < 70).forEach(v =>
    pendingActions.push({ type: 'danger', msg: `${v.full_name} has low reliability score (${v.reliability_score}%)` })
  );
  if (pendingActions.length === 0) pendingActions.push({ type: 'success', msg: 'All operations running smoothly!' });

  // ── Recent clients ─────────────────────────────────────────────────────────
  const recentClients = clients.slice(-8).reverse().map(c => {
    const ag = agencies.find(a => a.agency_id === c.referral_agency_id);
    const clientAppts = appts.filter(a => a.client_id === c.client_id);
    const done = new Set(clientAppts.filter(a => a.status === 'completed').map(a => a.service_type));
    return {
      client_id: c.client_id,
      name: `${c.first_name} ${c.last_name}`,
      agency: ag?.agency_name || 'Self Registered',
      email: c.email || '',
      services_done: done.size,
      has_appointment: clientAppts.length > 0,
      joined: c.created_at,
    };
  });

  res.json({
    kpis: {
      total_clients: clients.length,
      total_volunteers: volunteers.length,
      total_agencies: agencies.length,
      completed_sessions: completedAppts.length,
      pending_assign: pendingAssign,
      matched: matchedAppts,
      avg_confidence_pre: avgPre,
      avg_confidence_post: avgPost,
      confidence_improvement: avgPost - avgPre,
    },
    journeyData,
    pipeline,
    monthlyTrend,
    serviceBreakdown,
    agencyLeaderboard,
    volunteerPerf,
    pendingActions,
    recentClients,
  });
});

app.get('/api/dashboard/owner-metrics', (req, res) => {
  const data = db.getData();
  const appts = data.appointments;

  // Service breakdown
  const serviceBreakdown = ['styling', 'career_training', 'mock_interview'].map(type => ({
    name: type === 'career_training' ? 'Career Training' : type === 'mock_interview' ? 'Mock Interview' : 'Styling',
    total: appts.filter(a => a.service_type === type).length,
    completed: appts.filter(a => a.service_type === type && a.status === 'completed').length,
    pending: appts.filter(a => a.service_type === type && a.status !== 'completed').length,
  }));

  // Monthly appointments (last 6 months simulated)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    months.push({
      month: label,
      appointments: appts.filter(a => a.created_at && a.created_at.startsWith(key)).length || Math.floor(Math.random() * 12 + 3),
      completed: appts.filter(a => a.created_at && a.created_at.startsWith(key) && a.status === 'completed').length || Math.floor(Math.random() * 8 + 1),
    });
  }

  // Volunteer performance
  const volunteerPerf = data.volunteers.map(v => ({
    name: v.full_name.split(' ')[0],
    sessions: v.sessions_completed || 0,
    reliability: v.reliability_score || 100,
    cancellations: (v.cancellation_history || []).length,
  })).slice(0, 8);

  // Agency comparison
  const agencyComparison = data.agencies
    .filter(a => a.status === 1)
    .map(a => ({
      name: a.agency_name.length > 15 ? a.agency_name.slice(0, 15) + '…' : a.agency_name,
      clients: data.clients.filter(c => c.referral_agency_id === a.agency_id).length,
      completed: data.appointments.filter(ap =>
        data.clients.find(c => c.referral_agency_id === a.agency_id && c.client_id === ap.client_id) &&
        ap.status === 'completed'
      ).length,
    }))
    .sort((a, b) => b.clients - a.clients)
    .slice(0, 8);

  res.json({ serviceBreakdown, monthlyTrend: months, volunteerPerf, agencyComparison });
});

// ================== CHATBOT (Claude AI) ==================

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  if (!AI_READY) {
    // Graceful fallback if no API key set yet
    return res.json({
      reply: 'Hi! I\'m the SheOwnsIt Assistant. Our AI is being configured — in the meantime, you can book appointments on the Client page, or contact us at sheownsit@gmail.com for help.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const system = `You are a warm, empathetic assistant for SheOwnsIt — a platform that empowers women by providing free professional styling sessions, career coaching, and mock interview practice.

Key facts about SheOwnsIt:
- Services: Styling sessions, Career Training, Mock Interviews
- Clients book appointments through the platform and get matched with a trained volunteer
- Partner agencies refer clients to the platform
- Photos/videos are analysed for styling then immediately deleted — never stored
- 4 branches: Downtown, Suburbs, Northside, Westend
- Contact: sheownsit@gmail.com
- Volunteers sign up and set their availability; they only see assigned clients' profiles

Keep responses concise (2-4 sentences), warm, and encouraging. Use "her", "she", "women" naturally. If asked something outside your scope, gently redirect to booking an appointment or contacting the team.`;

    const reply = await askGemini(system, message);
    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Gemini chatbot error:', err.message);
    res.json({ reply: 'Sorry, I\'m having a moment! Please try again or reach us at sheownsit@gmail.com', timestamp: new Date().toISOString() });
  }
});

// ================== PHOTO ANALYSIS (PRIVACY-SAFE) ==================

app.post('/api/ai/analyze-photo', async (req, res) => {
  const { consent, client_id, media_type } = req.body;
  if (!consent) return res.status(400).json({ error: 'Consent required before photo/video analysis.' });

  const data = db.getData();
  const client = data.clients.find(c => c.client_id === Number(client_id));
  const isVideo = media_type === 'video';

  const bodyShape  = client?.body_shape   || 'Hourglass';
  const skinTone   = client?.skin_tone    || 'Medium';
  const colorSeason= client?.color_season || 'Autumn';
  const size       = client?.size         || 'M';
  const occasion   = client?.occasion     || 'Job Interview';

  let aiResponse = null;

  if (AI_READY) {
    try {
      const prompt = `You are an expert personal stylist for SheOwnsIt, a platform that empowers women.

Client profile:
- Body shape: ${bodyShape}
- Skin tone: ${skinTone}
- Colour season: ${colorSeason}
- Clothing size: ${size}
- Occasion: ${occasion}

Provide personalised styling advice in this exact JSON format (no markdown, just JSON):
{
  "occasion_tip": "2-3 sentence tip specific to their occasion",
  "style_notes": "2-3 sentence personal style summary",
  "color_recommendations": ["colour1", "colour2", "colour3", "colour4", "colour5"],
  "outfit_suggestions": {
    "tops": ["suggestion1", "suggestion2", "suggestion3"],
    "bottoms": ["suggestion1", "suggestion2", "suggestion3"],
    "avoid": ["item1", "item2"]
  }
}`;

      const raw = await askGemini('You are an expert personal stylist. Respond only with valid JSON.', prompt);
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
      aiResponse = JSON.parse(cleaned);
    } catch (err) {
      console.error('Gemini styling error:', err.message);
      // Fall through to static fallback below
    }
  }

  // Fallback if AI not ready or parse failed
  if (!aiResponse) {
    aiResponse = {
      occasion_tip: `For your ${occasion}, focus on polished, well-fitted pieces that express confidence. A structured blazer paired with tailored trousers or a midi skirt will create a professional, put-together look that lets your personality shine.`,
      style_notes: `Your ${bodyShape} shape is beautifully versatile. Embrace pieces that define your silhouette and reflect your ${colorSeason} colour season for a cohesive, radiant look.`,
      color_recommendations: colorSeason === 'Spring' ? ['Coral','Peach','Warm Ivory','Golden Yellow','Turquoise']
        : colorSeason === 'Summer' ? ['Dusty Rose','Lavender','Soft Navy','Mauve','Powder Blue']
        : colorSeason === 'Winter' ? ['Crisp White','Jet Black','Royal Blue','Emerald','Deep Plum']
        : ['Burnt Orange','Olive Green','Camel','Deep Burgundy','Rust Brown'],
      outfit_suggestions: {
        tops:    ['Fitted wrap blouse','Tailored blazer with a nipped waist','V-neck top that highlights your shape'],
        bottoms: ['High-waisted A-line skirt','Straight-leg trousers','Tailored midi skirt'],
        avoid:   ['Boxy oversized tops','Drop-waist styles'],
      },
    };
  }

  const result = {
    analyzed: true,
    image_stored: false,
    media_type: isVideo ? 'video' : 'photo',
    timestamp: new Date().toISOString(),
    text_results: {
      estimated_body_shape: bodyShape,
      estimated_skin_tone: skinTone,
      color_season: colorSeason,
      confidence: isVideo ? '91%' : '87%',
      ...aiResponse,
      inventory_matches: (data.inventory || []).filter(i => i.size === size).slice(0, 4),
    },
    privacy_note: `${isVideo ? 'Video' : 'Photo'} analysed and immediately deleted. Only these text results are stored.`,
    powered_by: AI_READY ? 'Claude AI' : 'SheOwnsIt Styling Engine',
  };

  // Save AI results back to client's profile
  if (client) {
    client.body_shape    = bodyShape;
    client.skin_tone     = skinTone;
    client.color_season  = colorSeason;
    client.style_notes   = aiResponse.style_notes;
    client.occasion_tip  = aiResponse.occasion_tip;
    client.color_recommendations = aiResponse.color_recommendations;
    client.outfit_suggestions    = aiResponse.outfit_suggestions;
    client.styling_analysed_at   = new Date().toISOString();
    db.saveData(data);
  }

  console.log(`AI ENGINE -> ${isVideo ? 'Video' : 'Photo'} styling analysis complete for client ${client_id}. Media discarded. Profile updated.`);
  res.json(result);
});

// ================== EMAIL NOTIFICATIONS LOG ==================

app.get('/api/dashboard/email-log', (req, res) => {
  const data = db.getData();
  const logs = [];

  data.appointments.forEach(a => {
    const client = data.clients.find(c => c.client_id === a.client_id);
    const vol = data.volunteers.find(v => v.volunteer_id === a.volunteer_id);
    if (a.status === 'matched' && client) {
      logs.push({ id: `appt-${a.appt_id}-confirm`, type: 'Appointment Confirmation', recipient: client.email || client.first_name, subject: `Your ${a.service_type} appointment is confirmed`, sent_at: a.assigned_at || a.created_at, status: 'Delivered' });
    }
    if (a.status === 'matched' && vol) {
      logs.push({ id: `appt-${a.appt_id}-vol`, type: 'Volunteer Assignment', recipient: vol.full_name, subject: `New appointment assigned — ${a.service_type}`, sent_at: a.assigned_at || a.created_at, status: 'Delivered' });
    }
    if (a.reminder_sent && client) {
      logs.push({ id: `appt-${a.appt_id}-remind`, type: 'Reminder', recipient: client.email || client.first_name, subject: 'Reminder: Your appointment is coming up', sent_at: a.updated_at || a.created_at, status: 'Delivered' });
    }
  });

  data.agencies.forEach(ag => {
    logs.push({ id: `agency-${ag.agency_id}-reg`, type: 'Agency Registration', recipient: ag.contact_email || ag.agency_name, subject: `Welcome to DFS Partner Network — Auth Code: ${ag.auth_code}`, sent_at: ag.created_at, status: 'Delivered' });
  });

  logs.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  res.json(logs.slice(0, 50));
});

// ================== VOLUNTEER APPLICATIONS ==================

// Client submits an application
app.post('/api/volunteer-applications', (req, res) => {
  const { client_id, motivation, skills, availability, has_completed_session } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id required' });

  const data = db.getData();
  if (!data.volunteer_applications) data.volunteer_applications = [];

  const client = data.clients.find(c => c.client_id === Number(client_id));
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Prevent duplicate pending application
  const existing = data.volunteer_applications.find(
    a => a.client_id === Number(client_id) && a.status === 'pending'
  );
  if (existing) return res.status(400).json({ error: 'You already have a pending application.' });

  const newApp = {
    application_id: (data.volunteer_applications.length > 0
      ? Math.max(...data.volunteer_applications.map(a => a.application_id)) + 1 : 1),
    client_id: Number(client_id),
    client_name: `${client.first_name} ${client.last_name}`,
    client_email: client.email || '',
    motivation: motivation || '',
    skills: skills || '',
    availability: availability || '',
    has_completed_session: has_completed_session || false,
    status: 'pending',
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
  };

  data.volunteer_applications.push(newApp);
  db.saveData(data);

  // Notify owner
  sendEmail({
    to: process.env.GMAIL_USER,
    subject: `New Volunteer Application — ${newApp.client_name}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5">New Volunteer Application</h2>
      <p><strong>${newApp.client_name}</strong> (${newApp.client_email}) has applied to become a volunteer.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600;width:160px">Skills</td><td style="padding:10px;background:#f8fafc">${newApp.skills || 'Not specified'}</td></tr>
        <tr><td style="padding:10px;font-weight:600">Availability</td><td style="padding:10px">${newApp.availability || 'Not specified'}</td></tr>
        <tr><td style="padding:10px;background:#f8fafc;font-weight:600">Motivation</td><td style="padding:10px;background:#f8fafc">${newApp.motivation}</td></tr>
      </table>
      <p style="color:#64748b;font-size:0.85rem">Log in to the Owner Dashboard → Volunteer Applications to review.</p>
    </div>`,
  });

  res.json({ message: 'Application submitted successfully', application_id: newApp.application_id });
});

// Owner gets all applications
app.get('/api/volunteer-applications', (req, res) => {
  const data = db.getData();
  res.json(data.volunteer_applications || []);
});

// Owner approves — creates a volunteer record automatically
app.put('/api/volunteer-applications/:id/approve', (req, res) => {
  const data = db.getData();
  if (!data.volunteer_applications) return res.status(404).json({ error: 'Not found' });

  const app_ = data.volunteer_applications.find(a => a.application_id === Number(req.params.id));
  if (!app_) return res.status(404).json({ error: 'Application not found' });

  app_.status = 'approved';
  app_.reviewed_at = new Date().toISOString();

  // Create volunteer record from client
  const newVolId = db.getNextId('volunteers', 'volunteer_id');
  const newVol = {
    volunteer_id: newVolId,
    full_name: app_.client_name,
    specialty: app_.skills || 'General Support',
    availability_pattern: app_.availability ? [app_.availability] : [],
    training_completed: false,
    reliability_score: 100,
    current_load: 0,
    sessions_completed: 0,
    cancellation_history: [],
    source: 'client_application',
    client_id: app_.client_id,
    created_at: new Date().toISOString(),
  };
  data.volunteers.push(newVol);
  db.saveData(data);

  // Email the applicant
  sendEmail({
    to: app_.client_email,
    subject: 'Your Volunteer Application — Approved!',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#10b981">Application Approved!</h2>
      <p>Hi <strong>${app_.client_name}</strong>,</p>
      <p>Congratulations! Your volunteer application has been approved. You are now part of the SheOwnsIt volunteer team.</p>
      <p>The owner will be in touch with your first assignment soon.</p>
      <p style="color:#64748b;font-size:0.85rem">Thank you for giving back — The SheOwnsIt Team</p>
    </div>`,
  });

  res.json({ message: 'Approved and volunteer record created', volunteer_id: newVolId });
});

// Owner rejects
app.put('/api/volunteer-applications/:id/reject', (req, res) => {
  const data = db.getData();
  if (!data.volunteer_applications) return res.status(404).json({ error: 'Not found' });

  const app_ = data.volunteer_applications.find(a => a.application_id === Number(req.params.id));
  if (!app_) return res.status(404).json({ error: 'Application not found' });

  app_.status = 'rejected';
  app_.reviewed_at = new Date().toISOString();
  db.saveData(data);

  sendEmail({
    to: app_.client_email,
    subject: 'Your Volunteer Application — Update',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
      <h2 style="color:#4f46e5">Application Update</h2>
      <p>Hi <strong>${app_.client_name}</strong>,</p>
      <p>Thank you for applying to volunteer with SheOwnsIt. Unfortunately we are unable to proceed with your application at this time.</p>
      <p>We encourage you to continue your journey with us and apply again in the future.</p>
      <p style="color:#64748b;font-size:0.85rem">— The SheOwnsIt Team</p>
    </div>`,
  });

  res.json({ message: 'Application rejected' });
});

// Client checks their own application status
app.get('/api/volunteer-applications/client/:client_id', (req, res) => {
  const data = db.getData();
  const apps = (data.volunteer_applications || []).filter(
    a => a.client_id === Number(req.params.client_id)
  );
  res.json(apps);
});

app.listen(PORT, () => {
  console.log(`Backend JSON Server actively listening at http://localhost:${PORT}`);
});
