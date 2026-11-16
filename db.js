// src/db.js
// SQLite database layer using Node.js built-in node:sqlite (SQLite 3.53+)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

// In Vercel serverless functions, the root is read-only, so we use /tmp for runtime operations
const isVercel = process.env.VERCEL === '1';
const DB_PATH = isVercel ? path.join('/tmp', 'hms.db') : path.join(__dirname, '..', 'hms.db');

if (isVercel) {
  const bundledDb = path.join(__dirname, '..', 'hms.db');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(bundledDb)) {
    try {
      fs.copyFileSync(bundledDb, DB_PATH);
    } catch (e) {
      console.error('Failed to copy bundled db to /tmp:', e);
    }
  }
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for performance and data integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

function initSchema() {
  db.exec(`
    -- Users table (Patients, Doctors, Nurses, Administrators, Staff)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL, -- 'patient', 'doctor', 'nurse', 'admin', 'pharmacist', 'lab_tech', 'receptionist', 'accountant'
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      gender TEXT,
      dob TEXT,
      address TEXT,
      specialization TEXT, -- For doctors
      qualifications TEXT, -- For doctors & nurses
      license_number TEXT, -- For doctors & nurses
      department TEXT,
      verification_status TEXT DEFAULT 'verified', -- 'verified', 'pending', 'rejected'
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Active Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    -- Patient Profiles (Extended medical details)
    CREATE TABLE IF NOT EXISTS patient_profiles (
      patient_id TEXT PRIMARY KEY,
      blood_group TEXT,
      genotype TEXT,
      allergies TEXT,
      chronic_conditions TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      emergency_contact_relation TEXT,
      nhis_number TEXT, -- Ghana National Health Insurance Scheme
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    -- Appointments Table
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      department TEXT,
      date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL, -- e.g. 09:00 AM
      type TEXT NOT NULL DEFAULT 'in_person', -- 'in_person' or 'virtual'
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'completed', 'cancelled'
      consultation_notes TEXT,
      virtual_meeting_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (doctor_id) REFERENCES users(user_id)
    );

    -- Electronic Medical Records (EMR)
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      symptoms TEXT,
      clinical_notes TEXT,
      treatment_plan TEXT,
      icd_code TEXT,
      follow_up_date TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (doctor_id) REFERENCES users(user_id)
    );

    -- Patient Vital Signs
    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      temperature REAL, -- Celsius
      systolic_bp INTEGER, -- mmHg
      diastolic_bp INTEGER, -- mmHg
      pulse_rate INTEGER, -- bpm
      respiratory_rate INTEGER, -- breaths/min
      spo2 REAL, -- % oxygen saturation
      weight REAL, -- kg
      blood_sugar REAL, -- mmol/L
      nursing_notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (recorded_by) REFERENCES users(user_id)
    );

    -- Prescriptions
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rx_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      record_id TEXT,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT,
      status TEXT NOT NULL DEFAULT 'prescribed', -- 'prescribed', 'dispensed', 'cancelled'
      dispensed_by TEXT,
      dispensed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (doctor_id) REFERENCES users(user_id)
    );

    -- Laboratory Requests and Results
    CREATE TABLE IF NOT EXISTS lab_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lab_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      specimen_type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Routine', -- 'Routine', 'Urgent', 'STAT'
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sample_collected', 'in_progress', 'completed'
      result_value TEXT,
      normal_range TEXT,
      flag TEXT DEFAULT 'Normal', -- 'Normal', 'High', 'Low', 'Critical'
      technician_notes TEXT,
      completed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (doctor_id) REFERENCES users(user_id)
    );

    -- Pharmacy Inventory
    CREATE TABLE IF NOT EXISTS pharmacy_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drug_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      dosage_form TEXT NOT NULL, -- Tablet, Syrup, Injection, Capsule, IV
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      reorder_level INTEGER NOT NULL DEFAULT 10,
      is_prescription_only INTEGER NOT NULL DEFAULT 1
    );

    -- Inpatient Ward & Bed Admissions
    CREATE TABLE IF NOT EXISTS inpatient_admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      admitted_by TEXT NOT NULL,
      ward TEXT NOT NULL,
      bed_number TEXT NOT NULL,
      admission_reason TEXT,
      admission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      discharge_date DATETIME,
      status TEXT NOT NULL DEFAULT 'admitted', -- 'admitted', 'discharged'
      FOREIGN KEY (patient_id) REFERENCES users(user_id),
      FOREIGN KEY (admitted_by) REFERENCES users(user_id)
    );

    -- Billing and Invoicing
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      items_json TEXT NOT NULL, -- JSON array of line items [{name, quantity, amount}]
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT, -- 'Cash', 'Mobile Money (MoMo)', 'Card', 'NHIS/Insurance'
      payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(user_id)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system', -- 'appointment', 'prescription', 'lab', 'vitals', 'system'
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    -- Data Protection Act 2012 (Act 843) Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      ip_address TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Searchable Medical Knowledge Base (Symptoms, First Aid, Medications)
    CREATE TABLE IF NOT EXISTS medical_knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- 'symptom', 'illness', 'first_aid', 'medication'
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      emergency_level TEXT DEFAULT 'none' -- 'none', 'moderate', 'high', 'immediate_emergency'
    );

    -- Doctor Consultation Availability Schedules
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id TEXT NOT NULL,
      day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
      start_time TEXT NOT NULL, -- '08:00 AM'
      end_time TEXT NOT NULL, -- '04:00 PM'
      max_patients INTEGER DEFAULT 15,
      FOREIGN KEY (doctor_id) REFERENCES users(user_id)
    );
  `);
}

// Security: Hash password using crypto.scrypt
function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// Log compliance and audit entries (Ghanaian Act 843 & clinical audit)
function logAudit(userId, userRole, action, resource, ipAddress, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_role, action, resource, ip_address, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId || 'anonymous', userRole || 'guest', action, resource, ipAddress || '127.0.0.1', details || '');
  } catch (err) {
    console.error('Audit log failure:', err.message);
  }
}

// Create in-app notification
function createNotification(userId, title, message, type = 'system') {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, title, message, type);
  } catch (err) {
    console.error('Notification creation failure:', err.message);
  }
}

initSchema();

module.exports = {
  db,
  initSchema,
  hashPassword,
  verifyPassword,
  logAudit,
  createNotification
};
