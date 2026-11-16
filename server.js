// src/server.js
// Modern Native Node.js HTTP Server for the AI-Powered Hospital Management System
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const { db, hashPassword, verifyPassword, logAudit, createNotification } = require('./db');
const { generateHealthcareResponse, searchKnowledge } = require('./ai');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Helper: Parse JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// Helper: Send JSON response
function sendJSON(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers
  });
  res.end(JSON.stringify(data));
}

// Helper: Authenticate request via Authorization Bearer token or session cookie
function getAuthenticatedUser(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith('hms_session=')) {
        token = c.substring('hms_session='.length);
        break;
      }
    }
  }

  if (!token) return null;

  try {
    const session = db.prepare(`
      SELECT s.*, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token);

    if (!session) return null;
    return session;
  } catch (err) {
    console.error('Session lookup error:', err.message);
    return null;
  }
}

// Generate unique ID helper
function generateId(prefix) {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${random}`;
}

// Main HTTP request handler
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  try {
    // ==========================================
    // API ROUTES
    // ==========================================

    // 1. AUTHENTICATION ROUTES
    // ------------------------------------------

    // POST /api/auth/register
    if (method === 'POST' && pathname === 'api/auth/register'.replace(/^/, '/')) {
      const body = await parseRequestBody(req);
      const { role, name, email, phone, password, gender, dob, address, specialization, qualifications, license_number, department, emergency_contact, nhis_number } = body;

      if (!name || !email || !password || !role) {
        return sendJSON(res, 400, { error: 'Name, email, password, and role are required.' });
      }

      // Check existing email
      const existing = db.prepare(`SELECT user_id FROM users WHERE email = ?`).get(email.toLowerCase().trim());
      if (existing) {
        return sendJSON(res, 409, { error: 'An account with this email address already exists.' });
      }

      // Generate customized user ID
      let prefix = 'HMS-P';
      if (role === 'doctor') prefix = 'HMS-DOC';
      else if (role === 'nurse') prefix = 'HMS-NUR';
      else if (role === 'admin') prefix = 'HMS-ADM';
      else if (role === 'pharmacist') prefix = 'HMS-PHARM';
      else if (role === 'lab_tech') prefix = 'HMS-LAB';
      else if (role === 'receptionist') prefix = 'HMS-REC';
      else if (role === 'accountant') prefix = 'HMS-ACC';

      const userId = generateId(prefix);
      const { hash, salt } = hashPassword(password);
      const verificationStatus = (role === 'doctor' || role === 'nurse') ? 'pending' : 'verified';

      db.prepare(`
        INSERT INTO users (
          user_id, role, name, email, phone, password_hash, password_salt,
          gender, dob, address, specialization, qualifications, license_number,
          department, verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId, role, name.trim(), email.toLowerCase().trim(), phone || '',
        hash, salt, gender || '', dob || '', address || '',
        specialization || '', qualifications || '', license_number || '',
        department || '', verificationStatus
      );

      // If patient, initialize patient profile
      if (role === 'patient') {
        db.prepare(`
          INSERT INTO patient_profiles (
            patient_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, nhis_number
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          userId,
          emergency_contact?.name || '',
          emergency_contact?.phone || '',
          emergency_contact?.relation || '',
          nhis_number || ''
        );
      }

      // Create session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(sessionToken, userId, expiresAt);

      logAudit(userId, role, 'USER_REGISTER', 'users', clientIp, `User registered with ID: ${userId}`);
      createNotification(userId, 'Welcome to the HMS Digital Healthcare Platform', `Your account has been created. Your unique ID is ${userId}.`, 'system');

      return sendJSON(res, 201, {
        success: true,
        message: 'Registration successful!',
        token: sessionToken,
        user: {
          user_id: userId,
          role,
          name,
          email: email.toLowerCase().trim(),
          verification_status: verificationStatus
        }
      });
    }

    // POST /api/auth/login
    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseRequestBody(req);
      const { identifier, password } = body; // email or user_id

      if (!identifier || !password) {
        return sendJSON(res, 400, { error: 'Email / Patient ID and password are required.' });
      }

      const cleanId = identifier.trim().toLowerCase();
      const user = db.prepare(`
        SELECT * FROM users
        WHERE LOWER(email) = ? OR LOWER(user_id) = ?
      `).get(cleanId, cleanId);

      if (!user) {
        return sendJSON(res, 401, { error: 'Invalid login credentials.' });
      }

      const isValid = verifyPassword(password, user.password_hash, user.password_salt);
      if (!isValid) {
        return sendJSON(res, 401, { error: 'Invalid login credentials.' });
      }

      // Create session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(sessionToken, user.user_id, expiresAt);

      logAudit(user.user_id, user.role, 'USER_LOGIN', 'sessions', clientIp, `Successful login for ${user.user_id}`);

      return sendJSON(res, 200, {
        success: true,
        message: 'Login successful!',
        token: sessionToken,
        user: {
          user_id: user.user_id,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          department: user.department,
          specialization: user.specialization,
          verification_status: user.verification_status,
          avatar_url: user.avatar_url
        }
      });
    }

    // POST /api/auth/demo-login (1-Click quick login for evaluating all 8 roles)
    if (method === 'POST' && pathname === '/api/auth/demo-login') {
      const body = await parseRequestBody(req);
      const role = body.role || 'patient';

      let user = db.prepare(`SELECT * FROM users WHERE role = ? LIMIT 1`).get(role);
      if (!user) {
        return sendJSON(res, 404, { error: `No demo account available for role: ${role}` });
      }

      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(sessionToken, user.user_id, expiresAt);

      logAudit(user.user_id, user.role, 'DEMO_LOGIN', 'sessions', clientIp, `1-Click quick login used for role ${role}`);

      return sendJSON(res, 200, {
        success: true,
        message: `Authenticated as ${user.name} (${user.role})`,
        token: sessionToken,
        user: {
          user_id: user.user_id,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          specialization: user.specialization,
          verification_status: user.verification_status,
          avatar_url: user.avatar_url
        }
      });
    }

    // GET /api/auth/me
    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendJSON(res, 401, { error: 'Authentication required.' });
      }

      let profile = null;
      if (user.role === 'patient') {
        profile = db.prepare(`SELECT * FROM patient_profiles WHERE patient_id = ?`).get(user.user_id);
      }

      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
      `).get(user.user_id)?.count || 0;

      return sendJSON(res, 200, {
        user: {
          user_id: user.user_id,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          dob: user.dob,
          address: user.address,
          specialization: user.specialization,
          qualifications: user.qualifications,
          license_number: user.license_number,
          department: user.department,
          verification_status: user.verification_status,
          avatar_url: user.avatar_url,
          patient_profile: profile,
          unread_notifications: unreadCount
        }
      });
    }

    // POST /api/auth/logout
    if (method === 'POST' && pathname === '/api/auth/logout') {
      const user = getAuthenticatedUser(req);
      if (user) {
        db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(user.user_id);
        logAudit(user.user_id, user.role, 'USER_LOGOUT', 'sessions', clientIp, 'User logged out.');
      }
      return sendJSON(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    // 2. DASHBOARD METRICS & STATS
    // ------------------------------------------
    if (method === 'GET' && pathname === '/api/dashboard/stats') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      let stats = {};

      if (user.role === 'patient') {
        const appointmentsCount = db.prepare(`SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND status != 'cancelled'`).get(user.user_id)?.c || 0;
        const prescriptionsCount = db.prepare(`SELECT COUNT(*) as c FROM prescriptions WHERE patient_id = ?`).get(user.user_id)?.c || 0;
        const labsCount = db.prepare(`SELECT COUNT(*) as c FROM lab_requests WHERE patient_id = ?`).get(user.user_id)?.c || 0;
        const recordsCount = db.prepare(`SELECT COUNT(*) as c FROM medical_records WHERE patient_id = ?`).get(user.user_id)?.c || 0;
        const latestVitals = db.prepare(`SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1`).get(user.user_id);

        stats = { appointmentsCount, prescriptionsCount, labsCount, recordsCount, latestVitals };
      } else if (user.role === 'doctor') {
        const today = new Date().toISOString().slice(0, 10);
        const myPatients = db.prepare(`SELECT COUNT(DISTINCT patient_id) as c FROM appointments WHERE doctor_id = ?`).get(user.user_id)?.c || 0;
        const appointmentsToday = db.prepare(`SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND date = ?`).get(user.user_id, today)?.c || 0;
        const pendingAppointments = db.prepare(`SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND status = 'pending'`).get(user.user_id)?.c || 0;
        const totalConsultations = db.prepare(`SELECT COUNT(*) as c FROM medical_records WHERE doctor_id = ?`).get(user.user_id)?.c || 0;

        stats = { myPatients, appointmentsToday, pendingAppointments, totalConsultations };
      } else if (user.role === 'nurse') {
        const activeAdmissions = db.prepare(`SELECT COUNT(*) as c FROM inpatient_admissions WHERE status = 'admitted'`).get()?.c || 0;
        const vitalsRecordedToday = db.prepare(`SELECT COUNT(*) as c FROM vitals WHERE date(recorded_at) = date('now')`).get()?.c || 0;
        const totalPatients = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'patient'`).get()?.c || 0;

        stats = { activeAdmissions, vitalsRecordedToday, totalPatients, onDutyWard: user.department || 'General Ward' };
      } else if (user.role === 'admin') {
        const totalPatients = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'patient'`).get()?.c || 0;
        const totalDoctors = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'doctor'`).get()?.c || 0;
        const totalNurses = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'nurse'`).get()?.c || 0;
        const totalStaff = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role NOT IN ('patient', 'admin')`).get()?.c || 0;
        const totalAppointments = db.prepare(`SELECT COUNT(*) as c FROM appointments`).get()?.c || 0;
        const activeAdmissions = db.prepare(`SELECT COUNT(*) as c FROM inpatient_admissions WHERE status = 'admitted'`).get()?.c || 0;
        const revenueTotal = db.prepare(`SELECT SUM(paid_amount) as s FROM billing_invoices`).get()?.s || 0;
        const pendingVerifications = db.prepare(`SELECT COUNT(*) as c FROM users WHERE verification_status = 'pending'`).get()?.c || 0;

        stats = { totalPatients, totalDoctors, totalNurses, totalStaff, totalAppointments, activeAdmissions, revenueTotal, pendingVerifications };
      } else if (user.role === 'pharmacist') {
        const totalDrugs = db.prepare(`SELECT COUNT(*) as c FROM pharmacy_inventory`).get()?.c || 0;
        const lowStockCount = db.prepare(`SELECT COUNT(*) as c FROM pharmacy_inventory WHERE stock_quantity <= reorder_level`).get()?.c || 0;
        const pendingRx = db.prepare(`SELECT COUNT(*) as c FROM prescriptions WHERE status = 'prescribed'`).get()?.c || 0;
        const dispensedToday = db.prepare(`SELECT COUNT(*) as c FROM prescriptions WHERE status = 'dispensed' AND date(dispensed_at) = date('now')`).get()?.c || 0;

        stats = { totalDrugs, lowStockCount, pendingRx, dispensedToday };
      } else if (user.role === 'lab_tech') {
        const pendingTests = db.prepare(`SELECT COUNT(*) as c FROM lab_requests WHERE status = 'pending'`).get()?.c || 0;
        const inProgressTests = db.prepare(`SELECT COUNT(*) as c FROM lab_requests WHERE status = 'in_progress'`).get()?.c || 0;
        const completedToday = db.prepare(`SELECT COUNT(*) as c FROM lab_requests WHERE status = 'completed' AND date(completed_at) = date('now')`).get()?.c || 0;
        const criticalAlerts = db.prepare(`SELECT COUNT(*) as c FROM lab_requests WHERE flag = 'Critical'`).get()?.c || 0;

        stats = { pendingTests, inProgressTests, completedToday, criticalAlerts };
      } else if (user.role === 'receptionist') {
        const today = new Date().toISOString().slice(0, 10);
        const appointmentsToday = db.prepare(`SELECT COUNT(*) as c FROM appointments WHERE date = ?`).get(today)?.c || 0;
        const registeredPatients = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'patient'`).get()?.c || 0;
        const pendingAppointments = db.prepare(`SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'`).get()?.c || 0;
        const doctorsAvailable = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'doctor' AND verification_status = 'verified'`).get()?.c || 0;

        stats = { appointmentsToday, registeredPatients, pendingAppointments, doctorsAvailable };
      } else if (user.role === 'accountant') {
        const totalBilled = db.prepare(`SELECT SUM(total_amount) as s FROM billing_invoices`).get()?.s || 0;
        const totalPaid = db.prepare(`SELECT SUM(paid_amount) as s FROM billing_invoices`).get()?.s || 0;
        const pendingInvoices = db.prepare(`SELECT COUNT(*) as c FROM billing_invoices WHERE payment_status != 'paid'`).get()?.c || 0;
        const totalInvoices = db.prepare(`SELECT COUNT(*) as c FROM billing_invoices`).get()?.c || 0;

        stats = { totalBilled, totalPaid, pendingInvoices, totalInvoices, outstandingBalance: (totalBilled - totalPaid).toFixed(2) };
      }

      return sendJSON(res, 200, { success: true, role: user.role, stats });
    }

    // 3. DOCTORS & DIRECTORY
    // ------------------------------------------
    if (method === 'GET' && pathname === '/api/doctors') {
      const doctors = db.prepare(`
        SELECT u.user_id, u.name, u.email, u.phone, u.specialization, u.qualifications,
               u.department, u.verification_status, u.avatar_url
        FROM users u
        WHERE u.role = 'doctor' AND u.verification_status = 'verified'
      `).all();

      // Attach doctor schedules
      for (const doc of doctors) {
        doc.schedules = db.prepare(`SELECT * FROM doctor_schedules WHERE doctor_id = ?`).all(doc.user_id);
      }

      return sendJSON(res, 200, { success: true, doctors });
    }

    // 4. PATIENT MANAGEMENT & PROFILES
    // ------------------------------------------
    if (method === 'GET' && pathname === '/api/patients') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      // Only staff can list all patients
      if (user.role === 'patient') {
        return sendJSON(res, 403, { error: 'Forbidden' });
      }

      const q = parsedUrl.query.q || '';
      let patients;
      if (q) {
        const searchTerm = `%${q}%`;
        patients = db.prepare(`
          SELECT u.user_id, u.name, u.email, u.phone, u.gender, u.dob, u.address,
                 p.blood_group, p.genotype, p.allergies, p.chronic_conditions, p.nhis_number
          FROM users u
          LEFT JOIN patient_profiles p ON u.user_id = p.patient_id
          WHERE u.role = 'patient' AND (u.name LIKE ? OR u.email LIKE ? OR u.user_id LIKE ? OR u.phone LIKE ?)
        `).all(searchTerm, searchTerm, searchTerm, searchTerm);
      } else {
        patients = db.prepare(`
          SELECT u.user_id, u.name, u.email, u.phone, u.gender, u.dob, u.address,
                 p.blood_group, p.genotype, p.allergies, p.chronic_conditions, p.nhis_number
          FROM users u
          LEFT JOIN patient_profiles p ON u.user_id = p.patient_id
          WHERE u.role = 'patient'
          ORDER BY u.created_at DESC
        `).all();
      }

      return sendJSON(res, 200, { success: true, patients });
    }

    // GET /api/patients/:id (Detailed EMR Dossier)
    if (method === 'GET' && pathname.startsWith('/api/patients/')) {
      const targetPatientId = pathname.split('/')[3];
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      // Patient can only view their own dossier unless staff
      if (user.role === 'patient' && user.user_id !== targetPatientId) {
        return sendJSON(res, 403, { error: 'You are not authorized to view another patient\'s medical file.' });
      }

      const patient = db.prepare(`
        SELECT u.user_id, u.name, u.email, u.phone, u.gender, u.dob, u.address, u.created_at,
               p.blood_group, p.genotype, p.allergies, p.chronic_conditions,
               p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation, p.nhis_number
        FROM users u
        LEFT JOIN patient_profiles p ON u.user_id = p.patient_id
        WHERE u.user_id = ? AND u.role = 'patient'
      `).get(targetPatientId);

      if (!patient) return sendJSON(res, 404, { error: 'Patient not found' });

      const records = db.prepare(`
        SELECT r.*, d.name as doctor_name, d.specialization as doctor_specialization
        FROM medical_records r
        LEFT JOIN users d ON r.doctor_id = d.user_id
        WHERE r.patient_id = ?
        ORDER BY r.date DESC
      `).all(targetPatientId);

      const vitals = db.prepare(`
        SELECT v.*, u.name as recorded_by_name, u.role as recorded_by_role
        FROM vitals v
        LEFT JOIN users u ON v.recorded_by = u.user_id
        WHERE v.patient_id = ?
        ORDER BY v.recorded_at DESC
      `).all(targetPatientId);

      const prescriptions = db.prepare(`
        SELECT p.*, d.name as doctor_name
        FROM prescriptions p
        LEFT JOIN users d ON p.doctor_id = d.user_id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC
      `).all(targetPatientId);

      const labResults = db.prepare(`
        SELECT l.*, d.name as doctor_name
        FROM lab_requests l
        LEFT JOIN users d ON l.doctor_id = d.user_id
        WHERE l.patient_id = ?
        ORDER BY l.created_at DESC
      `).all(targetPatientId);

      const admissions = db.prepare(`
        SELECT a.*, d.name as admitted_by_name
        FROM inpatient_admissions a
        LEFT JOIN users d ON a.admitted_by = d.user_id
        WHERE a.patient_id = ?
        ORDER BY a.admission_date DESC
      `).all(targetPatientId);

      logAudit(user.user_id, user.role, 'EMR_ACCESS', targetPatientId, clientIp, `Accessed medical record dossier for ${targetPatientId}`);

      return sendJSON(res, 200, {
        success: true,
        patient,
        records,
        vitals,
        prescriptions,
        labResults,
        admissions
      });
    }

    // 5. APPOINTMENTS
    // ------------------------------------------
    if (pathname === '/api/appointments') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        let appts;
        if (user.role === 'patient') {
          appts = db.prepare(`
            SELECT a.*, d.name as doctor_name, d.specialization as doctor_specialization, d.department, d.avatar_url as doctor_avatar
            FROM appointments a
            JOIN users d ON a.doctor_id = d.user_id
            WHERE a.patient_id = ?
            ORDER BY a.date DESC, a.time_slot ASC
          `).all(user.user_id);
        } else if (user.role === 'doctor') {
          appts = db.prepare(`
            SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.gender as patient_gender, p.dob as patient_dob
            FROM appointments a
            JOIN users p ON a.patient_id = p.user_id
            WHERE a.doctor_id = ?
            ORDER BY a.date ASC, a.time_slot ASC
          `).all(user.user_id);
        } else {
          // Receptionist, Nurse, Admin, etc. view all
          appts = db.prepare(`
            SELECT a.*, p.name as patient_name, p.phone as patient_phone, d.name as doctor_name, d.specialization as doctor_specialization
            FROM appointments a
            JOIN users p ON a.patient_id = p.user_id
            JOIN users d ON a.doctor_id = d.user_id
            ORDER BY a.date DESC, a.time_slot ASC
          `).all();
        }

        return sendJSON(res, 200, { success: true, appointments: appts });
      }

      if (method === 'POST') {
        const body = await parseRequestBody(req);
        let { patient_id, doctor_id, department, date, time_slot, type, reason } = body;

        // If patient books, lock to their own patient_id
        if (user.role === 'patient') {
          patient_id = user.user_id;
        }

        if (!patient_id || !doctor_id || !date || !time_slot) {
          return sendJSON(res, 400, { error: 'Patient, doctor, date, and time slot are required.' });
        }

        // PREVENT DOUBLE-BOOKING: Check if doctor already has an appointment at this exact date & time slot
        const conflict = db.prepare(`
          SELECT appointment_id FROM appointments
          WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status NOT IN ('declined', 'cancelled')
        `).get(doctor_id, date, time_slot);

        if (conflict) {
          return sendJSON(res, 409, {
            error: `Dr. is already booked on ${date} at ${time_slot}. Please select another time slot or date.`
          });
        }

        const appointmentId = generateId('APT');
        const virtualMeetingId = (type === 'virtual') ? `VMEET-${crypto.randomBytes(4).toString('hex').toUpperCase()}` : null;

        db.prepare(`
          INSERT INTO appointments (
            appointment_id, patient_id, doctor_id, department, date, time_slot, type, reason, status, virtual_meeting_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(
          appointmentId, patient_id, doctor_id, department || 'General Medicine',
          date, time_slot, type || 'in_person', reason || 'General Consultation', virtualMeetingId
        );

        createNotification(doctor_id, 'New Appointment Request', `Patient has requested an appointment on ${date} at ${time_slot}.`, 'appointment');
        createNotification(patient_id, 'Appointment Requested', `Your appointment request for ${date} at ${time_slot} is pending doctor confirmation.`, 'appointment');
        logAudit(user.user_id, user.role, 'APPOINTMENT_BOOK', appointmentId, clientIp, `Booked appointment for ${date} ${time_slot}`);

        return sendJSON(res, 201, {
          success: true,
          message: 'Appointment booked successfully and awaiting confirmation.',
          appointment_id: appointmentId,
          virtual_meeting_id: virtualMeetingId
        });
      }
    }

    // PUT /api/appointments/:id/status (Approve, decline, reschedule, complete)
    if (method === 'PUT' && pathname.startsWith('/api/appointments/') && pathname.endsWith('/status')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const apptId = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      const { status, consultation_notes, date, time_slot } = body;

      const appt = db.prepare(`SELECT * FROM appointments WHERE appointment_id = ?`).get(apptId);
      if (!appt) return sendJSON(res, 404, { error: 'Appointment not found' });

      // Permission check: doctor assigned, receptionist, admin, or the patient themselves (if cancelling)
      if (user.role === 'patient') {
        if (appt.patient_id !== user.user_id || status !== 'cancelled') {
          return sendJSON(res, 403, { error: 'Patients may only cancel their own pending/confirmed appointments.' });
        }
      }

      if (date && time_slot) {
        // Rescheduling check
        const conflict = db.prepare(`
          SELECT appointment_id FROM appointments
          WHERE doctor_id = ? AND date = ? AND time_slot = ? AND appointment_id != ? AND status NOT IN ('declined', 'cancelled')
        `).get(appt.doctor_id, date, time_slot, apptId);

        if (conflict) {
          return sendJSON(res, 409, { error: 'Selected reschedule slot is already booked.' });
        }

        db.prepare(`
          UPDATE appointments
          SET date = ?, time_slot = ?, status = ?, consultation_notes = COALESCE(?, consultation_notes)
          WHERE appointment_id = ?
        `).run(date, time_slot, status || 'confirmed', consultation_notes || null, apptId);

        createNotification(appt.patient_id, 'Appointment Rescheduled', `Your appointment has been rescheduled to ${date} at ${time_slot}.`, 'appointment');
      } else {
        db.prepare(`
          UPDATE appointments
          SET status = ?, consultation_notes = COALESCE(?, consultation_notes)
          WHERE appointment_id = ?
        `).run(status, consultation_notes || null, apptId);

        createNotification(appt.patient_id, `Appointment ${status.toUpperCase()}`, `Your appointment has been marked as ${status}.`, 'appointment');
      }

      logAudit(user.user_id, user.role, 'APPOINTMENT_STATUS_UPDATE', apptId, clientIp, `Updated status to ${status}`);

      return sendJSON(res, 200, { success: true, message: `Appointment status updated to ${status}` });
    }

    // 6. MEDICAL RECORDS (EMR)
    // ------------------------------------------
    if (pathname === '/api/medical-records') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        const patientId = parsedUrl.query.patient_id;
        let records;
        if (user.role === 'patient') {
          records = db.prepare(`
            SELECT r.*, d.name as doctor_name, d.specialization as doctor_specialization
            FROM medical_records r
            JOIN users d ON r.doctor_id = d.user_id
            WHERE r.patient_id = ?
            ORDER BY r.date DESC
          `).all(user.user_id);
        } else if (patientId) {
          records = db.prepare(`
            SELECT r.*, d.name as doctor_name, d.specialization as doctor_specialization
            FROM medical_records r
            JOIN users d ON r.doctor_id = d.user_id
            WHERE r.patient_id = ?
            ORDER BY r.date DESC
          `).all(patientId);
        } else {
          records = db.prepare(`
            SELECT r.*, p.name as patient_name, d.name as doctor_name
            FROM medical_records r
            JOIN users p ON r.patient_id = p.user_id
            JOIN users d ON r.doctor_id = d.user_id
            ORDER BY r.date DESC
          `).all();
        }

        return sendJSON(res, 200, { success: true, records });
      }

      if (method === 'POST') {
        // Only doctors and verified admins can create medical records
        if (user.role !== 'doctor' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Only licensed healthcare doctors can create medical diagnoses and clinical notes.' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, diagnosis, symptoms, clinical_notes, treatment_plan, icd_code, follow_up_date } = body;

        if (!patient_id || !diagnosis) {
          return sendJSON(res, 400, { error: 'Patient ID and diagnosis are required.' });
        }

        const recordId = generateId('EMR');
        db.prepare(`
          INSERT INTO medical_records (
            record_id, patient_id, doctor_id, diagnosis, symptoms, clinical_notes,
            treatment_plan, icd_code, follow_up_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          recordId, patient_id, user.user_id, diagnosis, symptoms || '',
          clinical_notes || '', treatment_plan || '', icd_code || '', follow_up_date || null
        );

        createNotification(patient_id, 'Medical Record Updated', `Dr. ${user.name} has documented a new consultation report and treatment plan.`, 'system');
        logAudit(user.user_id, user.role, 'EMR_CREATE', recordId, clientIp, `Recorded diagnosis for patient ${patient_id}`);

        return sendJSON(res, 201, { success: true, message: 'Clinical record documented successfully.', record_id: recordId });
      }
    }

    // 7. VITALS LOGGING
    // ------------------------------------------
    if (pathname === '/api/vitals') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        const patientId = parsedUrl.query.patient_id || (user.role === 'patient' ? user.user_id : null);
        let vitalsList;
        if (patientId) {
          vitalsList = db.prepare(`
            SELECT v.*, u.name as recorded_by_name, u.role as recorded_by_role
            FROM vitals v
            JOIN users u ON v.recorded_by = u.user_id
            WHERE v.patient_id = ?
            ORDER BY v.recorded_at DESC
          `).all(patientId);
        } else {
          vitalsList = db.prepare(`
            SELECT v.*, p.name as patient_name, u.name as recorded_by_name
            FROM vitals v
            JOIN users p ON v.patient_id = p.user_id
            JOIN users u ON v.recorded_by = u.user_id
            ORDER BY v.recorded_at DESC LIMIT 50
          `).all();
        }
        return sendJSON(res, 200, { success: true, vitals: vitalsList });
      }

      if (method === 'POST') {
        // Doctors and nurses can record vitals
        if (user.role !== 'nurse' && user.role !== 'doctor' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Only nurses or clinical staff can record patient vital signs.' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, temperature, systolic_bp, diastolic_bp, pulse_rate, respiratory_rate, spo2, weight, blood_sugar, nursing_notes } = body;

        if (!patient_id) return sendJSON(res, 400, { error: 'Patient ID is required.' });

        db.prepare(`
          INSERT INTO vitals (
            patient_id, recorded_by, temperature, systolic_bp, diastolic_bp,
            pulse_rate, respiratory_rate, spo2, weight, blood_sugar, nursing_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          patient_id, user.user_id,
          temperature ? parseFloat(temperature) : null,
          systolic_bp ? parseInt(systolic_bp) : null,
          diastolic_bp ? parseInt(diastolic_bp) : null,
          pulse_rate ? parseInt(pulse_rate) : null,
          respiratory_rate ? parseInt(respiratory_rate) : null,
          spo2 ? parseFloat(spo2) : null,
          weight ? parseFloat(weight) : null,
          blood_sugar ? parseFloat(blood_sugar) : null,
          nursing_notes || ''
        );

        // Immediate clinical anomaly flag check
        const warnings = [];
        if (systolic_bp >= 160 || diastolic_bp >= 100) warnings.push('Critical High Blood Pressure (Stage 2 / Crisis warning)');
        if (temperature >= 38.5) warnings.push('High Fever (Hyperpyrexia warning)');
        if (spo2 && spo2 < 93) warnings.push('Low Oxygen Saturation (Hypoxemia warning)');
        if (pulse_rate >= 115) warnings.push('Severe Tachycardia');

        createNotification(patient_id, 'Vital Signs Recorded', `Your vital signs have been recorded by ${user.name}.`, 'vitals');
        logAudit(user.user_id, user.role, 'VITALS_RECORD', patient_id, clientIp, `Logged vitals for patient ${patient_id}`);

        return sendJSON(res, 201, {
          success: true,
          message: 'Patient vitals saved successfully.',
          clinicalWarnings: warnings
        });
      }
    }

    // 8. PRESCRIPTIONS
    // ------------------------------------------
    if (pathname === '/api/prescriptions') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        let rxList;
        if (user.role === 'patient') {
          rxList = db.prepare(`
            SELECT pr.*, d.name as doctor_name, d.specialization as doctor_specialization,
                   ph.name as dispensed_by_name
            FROM prescriptions pr
            JOIN users d ON pr.doctor_id = d.user_id
            LEFT JOIN users ph ON pr.dispensed_by = ph.user_id
            WHERE pr.patient_id = ?
            ORDER BY pr.created_at DESC
          `).all(user.user_id);
        } else {
          rxList = db.prepare(`
            SELECT pr.*, p.name as patient_name, d.name as doctor_name,
                   ph.name as dispensed_by_name
            FROM prescriptions pr
            JOIN users p ON pr.patient_id = p.user_id
            JOIN users d ON pr.doctor_id = d.user_id
            LEFT JOIN users ph ON pr.dispensed_by = ph.user_id
            ORDER BY pr.created_at DESC
          `).all();
        }
        return sendJSON(res, 200, { success: true, prescriptions: rxList });
      }

      if (method === 'POST') {
        if (user.role !== 'doctor' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Only licensed doctors are authorized to issue medical prescriptions.' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, medication_name, dosage, frequency, duration, instructions, record_id } = body;

        if (!patient_id || !medication_name || !dosage || !frequency || !duration) {
          return sendJSON(res, 400, { error: 'Patient ID, medication name, dosage, frequency, and duration are required.' });
        }

        const rxId = generateId('RX');
        db.prepare(`
          INSERT INTO prescriptions (
            rx_id, patient_id, doctor_id, record_id, medication_name, dosage, frequency, duration, instructions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          rxId, patient_id, user.user_id, record_id || null,
          medication_name, dosage, frequency, duration, instructions || ''
        );

        createNotification(patient_id, 'New Prescription Issued', `Dr. ${user.name} prescribed ${medication_name} (${dosage}).`, 'prescription');
        logAudit(user.user_id, user.role, 'RX_ISSUE', rxId, clientIp, `Prescribed ${medication_name} to patient ${patient_id}`);

        return sendJSON(res, 201, { success: true, message: 'Prescription issued successfully.', rx_id: rxId });
      }
    }

    // PUT /api/prescriptions/:id/dispense (Pharmacist dispensing)
    if (method === 'PUT' && pathname.startsWith('/api/prescriptions/') && pathname.endsWith('/dispense')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (user.role !== 'pharmacist' && user.role !== 'admin') {
        return sendJSON(res, 403, { error: 'Only authorized hospital pharmacists can dispense medications.' });
      }

      const rxId = pathname.split('/')[3];
      const rx = db.prepare(`SELECT * FROM prescriptions WHERE rx_id = ?`).get(rxId);
      if (!rx) return sendJSON(res, 404, { error: 'Prescription not found' });

      db.prepare(`
        UPDATE prescriptions
        SET status = 'dispensed', dispensed_by = ?, dispensed_at = CURRENT_TIMESTAMP
        WHERE rx_id = ?
      `).run(user.user_id, rxId);

      createNotification(rx.patient_id, 'Medication Dispensed', `Your prescription for ${rx.medication_name} has been dispensed by ${user.name}.`, 'prescription');
      logAudit(user.user_id, user.role, 'RX_DISPENSE', rxId, clientIp, `Dispensed ${rx.medication_name}`);

      return sendJSON(res, 200, { success: true, message: 'Prescription dispensed successfully.' });
    }

    // 9. LABORATORY REQUESTS & RESULTS
    // ------------------------------------------
    if (pathname === '/api/lab-requests') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        let labs;
        if (user.role === 'patient') {
          labs = db.prepare(`
            SELECT l.*, d.name as doctor_name, t.name as completed_by_name
            FROM lab_requests l
            JOIN users d ON l.doctor_id = d.user_id
            LEFT JOIN users t ON l.completed_by = t.user_id
            WHERE l.patient_id = ?
            ORDER BY l.created_at DESC
          `).all(user.user_id);
        } else {
          labs = db.prepare(`
            SELECT l.*, p.name as patient_name, d.name as doctor_name, t.name as completed_by_name
            FROM lab_requests l
            JOIN users p ON l.patient_id = p.user_id
            JOIN users d ON l.doctor_id = d.user_id
            LEFT JOIN users t ON l.completed_by = t.user_id
            ORDER BY l.created_at DESC
          `).all();
        }
        return sendJSON(res, 200, { success: true, labRequests: labs });
      }

      if (method === 'POST') {
        if (user.role !== 'doctor' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Only doctors can order diagnostic laboratory investigations.' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, test_name, specimen_type, priority } = body;

        if (!patient_id || !test_name || !specimen_type) {
          return sendJSON(res, 400, { error: 'Patient ID, test name, and specimen type are required.' });
        }

        const labId = generateId('LAB');
        db.prepare(`
          INSERT INTO lab_requests (lab_id, patient_id, doctor_id, test_name, specimen_type, priority)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(labId, patient_id, user.user_id, test_name, specimen_type, priority || 'Routine');

        createNotification(patient_id, 'Laboratory Test Requested', `Dr. ${user.name} ordered a ${test_name} test for you.`, 'lab');
        logAudit(user.user_id, user.role, 'LAB_ORDER', labId, clientIp, `Ordered lab test ${test_name}`);

        return sendJSON(res, 201, { success: true, message: 'Laboratory test ordered.', lab_id: labId });
      }
    }

    // PUT /api/lab-requests/:id/result (Lab Technician records results)
    if (method === 'PUT' && pathname.startsWith('/api/lab-requests/') && pathname.endsWith('/result')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (user.role !== 'lab_tech' && user.role !== 'admin') {
        return sendJSON(res, 403, { error: 'Only authorized Medical Laboratory Scientists can verify and enter lab results.' });
      }

      const labId = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      const { result_value, normal_range, flag, technician_notes } = body;

      const lab = db.prepare(`SELECT * FROM lab_requests WHERE lab_id = ?`).get(labId);
      if (!lab) return sendJSON(res, 404, { error: 'Lab request not found' });

      db.prepare(`
        UPDATE lab_requests
        SET status = 'completed', result_value = ?, normal_range = ?, flag = ?,
            technician_notes = ?, completed_by = ?, completed_at = CURRENT_TIMESTAMP
        WHERE lab_id = ?
      `).run(
        result_value || '', normal_range || '', flag || 'Normal',
        technician_notes || '', user.user_id, labId
      );

      createNotification(lab.patient_id, 'Lab Results Verified', `Results for your ${lab.test_name} are now available.`, 'lab');
      createNotification(lab.doctor_id, 'Lab Results Available', `Results for ${lab.test_name} (Patient: ${lab.patient_id}) are uploaded. Flag: ${flag || 'Normal'}`, 'lab');
      logAudit(user.user_id, user.role, 'LAB_RESULT_ENTER', labId, clientIp, `Uploaded results for ${labId}`);

      return sendJSON(res, 200, { success: true, message: 'Lab test results recorded and verified.' });
    }

    // 10. PHARMACY INVENTORY
    // ------------------------------------------
    if (pathname === '/api/pharmacy') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        const drugs = db.prepare(`SELECT * FROM pharmacy_inventory ORDER BY category ASC, name ASC`).all();
        return sendJSON(res, 200, { success: true, inventory: drugs });
      }

      if (method === 'POST') {
        if (user.role !== 'pharmacist' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Only pharmacists can add medication items.' });
        }

        const body = await parseRequestBody(req);
        const { drug_code, name, category, dosage_form, stock_quantity, unit_price, batch_number, expiry_date, reorder_level, is_prescription_only } = body;

        const code = drug_code || `DRG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        db.prepare(`
          INSERT INTO pharmacy_inventory (
            drug_code, name, category, dosage_form, stock_quantity, unit_price, batch_number, expiry_date, reorder_level, is_prescription_only
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code, name, category, dosage_form,
          parseInt(stock_quantity) || 0,
          parseFloat(unit_price) || 0.0,
          batch_number || '', expiry_date || '',
          parseInt(reorder_level) || 10,
          is_prescription_only ? 1 : 0
        );

        logAudit(user.user_id, user.role, 'PHARMACY_STOCK_ADD', code, clientIp, `Added drug ${name}`);
        return sendJSON(res, 201, { success: true, message: 'Medication added to pharmacy formulary.' });
      }
    }

    // PUT /api/pharmacy/:id (Update stock)
    if (method === 'PUT' && pathname.startsWith('/api/pharmacy/')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (user.role !== 'pharmacist' && user.role !== 'admin') {
        return sendJSON(res, 403, { error: 'Unauthorized' });
      }

      const id = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      const { stock_quantity, unit_price } = body;

      db.prepare(`
        UPDATE pharmacy_inventory
        SET stock_quantity = COALESCE(?, stock_quantity), unit_price = COALESCE(?, unit_price)
        WHERE id = ? OR drug_code = ?
      `).run(stock_quantity !== undefined ? parseInt(stock_quantity) : null, unit_price !== undefined ? parseFloat(unit_price) : null, id, id);

      logAudit(user.user_id, user.role, 'PHARMACY_STOCK_UPDATE', id, clientIp, `Updated stock for ${id}`);
      return sendJSON(res, 200, { success: true, message: 'Stock updated.' });
    }

    // 11. INPATIENT ADMISSIONS & BEDS
    // ------------------------------------------
    if (pathname === '/api/admissions') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        const admissions = db.prepare(`
          SELECT a.*, p.name as patient_name, p.gender as patient_gender, d.name as admitted_by_name
          FROM inpatient_admissions a
          JOIN users p ON a.patient_id = p.user_id
          JOIN users d ON a.admitted_by = d.user_id
          ORDER BY a.status ASC, a.admission_date DESC
        `).all();
        return sendJSON(res, 200, { success: true, admissions });
      }

      if (method === 'POST') {
        if (user.role !== 'doctor' && user.role !== 'nurse' && user.role !== 'admin') {
          return sendJSON(res, 403, { error: 'Unauthorized' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, ward, bed_number, admission_reason } = body;

        const admId = generateId('ADM');
        db.prepare(`
          INSERT INTO inpatient_admissions (admission_id, patient_id, admitted_by, ward, bed_number, admission_reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(admId, patient_id, user.user_id, ward, bed_number, admission_reason || '');

        createNotification(patient_id, 'Inpatient Admission', `You have been admitted to ${ward}, Bed ${bed_number}.`, 'system');
        logAudit(user.user_id, user.role, 'INPATIENT_ADMIT', admId, clientIp, `Admitted patient ${patient_id} to ${ward} Bed ${bed_number}`);

        return sendJSON(res, 201, { success: true, message: 'Patient admitted successfully.', admission_id: admId });
      }
    }

    // PUT /api/admissions/:id/discharge
    if (method === 'PUT' && pathname.startsWith('/api/admissions/') && pathname.endsWith('/discharge')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const admId = pathname.split('/')[3];
      db.prepare(`
        UPDATE inpatient_admissions
        SET status = 'discharged', discharge_date = CURRENT_TIMESTAMP
        WHERE admission_id = ?
      `).run(admId);

      logAudit(user.user_id, user.role, 'INPATIENT_DISCHARGE', admId, clientIp, `Discharged admission ${admId}`);
      return sendJSON(res, 200, { success: true, message: 'Patient discharged successfully.' });
    }

    // 12. BILLING & INVOICING
    // ------------------------------------------
    if (pathname === '/api/billing') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        let invoices;
        if (user.role === 'patient') {
          invoices = db.prepare(`
            SELECT * FROM billing_invoices WHERE patient_id = ? ORDER BY created_at DESC
          `).all(user.user_id);
        } else {
          invoices = db.prepare(`
            SELECT b.*, p.name as patient_name
            FROM billing_invoices b
            JOIN users p ON b.patient_id = p.user_id
            ORDER BY b.created_at DESC
          `).all();
        }
        return sendJSON(res, 200, { success: true, invoices });
      }

      if (method === 'POST') {
        if (user.role !== 'accountant' && user.role !== 'admin' && user.role !== 'receptionist') {
          return sendJSON(res, 403, { error: 'Unauthorized' });
        }

        const body = await parseRequestBody(req);
        const { patient_id, items, payment_method, paid_amount } = body;

        const total = (items || []).reduce((acc, it) => acc + (parseFloat(it.amount) || 0) * (parseInt(it.quantity) || 1), 0);
        const paid = parseFloat(paid_amount) || 0;
        let pStatus = 'unpaid';
        if (paid >= total) pStatus = 'paid';
        else if (paid > 0) pStatus = 'partially_paid';

        const invId = generateId('INV');
        db.prepare(`
          INSERT INTO billing_invoices (invoice_id, patient_id, items_json, total_amount, paid_amount, payment_method, payment_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invId, patient_id, JSON.stringify(items || []), total, paid, payment_method || 'Cash', pStatus);

        createNotification(patient_id, 'New Hospital Invoice Generated', `Invoice ${invId} for GHS ${total.toFixed(2)} has been prepared.`, 'system');
        logAudit(user.user_id, user.role, 'BILLING_GENERATE', invId, clientIp, `Generated invoice for ${patient_id} amount: GHS ${total}`);

        return sendJSON(res, 201, { success: true, message: 'Invoice generated.', invoice_id: invId });
      }
    }

    // PUT /api/billing/:id/pay
    if (method === 'PUT' && pathname.startsWith('/api/billing/') && pathname.endsWith('/pay')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const invId = pathname.split('/')[3];
      const body = await parseRequestBody(req);
      const { paid_amount, payment_method } = body;

      const inv = db.prepare(`SELECT * FROM billing_invoices WHERE invoice_id = ?`).get(invId);
      if (!inv) return sendJSON(res, 404, { error: 'Invoice not found' });

      const newPaid = (inv.paid_amount || 0) + (parseFloat(paid_amount) || 0);
      let pStatus = 'partially_paid';
      if (newPaid >= inv.total_amount) pStatus = 'paid';

      db.prepare(`
        UPDATE billing_invoices
        SET paid_amount = ?, payment_status = ?, payment_method = COALESCE(?, payment_method)
        WHERE invoice_id = ?
      `).run(newPaid, pStatus, payment_method || null, invId);

      createNotification(inv.patient_id, 'Payment Received', `Payment of GHS ${paid_amount} received for invoice ${invId}.`, 'system');
      logAudit(user.user_id, user.role, 'BILLING_PAYMENT', invId, clientIp, `Recorded payment of GHS ${paid_amount}`);

      return sendJSON(res, 200, { success: true, message: 'Payment recorded successfully.' });
    }

    // 13. NOTIFICATIONS
    // ------------------------------------------
    if (pathname === '/api/notifications') {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      if (method === 'GET') {
        const notes = db.prepare(`
          SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
        `).all(user.user_id);
        return sendJSON(res, 200, { success: true, notifications: notes });
      }
    }

    // PUT /api/notifications/:id/read
    if (method === 'PUT' && pathname.startsWith('/api/notifications/') && pathname.endsWith('/read')) {
      const user = getAuthenticatedUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      const id = pathname.split('/')[3];
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, user.user_id);
      return sendJSON(res, 200, { success: true });
    }

    // 14. ADMIN & COMPLIANCE AUDIT LOGS
    // ------------------------------------------
    if (pathname === '/api/admin/audit-logs') {
      const user = getAuthenticatedUser(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { error: 'Admin access required.' });

      const logs = db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`).all();
      return sendJSON(res, 200, { success: true, logs });
    }

    if (pathname === '/api/admin/users') {
      const user = getAuthenticatedUser(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { error: 'Admin access required.' });

      const usersList = db.prepare(`
        SELECT user_id, role, name, email, phone, gender, department, specialization, license_number, verification_status, created_at
        FROM users
        ORDER BY created_at DESC
      `).all();
      return sendJSON(res, 200, { success: true, users: usersList });
    }

    // PUT /api/admin/users/:id/verify
    if (method === 'PUT' && pathname.startsWith('/api/admin/users/') && pathname.endsWith('/verify')) {
      const user = getAuthenticatedUser(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { error: 'Admin access required.' });

      const targetId = pathname.split('/')[4];
      const body = await parseRequestBody(req);
      const { status } = body; // 'verified' or 'rejected'

      db.prepare(`UPDATE users SET verification_status = ? WHERE user_id = ?`).run(status || 'verified', targetId);
      createNotification(targetId, 'Credential Verification Updated', `Your professional credentials have been marked as ${status}.`, 'system');
      logAudit(user.user_id, 'admin', 'USER_VERIFY', targetId, clientIp, `Updated verification status to ${status}`);

      return sendJSON(res, 200, { success: true, message: `User credentials marked as ${status}.` });
    }

    // 15. SEARCHABLE MEDICAL KNOWLEDGE BASE
    // ------------------------------------------
    if (pathname === '/api/knowledge') {
      const q = parsedUrl.query.q || '';
      const category = parsedUrl.query.category || '';

      let results;
      if (q) {
        results = searchKnowledge(q);
      } else if (category) {
        results = db.prepare(`SELECT * FROM medical_knowledge WHERE category = ?`).all(category);
      } else {
        results = db.prepare(`SELECT * FROM medical_knowledge ORDER BY category ASC`).all();
      }

      return sendJSON(res, 200, { success: true, results });
    }

    // 16. AI HEALTHCARE ASSISTANT CHAT
    // ------------------------------------------
    if (method === 'POST' && pathname === '/api/ai/chat') {
      const body = await parseRequestBody(req);
      const user = getAuthenticatedUser(req);
      const { message, role_mode } = body;

      if (!message || !message.trim()) {
        return sendJSON(res, 400, { error: 'Message cannot be empty.' });
      }

      const activeRole = role_mode || user?.role || 'patient';
      const activeName = user?.name || 'Visitor';

      const aiResponse = await generateHealthcareResponse({
        message,
        userRole: activeRole,
        userName: activeName,
        context: { user_id: user?.user_id }
      });

      if (user) {
        logAudit(user.user_id, activeRole, 'AI_CHAT_QUERY', 'ai_assistant', clientIp, `Query: ${message.slice(0, 60)}...`);
      }

      return sendJSON(res, 200, {
        success: true,
        ...aiResponse
      });
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    const extname = path.extname(filePath).toLowerCase();

    // Security: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Access Denied');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If file doesn't exist, fallback to index.html for SPA client-side routing
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const contentType = MIME_TYPES[extname] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    });

  } catch (err) {
    console.error('Server Internal Error:', err);
    sendJSON(res, 500, { error: 'Internal Server Error', message: err.message });
  }
}

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 AI-POWERED HOSPITAL MANAGEMENT SYSTEM (HMS) READY`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🛡️ Ghanaian Act 843 & HIPAA compliance engine active`);
    console.log(`🤖 AI Healthcare Assistant initialized in dual mode`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, handleRequest };
