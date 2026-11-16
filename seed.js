// src/seed.js
// Seeds the HMS SQLite database with realistic initial data across all 8 user roles
const { db, hashPassword } = require('./db');

function seedDatabase() {
  console.log('Seeding Hospital Management System database...');

  // Clear existing data in reverse order of foreign keys
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM billing_invoices;
    DELETE FROM inpatient_admissions;
    DELETE FROM lab_requests;
    DELETE FROM prescriptions;
    DELETE FROM vitals;
    DELETE FROM medical_records;
    DELETE FROM appointments;
    DELETE FROM doctor_schedules;
    DELETE FROM patient_profiles;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM pharmacy_inventory;
    DELETE FROM medical_knowledge;
  `);

  // 1. Users table
  const insertUser = db.prepare(`
    INSERT INTO users (
      user_id, role, name, email, phone, password_hash, password_salt,
      gender, dob, address, specialization, qualifications, license_number,
      department, verification_status, avatar_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const usersData = [
    // Administrator
    {
      user_id: 'HMS-ADM-001',
      role: 'admin',
      name: 'Dr. Kofi Osei-Tutu',
      email: 'admin@hospital.org',
      phone: '+233 24 411 0001',
      password: 'admin123',
      gender: 'Male',
      dob: '1975-04-12',
      address: 'Airport Residential Area, Accra',
      specialization: 'Healthcare Administration & Public Health',
      qualifications: 'MBChB, MPH, FWACP, DHA',
      license_number: 'MDC/RN/31045',
      department: 'Executive Administration',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'
    },
    // Doctor 1 - Cardiologist
    {
      user_id: 'HMS-DOC-101',
      role: 'doctor',
      name: 'Dr. Kwesi Mensah',
      email: 'dr.mensah@hospital.org',
      phone: '+233 20 812 3456',
      password: 'doctor123',
      gender: 'Male',
      dob: '1980-08-22',
      address: 'East Legon Hills, Accra',
      specialization: 'Cardiology',
      qualifications: 'MBChB (UGMS), FWACS (Cardiology), FACC',
      license_number: 'MDC/RN/44912',
      department: 'Cardiology & Internal Medicine',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150'
    },
    // Doctor 2 - Pediatrician
    {
      user_id: 'HMS-DOC-102',
      role: 'doctor',
      name: 'Dr. Akosua Boateng',
      email: 'dr.boateng@hospital.org',
      phone: '+233 24 933 2145',
      password: 'doctor123',
      gender: 'Female',
      dob: '1985-11-15',
      address: 'Cantonments, Accra',
      specialization: 'Pediatrics & Child Health',
      qualifications: 'MBChB (KNUST), MWACP (Paediatrics)',
      license_number: 'MDC/RN/51204',
      department: 'Pediatrics',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1594824813511-209e992167d4?w=150'
    },
    // Doctor 3 - General Surgery & Orthopedics
    {
      user_id: 'HMS-DOC-103',
      role: 'doctor',
      name: 'Dr. David Appiah',
      email: 'dr.appiah@hospital.org',
      phone: '+233 50 144 9876',
      password: 'doctor123',
      gender: 'Male',
      dob: '1978-02-18',
      address: 'Ridge, Accra',
      specialization: 'Orthopedic & General Surgery',
      qualifications: 'MBChB, FGCS, FACS',
      license_number: 'MDC/RN/38891',
      department: 'Surgery & Orthopedics',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150'
    },
    // Nurse 1 - Ward Nurse
    {
      user_id: 'HMS-NUR-201',
      role: 'nurse',
      name: 'Nurse Grace Ofori',
      email: 'nurse.grace@hospital.org',
      phone: '+233 24 555 7890',
      password: 'nurse123',
      gender: 'Female',
      dob: '1990-06-30',
      address: 'Adenta Housing, Accra',
      specialization: 'Medical-Surgical Nursing',
      qualifications: 'BSc Nursing (UG), RN, RM',
      license_number: 'NMC/RN/88219',
      department: 'Male Medical Ward',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=150'
    },
    // Nurse 2 - Emergency / Triage
    {
      user_id: 'HMS-NUR-202',
      role: 'nurse',
      name: 'Nurse Kofi Antwi',
      email: 'nurse.kofi@hospital.org',
      phone: '+233 55 678 1234',
      password: 'nurse123',
      gender: 'Male',
      dob: '1992-09-14',
      address: 'Madina Firestone, Accra',
      specialization: 'Critical Care & Emergency Triage',
      qualifications: 'BSc Emergency Nursing, CPR/ACLS Certified',
      license_number: 'NMC/RN/94012',
      department: 'Emergency & Triage',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=150'
    },
    // Pharmacist
    {
      user_id: 'HMS-PHARM-301',
      role: 'pharmacist',
      name: 'Pharm. Samuel Owusu',
      email: 'pharm.owusu@hospital.org',
      phone: '+233 26 789 4321',
      password: 'pharm123',
      gender: 'Male',
      dob: '1984-03-05',
      address: 'Spintex Road, Accra',
      specialization: 'Clinical Pharmacy & Toxicology',
      qualifications: 'PharmD (KNUST), MPSGH',
      license_number: 'PCG/R/10923',
      department: 'Hospital Pharmacy Services',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150'
    },
    // Laboratory Technician / Scientist
    {
      user_id: 'HMS-LAB-401',
      role: 'lab_tech',
      name: 'Ebenezer Ansah, MLS',
      email: 'lab.ansah@hospital.org',
      phone: '+233 24 332 5566',
      password: 'lab123',
      gender: 'Male',
      dob: '1987-12-01',
      address: 'Dzorwulu, Accra',
      specialization: 'Hematology & Chemical Pathology',
      qualifications: 'BSc Medical Laboratory Science (UHAS), AIMLS',
      license_number: 'AHPC/MLS/7731',
      department: 'Central Diagnostic Laboratory',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=150'
    },
    // Receptionist
    {
      user_id: 'HMS-REC-501',
      role: 'receptionist',
      name: 'Abena Konadu',
      email: 'rec.abena@hospital.org',
      phone: '+233 27 123 9988',
      password: 'rec123',
      gender: 'Female',
      dob: '1995-07-21',
      address: 'Achimota, Accra',
      specialization: 'Patient Relations & Front Desk Operations',
      qualifications: 'HND Secretaryship & Healthcare Administration',
      license_number: 'ADMIN/REC/2022',
      department: 'Outpatient Front Desk & Admissions',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    },
    // Accountant / Billing Officer
    {
      user_id: 'HMS-ACC-601',
      role: 'accountant',
      name: 'Michael Quaye, CA',
      email: 'acc.quaye@hospital.org',
      phone: '+233 20 554 1122',
      password: 'acc123',
      gender: 'Male',
      dob: '1983-05-19',
      address: 'Osu, Accra',
      specialization: 'Healthcare Finance & Medical Billing',
      qualifications: 'BSc Accounting, CA Ghana (ICAG)',
      license_number: 'ICAG/M/14209',
      department: 'Finance & Medical Invoicing',
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150'
    },
    // Patient 1 - Kwame Asante (Hypertension / Diabetic)
    {
      user_id: 'HMS-P-2026-001',
      role: 'patient',
      name: 'Kwame Asante',
      email: 'kwame.asante@gmail.com',
      phone: '+233 24 489 1234',
      password: 'patient123',
      gender: 'Male',
      dob: '1972-06-15',
      address: 'House No. 44, Roman Ridge, Accra',
      specialization: null,
      qualifications: null,
      license_number: null,
      department: null,
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    // Patient 2 - Ama Serwaa (Asthma / Penicillin Allergy)
    {
      user_id: 'HMS-P-2026-002',
      role: 'patient',
      name: 'Ama Serwaa',
      email: 'ama.serwaa@gmail.com',
      phone: '+233 20 671 9876',
      password: 'patient123',
      gender: 'Female',
      dob: '1995-09-28',
      address: 'Block B, Labone, Accra',
      specialization: null,
      qualifications: null,
      license_number: null,
      department: null,
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    },
    // Patient 3 - Emmanuel Addo
    {
      user_id: 'HMS-P-2026-003',
      role: 'patient',
      name: 'Emmanuel Addo',
      email: 'emmanuel.addo@gmail.com',
      phone: '+233 55 901 4433',
      password: 'patient123',
      gender: 'Male',
      dob: '1984-01-10',
      address: 'Airport Hills, Accra',
      specialization: null,
      qualifications: null,
      license_number: null,
      department: null,
      verification_status: 'verified',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    }
  ];

  for (const u of usersData) {
    const { hash, salt } = hashPassword(u.password);
    insertUser.run(
      u.user_id, u.role, u.name, u.email, u.phone, hash, salt,
      u.gender, u.dob, u.address, u.specialization, u.qualifications,
      u.license_number, u.department, u.verification_status, u.avatar_url
    );
  }

  // 2. Patient Profiles
  const insertProfile = db.prepare(`
    INSERT INTO patient_profiles (
      patient_id, blood_group, genotype, allergies, chronic_conditions,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation, nhis_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    'HMS-P-2026-001',
    'O+',
    'AA',
    'Sulfa drugs, Pollen',
    'Essential Hypertension, Type 2 Diabetes Mellitus',
    'Yaa Asante (Spouse)',
    '+233 24 489 1235',
    'Spouse',
    'NHIS-GH-0091823'
  );

  insertProfile.run(
    'HMS-P-2026-002',
    'B+',
    'AS',
    'Penicillin, Cephalosporins (Severe Anaphylaxis risk)',
    'Bronchial Asthma (Moderate persistent)',
    'Kwadwo Serwaa (Brother)',
    '+233 20 671 9877',
    'Brother',
    'NHIS-GH-0074619'
  );

  insertProfile.run(
    'HMS-P-2026-003',
    'A+',
    'AA',
    'None known',
    'Mild Gastroesophageal Reflux Disease (GERD)',
    'Naa Addo (Mother)',
    '+233 55 901 4434',
    'Mother',
    'NHIS-GH-0112845'
  );

  // 3. Doctor Schedules
  const insertSchedule = db.prepare(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients)
    VALUES (?, ?, ?, ?, ?)
  `);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  for (const day of days) {
    insertSchedule.run('HMS-DOC-101', day, '08:00 AM', '03:00 PM', 12);
    insertSchedule.run('HMS-DOC-102', day, '09:00 AM', '04:00 PM', 15);
    insertSchedule.run('HMS-DOC-103', day, '08:30 AM', '02:30 PM', 10);
  }

  // 4. Appointments
  const insertAppt = db.prepare(`
    INSERT INTO appointments (
      appointment_id, patient_id, doctor_id, department, date, time_slot,
      type, reason, status, consultation_notes, virtual_meeting_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAppt.run(
    'APT-2026-1001',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'Cardiology & Internal Medicine',
    '2026-11-18',
    '10:00 AM',
    'in_person',
    'Quarterly hypertensive review and cardiovascular checkup',
    'confirmed',
    'Patient instructed to bring home BP log book and fasting blood sugar records.',
    null
  );

  insertAppt.run(
    'APT-2026-1002',
    'HMS-P-2026-002',
    'HMS-DOC-102',
    'Pediatrics & Allergy',
    '2026-11-19',
    '02:00 PM',
    'virtual',
    'Asthma control review and peak flow meter monitoring',
    'confirmed',
    'Virtual Telemedicine consultation scheduled.',
    'VMEET-GH-88214'
  );

  insertAppt.run(
    'APT-2026-1003',
    'HMS-P-2026-003',
    'HMS-DOC-103',
    'Surgery & Orthopedics',
    '2026-11-20',
    '11:30 AM',
    'in_person',
    'Right knee pain follow-up after sports strain',
    'pending',
    null,
    null
  );

  insertAppt.run(
    'APT-2026-0988',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'Cardiology & Internal Medicine',
    '2026-10-15',
    '09:30 AM',
    'in_person',
    'Blood pressure elevated during morning routine',
    'completed',
    'Amlodipine titrated up from 5mg to 10mg daily. Patient counseled on low sodium dietary intake.',
    null
  );

  // 5. Electronic Medical Records (EMR)
  const insertRecord = db.prepare(`
    INSERT INTO medical_records (
      record_id, patient_id, doctor_id, diagnosis, symptoms, clinical_notes,
      treatment_plan, icd_code, follow_up_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRecord.run(
    'EMR-2026-001',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'Stage 2 Essential Hypertension with Type 2 Diabetes',
    'Intermittent morning occipital headaches, mild bilateral ankle edema, fatigue',
    'BP seated 145/92 mmHg right arm. Heart sounds S1 and S2 present, no murmurs. Chest clear bilaterally. Peripheral pulses palpable.',
    '1. Continue Amlodipine 10mg daily. 2. Continue Metformin 500mg BD. 3. Ordered Lipid profile and Serum Creatinine. 4. Low salt diet, 30 min daily brisk walking.',
    'I10 / E11.9',
    '2026-11-18'
  );

  insertRecord.run(
    'EMR-2026-002',
    'HMS-P-2026-002',
    'HMS-DOC-102',
    'Moderate Persistent Bronchial Asthma with Allergic Rhinitis',
    'Nocturnal cough, wheezing when exposed to dust and cold weather, chest tightness',
    'Bilateral expiratory wheezing heard on auscultation. SpO2 96% on room air. Peak expiratory flow 340 L/min (baseline 420 L/min). Note Penicillin anaphylaxis history.',
    '1. Prescribed Salbutamol 100mcg inhaler 2 puffs PRN. 2. Budesonide inhaler 200mcg BD. 3. Avoid known triggers and dust exposure.',
    'J45.40',
    '2026-11-19'
  );

  insertRecord.run(
    'EMR-2026-003',
    'HMS-P-2026-003',
    'HMS-DOC-103',
    'Acute Uncomplicated Malaria (Plasmodium falciparum)',
    'High-grade fever with chills, rigors, body aches, bitter taste in mouth, anorexia',
    'Febrile to touch (38.9°C), tongue coated, conjunctivae pale-pink, abdominal exam soft and non-tender, no splenomegaly.',
    '1. Confirmed by MP test (+++). 2. Prescribed Artemether-Lumefantrine 80/480mg tabs 1 BD for 3 days with fatty meal. 3. Paracetamol 1g TDS for fever.',
    'B50.9',
    '2026-11-20'
  );

  // 6. Vitals Records
  const insertVital = db.prepare(`
    INSERT INTO vitals (
      patient_id, recorded_by, temperature, systolic_bp, diastolic_bp,
      pulse_rate, respiratory_rate, spo2, weight, blood_sugar, nursing_notes, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVital.run('HMS-P-2026-001', 'HMS-NUR-201', 36.6, 142, 90, 76, 18, 98.0, 84.5, 7.2, 'Patient seated at rest for 15 mins before BP check. Alert and responsive.', '2026-11-10 09:15:00');
  insertVital.run('HMS-P-2026-001', 'HMS-NUR-201', 36.8, 138, 88, 74, 16, 98.5, 84.2, 6.8, 'Routine clinic checkup. Vitals stable.', '2026-11-14 10:30:00');
  insertVital.run('HMS-P-2026-001', 'HMS-NUR-202', 36.7, 135, 85, 72, 16, 99.0, 84.0, 6.5, 'Evening vitals recorded. Blood pressure within satisfactory control.', '2026-11-15 17:45:00');

  insertVital.run('HMS-P-2026-002', 'HMS-NUR-201', 36.9, 118, 76, 88, 22, 96.0, 58.0, 5.1, 'Mild tachypnea. Chest auscultation shows faint wheeze. SpO2 monitored.', '2026-11-12 14:00:00');
  insertVital.run('HMS-P-2026-002', 'HMS-NUR-201', 36.7, 115, 74, 80, 18, 98.0, 58.2, 4.9, 'Post-bronchodilator assessment. Wheeze cleared, respiratory rate normalized.', '2026-11-14 11:20:00');

  insertVital.run('HMS-P-2026-003', 'HMS-NUR-202', 38.9, 122, 80, 102, 20, 97.0, 72.0, 5.8, 'Patient presented with high fever, sweating, and malaise. Cold compress applied.', '2026-11-13 08:30:00');
  insertVital.run('HMS-P-2026-003', 'HMS-NUR-202', 37.2, 120, 78, 84, 18, 98.5, 71.8, 5.4, 'Post-antipyretic temperature dropped to 37.2°C. Patient resting comfortably.', '2026-11-13 14:00:00');

  // 7. Prescriptions
  const insertRx = db.prepare(`
    INSERT INTO prescriptions (
      rx_id, patient_id, doctor_id, record_id, medication_name,
      dosage, frequency, duration, instructions, status, dispensed_by, dispensed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRx.run(
    'RX-2026-5001',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'EMR-2026-001',
    'Amlodipine Besylate',
    '10mg',
    'Once daily in the morning',
    '30 days',
    'Take with or without food. Monitor blood pressure weekly.',
    'dispensed',
    'HMS-PHARM-301',
    '2026-11-10 11:30:00'
  );

  insertRx.run(
    'RX-2026-5002',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'EMR-2026-001',
    'Metformin Hydrochloride',
    '500mg',
    'Twice daily with meals',
    '30 days',
    'Take with food to minimize GI side effects. Avoid skipping meals.',
    'dispensed',
    'HMS-PHARM-301',
    '2026-11-10 11:30:00'
  );

  insertRx.run(
    'RX-2026-5003',
    'HMS-P-2026-002',
    'HMS-DOC-102',
    'EMR-2026-002',
    'Salbutamol Sulfate Inhaler',
    '100mcg/actuation',
    '2 puffs every 4-6 hours PRN',
    '1 canister (200 doses)',
    'Inhale slowly and deeply. Rinse mouth after use. Keep rescue inhaler accessible at all times.',
    'prescribed',
    null,
    null
  );

  insertRx.run(
    'RX-2026-5004',
    'HMS-P-2026-003',
    'HMS-DOC-103',
    'EMR-2026-003',
    'Artemether / Lumefantrine (Coartem)',
    '20mg / 120mg (4 tablets)',
    'Twice daily for 3 days',
    '3 days (24 tablets)',
    'Take with fatty food or milk for optimum absorption. Complete full 3-day course.',
    'dispensed',
    'HMS-PHARM-301',
    '2026-11-13 10:15:00'
  );

  // 8. Laboratory Requests
  const insertLab = db.prepare(`
    INSERT INTO lab_requests (
      lab_id, patient_id, doctor_id, test_name, specimen_type, priority,
      status, result_value, normal_range, flag, technician_notes, completed_by, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLab.run(
    'LAB-2026-8001',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'Fasting Blood Glucose & HbA1c',
    'Venous Blood (Fluoride / EDTA)',
    'Routine',
    'completed',
    'FBG: 6.8 mmol/L | HbA1c: 6.9%',
    'FBG: 3.9 - 5.6 mmol/L | HbA1c: < 5.7%',
    'High',
    'Glycemic control fair. Mildly elevated FBG. Recommended dietary consultation.',
    'HMS-LAB-401',
    '2026-11-11 15:30:00'
  );

  insertLab.run(
    'LAB-2026-8002',
    'HMS-P-2026-001',
    'HMS-DOC-101',
    'Lipid Profile (Total Chol, LDL, HDL, Trig)',
    'Serum Blood',
    'Routine',
    'completed',
    'Total: 5.1 mmol/L | LDL: 3.2 mmol/L | HDL: 1.3 mmol/L | Trig: 1.7 mmol/L',
    'Total: < 5.2 | LDL: < 3.0 | HDL: > 1.0 | Trig: < 1.7 mmol/L',
    'Normal',
    'Borderline LDL cholesterol. Continue lifestyle modifications.',
    'HMS-LAB-401',
    '2026-11-11 15:45:00'
  );

  insertLab.run(
    'LAB-2026-8003',
    'HMS-P-2026-003',
    'HMS-DOC-103',
    'Malaria Parasite (RDT & Giemsa Microscopy)',
    'Capillary / Venous Blood',
    'STAT',
    'completed',
    'Plasmodium falciparum ring forms seen: +++ (High parasitemia)',
    'Negative (No parasites seen)',
    'Critical',
    'Confirmed severe parasitemia. Clinician notified immediately for antimalarial initiation.',
    'HMS-LAB-401',
    '2026-11-13 09:15:00'
  );

  insertLab.run(
    'LAB-2026-8004',
    'HMS-P-2026-002',
    'HMS-DOC-102',
    'Complete Blood Count (CBC / FBC)',
    'EDTA Blood',
    'Routine',
    'in_progress',
    'Processing automated hematology analyzer...',
    'WBC: 4.0-10.0 x10^9/L | Hb: 12.0-16.0 g/dL | PLT: 150-450',
    'Normal',
    'Sample collected at 09:30 AM. Under analyzer run.',
    'HMS-LAB-401',
    null
  );

  // 9. Pharmacy Inventory
  const insertInventory = db.prepare(`
    INSERT INTO pharmacy_inventory (
      drug_code, name, category, dosage_form, stock_quantity, unit_price,
      batch_number, expiry_date, reorder_level, is_prescription_only
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const meds = [
    ['DRG-001', 'Amlodipine Besylate 10mg', 'Antihypertensives', 'Tablet', 350, 18.50, 'AML-2024-B1', '2028-05-31', 50, 1],
    ['DRG-002', 'Lisinopril 20mg', 'Antihypertensives', 'Tablet', 280, 22.00, 'LIS-2024-C4', '2027-11-30', 40, 1],
    ['DRG-003', 'Metformin HCl 500mg', 'Antidiabetics', 'Tablet', 600, 14.00, 'MET-2024-A9', '2028-08-31', 100, 1],
    ['DRG-004', 'Artemether / Lumefantrine 20/120mg (Coartem)', 'Antimalarials', 'Tablet', 180, 45.00, 'AL-2025-01', '2027-09-30', 30, 1],
    ['DRG-005', 'Amoxicillin / Clavulanic Acid 625mg (Augmentin)', 'Antibiotics', 'Tablet', 95, 65.00, 'AUG-2024-X2', '2027-04-30', 25, 1],
    ['DRG-006', 'Ciprofloxacin 500mg', 'Antibiotics', 'Tablet', 140, 28.00, 'CIP-2024-D7', '2027-10-31', 30, 1],
    ['DRG-007', 'Salbutamol Inhaler 100mcg (Ventolin)', 'Respiratory', 'Inhaler', 60, 52.00, 'SAL-2024-H3', '2027-06-30', 15, 1],
    ['DRG-008', 'Omeprazole 20mg', 'Gastrointestinal', 'Capsule', 420, 16.50, 'OME-2024-K8', '2028-01-31', 50, 0],
    ['DRG-009', 'Paracetamol 500mg (Emzor)', 'Analgesics / Antipyretics', 'Tablet', 1200, 5.00, 'PCM-2025-E1', '2029-02-28', 150, 0],
    ['DRG-010', 'Ibuprofen 400mg', 'NSAID / Anti-inflammatory', 'Tablet', 500, 9.50, 'IBU-2024-F4', '2028-03-31', 80, 0],
    ['DRG-011', 'Normal Saline 0.9% IV 500ml', 'IV Infusions & Fluids', 'IV Infusion', 120, 25.00, 'NS-2024-M2', '2028-12-31', 40, 1],
    ['DRG-012', 'Dextrose 5% in Water 500ml', 'IV Infusions & Fluids', 'IV Infusion', 85, 27.50, 'DW-2024-L5', '2028-10-31', 30, 1],
    ['DRG-013', 'Ceftriaxone 1g Injection', 'Antibiotics', 'Vial Injection', 45, 48.00, 'CEF-2024-R9', '2027-08-31', 20, 1],
    ['DRG-014', 'Budesonide 200mcg Inhaler', 'Respiratory', 'Inhaler', 35, 75.00, 'BUD-2024-T1', '2027-05-31', 10, 1],
    ['DRG-015', 'Oral Rehydration Salts (ORS) Sachets', 'Gastrointestinal', 'Powder Sachet', 800, 3.50, 'ORS-2025-G0', '2029-01-31', 100, 0],
    ['DRG-016', 'Hydrocortisone 100mg Injection', 'Corticosteroids / Emergency', 'Vial Injection', 28, 38.00, 'HYD-2024-Q3', '2027-03-31', 15, 1]
  ];

  for (const m of meds) {
    insertInventory.run(...m);
  }

  // 10. Inpatient Admissions
  const insertAdmission = db.prepare(`
    INSERT INTO inpatient_admissions (
      admission_id, patient_id, admitted_by, ward, bed_number,
      admission_reason, admission_date, discharge_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAdmission.run(
    'ADM-2026-041',
    'HMS-P-2026-003',
    'HMS-DOC-103',
    'Male Medical Ward',
    'Bed 07',
    'Severe acute Plasmodium falciparum malaria with dehydration and persistent vomiting',
    '2026-11-13 09:30:00',
    null,
    'admitted'
  );

  // 11. Billing Invoices
  const insertBilling = db.prepare(`
    INSERT INTO billing_invoices (
      invoice_id, patient_id, items_json, total_amount, paid_amount,
      payment_method, payment_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBilling.run(
    'INV-2026-901',
    'HMS-P-2026-001',
    JSON.stringify([
      { name: 'Cardiology Specialist Consultation', quantity: 1, amount: 150.00 },
      { name: 'HbA1c & Fasting Blood Sugar Test', quantity: 1, amount: 85.00 },
      { name: 'Lipid Profile Test', quantity: 1, amount: 110.00 },
      { name: 'Amlodipine 10mg (30 Tablets)', quantity: 1, amount: 18.50 },
      { name: 'Metformin 500mg (60 Tablets)', quantity: 2, amount: 28.00 }
    ]),
    391.50,
    391.50,
    'Mobile Money (MTN MoMo)',
    'paid',
    '2026-11-10 12:00:00'
  );

  insertBilling.run(
    'INV-2026-902',
    'HMS-P-2026-003',
    JSON.stringify([
      { name: 'Emergency Triage & Consultation', quantity: 1, amount: 120.00 },
      { name: 'STAT Malaria Parasite Microscopy', quantity: 1, amount: 45.00 },
      { name: 'Inpatient Ward Bed (2 Days)', quantity: 2, amount: 200.00 },
      { name: 'Normal Saline IV 500ml', quantity: 3, amount: 75.00 },
      { name: 'Artemether-Lumefantrine 80/480mg', quantity: 1, amount: 45.00 },
      { name: 'Nursing Care Fee', quantity: 2, amount: 80.00 }
    ]),
    565.00,
    300.00,
    'NHIS + Cash Top-up',
    'partially_paid',
    '2026-11-13 11:30:00'
  );

  insertBilling.run(
    'INV-2026-903',
    'HMS-P-2026-002',
    JSON.stringify([
      { name: 'Pediatric Virtual Telemedicine Consultation', quantity: 1, amount: 100.00 },
      { name: 'Complete Blood Count (CBC)', quantity: 1, amount: 65.00 }
    ]),
    165.00,
    165.00,
    'Card (Visa / Mastercard)',
    'paid',
    '2026-11-14 11:45:00'
  );

  // 12. Searchable Medical Knowledge Base
  const insertKnowledge = db.prepare(`
    INSERT INTO medical_knowledge (category, title, summary, content, keywords, emergency_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const knowledgeEntries = [
    {
      category: 'first_aid',
      title: 'Adult Cardiopulmonary Resuscitation (CPR)',
      summary: 'Emergency lifesaving procedure for cardiac arrest when someone stops breathing or their heart stops.',
      content: `1. Check scene safety. Tap the person's shoulder and shout "Are you OK?".
2. Call Emergency immediately (Dial 112 / 193 / 911) or have someone fetch an Automated External Defibrillator (AED).
3. Check for normal breathing for no more than 10 seconds.
4. Position your hands: Place the heel of one hand in the center of the chest (lower half of sternum), interlock the other hand.
5. Push hard and fast: 100 to 120 compressions per minute at a depth of at least 2 inches (5 cm). Allow chest to fully recoil.
6. If trained in rescue breaths: Deliver 30 compressions followed by 2 rescue breaths. If untrained: Perform continuous chest compressions (Hands-Only CPR).
7. Continue until emergency medical personnel take over or victim starts breathing normally.`,
      keywords: 'cpr, cardiac arrest, heart stopped, unconscious, not breathing, resuscitation, emergency',
      emergency_level: 'immediate_emergency'
    },
    {
      category: 'first_aid',
      title: 'First Aid for Severe Bleeding and Hemorrhage',
      summary: 'Critical steps to arrest active severe external bleeding and prevent hypovolemic shock.',
      content: `1. Put on gloves if available. Remove obvious clothing to expose wound.
2. Apply FIRM, DIRECT PRESSURE directly over the bleeding site using a sterile gauze or clean cloth.
3. If blood soaks through, DO NOT remove the first pad; place another pad on top and maintain firm pressure.
4. Elevate the injured limb above heart level if no fractures are suspected.
5. Keep pressure continuous for at least 10-15 minutes without lifting to check.
6. For arterial or catastrophic limb bleeding where direct pressure fails, apply a medical tourniquet 2-3 inches above the wound (never over a joint). Record the time applied.
7. Treat for shock: Keep the patient warm, lie them flat with legs elevated 12 inches if conscious, and seek emergency care immediately.`,
      keywords: 'bleeding, hemorrhage, cut, blood loss, laceration, wound, trauma, pressure',
      emergency_level: 'immediate_emergency'
    },
    {
      category: 'first_aid',
      title: 'First Aid for Thermal and Scald Burns',
      summary: 'Immediate cooling and management steps for 1st, 2nd, and 3rd degree burns.',
      content: `1. Remove person from heat source immediately.
2. COOL THE BURN: Hold the burned area under cool running tap water for 15-20 minutes. DO NOT use ice, iced water, or freezing agents as this causes tissue ischemia.
3. Gently remove rings, tight clothing, watches or shoes before swelling begins. Do not remove items stuck to the burn.
4. COVER LOOSELY: Use a sterile non-stick dressing or clean plastic wrap loosely placed over the burn.
5. NEVER apply butter, oils, toothpaste, eggs, or powders to a burn.
6. DO NOT break blisters; breaking blisters increases severe bacterial infection risk.
7. Seek immediate emergency medical attention for burns covering large areas, burns on face, hands, groin, or major joints, or any third-degree burn (charred or white skin).`,
      keywords: 'burns, scald, hot water, fire, blister, first degree, second degree, chemical burn',
      emergency_level: 'high'
    },
    {
      category: 'first_aid',
      title: 'First Aid for Choking (Heimlich Maneuver)',
      summary: 'Relieving foreign object airway obstruction in conscious adults and children over 1 year.',
      content: `1. Identify choking: Person cannot speak, cough forcefully, or breathe, and may clutch their throat (universal choking sign).
2. Stand behind the person and lean them slightly forward.
3. Give 5 back blows between shoulder blades with the heel of your hand.
4. If still blocked, perform 5 ABDOMINAL THRUSTS (Heimlich Maneuver): Make a fist with one hand, place thumb side just above the navel (well below ribcage). Grasp fist with your other hand and press hard into the abdomen with a quick upward and inward thrust.
5. Repeat cycle of 5 back blows and 5 abdominal thrusts until foreign object is expelled or person can breathe.
6. If person becomes unconscious: Lower them gently to the floor and immediately begin CPR compressions. Inspect mouth for visible object before giving rescue breaths.`,
      keywords: 'choking, heimlich, airway obstruction, food stuck, throat, breathing blocked',
      emergency_level: 'immediate_emergency'
    },
    {
      category: 'first_aid',
      title: 'First Aid for Acute Asthma Exacerbation',
      summary: 'Action plan when a patient experiences acute shortness of breath and wheezing.',
      content: `1. Keep calm and sit the person upright comfortably. DO NOT let them lie flat.
2. Assist them to use their fast-acting reliever inhaler (e.g. Salbutamol / Ventolin, usually blue).
3. Give 1 puff into a spacer every 30 to 60 seconds up to 4 to 10 puffs.
4. Have the patient breathe slowly and deeply through their mouth.
5. If there is no improvement after 5 minutes, or symptoms are severe (struggling to speak in full sentences, cyanosis/blue lips, chest retractions), call for emergency hospital transfer immediately.
6. Continue giving 4 puffs every 4 minutes while waiting for the ambulance.`,
      keywords: 'asthma, wheezing, inhaler, salbutamol, ventolin, breathing difficulty, chest tightness',
      emergency_level: 'high'
    },
    {
      category: 'illness',
      title: 'Essential Hypertension (High Blood Pressure)',
      summary: 'Chronic cardiovascular condition characterized by persistently elevated arterial blood pressure.',
      content: `Overview: Hypertension is defined as persistent resting blood pressure of 140/90 mmHg or higher. Often called the 'silent killer' because it commonly presents without noticeable symptoms until complications develop.
Common Symptoms: Frequent morning occipital headaches, dizziness, palpitations, blurred vision, shortness of breath, fatigue.
Risk Factors: High sodium diet, lack of physical activity, obesity, chronic stress, tobacco and alcohol use, genetic predisposition.
Complications: Myocardial infarction (heart attack), stroke, hypertensive heart disease, chronic kidney disease (CKD), retinopathy.
Management: Lifestyle modification (DASH low-sodium diet, aerobic exercise, weight reduction) and pharmacological management (ACE inhibitors, ARBs, Calcium Channel Blockers like Amlodipine, Thiazide diuretics). Regular monitoring is essential.`,
      keywords: 'hypertension, high blood pressure, bp, stroke, heart attack, amlodipine, cardiovascular',
      emergency_level: 'moderate'
    },
    {
      category: 'illness',
      title: 'Malaria (Plasmodium falciparum)',
      summary: 'Life-threatening mosquito-borne infectious disease prevalent in tropical and subtropical regions.',
      content: `Overview: Malaria is caused by Plasmodium parasites transmitted through the bites of infected female Anopheles mosquitoes. Plasmodium falciparum is the most common and dangerous strain in West Africa.
Classic Symptoms: Paroxysms of shivering chills (rigors) followed by high fever (up to 40°C), profuse sweating, intense headache, generalized body/joint aches, nausea, vomiting, loss of appetite, and anemia.
Red Flags for Severe Malaria: Altered mental state or coma (cerebral malaria), extreme weakness/prostration, severe jaundice, dark 'blackwater' urine, respiratory distress, convulsions.
Diagnosis: Confirmed by rapid diagnostic test (RDT) or Giemsa-stained thick and thin blood film microscopy.
Treatment: Artemisinin-based Combination Therapy (ACT), such as Artemether-Lumefantrine or Artesunate-Amodiaquine. Severe malaria requires parenteral Artesunate IV.`,
      keywords: 'malaria, fever, chills, mosquito, coartem, headache, falciparum, parasite',
      emergency_level: 'moderate'
    },
    {
      category: 'illness',
      title: 'Type 2 Diabetes Mellitus',
      summary: 'Metabolic disorder characterized by chronic hyperglycemia resulting from insulin resistance.',
      content: `Overview: A chronic metabolic disorder where cells do not respond effectively to insulin (insulin resistance) coupled with progressive beta-cell dysfunction.
Symptoms: Polyuria (frequent urination), polydipsia (excessive thirst), polyphagia (excessive hunger), unexplained weight loss, fatigue, blurred vision, slow-healing sores, recurrent fungal or urinary infections.
Diagnostic Criteria: Fasting Plasma Glucose >= 7.0 mmol/L (126 mg/dL), 2-hour postprandial glucose >= 11.1 mmol/L (200 mg/dL), or HbA1c >= 6.5%.
Management: Dietary counseling, portion control, regular exercise, blood glucose monitoring, and oral antidiabetic agents (Metformin, SGLT2 inhibitors, Sulfonylureas) or Insulin when required.`,
      keywords: 'diabetes, sugar, hyperglycemia, metformin, insulin, polyuria, hba1c',
      emergency_level: 'none'
    },
    {
      category: 'medication',
      title: 'Amlodipine Besylate (Norvasc)',
      summary: 'Dihydropyridine calcium channel blocker used for hypertension and chronic stable angina.',
      content: `Classification: Calcium Channel Blocker (CCB).
Approved Indications: Treatment of essential hypertension alone or in combination with other antihypertensives; chronic stable angina pectoris.
Standard Adult Dosage: 5mg once daily orally, may be titrated to a maximum of 10mg once daily after 1-2 weeks based on clinical response.
Common Side Effects: Peripheral edema (swelling of ankles/feet), flushing, dizziness, palpitations, fatigue, headache, nausea.
Contraindications & Precautions: Severe hypotension, cardiogenic shock, severe aortic stenosis. Exercise caution in severe hepatic impairment.
Patient Education: Take consistently at the same time each day with or without meals. Rise slowly from sitting or lying down to prevent orthostatic dizziness. Do not abruptly discontinue without consulting your physician.`,
      keywords: 'amlodipine, norvasc, calcium channel blocker, bp medicine, hypertension, ankles swelling',
      emergency_level: 'none'
    },
    {
      category: 'medication',
      title: 'Metformin Hydrochloride (Glucophage)',
      summary: 'First-line biguanide oral antihyperglycemic medication for Type 2 Diabetes.',
      content: `Classification: Biguanide Antidiabetic.
Approved Indications: First-line management of Type 2 Diabetes Mellitus; management of Polycystic Ovary Syndrome (PCOS off-label).
Mechanism: Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity by increasing peripheral glucose uptake.
Standard Adult Dosage: 500mg once or twice daily with meals; titrated up to maximum 2000mg - 2550mg daily in divided doses.
Common Side Effects: Gastrointestinal disturbances (nausea, diarrhea, abdominal cramps, flatulence, metallic taste in mouth), vitamin B12 deficiency with long-term use.
Black Box Warning: Lactic acidosis (rare but potentially fatal). Contraindicated in severe renal impairment (eGFR < 30 mL/min), acute metabolic acidosis, severe hypoxemia, or sepsis.
Patient Advice: Always take with meals to reduce stomach upset. Must be temporarily withheld prior to iodinated contrast radiological procedures.`,
      keywords: 'metformin, glucophage, diabetes medicine, blood sugar, biguanide, lactic acidosis',
      emergency_level: 'none'
    },
    {
      category: 'medication',
      title: 'Artemether / Lumefantrine (Coartem)',
      summary: 'Gold-standard Artemisinin-based Combination Therapy (ACT) for acute uncomplicated P. falciparum malaria.',
      content: `Classification: Antimalarial (Artemisinin derivative + Arylaminoalcohol).
Approved Indications: Treatment of acute uncomplicated malaria infections caused by Plasmodium falciparum in adults and children.
Standard Adult Dosage (over 35 kg): 6-dose regimen over 3 days (Total 24 tablets). 4 tablets at diagnosis (0 hr), 4 tablets at 8 hours, then 4 tablets twice daily (morning and evening) for the following 2 days.
Critical Administration Rule: MUST be taken with fatty food, milk, or a meal to ensure adequate oral absorption of lumefantrine. If vomiting occurs within 1 hour of ingestion, a replacement dose should be taken.
Common Side Effects: Headache, dizziness, anorexia, sleep disturbance, palpitation, abdominal pain.
Contraindications: Known hypersensitivity, severe/complicated malaria (which requires IV artesunate), first trimester of pregnancy unless no alternative.`,
      keywords: 'coartem, artemether, lumefantrine, malaria medicine, fever tablets, act',
      emergency_level: 'none'
    },
    {
      category: 'medication',
      title: 'Salbutamol Sulfate (Ventolin)',
      summary: 'Short-acting beta-2 adrenergic agonist (SABA) bronchodilator for rapid relief of bronchospasm.',
      content: `Classification: Short-Acting Beta-2 Agonist (SABA) Bronchodilator.
Approved Indications: Quick relief of acute bronchospasm in asthma, chronic bronchitis, and COPD; prevention of exercise-induced bronchospasm.
Dosage: Inhalation aerosol: 1 to 2 puffs (100-200 mcg) every 4 to 6 hours as needed for symptoms. Maximum 8 puffs in 24 hours without medical supervision.
Common Side Effects: Fine skeletal muscle tremor (especially hands), tachycardia, palpitations, nervousness, headache.
Safety Warning: If you need your rescue inhaler more than 2-3 times per week, your asthma is NOT well controlled. Seek clinical review for controller steroid titration. If breathless despite 10 puffs, seek emergency care immediately.`,
      keywords: 'salbutamol, ventolin, inhaler, asthma relief, bronchodilator, wheezing, shortness of breath',
      emergency_level: 'none'
    }
  ];

  for (const k of knowledgeEntries) {
    insertKnowledge.run(k.category, k.title, k.summary, k.content, k.keywords, k.emergency_level);
  }

  // 13. System Notifications
  const insertNotice = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotice.run('HMS-P-2026-001', 'Appointment Confirmed', 'Your consultation with Dr. Kwesi Mensah is scheduled for Nov 18, 2026 at 10:00 AM.', 'appointment', 0);
  insertNotice.run('HMS-P-2026-001', 'Prescription Dispensed', 'Your medication (Amlodipine 10mg & Metformin 500mg) has been dispensed by Pharmacy.', 'prescription', 1);
  insertNotice.run('HMS-P-2026-001', 'Lab Results Ready', 'Your Fasting Blood Glucose and Lipid Profile lab results are now available for viewing.', 'lab', 0);
  insertNotice.run('HMS-DOC-101', 'New Appointment Request', 'Kwame Asante has requested a follow-up consultation on Nov 18, 2026.', 'appointment', 0);
  insertNotice.run('HMS-DOC-101', 'Critical Lab Alert', 'STAT Malaria Parasite for patient Emmanuel Addo returned +++ parasitemia.', 'lab', 1);
  insertNotice.run('HMS-NUR-201', 'Ward Assignment', 'You are assigned to Male Medical Ward duty. 1 Inpatient currently in Bed 07.', 'system', 0);
  insertNotice.run('HMS-ADM-001', 'System Audit Notice', 'Monthly Data Protection Act (Act 843) compliance backup and security check completed.', 'system', 1);

  // 14. Initial Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_role, action, resource, ip_address, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run('SYSTEM', 'system', 'SYSTEM_INITIALIZATION', 'DATABASE_SCHEMA', '127.0.0.1', 'HMS Database schema and baseline records initialized.');
  insertAudit.run('HMS-ADM-001', 'admin', 'USER_VERIFY', 'HMS-DOC-101', '192.168.1.10', 'Verified Medical and Dental Council license MDC/RN/44912 for Dr. Kwesi Mensah.');
  insertAudit.run('HMS-DOC-101', 'doctor', 'EMR_CREATE', 'EMR-2026-001', '192.168.1.15', 'Recorded diagnosis and clinical notes for patient Kwame Asante.');
  insertAudit.run('HMS-PHARM-301', 'pharmacist', 'RX_DISPENSE', 'RX-2026-5001', '192.168.1.22', 'Dispensed Amlodipine 10mg to patient HMS-P-2026-001.');

  console.log('Database seeded successfully with all 8 roles, sample records, and clinical knowledge!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
