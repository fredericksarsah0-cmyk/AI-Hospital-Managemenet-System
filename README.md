# 🏥 AI-Powered Hospital Management System (HMS)
### St. Nicholas Digital Hospital & Clinical AI Health Center

A modern, responsive, intelligent, and production-grade Hospital Management System (HMS) developed with native high-performance Node.js, SQLite (ACID compliant), modern responsive CSS, and a specialized AI Healthcare Assistant.

Designed in accordance with international healthcare standards and the **Ghanaian Data Protection Act, 2012 (Act 843)**.

---

## 🌟 Key Features

### 1. 👥 Role-Based Access Control (RBAC) across 8 Roles
Every role has a tailored dashboard with appropriate data permissions:
1. **Patient Portal**: Unique Patient ID generation (`HMS-P-XXXX`), appointment scheduling, Electronic Medical Records (EMR), active prescriptions, lab investigations, vitals log with SVG progression charts, itemized billing invoices, and printable clinical reports.
2. **Doctor Portal**: Daily consultation schedule, appointment approvals/rescheduling, clinical diagnosis and examination notes (ICD-10 coding), official prescription authoring, diagnostic lab orders, and virtual telemedicine consultation room.
3. **Nurse Portal**: Inpatient ward and bed monitoring, real-time vital signs entry (BP, Temp, Pulse, SpO2, Resp, Sugar, Weight) with **instant clinical anomaly detection** (Hypertension Crisis, Hypoxemia, High Fever alerts), and nursing shift observation notes.
4. **Administrator Portal**: Executive hospital statistics (total patients, active doctors, nurses, bed occupancy, total hospital revenue), professional credential verification (approve/reject doctor and nurse licenses), staff management, and **Ghanaian Act 843 immutable audit logs**.
5. **Pharmacist Portal**: Drug inventory management, stock levels, batch tracking, expiry date monitoring, low-stock reorder alerts, and doctor prescription dispensing queue.
6. **Laboratory Technician / Scientist Portal**: Diagnostic investigation requests queue, result entry with normal reference ranges and abnormal flags (`Normal`, `High`, `Low`, `Critical Alert`), and automated release of verified reports to doctors and patients.
7. **Receptionist Portal**: Daily outpatient check-in desk, walk-in patient registration with instant ID card generation, and real-time directory of doctors on duty.
8. **Accountant / Hospital Billing Portal**: Itemized patient invoices, payment processing supporting Cash, **Mobile Money (MTN MoMo, Telecel)**, Card (Visa/Mastercard), and NHIS insurance co-pay claims.

---

### 2. 🤖 Dual-Mode AI Healthcare Assistant
Accessible through a slide-up chat drawer on every page:
- **Patient Mode**: Answers medical queries in clear, empathetic language, explains common illnesses, breaks down medical terminology, provides first-aid procedures, and guides patients on booking specialist consultations.
- **Staff / Clinical Mode**: Provides clinical reference guidelines, ICD-10 suggestions, nursing vital sign interpretation, pharmacology guidance (indications, contraindications, and precautions), and standard hospital documentation protocols.
- **Critical Medical Safety & Emergency Triage**:
  - The AI strictly adheres to clinical safety: it never issues unsupervised definitive prescriptions or overrides doctors.
  - **Automated Red-Flag Detection**: If a life-threatening symptom is detected (e.g. crushing chest pain, stroke FAST symptoms, severe respiratory failure, massive hemorrhage, poisoning), it immediately triggers a **RED ALERT** banner with direct emergency call dispatch (**Ghana 112**, **National Ambulance 193**) and immediate first-aid stabilization steps.

---

### 3. 🩺 First-Aid & Medication Knowledge Hub
A dedicated searchable medical knowledge base covering:
- **First-Aid Protocols**: Step-by-step guides for Adult CPR, Severe Bleeding & Hemorrhage, Thermal Burns, Choking (Heimlich Maneuver), and Acute Asthma Exacerbation.
- **Disease & Illness Summaries**: Essential Hypertension, Malaria (*P. falciparum*), Type 2 Diabetes Mellitus, etc.
- **Medication Formularies**: Amlodipine, Metformin, Artemether-Lumefantrine (Coartem), Salbutamol Inhaler, etc., including approved indications, dosages, side effects, and precautions.

---

### 4. 🎥 Virtual Telemedicine Consultation Room
Simulated WebRTC consultation suite with concurrent clinical note-taking:
- Patient video stream layout with local camera indicator.
- Mic, camera, screen-sharing, and call termination controls.
- Integrated doctor clinical notes drawer that syncs directly into the patient's EMR dossier.

---

### 5. 🖨️ Official Printable Clinical Reports & Prescriptions
- One-click **Print / Download Health Summary** generating an official hospital letterhead report complete with patient demographics, blood group, drug allergies, latest clinical examination findings, vitals, active prescriptions, and attending physician signature lines.

---

## ⚡ Quick 1-Click Role Switcher (Evaluation & Demo)

For instant evaluation and testing of all 8 roles without manually logging out or remembering passwords, a persistent **1-Click Role Switcher bar** is available at the very top of the page:

| Role | Name | ID / Email | Default Password |
|---|---|---|---|
| **Patient** | Kwame Asante | `HMS-P-2026-001` / `kwame.asante@gmail.com` | `patient123` |
| **Doctor (Cardiology)** | Dr. Kwesi Mensah | `HMS-DOC-101` / `dr.mensah@hospital.org` | `doctor123` |
| **Doctor (Pediatrics)** | Dr. Akosua Boateng | `HMS-DOC-102` / `dr.boateng@hospital.org` | `doctor123` |
| **Nurse (Ward)** | Nurse Grace Ofori | `HMS-NUR-201` / `nurse.grace@hospital.org` | `nurse123` |
| **Nurse (Triage)** | Nurse Kofi Antwi | `HMS-NUR-202` / `nurse.kofi@hospital.org` | `nurse123` |
| **Administrator** | Dr. Kofi Osei-Tutu | `HMS-ADM-001` / `admin@hospital.org` | `admin123` |
| **Pharmacist** | Pharm. Samuel Owusu | `HMS-PHARM-301` / `pharm.owusu@hospital.org` | `pharm123` |
| **Lab Scientist** | Ebenezer Ansah, MLS | `HMS-LAB-401` / `lab.ansah@hospital.org` | `lab123` |
| **Receptionist** | Abena Konadu | `HMS-REC-501` / `rec.abena@hospital.org` | `rec123` |
| **Accountant** | Michael Quaye, CA | `HMS-ACC-601` / `acc.quaye@hospital.org` | `acc123` |

---

## 🚀 How to Run the Application

### Option A: Using Windows Batch Script (Recommended)
Double-click `run.bat` or run:
```cmd
.\run.bat
```

### Option B: Using Node.js
```bash
# 1. (Optional) Re-seed the database with clean sample records:
node src/seed.js

# 2. Start the HTTP server:
node src/server.js
```

Then open your browser and navigate to:
```
http://localhost:3000
```

---

## 🏗️ Technology Architecture

- **Backend**: Native Node.js HTTP/REST architecture (clean, modular, zero external vulnerable dependencies).
- **Database**: `node:sqlite` (SQLite 3.53.4 embedded in Node.js runtime) providing full ACID transactions, foreign keys, and persistent `.db` storage.
- **Frontend**: Responsive Single-Page Application (HTML5, Custom Healthcare CSS Design System, Modular JavaScript).
- **Security & Cryptography**: `node:crypto` using `scrypt` hashing with unique cryptographic salts, 256-bit session tokens, timing-safe equality checks, and SQL prepared statement injection prevention.
- **Data Protection Act (Act 843)**: Centralized immutable audit logger recording user ID, role, action, resource, timestamp, and IP address for every clinical dossier interaction.

---

## 🏥 Hospital Location & Contact Details
- **Facility**: St. Nicholas Digital Hospital & Clinical AI Center
- **Address**: Liberation Road, Airport Residential Area, Accra, Ghana
- **Emergency Helpline**: Dial 112 / 193
- **Main Reception**: +233 30 277 5555
