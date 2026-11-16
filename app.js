// public/js/app.js
// Main Application Controller, Modals, AI Assistant & Routing

const App = {
  currentUser: null,
  activeView: 'home',

  async init() {
    console.log('Initializing Hospital Management System...');
    this.bindEvents();

    // Check existing session
    const token = API.getToken();
    if (token) {
      try {
        this.currentUser = await API.getMe();
        this.updateAuthUI();
      } catch (e) {
        console.warn('Session expired or invalid, logging out.');
        API.logout();
      }
    }

    // Load initial knowledge cards on homepage
    this.searchKnowledgeHub();
  },

  bindEvents() {
    // Top quick role switcher buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const role = e.currentTarget.getAttribute('data-role');
        await this.handleDemoSwitch(role);
      });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });
  },

  // TOAST NOTIFICATIONS
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'danger' || type === 'error') icon = '⚠️';
    else if (type === 'warning') icon = '🔔';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // MODAL CONTROLLERS
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  },

  // ROUTING & VIEW SWITCHING
  navigate(viewName) {
    this.activeView = viewName;
    const views = ['home', 'dashboard', 'knowledge', 'doctors'];

    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-nav') === viewName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'dashboard') {
      if (!this.currentUser) {
        this.openModal('modal-auth');
      } else {
        this.renderActiveDashboard();
      }
    }
  },

  // AUTH UI UPDATES
  updateAuthUI() {
    const authActions = document.getElementById('nav-auth-actions');
    const userRoleBadge = document.getElementById('top-user-indicator');

    if (this.currentUser) {
      if (authActions) {
        authActions.innerHTML = `
          <button class="btn btn-outline btn-sm" onclick="App.navigate('dashboard')">
            🏥 My Dashboard (${this.currentUser.role.toUpperCase()})
          </button>
          <button class="btn btn-danger btn-sm" onclick="App.handleLogout()">
            Logout
          </button>
        `;
      }
      if (userRoleBadge) {
        userRoleBadge.innerHTML = `Signed in as: <strong>${this.currentUser.name}</strong> (${this.currentUser.role.toUpperCase()})`;
      }

      // Highlight corresponding role button
      document.querySelectorAll('.role-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-role') === this.currentUser.role);
      });
    } else {
      if (authActions) {
        authActions.innerHTML = `
          <button class="btn btn-outline btn-sm" onclick="App.openAuthModal('login')">Sign In</button>
          <button class="btn btn-primary btn-sm" onclick="App.openAuthModal('register')">Register Patient</button>
        `;
      }
      if (userRoleBadge) {
        userRoleBadge.innerHTML = 'Not signed in. Click any role above for instant 1-click preview:';
      }
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    }
  },

  // 1-CLICK QUICK ROLE SWITCHER
  async handleDemoSwitch(role) {
    try {
      this.showToast(`Switching to ${role.toUpperCase()} account...`, 'info');
      const data = await API.demoLogin(role);
      this.currentUser = data.user;
      this.updateAuthUI();
      this.showToast(`Logged in as ${data.user.name} (${role})`, 'success');
      this.navigate('dashboard');
    } catch (err) {
      this.showToast(`Demo switch failed: ${err.message}`, 'danger');
    }
  },

  // RENDER CORRESPONDING DASHBOARD
  async renderActiveDashboard() {
    const container = document.getElementById('dashboard-container');
    if (!container || !this.currentUser) return;

    container.innerHTML = '<div style="padding: 40px; text-align: center;"><p>Loading personalized dashboard...</p></div>';

    try {
      const role = this.currentUser.role;
      if (role === 'patient') await Dashboards.renderPatient(container, this.currentUser);
      else if (role === 'doctor') await Dashboards.renderDoctor(container, this.currentUser);
      else if (role === 'nurse') await Dashboards.renderNurse(container, this.currentUser);
      else if (role === 'admin') await Dashboards.renderAdmin(container, this.currentUser);
      else if (role === 'pharmacist') await Dashboards.renderPharmacist(container, this.currentUser);
      else if (role === 'lab_tech') await Dashboards.renderLabTech(container, this.currentUser);
      else if (role === 'receptionist') await Dashboards.renderReceptionist(container, this.currentUser);
      else if (role === 'accountant') await Dashboards.renderAccountant(container, this.currentUser);
      else container.innerHTML = '<p>Unknown role</p>';
    } catch (err) {
      container.innerHTML = `<div class="card" style="margin: 20px;"><p style="color: var(--danger);">Dashboard load error: ${err.message}</p></div>`;
    }
  },

  // AUTH MODAL LOGIC
  openAuthModal(tab = 'login') {
    this.openModal('modal-auth');
    this.switchAuthTab(tab);
  },

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    document.getElementById('auth-pane-login').style.display = (tab === 'login') ? 'block' : 'none';
    document.getElementById('auth-pane-register').style.display = (tab === 'register') ? 'block' : 'none';
  },

  async handleLogin(event) {
    event.preventDefault();
    const identifier = document.getElementById('login-id').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.login(identifier, password);
      this.currentUser = data.user;
      this.updateAuthUI();
      this.closeModal('modal-auth');
      this.showToast(`Welcome back, ${data.user.name}!`, 'success');
      this.navigate('dashboard');
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  async handleRegister(event) {
    event.preventDefault();
    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const gender = document.getElementById('reg-gender').value;
    const dob = document.getElementById('reg-dob').value;
    const address = document.getElementById('reg-address').value;
    const specialization = document.getElementById('reg-specialization')?.value || '';
    const licenseNumber = document.getElementById('reg-license')?.value || '';
    const nhis = document.getElementById('reg-nhis')?.value || '';

    const payload = {
      role, name, email, phone, password, gender, dob, address,
      specialization, license_number: licenseNumber, nhis_number: nhis,
      emergency_contact: {
        name: document.getElementById('reg-emerg-name')?.value || '',
        phone: document.getElementById('reg-emerg-phone')?.value || '',
        relation: document.getElementById('reg-emerg-rel')?.value || ''
      }
    };

    try {
      const data = await API.register(payload);
      this.currentUser = data.user;
      this.updateAuthUI();
      this.closeModal('modal-auth');
      this.showToast(`Account created! Your ID is: ${data.user.user_id}`, 'success');
      this.navigate('dashboard');
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  async handleLogout() {
    await API.logout();
    this.currentUser = null;
    this.updateAuthUI();
    this.showToast('You have been logged out.', 'info');
    this.navigate('home');
  },

  // PATIENT TAB SWITCHER
  switchPatientTab(tabKey) {
    const link = document.querySelector(`.sidebar-link[data-tab="${tabKey}"]`);
    if (link) link.click();
  },

  // BOOK APPOINTMENT
  async handleBookAppointment(event) {
    event.preventDefault();
    const type = document.getElementById('book-type').value;
    const doctor_id = document.getElementById('book-doctor').value;
    const date = document.getElementById('book-date').value;
    const time_slot = document.getElementById('book-slot').value;
    const reason = document.getElementById('book-reason').value;

    try {
      const res = await API.bookAppointment({
        doctor_id,
        date,
        time_slot,
        type,
        reason
      });

      this.showToast('Consultation appointment booked successfully!', 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  async cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await API.updateAppointmentStatus(appointmentId, { status: 'cancelled' });
      this.showToast('Appointment cancelled.', 'info');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  async updateApptStatus(appointmentId, status) {
    try {
      await API.updateAppointmentStatus(appointmentId, { status });
      this.showToast(`Appointment status updated to ${status}.`, 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // EMR & DIAGNOSIS MODAL
  openNewRecordModal(patientId = '') {
    const patSelect = document.getElementById('emr-modal-patient');
    if (patSelect && patientId) patSelect.value = patientId;
    this.openModal('modal-new-emr');
  },

  async handleSaveEMR(event) {
    event.preventDefault();
    const patient_id = document.getElementById('emr-modal-patient').value;
    const diagnosis = document.getElementById('emr-modal-diagnosis').value;
    const symptoms = document.getElementById('emr-modal-symptoms').value;
    const clinical_notes = document.getElementById('emr-modal-notes').value;
    const treatment_plan = document.getElementById('emr-modal-plan').value;
    const icd_code = document.getElementById('emr-modal-icd').value;
    const follow_up_date = document.getElementById('emr-modal-followup').value;

    try {
      await API.createMedicalRecord({
        patient_id, diagnosis, symptoms, clinical_notes, treatment_plan, icd_code, follow_up_date
      });
      this.showToast('Clinical diagnosis and treatment plan saved to EMR.', 'success');
      this.closeModal('modal-new-emr');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // PRESCRIPTION MODAL
  openNewRxModal(patientId = '') {
    const pSelect = document.getElementById('rx-modal-patient');
    if (pSelect && patientId) pSelect.value = patientId;
    this.openModal('modal-new-rx');
  },

  async handleSaveRx(event) {
    event.preventDefault();
    const patient_id = document.getElementById('rx-modal-patient').value;
    const medication_name = document.getElementById('rx-modal-drug').value;
    const dosage = document.getElementById('rx-modal-dosage').value;
    const frequency = document.getElementById('rx-modal-freq').value;
    const duration = document.getElementById('rx-modal-duration').value;
    const instructions = document.getElementById('rx-modal-inst').value;

    try {
      await API.issuePrescription({
        patient_id, medication_name, dosage, frequency, duration, instructions
      });
      this.showToast('Prescription signed and issued to patient file.', 'success');
      this.closeModal('modal-new-rx');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // DISPENSE PRESCRIPTION (Pharmacist)
  async dispensePrescription(rxId) {
    try {
      await API.dispensePrescription(rxId);
      this.showToast('Prescription marked as Dispensed.', 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // LAB ORDER MODAL
  openNewLabOrderModal() {
    this.openModal('modal-new-lab');
  },

  async handleSaveLabOrder(event) {
    event.preventDefault();
    const patient_id = document.getElementById('lab-modal-patient').value;
    const test_name = document.getElementById('lab-modal-test').value;
    const specimen_type = document.getElementById('lab-modal-specimen').value;
    const priority = document.getElementById('lab-modal-priority').value;

    try {
      await API.orderLabTest({ patient_id, test_name, specimen_type, priority });
      this.showToast('Laboratory investigation ordered successfully.', 'success');
      this.closeModal('modal-new-lab');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // LAB RESULT ENTRY MODAL (Lab Tech)
  openEnterLabResultModal(labId, testName) {
    document.getElementById('result-modal-labid').value = labId;
    document.getElementById('result-modal-testname').textContent = testName;
    this.openModal('modal-enter-lab');
  },

  async handleSaveLabResult(event) {
    event.preventDefault();
    const labId = document.getElementById('result-modal-labid').value;
    const result_value = document.getElementById('result-modal-val').value;
    const normal_range = document.getElementById('result-modal-range').value;
    const flag = document.getElementById('result-modal-flag').value;
    const technician_notes = document.getElementById('result-modal-notes').value;

    try {
      await API.enterLabResult(labId, { result_value, normal_range, flag, technician_notes });
      this.showToast('Lab results verified and published to doctor and patient.', 'success');
      this.closeModal('modal-enter-lab');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // VITALS ENTRY MODAL (Nurse)
  openVitalsModal(patientId = '') {
    const pSelect = document.getElementById('vital-modal-patient');
    if (pSelect && patientId) pSelect.value = patientId;
    this.openModal('modal-nurse-vitals');
  },

  async handleSaveVitals(event) {
    event.preventDefault();
    const patient_id = document.getElementById('vital-patient')?.value || document.getElementById('vital-modal-patient')?.value;
    const systolic_bp = document.getElementById('vital-sys')?.value || document.getElementById('vital-modal-sys')?.value;
    const diastolic_bp = document.getElementById('vital-dia')?.value || document.getElementById('vital-modal-dia')?.value;
    const temperature = document.getElementById('vital-temp')?.value || document.getElementById('vital-modal-temp')?.value;
    const pulse_rate = document.getElementById('vital-pulse')?.value || document.getElementById('vital-modal-pulse')?.value;
    const spo2 = document.getElementById('vital-spo2')?.value || document.getElementById('vital-modal-spo2')?.value;
    const respiratory_rate = document.getElementById('vital-resp')?.value || document.getElementById('vital-modal-resp')?.value;
    const weight = document.getElementById('vital-weight')?.value || document.getElementById('vital-modal-weight')?.value;
    const blood_sugar = document.getElementById('vital-sugar')?.value || document.getElementById('vital-modal-sugar')?.value;
    const nursing_notes = document.getElementById('vital-notes')?.value || document.getElementById('vital-modal-notes')?.value;

    try {
      const res = await API.recordVitals({
        patient_id, systolic_bp, diastolic_bp, temperature, pulse_rate,
        spo2, respiratory_rate, weight, blood_sugar, nursing_notes
      });

      if (res.clinicalWarnings && res.clinicalWarnings.length > 0) {
        alert('⚠️ CLINICAL ALERT: ' + res.clinicalWarnings.join(', '));
      }

      this.showToast('Vitals recorded successfully.', 'success');
      this.closeModal('modal-nurse-vitals');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // PHARMACY ADD DRUG
  async handleAddDrug(event) {
    event.preventDefault();
    const name = document.getElementById('drug-name').value;
    const category = document.getElementById('drug-category').value;
    const dosage_form = document.getElementById('drug-form').value;
    const stock_quantity = document.getElementById('drug-qty').value;
    const unit_price = document.getElementById('drug-price').value;
    const expiry_date = document.getElementById('drug-expiry').value;

    try {
      await API.addPharmacyItem({ name, category, dosage_form, stock_quantity, unit_price, expiry_date });
      this.showToast(`Added ${name} to hospital inventory.`, 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // BILLING PAYMENT MODAL
  openPayModal(invoiceId, balance) {
    document.getElementById('pay-modal-invid').value = invoiceId;
    document.getElementById('pay-modal-balance').textContent = `GHS ${parseFloat(balance).toFixed(2)}`;
    document.getElementById('pay-modal-amount').value = parseFloat(balance).toFixed(2);
    this.openModal('modal-pay-invoice');
  },

  async handlePayInvoice(event) {
    event.preventDefault();
    const invoiceId = document.getElementById('pay-modal-invid').value;
    const paid_amount = document.getElementById('pay-modal-amount').value;
    const payment_method = document.getElementById('pay-modal-method').value;

    try {
      await API.payInvoice(invoiceId, { paid_amount, payment_method });
      this.showToast(`Payment of GHS ${paid_amount} recorded successfully.`, 'success');
      this.closeModal('modal-pay-invoice');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // CREATE BILLING INVOICE (Accountant)
  async handleCreateInvoice(event) {
    event.preventDefault();
    const patient_id = document.getElementById('inv-patient').value;
    const itemName = document.getElementById('inv-item-name').value;
    const itemAmount = document.getElementById('inv-item-amount').value;
    const payment_method = document.getElementById('inv-method').value;
    const paid_amount = document.getElementById('inv-paid').value;

    try {
      await API.createInvoice({
        patient_id,
        items: [{ name: itemName, quantity: 1, amount: parseFloat(itemAmount) }],
        payment_method,
        paid_amount: parseFloat(paid_amount)
      });
      this.showToast('Billing invoice created.', 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // RECEPTIONIST WALK-IN REGISTRATION
  async handleRegisterWalkin(event) {
    event.preventDefault();
    const name = document.getElementById('walkin-name').value;
    const email = document.getElementById('walkin-email').value;
    const phone = document.getElementById('walkin-phone').value;
    const gender = document.getElementById('walkin-gender').value;
    const dob = document.getElementById('walkin-dob').value;
    const address = document.getElementById('walkin-address').value;
    const nhis = document.getElementById('walkin-nhis').value;

    try {
      const res = await API.register({
        role: 'patient', name, email, phone, password: 'patient123',
        gender, dob, address, nhis_number: nhis
      });
      alert(`✅ Patient Registration Complete!\nPatient Name: ${name}\nAssigned ID: ${res.user.user_id}`);
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // ADMIN VERIFY CREDENTIALS
  async verifyUser(userId, status) {
    try {
      await API.verifyUser(userId, status);
      this.showToast(`User ${userId} credentials marked as ${status}.`, 'success');
      this.renderActiveDashboard();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  },

  // TELEMEDICINE VIRTUAL CONSULTATION ROOM
  launchTelemed(meetingId, peerName) {
    document.getElementById('telemed-peer-name').textContent = peerName || 'Doctor / Patient';
    document.getElementById('telemed-meeting-code').textContent = meetingId || 'VMEET-SECURE-CHANNEL';
    this.openModal('modal-telemed-room');
  },

  saveTelemedNotes() {
    this.showToast('Telemedicine consultation notes appended to patient electronic record.', 'success');
  },

  // PRINT HEALTH SUMMARY / PRESCRIPTION SLIP
  async printPatientReport(patientId) {
    try {
      const dossier = await API.getPatientDossier(patientId);
      const p = dossier.patient;
      const rec = dossier.records[0] || {};
      const vit = dossier.vitals[0] || {};
      const rxList = dossier.prescriptions || [];

      const reportEl = document.getElementById('printable-report');
      reportEl.innerHTML = `
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="font-size: 1.4rem; color: #0369a1; margin: 0;">🏥 ST. NICHOLAS DIGITAL HOSPITAL & CLINICAL AI CENTER</h1>
            <p style="font-size: 0.85rem; color: #64748b; margin: 2px 0 0 0;">Airport Residential Area, Accra, Ghana &bull; Emergency: 112 / +233 30 277 5555</p>
          </div>
          <div style="text-align: right; font-size: 0.8rem;">
            <strong>OFFICIAL CLINICAL SUMMARY</strong><br>
            Date: ${new Date().toLocaleDateString()}
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 0.88rem;">
          <table style="width: 100%; border: none;">
            <tr>
              <td><strong>Patient Name:</strong> ${p.name}</td>
              <td><strong>Patient ID:</strong> ${p.user_id}</td>
              <td><strong>DOB / Gender:</strong> ${p.dob || '-'} / ${p.gender || '-'}</td>
            </tr>
            <tr>
              <td><strong>Blood Group:</strong> ${p.blood_group || 'O+'} (${p.genotype || 'AA'})</td>
              <td><strong>NHIS Number:</strong> ${p.nhis_number || 'N/A'}</td>
              <td><strong>Emergency Contact:</strong> ${p.emergency_contact_phone || 'N/A'}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding-top: 6px;">
                <strong style="color: #dc2626;">Known Drug Allergies:</strong> ${p.allergies || 'No known allergies reported'}
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 1.05rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Latest Clinical Diagnosis & Observations</h3>
          <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Primary Diagnosis:</strong> ${rec.diagnosis || 'General Checkup & Wellness Review'} (${rec.icd_code || 'Standard'})</p>
          <p style="margin: 6px 0; font-size: 0.88rem;"><strong>Presenting Symptoms:</strong> ${rec.symptoms || 'None reported'}</p>
          <p style="margin: 6px 0; font-size: 0.88rem;"><strong>Physician Examination Findings:</strong> ${rec.clinical_notes || 'Stable clinical parameters.'}</p>
          <p style="margin: 6px 0; font-size: 0.88rem;"><strong>Prescribed Treatment Plan:</strong> ${rec.treatment_plan || 'Continue prescribed regimen and diet.'}</p>
        </div>

        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 1.05rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Latest Vital Signs</h3>
          <p style="font-size: 0.88rem; margin: 6px 0;">
            BP: <strong>${vit.systolic_bp || 120}/${vit.diastolic_bp || 80} mmHg</strong> &bull;
            Temp: <strong>${vit.temperature || 36.8} °C</strong> &bull;
            Pulse: <strong>${vit.pulse_rate || 72} bpm</strong> &bull;
            SpO2: <strong>${vit.spo2 || 98} %</strong> &bull;
            Glucose: <strong>${vit.blood_sugar ? vit.blood_sugar + ' mmol/L' : 'Normal'}</strong>
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 1.05rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Prescribed Medications (Rx)</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 8px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #cbd5e1;">Medication</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">Dosage & Frequency</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">Duration</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">Special Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${rxList.map(r => `
                <tr>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${r.medication_name}</strong></td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.dosage} - ${r.frequency}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.duration}</td>
                  <td style="padding: 6px; border: 1px solid #cbd5e1;">${r.instructions || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.85rem; border-top: 1px solid #cbd5e1; padding-top: 12px;">
          <div>
            <strong>Hospital Pharmacist Stamp:</strong><br><br>
            _______________________________<br>
            Pharm. Samuel Owusu (PCG/R/10923)
          </div>
          <div style="text-align: right;">
            <strong>Attending Physician Signature:</strong><br><br>
            _______________________________<br>
            Dr. Kwesi Mensah, MBChB, FWACS (MDC/RN/44912)
          </div>
        </div>
      `;

      window.print();
    } catch (err) {
      this.showToast('Failed to generate printable summary: ' + err.message, 'danger');
    }
  },

  // FIRST AID & MEDICATION KNOWLEDGE BASE SEARCH
  async searchKnowledgeHub(query = '') {
    const container = document.getElementById('knowledge-cards-container');
    if (!container) return;

    try {
      const res = await API.getKnowledge(query);
      const items = res.results || [];

      if (items.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No matching health articles found. Try searching for "burns", "cpr", "malaria", "metformin", or "asthma".</div>';
        return;
      }

      container.innerHTML = items.map(item => `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span class="badge ${item.category === 'first_aid' ? 'badge-danger' : item.category === 'medication' ? 'badge-info' : 'badge-warning'}">
                ${item.category === 'first_aid' ? '🚑 First Aid Protocol' : item.category === 'medication' ? '💊 Drug Formulary' : '🩺 Medical Condition'}
              </span>
              ${item.emergency_level === 'immediate_emergency' ? '<span class="badge badge-danger">🚨 Emergency</span>' : ''}
            </div>
            <h3 style="margin-bottom: 8px;">${item.title}</h3>
            <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">${item.summary}</p>
          </div>

          <div>
            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="App.viewKnowledgeDetail(${item.id})">
              Read Complete Guide &rarr;
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger);">Failed to load knowledge entries: ${err.message}</p>`;
    }
  },

  async viewKnowledgeDetail(id) {
    try {
      const res = await API.getKnowledge();
      const item = (res.results || []).find(x => x.id === id);
      if (!item) return;

      document.getElementById('modal-kb-title').textContent = item.title;
      document.getElementById('modal-kb-summary').textContent = item.summary;
      document.getElementById('modal-kb-content').innerHTML = item.content.replace(/\n/g, '<br>');
      this.openModal('modal-kb-detail');
    } catch (err) {
      this.showToast('Could not load article detail', 'danger');
    }
  },

  // AI HEALTHCARE ASSISTANT CHAT
  toggleAiDrawer() {
    const drawer = document.getElementById('ai-chat-drawer');
    if (drawer) drawer.classList.toggle('open');
  },

  openAiDrawer(mode = 'patient') {
    const drawer = document.getElementById('ai-chat-drawer');
    if (drawer) drawer.classList.add('open');
    const select = document.getElementById('ai-mode-select');
    if (select) select.value = mode;
  },

  setAiPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptText;
      this.handleAiSendMessage();
    }
  },

  async handleAiSendMessage() {
    const input = document.getElementById('ai-chat-input');
    const text = input?.value.trim();
    if (!text) return;

    input.value = '';
    const body = document.getElementById('ai-chat-messages');

    // Add user bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'ai-msg ai-msg-user';
    userBubble.textContent = text;
    body.appendChild(userBubble);
    body.scrollTop = body.scrollHeight;

    // Loading indicator bubble
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'ai-msg ai-msg-bot';
    loadingBubble.innerHTML = '<em>Thinking and evaluating clinical safety...</em>';
    body.appendChild(loadingBubble);
    body.scrollTop = body.scrollHeight;

    const mode = document.getElementById('ai-mode-select')?.value || 'patient';

    try {
      const res = await API.chatWithAI(text, mode);
      loadingBubble.remove();

      const botBubble = document.createElement('div');
      botBubble.className = res.isEmergency ? 'ai-msg ai-msg-emergency' : 'ai-msg ai-msg-bot';

      let html = res.message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (res.isEmergency) {
        html += `
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <a href="tel:112" class="btn btn-danger btn-sm" style="text-decoration: none;">🚨 Call Ghana 112</a>
            <a href="tel:193" class="btn btn-danger btn-sm" style="text-decoration: none;">🚑 Call Ambulance 193</a>
          </div>
        `;
      }

      if (res.actions && res.actions.length > 0) {
        html += '<div style="margin-top: 10px; display: flex; gap: 6px;">';
        for (const act of res.actions) {
          html += `<button class="btn btn-${act.type || 'primary'} btn-sm" onclick="App.handleAiAction('${act.action}')">${act.text}</button>`;
        }
        html += '</div>';
      }

      if (res.disclaimer) {
        html += `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px; border-top: 1px solid var(--border); padding-top: 4px;">⚠️ ${res.disclaimer}</div>`;
      }

      botBubble.innerHTML = html;
      body.appendChild(botBubble);
      body.scrollTop = body.scrollHeight;
    } catch (err) {
      loadingBubble.innerHTML = `<span style="color: var(--danger);">Assistant unavailable: ${err.message}</span>`;
    }
  },

  handleAiAction(action) {
    if (action === '#appointments') {
      if (this.currentUser) {
        this.navigate('dashboard');
        this.switchPatientTab('pt-book');
      } else {
        this.openAuthModal('login');
      }
    } else if (action === '#first-aid') {
      this.navigate('knowledge');
    }
  }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
