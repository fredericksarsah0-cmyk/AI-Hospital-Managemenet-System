// public/js/dashboards.js
// Renders personalized, feature-rich dashboards for all 8 HMS user roles

const Dashboards = {
  // 1. PATIENT DASHBOARD
  async renderPatient(container, user) {
    const [statsRes, apptsRes, rxRes, labsRes, vitalsRes, billingRes] = await Promise.all([
      API.getStats().catch(() => ({ stats: {} })),
      API.getAppointments().catch(() => ({ appointments: [] })),
      API.getPrescriptions().catch(() => ({ prescriptions: [] })),
      API.getLabRequests().catch(() => ({ labRequests: [] })),
      API.getVitals().catch(() => ({ vitals: [] })),
      API.getBillingInvoices().catch(() => ({ invoices: [] }))
    ]);

    const stats = statsRes.stats || {};
    const appointments = apptsRes.appointments || [];
    const prescriptions = rxRes.prescriptions || [];
    const labs = labsRes.labRequests || [];
    const vitals = vitalsRes.vitals || [];
    const invoices = billingRes.invoices || [];

    const profile = user.patient_profile || {};

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>${user.name}</h4>
                <span>Patient ID: ${user.user_id}</span>
                <small>Blood: ${profile.blood_group || 'O+'} | Genotype: ${profile.genotype || 'AA'}</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="pt-overview">📊 Health Overview</a></li>
              <li><a class="sidebar-link" data-tab="pt-appointments">📅 My Appointments (${appointments.length})</a></li>
              <li><a class="sidebar-link" data-tab="pt-book">➕ Book Consultation</a></li>
              <li><a class="sidebar-link" data-tab="pt-emr">📋 Medical Records (EMR)</a></li>
              <li><a class="sidebar-link" data-tab="pt-prescriptions">💊 Prescriptions (${prescriptions.length})</a></li>
              <li><a class="sidebar-link" data-tab="pt-labs">🔬 Lab Results (${labs.length})</a></li>
              <li><a class="sidebar-link" data-tab="pt-vitals">📈 Vitals Log</a></li>
              <li><a class="sidebar-link" data-tab="pt-billing">💳 Invoices & Payments</a></li>
            </ul>
          </div>

          <div style="padding-top: 16px; border-top: 1px solid var(--border);">
            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="App.openAiDrawer('patient')">
              🤖 Ask AI Assistant
            </button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: OVERVIEW -->
          <div id="tab-pt-overview" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Welcome back, ${user.name}</h2>
                <p>Personalized Patient Health Portal & Digital Medical Records</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="App.switchPatientTab('pt-book')">➕ Book Appointment</button>
                <button class="btn btn-outline" onclick="App.printPatientReport('${user.user_id}')">🖨️ Print Health Summary</button>
              </div>
            </div>

            <!-- Health Profile Notice -->
            <div style="background: #ffffff; border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <strong>Active Allergies:</strong> <span style="color: var(--danger); font-weight: 600;">${profile.allergies || 'None recorded'}</span> &nbsp;|&nbsp;
                <strong>Chronic Conditions:</strong> <span>${profile.chronic_conditions || 'None recorded'}</span> &nbsp;|&nbsp;
                <strong>Emergency Contact:</strong> <span>${profile.emergency_contact_name || 'Not provided'} (${profile.emergency_contact_phone || 'N/A'})</span>
              </div>
              <span class="badge badge-success">NHIS: ${profile.nhis_number || 'GH-NHIS-Active'}</span>
            </div>

            <!-- Stats KPI -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-info">
                  <span>Appointments</span>
                  <h3>${stats.appointmentsCount || appointments.length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">📅</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Active Prescriptions</span>
                  <h3>${stats.prescriptionsCount || prescriptions.length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--accent-light); color: var(--accent);">💊</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Laboratory Reports</span>
                  <h3>${stats.labsCount || labs.length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--success-light); color: var(--success);">🔬</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Latest BP / Temp</span>
                  <h3>${stats.latestVitals ? `${stats.latestVitals.systolic_bp}/${stats.latestVitals.diastolic_bp}` : '120/80'}</h3>
                </div>
                <div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">❤️</div>
              </div>
            </div>

            <!-- Upcoming Appointment Banner -->
            <div class="card" style="margin-bottom: 24px;">
              <h3 style="margin-bottom: 12px;">📅 Upcoming Consultation</h3>
              ${appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').slice(0, 1).map(a => `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; background: var(--bg-main); padding: 16px; border-radius: var(--radius-md);">
                  <div>
                    <h4 style="color: var(--secondary); font-size: 1.05rem;">With Dr. ${a.doctor_name || 'Specialist'}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${a.department} &bull; ${a.reason}</p>
                    <div style="margin-top: 6px; font-weight: 600; font-size: 0.9rem;">
                      🗓️ ${a.date} at ${a.time_slot}
                      <span class="badge ${a.type === 'virtual' ? 'badge-info' : 'badge-neutral'}" style="margin-left: 8px;">
                        ${a.type === 'virtual' ? '🎥 Virtual Telemedicine' : '🏥 In-Person'}
                      </span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    ${a.type === 'virtual' ? `<button class="btn btn-primary btn-sm" onclick="App.launchTelemed('${a.virtual_meeting_id}', '${a.doctor_name}')">Join Telemedicine Call</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="App.cancelAppointment('${a.appointment_id}')">Cancel</button>
                  </div>
                </div>
              `).join('') || '<p style="color: var(--text-muted); padding: 12px 0;">No pending appointments. Use the button above to book a consultation.</p>'}
            </div>

            <!-- Recent Prescriptions & Labs Quick Tables -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div class="card">
                <h3 style="margin-bottom: 12px;">💊 Current Medications</h3>
                <div class="table-responsive">
                  <table class="table">
                    <thead>
                      <tr><th>Medication</th><th>Dosage</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      ${prescriptions.slice(0, 3).map(p => `
                        <tr>
                          <td><strong>${p.medication_name}</strong><br><small style="color: var(--text-muted);">${p.instructions || ''}</small></td>
                          <td>${p.dosage} (${p.frequency})</td>
                          <td><span class="badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
                        </tr>
                      `).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No active prescriptions</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="card">
                <h3 style="margin-bottom: 12px;">🔬 Latest Lab Investigations</h3>
                <div class="table-responsive">
                  <table class="table">
                    <thead>
                      <tr><th>Test Name</th><th>Result</th><th>Flag</th></tr>
                    </thead>
                    <tbody>
                      ${labs.slice(0, 3).map(l => `
                        <tr>
                          <td><strong>${l.test_name}</strong><br><small style="color: var(--text-muted);">${l.specimen_type}</small></td>
                          <td>${l.result_value || 'Pending analysis'}</td>
                          <td><span class="badge ${l.flag === 'Critical' ? 'badge-danger' : l.flag === 'High' ? 'badge-warning' : 'badge-success'}">${l.flag || 'Normal'}</span></td>
                        </tr>
                      `).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No lab results yet</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: APPOINTMENTS -->
          <div id="tab-pt-appointments" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>My Appointment History</h2>
                <p>Track, manage, or join upcoming virtual telemedicine consultations</p>
              </div>
              <button class="btn btn-primary" onclick="App.switchPatientTab('pt-book')">➕ Book New Appointment</button>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Doctor</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason / Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${appointments.map(a => `
                      <tr>
                        <td><code>${a.appointment_id}</code></td>
                        <td><strong>Dr. ${a.doctor_name || 'Doctor'}</strong><br><small style="color: var(--text-muted);">${a.department}</small></td>
                        <td>${a.date}<br><small style="color: var(--text-muted);">${a.time_slot}</small></td>
                        <td><span class="badge ${a.type === 'virtual' ? 'badge-info' : 'badge-neutral'}">${a.type === 'virtual' ? '🎥 Virtual' : '🏥 In-Person'}</span></td>
                        <td><span class="badge ${a.status === 'confirmed' ? 'badge-success' : a.status === 'pending' ? 'badge-warning' : a.status === 'completed' ? 'badge-info' : 'badge-danger'}">${a.status}</span></td>
                        <td>${a.reason || '-'}${a.consultation_notes ? `<br><small style="color: var(--primary);">Dr. Note: ${a.consultation_notes}</small>` : ''}</td>
                        <td>
                          ${a.type === 'virtual' && (a.status === 'confirmed' || a.status === 'pending') ? `
                            <button class="btn btn-primary btn-sm" onclick="App.launchTelemed('${a.virtual_meeting_id}', '${a.doctor_name}')">Join Call</button>
                          ` : ''}
                          ${a.status === 'pending' || a.status === 'confirmed' ? `
                            <button class="btn btn-outline btn-sm" onclick="App.cancelAppointment('${a.appointment_id}')">Cancel</button>
                          ` : '-'}
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No appointment records found.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 3: BOOK CONSULTATION -->
          <div id="tab-pt-book" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Book Doctor Consultation</h2>
                <p>Schedule an in-person clinic visit or a virtual telemedicine session</p>
              </div>
            </div>

            <div class="card" style="max-width: 800px;">
              <form id="form-patient-book" onsubmit="App.handleBookAppointment(event)">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Consultation Type</label>
                    <select id="book-type" class="form-control" required>
                      <option value="in_person">In-Person Consultation (Hospital Clinic)</option>
                      <option value="virtual">Virtual Telemedicine Consultation (Online Video)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Specialist Doctor</label>
                    <select id="book-doctor" class="form-control" required onchange="App.handleDoctorSelect(this.value)">
                      <option value="">Select a Doctor</option>
                      <option value="HMS-DOC-101">Dr. Kwesi Mensah - Cardiology & Internal Medicine</option>
                      <option value="HMS-DOC-102">Dr. Akosua Boateng - Pediatrics & Child Health</option>
                      <option value="HMS-DOC-103">Dr. David Appiah - Surgery & Orthopedics</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Preferred Date</label>
                    <input type="date" id="book-date" class="form-control" required min="${new Date().toISOString().split('T')[0]}" value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Time Slot</label>
                    <select id="book-slot" class="form-control" required>
                      <option value="09:00 AM">09:00 AM - Morning Slot</option>
                      <option value="10:00 AM">10:00 AM - Morning Slot</option>
                      <option value="11:30 AM">11:30 AM - Late Morning Slot</option>
                      <option value="01:30 PM">01:30 PM - Afternoon Slot</option>
                      <option value="02:30 PM">02:30 PM - Afternoon Slot</option>
                      <option value="03:30 PM">03:30 PM - Evening Slot</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Reason for Consultation / Symptoms</label>
                  <textarea id="book-reason" class="form-control" placeholder="Describe symptoms, concern, or ongoing medication renewal request..." required></textarea>
                </div>

                <div style="background: var(--primary-light); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--primary-dark); margin-bottom: 20px;">
                  ℹ️ <strong>Double-booking prevention:</strong> The system verifies doctor availability in real-time. Confirmation notices are sent directly to your portal.
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Confirm Consultation Booking</button>
              </form>
            </div>
          </div>

          <!-- TAB 4: MEDICAL RECORDS (EMR) -->
          <div id="tab-pt-emr" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Electronic Medical Records (EMR)</h2>
                <p>Doctor consultation summaries, diagnostic history, and treatment plans</p>
              </div>
              <button class="btn btn-outline" onclick="App.printPatientReport('${user.user_id}')">🖨️ Print Full Medical Record</button>
            </div>

            <div id="patient-emr-list">
              <!-- Populated via API -->
              <p style="color: var(--text-muted);">Loading electronic health records...</p>
            </div>
          </div>

          <!-- TAB 5: PRESCRIPTIONS -->
          <div id="tab-pt-prescriptions" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Prescriptions & Medication Schedule</h2>
                <p>Approved medications authorized by licensed hospital physicians</p>
              </div>
              <button class="btn btn-outline" onclick="App.printPatientReport('${user.user_id}')">🖨️ Print Prescription Slip</button>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Rx ID</th>
                      <th>Medication</th>
                      <th>Dosage & Frequency</th>
                      <th>Duration</th>
                      <th>Special Instructions</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${prescriptions.map(p => `
                      <tr>
                        <td><code>${p.rx_id}</code></td>
                        <td><strong>${p.medication_name}</strong><br><small style="color: var(--text-muted);">By Dr. ${p.doctor_name || 'Specialist'}</small></td>
                        <td><strong>${p.dosage}</strong><br>${p.frequency}</td>
                        <td>${p.duration}</td>
                        <td>${p.instructions || 'Take as instructed'}</td>
                        <td>
                          <span class="badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-warning'}">
                            ${p.status === 'dispensed' ? '✅ Dispensed by Pharmacy' : '⏳ Ready for Pickup'}
                          </span>
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No prescription records found.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 6: LAB RESULTS -->
          <div id="tab-pt-labs" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Laboratory Diagnostic Reports</h2>
                <p>Pathology, hematology, and biochemistry investigation records</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Lab Ref</th>
                      <th>Investigation</th>
                      <th>Specimen</th>
                      <th>Measured Results</th>
                      <th>Reference Range</th>
                      <th>Clinical Flag</th>
                      <th>Scientist Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${labs.map(l => `
                      <tr>
                        <td><code>${l.lab_id}</code></td>
                        <td><strong>${l.test_name}</strong><br><small style="color: var(--text-muted);">Ordered by Dr. ${l.doctor_name || 'Physician'}</small></td>
                        <td>${l.specimen_type}</td>
                        <td><strong>${l.result_value || 'Sample under analyzer run...'}</strong></td>
                        <td><small style="color: var(--text-muted);">${l.normal_range || '-'}</small></td>
                        <td>
                          <span class="badge ${l.flag === 'Critical' ? 'badge-danger' : l.flag === 'High' ? 'badge-warning' : 'badge-success'}">
                            ${l.flag || 'Normal'}
                          </span>
                        </td>
                        <td><small>${l.technician_notes || 'Pending technician sign-off'}</small></td>
                      </tr>
                    `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No laboratory tests on file.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 7: VITALS LOG -->
          <div id="tab-pt-vitals" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Vital Signs Tracking & Progression</h2>
                <p>Blood pressure, body temperature, pulse, oxygen saturation, and blood glucose</p>
              </div>
            </div>

            <div class="card" style="margin-bottom: 24px;">
              <h3 style="margin-bottom: 16px;">📈 Blood Pressure & Heart Rate Progression</h3>
              <div id="vitals-chart-container" style="width: 100%; height: 200px; display: flex; align-items: flex-end; gap: 20px; padding: 20px 10px; background: #f8fafc; border-radius: var(--radius-md);">
                ${vitals.slice(0, 6).reverse().map(v => `
                  <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary-dark);">${v.systolic_bp}/${v.diastolic_bp}</div>
                    <div style="width: 28px; height: ${Math.max(40, (v.systolic_bp - 70) * 1.5)}px; background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 4px;"></div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${v.recorded_at.split(' ')[0]}</div>
                  </div>
                `).join('') || '<p style="color: var(--text-muted); width: 100%; text-align: center;">No vitals data to plot.</p>'}
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>BP (mmHg)</th>
                      <th>Temp (°C)</th>
                      <th>Pulse (bpm)</th>
                      <th>SpO2 (%)</th>
                      <th>Weight (kg)</th>
                      <th>Blood Sugar</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vitals.map(v => `
                      <tr>
                        <td>${v.recorded_at}</td>
                        <td><strong>${v.systolic_bp}/${v.diastolic_bp}</strong></td>
                        <td>${v.temperature}°C</td>
                        <td>${v.pulse_rate} bpm</td>
                        <td>${v.spo2}%</td>
                        <td>${v.weight || '-'} kg</td>
                        <td>${v.blood_sugar ? `${v.blood_sugar} mmol/L` : '-'}</td>
                        <td><small>${v.recorded_by_name || 'Nurse'}</small></td>
                      </tr>
                    `).join('') || '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No vitals records recorded yet.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 8: BILLING & INVOICES -->
          <div id="tab-pt-billing" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Invoices & Payment Records</h2>
                <p>Itemized hospital bills, NHIS coverage claims, and payment receipts</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Date</th>
                      <th>Total Amount (GHS)</th>
                      <th>Amount Paid</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${invoices.map(inv => `
                      <tr>
                        <td><code>${inv.invoice_id}</code></td>
                        <td>${inv.created_at.split(' ')[0]}</td>
                        <td><strong>GHS ${parseFloat(inv.total_amount).toFixed(2)}</strong></td>
                        <td>GHS ${parseFloat(inv.paid_amount).toFixed(2)}</td>
                        <td>${inv.payment_method || 'Mobile Money'}</td>
                        <td>
                          <span class="badge ${inv.payment_status === 'paid' ? 'badge-success' : inv.payment_status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}">
                            ${inv.payment_status}
                          </span>
                        </td>
                        <td>
                          ${inv.payment_status !== 'paid' ? `
                            <button class="btn btn-primary btn-sm" onclick="App.openPayModal('${inv.invoice_id}', ${inv.total_amount - inv.paid_amount})">Pay Balance</button>
                          ` : `<span style="color: var(--success); font-weight: 600;">Receipt Paid</span>`}
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No billing records found.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    // Load EMR details asynchronously
    this.loadPatientEmr(user.user_id);
    this.setupSidebarNav(container);
  },

  async loadPatientEmr(patientId) {
    const listEl = document.getElementById('patient-emr-list');
    if (!listEl) return;
    try {
      const res = await API.getMedicalRecords(patientId);
      const records = res.records || [];
      if (records.length === 0) {
        listEl.innerHTML = '<div class="card"><p style="color: var(--text-muted);">No clinical diagnosis records found on file.</p></div>';
        return;
      }

      listEl.innerHTML = records.map(r => `
        <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--accent);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h3 style="color: var(--secondary);">${r.diagnosis}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">
                Consulting Physician: <strong>Dr. ${r.doctor_name}</strong> (${r.doctor_specialization || 'Consultant'}) &bull; Date: ${r.date.split(' ')[0]}
              </p>
            </div>
            <span class="badge badge-info">ICD-10: ${r.icd_code || 'Standard'}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 0.9rem;">
            <div style="background: var(--bg-main); padding: 12px; border-radius: var(--radius-md);">
              <strong style="color: var(--secondary);">Presenting Symptoms:</strong>
              <p style="margin-top: 4px; color: var(--text-main);">${r.symptoms || 'None recorded'}</p>
            </div>
            <div style="background: var(--bg-main); padding: 12px; border-radius: var(--radius-md);">
              <strong style="color: var(--secondary);">Clinical Examination Notes:</strong>
              <p style="margin-top: 4px; color: var(--text-main);">${r.clinical_notes || 'Routine examination'}</p>
            </div>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: var(--radius-md); font-size: 0.9rem;">
            <strong style="color: #166534;">Prescribed Treatment Plan & Lifestyle Advice:</strong>
            <p style="margin-top: 4px; color: #14532d;">${r.treatment_plan || 'Follow prescribed medications.'}</p>
            ${r.follow_up_date ? `<div style="margin-top: 6px; font-weight: 600; color: #15803d;">🗓️ Recommended Follow-up: ${r.follow_up_date}</div>` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color: var(--danger);">Error loading medical records: ${err.message}</p>`;
    }
  },

  // 2. DOCTOR DASHBOARD
  async renderDoctor(container, user) {
    const [statsRes, apptsRes, patientsRes, rxRes, labsRes] = await Promise.all([
      API.getStats().catch(() => ({ stats: {} })),
      API.getAppointments().catch(() => ({ appointments: [] })),
      API.getPatients().catch(() => ({ patients: [] })),
      API.getPrescriptions().catch(() => ({ prescriptions: [] })),
      API.getLabRequests().catch(() => ({ labRequests: [] }))
    ]);

    const stats = statsRes.stats || {};
    const appointments = apptsRes.appointments || [];
    const patients = patientsRes.patients || [];
    const prescriptions = rxRes.prescriptions || [];
    const labs = labsRes.labRequests || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>Dr. ${user.name}</h4>
                <span>${user.specialization || 'Consultant'}</span>
                <small>Lic: ${user.license_number || 'MDC-Verified'}</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="doc-overview">📊 Clinical Dashboard</a></li>
              <li><a class="sidebar-link" data-tab="doc-queue">👥 Appointment Queue (${appointments.filter(a => a.status === 'pending').length} pending)</a></li>
              <li><a class="sidebar-link" data-tab="doc-patients">📁 Patient Records & EMR</a></li>
              <li><a class="sidebar-link" data-tab="doc-rx">💊 Prescription Writer</a></li>
              <li><a class="sidebar-link" data-tab="doc-labs">🔬 Diagnostic Lab Orders</a></li>
              <li><a class="sidebar-link" data-tab="doc-telemed">🎥 Telemedicine Room</a></li>
            </ul>
          </div>

          <div style="padding-top: 16px; border-top: 1px solid var(--border);">
            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="App.openAiDrawer('doctor')">
              🩺 Clinical AI Reference
            </button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: OVERVIEW -->
          <div id="tab-doc-overview" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Clinical Workspace &bull; Dr. ${user.name}</h2>
                <p>${user.department || 'Clinical Medicine'} &bull; GMC / MDC License: <strong>${user.license_number}</strong></p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="App.openNewRecordModal()">➕ New Diagnosis / EMR</button>
                <button class="btn btn-accent" onclick="App.openNewRxModal()">💊 Issue Rx</button>
              </div>
            </div>

            <!-- Stats KPI -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-info">
                  <span>Assigned Patients</span>
                  <h3>${stats.myPatients || patients.length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">👥</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Appointments Today</span>
                  <h3>${stats.appointmentsToday || appointments.length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">🗓️</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Pending Requests</span>
                  <h3>${appointments.filter(a => a.status === 'pending').length}</h3>
                </div>
                <div class="stat-icon" style="background: var(--danger-light); color: var(--danger);">⏳</div>
              </div>
              <div class="stat-card">
                <div class="stat-info">
                  <span>Total Consultations</span>
                  <h3>${stats.totalConsultations || 14}</h3>
                </div>
                <div class="stat-icon" style="background: var(--success-light); color: var(--success);">📋</div>
              </div>
            </div>

            <!-- Consultation Queue Preview -->
            <div class="card" style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3>📅 Today's Consultation Schedule</h3>
                <span class="badge badge-info">${appointments.length} Consultations</span>
              </div>

              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Time Slot</th>
                      <th>Type</th>
                      <th>Chief Complaint / Reason</th>
                      <th>Status</th>
                      <th>Clinical Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${appointments.map(a => `
                      <tr>
                        <td><strong>${a.patient_name || a.patient_id}</strong><br><small style="color: var(--text-muted);">${a.patient_phone || ''}</small></td>
                        <td>${a.date}<br><strong>${a.time_slot}</strong></td>
                        <td><span class="badge ${a.type === 'virtual' ? 'badge-info' : 'badge-neutral'}">${a.type === 'virtual' ? '🎥 Virtual' : '🏥 In-Person'}</span></td>
                        <td>${a.reason}</td>
                        <td><span class="badge ${a.status === 'confirmed' ? 'badge-success' : a.status === 'pending' ? 'badge-warning' : 'badge-neutral'}">${a.status}</span></td>
                        <td>
                          <div style="display: flex; gap: 4px;">
                            ${a.status === 'pending' ? `
                              <button class="btn btn-success btn-sm" onclick="App.updateApptStatus('${a.appointment_id}', 'confirmed')">Approve</button>
                              <button class="btn btn-danger btn-sm" onclick="App.updateApptStatus('${a.appointment_id}', 'declined')">Decline</button>
                            ` : ''}
                            ${a.type === 'virtual' && a.status === 'confirmed' ? `
                              <button class="btn btn-primary btn-sm" onclick="App.launchTelemed('${a.virtual_meeting_id}', '${a.patient_name}')">Start Call</button>
                            ` : ''}
                            <button class="btn btn-outline btn-sm" onclick="App.openNewRecordModal('${a.patient_id}')">Examine / EMR</button>
                          </div>
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No consultations scheduled.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: APPOINTMENT QUEUE -->
          <div id="tab-doc-queue" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Consultation Requests & Schedule</h2>
                <p>Accept, reschedule, or complete consultation appointments</p>
              </div>
            </div>
            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Ref</th><th>Patient</th><th>Date</th><th>Slot</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    ${appointments.map(a => `
                      <tr>
                        <td><code>${a.appointment_id}</code></td>
                        <td><strong>${a.patient_name}</strong></td>
                        <td>${a.date}</td>
                        <td>${a.time_slot}</td>
                        <td><span class="badge ${a.type === 'virtual' ? 'badge-info' : 'badge-neutral'}">${a.type}</span></td>
                        <td><span class="badge ${a.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">${a.status}</span></td>
                        <td>
                          <button class="btn btn-success btn-sm" onclick="App.updateApptStatus('${a.appointment_id}', 'completed')">Mark Completed</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 3: PATIENT RECORDS & EMR -->
          <div id="tab-doc-patients" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Electronic Health Records & Patient Dossiers</h2>
                <p>Access full clinical histories, allergies, vitals, and previous diagnoses</p>
              </div>
              <button class="btn btn-primary" onclick="App.openNewRecordModal()">➕ Document Clinical EMR</button>
            </div>

            <div class="card" style="margin-bottom: 24px;">
              <input type="text" class="form-control" placeholder="Search patients by name, patient ID, phone..." oninput="App.filterDoctorPatients(this.value)">
            </div>

            <div id="doc-patients-grid" class="grid-3">
              ${patients.map(p => `
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <h3 style="margin-bottom: 2px;">${p.name}</h3>
                      <span style="font-size: 0.78rem; color: var(--primary); font-weight: 600;">${p.user_id}</span>
                    </div>
                    <span class="badge badge-info">${p.gender || 'Unknown'} &bull; ${p.blood_group || 'O+'}</span>
                  </div>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
                    <strong>Allergies:</strong> <span style="color: var(--danger); font-weight: 600;">${p.allergies || 'None'}</span><br>
                    <strong>Chronic:</strong> ${p.chronic_conditions || 'None'}<br>
                    <strong>Phone:</strong> ${p.phone || 'N/A'}
                  </p>
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="App.viewFullDossier('${p.user_id}')">View Dossier</button>
                    <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="App.openNewRecordModal('${p.user_id}')">Add Diagnosis</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TAB 4: PRESCRIPTION WRITER -->
          <div id="tab-doc-rx" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Prescription Authorization Portal</h2>
                <p>Issue clinical prescriptions signed with your license number</p>
              </div>
              <button class="btn btn-primary" onclick="App.openNewRxModal()">➕ Write New Prescription</button>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Rx ID</th><th>Patient</th><th>Drug Name</th><th>Dosage & Frequency</th><th>Duration</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${prescriptions.map(p => `
                      <tr>
                        <td><code>${p.rx_id}</code></td>
                        <td><strong>${p.patient_name || p.patient_id}</strong></td>
                        <td><strong>${p.medication_name}</strong></td>
                        <td>${p.dosage} - ${p.frequency}</td>
                        <td>${p.duration}</td>
                        <td><span class="badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 5: LAB ORDERS -->
          <div id="tab-doc-labs" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Diagnostic Laboratory Orders</h2>
                <p>Order tests from Pathology, Hematology, and Biochemistry labs</p>
              </div>
              <button class="btn btn-primary" onclick="App.openNewLabOrderModal()">➕ Order Lab Investigation</button>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Lab ID</th><th>Patient</th><th>Test Name</th><th>Priority</th><th>Status</th><th>Results</th></tr>
                  </thead>
                  <tbody>
                    ${labs.map(l => `
                      <tr>
                        <td><code>${l.lab_id}</code></td>
                        <td><strong>${l.patient_name || l.patient_id}</strong></td>
                        <td><strong>${l.test_name}</strong></td>
                        <td><span class="badge ${l.priority === 'STAT' ? 'badge-danger' : 'badge-neutral'}">${l.priority}</span></td>
                        <td><span class="badge ${l.status === 'completed' ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
                        <td>${l.result_value || 'In analysis'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 6: TELEMEDICINE ROOM -->
          <div id="tab-doc-telemed" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Virtual Telemedicine Consultation Suite</h2>
                <p>Encrypted clinical video consultation with concurrent EMR notes</p>
              </div>
            </div>

            <div class="telemed-container">
              <div class="telemed-video-pane">
                <div style="text-align: center;">
                  <div style="font-size: 3rem; margin-bottom: 12px;">👨‍⚕️ 🩺</div>
                  <h3>Secure Virtual Telemedicine Channel Ready</h3>
                  <p style="color: #94a3b8; font-size: 0.9rem;">Select an appointment from the queue or click 'Start Call' to connect</p>
                </div>
                <div class="telemed-feed-self">
                  <div style="padding: 6px; font-size: 0.7rem; color: #38bdf8;">Dr. ${user.name} (Camera Active)</div>
                </div>
                <div class="telemed-controls">
                  <button class="telemed-btn" title="Mute Mic">🎤</button>
                  <button class="telemed-btn" title="Toggle Camera">📹</button>
                  <button class="telemed-btn" title="Share Screen">🖥️</button>
                  <button class="telemed-btn end-call" title="End Call">📞</button>
                </div>
              </div>

              <div class="telemed-sidebar" style="padding: 16px;">
                <h4 style="margin-bottom: 12px; color: var(--secondary);">Clinical Consultation Notes</h4>
                <div class="form-group">
                  <label class="form-label">Patient</label>
                  <select id="telemed-patient" class="form-control">
                    ${patients.map(p => `<option value="${p.user_id}">${p.name} (${p.user_id})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Live Clinical Observations</label>
                  <textarea id="telemed-notes" class="form-control" style="height: 200px;" placeholder="Document patient observations, tele-triage findings, and verbal orders..."></textarea>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="App.saveTelemedNotes()">Save to EMR</button>
                  <button class="btn btn-accent btn-sm" onclick="App.openNewRxModal()">Rx</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 3. NURSE DASHBOARD
  async renderNurse(container, user) {
    const [admissionsRes, vitalsRes, patientsRes] = await Promise.all([
      API.getAdmissions().catch(() => ({ admissions: [] })),
      API.getVitals().catch(() => ({ vitals: [] })),
      API.getPatients().catch(() => ({ patients: [] }))
    ]);

    const admissions = admissionsRes.admissions || [];
    const vitals = vitalsRes.vitals || [];
    const patients = patientsRes.patients || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>Nurse ${user.name}</h4>
                <span>${user.department || 'Ward Nursing'}</span>
                <small>Lic: ${user.license_number || 'NMC-Active'}</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="nur-ward">🏥 Ward Inpatients (${admissions.filter(a => a.status === 'admitted').length})</a></li>
              <li><a class="sidebar-link" data-tab="nur-vitals">📊 Vital Signs Entry</a></li>
              <li><a class="sidebar-link" data-tab="nur-log">📋 Nursing Notes & Handover</a></li>
            </ul>
          </div>

          <div style="padding-top: 16px; border-top: 1px solid var(--border);">
            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="App.openAiDrawer('nurse')">
              🩺 Nursing SOP Assistant
            </button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: WARD INPATIENTS -->
          <div id="tab-nur-ward" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Ward Management &bull; ${user.department || 'Inpatient Care'}</h2>
                <p>NMC License: <strong>${user.license_number}</strong> &bull; Active Shift Duty</p>
              </div>
              <button class="btn btn-primary" onclick="App.openVitalsModal()">➕ Record Patient Vitals</button>
            </div>

            <!-- Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-info"><span>Active Inpatients</span><h3>${admissions.filter(a => a.status === 'admitted').length}</h3></div>
                <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">🛏️</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Vitals Recorded Today</span><h3>${vitals.length}</h3></div>
                <div class="stat-icon" style="background: var(--success-light); color: var(--success);">📈</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Critical Alerts</span><h3>${vitals.filter(v => v.systolic_bp >= 160 || v.temperature >= 38.5 || v.spo2 < 93).length}</h3></div>
                <div class="stat-icon" style="background: var(--danger-light); color: var(--danger);">🚨</div>
              </div>
            </div>

            <div class="card">
              <h3 style="margin-bottom: 16px;">🛏️ Admitted Ward Patients</h3>
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Patient</th><th>Ward</th><th>Bed No</th><th>Admission Reason</th><th>Admitted Date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${admissions.filter(a => a.status === 'admitted').map(a => `
                      <tr>
                        <td><strong>${a.patient_name}</strong> (<code>${a.patient_id}</code>)</td>
                        <td>${a.ward}</td>
                        <td><span class="badge badge-info"><strong>${a.bed_number}</strong></span></td>
                        <td>${a.admission_reason}</td>
                        <td>${a.admission_date.split(' ')[0]}</td>
                        <td>
                          <button class="btn btn-primary btn-sm" onclick="App.openVitalsModal('${a.patient_id}')">Record Vitals</button>
                          <button class="btn btn-outline btn-sm" onclick="App.dischargePatient('${a.admission_id}')">Discharge</button>
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No patients currently admitted in this ward.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: VITALS ENTRY -->
          <div id="tab-nur-vitals" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Clinical Vital Signs Entry & Triage</h2>
                <p>Input patient parameters. The system automatically computes clinical anomaly alerts.</p>
              </div>
            </div>

            <div class="card" style="max-width: 800px; margin-bottom: 24px;">
              <form id="form-nurse-vitals" onsubmit="App.handleSaveVitals(event)">
                <div class="form-group">
                  <label class="form-label">Select Patient</label>
                  <select id="vital-patient" class="form-control" required>
                    <option value="">Choose Patient...</option>
                    ${patients.map(p => `<option value="${p.user_id}">${p.name} (${p.user_id})</option>`).join('')}
                  </select>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Systolic BP (mmHg)</label>
                    <input type="number" id="vital-sys" class="form-control" placeholder="120" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Diastolic BP (mmHg)</label>
                    <input type="number" id="vital-dia" class="form-control" placeholder="80" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Temperature (°C)</label>
                    <input type="number" step="0.1" id="vital-temp" class="form-control" placeholder="36.8" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Pulse Rate (bpm)</label>
                    <input type="number" id="vital-pulse" class="form-control" placeholder="72" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Oxygen Saturation - SpO2 (%)</label>
                    <input type="number" step="0.1" id="vital-spo2" class="form-control" placeholder="98" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Respiratory Rate (breaths/min)</label>
                    <input type="number" id="vital-resp" class="form-control" placeholder="16">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Weight (kg)</label>
                    <input type="number" step="0.1" id="vital-weight" class="form-control" placeholder="70.5">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Random / Fasting Blood Glucose (mmol/L)</label>
                    <input type="number" step="0.1" id="vital-sugar" class="form-control" placeholder="5.4">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Nursing Observation Notes</label>
                  <textarea id="vital-notes" class="form-control" placeholder="Note patient appearance, alertness, IV fluid flow, or complaints..."></textarea>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Save Vitals & Check Flags</button>
              </form>
            </div>
          </div>

          <!-- TAB 3: NURSING LOG -->
          <div id="tab-nur-log" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Recent Vitals Observation History</h2>
                <p>Audited records of patient vital statistics</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Patient</th><th>Date/Time</th><th>BP</th><th>Temp</th><th>Pulse</th><th>SpO2</th><th>Nursing Notes</th></tr>
                  </thead>
                  <tbody>
                    ${vitals.map(v => `
                      <tr>
                        <td><strong>${v.patient_name || v.patient_id}</strong></td>
                        <td>${v.recorded_at}</td>
                        <td><span class="badge ${v.systolic_bp >= 140 ? 'badge-danger' : 'badge-success'}">${v.systolic_bp}/${v.diastolic_bp}</span></td>
                        <td>${v.temperature}°C</td>
                        <td>${v.pulse_rate} bpm</td>
                        <td>${v.spo2}%</td>
                        <td><small>${v.nursing_notes || 'Vitals stable'}</small></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 4. ADMINISTRATOR DASHBOARD
  async renderAdmin(container, user) {
    const [statsRes, usersRes, auditRes] = await Promise.all([
      API.getStats().catch(() => ({ stats: {} })),
      API.getAdminUsers().catch(() => ({ users: [] })),
      API.getAuditLogs().catch(() => ({ logs: [] }))
    ]);

    const stats = statsRes.stats || {};
    const allUsers = usersRes.users || [];
    const logs = auditRes.logs || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>${user.name}</h4>
                <span>Hospital Director</span>
                <small>System Administrator</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="adm-overview">📊 Hospital Executive KPIs</a></li>
              <li><a class="sidebar-link" data-tab="adm-users">👥 User & Staff Management (${allUsers.length})</a></li>
              <li><a class="sidebar-link" data-tab="adm-audit">🛡️ Act 843 Compliance Audit Logs</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: OVERVIEW -->
          <div id="tab-adm-overview" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Hospital Executive Administration</h2>
                <p>Digital Healthcare Operations, Capacity, and Data Protection Monitoring</p>
              </div>
              <span class="badge badge-success">Act 843 Compliant &bull; All Systems Operational</span>
            </div>

            <!-- Stats KPI -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-info"><span>Total Patients</span><h3>${stats.totalPatients || 3}</h3></div>
                <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">👥</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Active Doctors</span><h3>${stats.totalDoctors || 3}</h3></div>
                <div class="stat-icon" style="background: var(--success-light); color: var(--success);">👨‍⚕️</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Nurses & Staff</span><h3>${(stats.totalNurses || 2) + (stats.totalStaff || 4)}</h3></div>
                <div class="stat-icon" style="background: var(--accent-light); color: var(--accent);">🩺</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Total Revenue (GHS)</span><h3>${parseFloat(stats.revenueTotal || 856.5).toFixed(2)}</h3></div>
                <div class="stat-icon" style="background: var(--warning-light); color: var(--warning);">💳</div>
              </div>
            </div>

            <div class="card" style="margin-bottom: 24px;">
              <h3 style="margin-bottom: 12px;">🛡️ Ghanaian Data Protection Act 2012 (Act 843) Security Status</h3>
              <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
                The platform encrypts sensitive medical dossiers, enforces role-based access control (RBAC), and logs every clinical file access, diagnosis creation, and prescription event into an immutable audit trail.
              </p>
            </div>
          </div>

          <!-- TAB 2: USERS -->
          <div id="tab-adm-users" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>User & Professional Staff Management</h2>
                <p>Verify doctor & nurse credentials, toggle access, and manage hospital roles</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>User ID</th><th>Name</th><th>Role</th><th>Email / Phone</th><th>License / Spec</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${allUsers.map(u => `
                      <tr>
                        <td><code>${u.user_id}</code></td>
                        <td><strong>${u.name}</strong></td>
                        <td><span class="badge badge-info">${u.role.toUpperCase()}</span></td>
                        <td>${u.email}<br><small style="color: var(--text-muted);">${u.phone || ''}</small></td>
                        <td>${u.license_number || u.specialization || '-'}</td>
                        <td><span class="badge ${u.verification_status === 'verified' ? 'badge-success' : 'badge-warning'}">${u.verification_status}</span></td>
                        <td>
                          ${u.verification_status === 'pending' ? `
                            <button class="btn btn-success btn-sm" onclick="App.verifyUser('${u.user_id}', 'verified')">Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="App.verifyUser('${u.user_id}', 'rejected')">Reject</button>
                          ` : `<span style="color: var(--success); font-weight: 600;">Active</span>`}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 3: AUDIT LOGS -->
          <div id="tab-adm-audit" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Act 843 Immutable Audit Logs</h2>
                <p>Complete traceability of all system, medical, and administrative interactions</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Resource</th><th>IP Address</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    ${logs.map(l => `
                      <tr>
                        <td><small>${l.timestamp}</small></td>
                        <td><code>${l.user_id}</code></td>
                        <td><span class="badge badge-neutral">${l.user_role}</span></td>
                        <td><strong>${l.action}</strong></td>
                        <td>${l.resource}</td>
                        <td>${l.ip_address}</td>
                        <td><small>${l.details}</small></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 5. PHARMACIST DASHBOARD
  async renderPharmacist(container, user) {
    const [invRes, rxRes] = await Promise.all([
      API.getPharmacyInventory().catch(() => ({ inventory: [] })),
      API.getPrescriptions().catch(() => ({ prescriptions: [] }))
    ]);

    const inventory = invRes.inventory || [];
    const prescriptions = rxRes.prescriptions || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>Pharm. ${user.name}</h4>
                <span>Chief Pharmacist</span>
                <small>Lic: ${user.license_number || 'PCG-Verified'}</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="ph-queue">💊 Dispensing Queue (${prescriptions.filter(p => p.status === 'prescribed').length})</a></li>
              <li><a class="sidebar-link" data-tab="ph-inventory">📦 Drug Inventory (${inventory.length} items)</a></li>
              <li><a class="sidebar-link" data-tab="ph-add">➕ Add Medication</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: DISPENSING QUEUE -->
          <div id="tab-ph-queue" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Prescription Dispensing Queue</h2>
                <p>Verify doctor orders and dispense hospital medications to patients</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Rx Ref</th><th>Patient</th><th>Doctor</th><th>Medication</th><th>Dosage & Frequency</th><th>Instructions</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${prescriptions.map(p => `
                      <tr>
                        <td><code>${p.rx_id}</code></td>
                        <td><strong>${p.patient_name || p.patient_id}</strong></td>
                        <td>Dr. ${p.doctor_name || 'Physician'}</td>
                        <td><strong>${p.medication_name}</strong></td>
                        <td>${p.dosage} (${p.frequency})</td>
                        <td><small>${p.instructions || 'Standard'}</small></td>
                        <td>
                          ${p.status === 'prescribed' ? `
                            <button class="btn btn-success btn-sm" onclick="App.dispensePrescription('${p.rx_id}')">Dispense Medication</button>
                          ` : `<span class="badge badge-success">✅ Dispensed</span>`}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: INVENTORY -->
          <div id="tab-ph-inventory" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Hospital Pharmacy Formulary & Stock</h2>
                <p>Real-time drug quantities, unit prices (GHS), and expiry alerts</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Code</th><th>Drug Name</th><th>Category</th><th>Form</th><th>Stock Qty</th><th>Unit Price</th><th>Batch</th><th>Expiry</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${inventory.map(m => `
                      <tr>
                        <td><code>${m.drug_code}</code></td>
                        <td><strong>${m.name}</strong></td>
                        <td>${m.category}</td>
                        <td>${m.dosage_form}</td>
                        <td><strong>${m.stock_quantity}</strong></td>
                        <td>GHS ${parseFloat(m.unit_price).toFixed(2)}</td>
                        <td><small>${m.batch_number}</small></td>
                        <td>${m.expiry_date}</td>
                        <td>
                          <span class="badge ${m.stock_quantity <= m.reorder_level ? 'badge-danger' : 'badge-success'}">
                            ${m.stock_quantity <= m.reorder_level ? '⚠️ Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 3: ADD MEDICATION -->
          <div id="tab-ph-add" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Add Medication to Hospital Formulary</h2>
                <p>Register new pharmaceutical supplies and batch details</p>
              </div>
            </div>

            <div class="card" style="max-width: 700px;">
              <form id="form-pharmacy-add" onsubmit="App.handleAddDrug(event)">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Drug Name & Strength</label>
                    <input type="text" id="drug-name" class="form-control" placeholder="e.g. Azithromycin 500mg" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Category</label>
                    <select id="drug-category" class="form-control" required>
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Antihypertensives">Antihypertensives</option>
                      <option value="Antimalarials">Antimalarials</option>
                      <option value="Analgesics">Analgesics</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="IV Fluids">IV Fluids</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Dosage Form</label>
                    <select id="drug-form" class="form-control" required>
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Inhaler">Inhaler</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Initial Stock Quantity</label>
                    <input type="number" id="drug-qty" class="form-control" placeholder="100" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Unit Price (GHS)</label>
                    <input type="number" step="0.5" id="drug-price" class="form-control" placeholder="25.00" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Expiry Date</label>
                    <input type="date" id="drug-expiry" class="form-control" required>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Add to Inventory</button>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 6. LAB TECHNICIAN DASHBOARD
  async renderLabTech(container, user) {
    const labsRes = await API.getLabRequests().catch(() => ({ labRequests: [] }));
    const labs = labsRes.labRequests || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>${user.name}</h4>
                <span>Medical Lab Scientist</span>
                <small>Lic: ${user.license_number || 'AHPC-Active'}</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="lab-queue">🔬 Lab Orders Queue (${labs.filter(l => l.status !== 'completed').length} pending)</a></li>
              <li><a class="sidebar-link" data-tab="lab-archive">📋 Verified Results Archive</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: QUEUE -->
          <div id="tab-lab-queue" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Diagnostic Laboratory Queue</h2>
                <p>Run diagnostic investigations, record measured values, and verify reports</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Lab ID</th><th>Patient</th><th>Ordering Doctor</th><th>Test Name</th><th>Specimen</th><th>Priority</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${labs.filter(l => l.status !== 'completed').map(l => `
                      <tr>
                        <td><code>${l.lab_id}</code></td>
                        <td><strong>${l.patient_name || l.patient_id}</strong></td>
                        <td>Dr. ${l.doctor_name || 'Physician'}</td>
                        <td><strong>${l.test_name}</strong></td>
                        <td>${l.specimen_type}</td>
                        <td><span class="badge ${l.priority === 'STAT' ? 'badge-danger' : 'badge-neutral'}">${l.priority}</span></td>
                        <td>
                          <button class="btn btn-primary btn-sm" onclick="App.openEnterLabResultModal('${l.lab_id}', '${l.test_name}')">Enter Results</button>
                        </td>
                      </tr>
                    `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No pending lab tests in queue.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: ARCHIVE -->
          <div id="tab-lab-archive" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Completed & Verified Laboratory Archive</h2>
                <p>Historical test records with normal ranges and flags</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Lab ID</th><th>Patient</th><th>Test</th><th>Results</th><th>Normal Range</th><th>Flag</th><th>Completed Date</th></tr>
                  </thead>
                  <tbody>
                    ${labs.filter(l => l.status === 'completed').map(l => `
                      <tr>
                        <td><code>${l.lab_id}</code></td>
                        <td><strong>${l.patient_name}</strong></td>
                        <td>${l.test_name}</td>
                        <td><strong>${l.result_value}</strong></td>
                        <td><small>${l.normal_range}</small></td>
                        <td><span class="badge ${l.flag === 'Critical' ? 'badge-danger' : l.flag === 'High' ? 'badge-warning' : 'badge-success'}">${l.flag}</span></td>
                        <td>${l.completed_at || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 7. RECEPTIONIST DASHBOARD
  async renderReceptionist(container, user) {
    const [apptsRes, patientsRes, docsRes] = await Promise.all([
      API.getAppointments().catch(() => ({ appointments: [] })),
      API.getPatients().catch(() => ({ patients: [] })),
      API.getDoctors().catch(() => ({ doctors: [] }))
    ]);

    const appointments = apptsRes.appointments || [];
    const patients = patientsRes.patients || [];
    const doctors = docsRes.doctors || [];

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>${user.name}</h4>
                <span>Front Desk Officer</span>
                <small>Patient Admissions</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="rec-checkin">📋 Daily Check-In Queue</a></li>
              <li><a class="sidebar-link" data-tab="rec-register">➕ Register Walk-in Patient</a></li>
              <li><a class="sidebar-link" data-tab="rec-docs">👨‍⚕️ Doctors On-Duty Directory</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: CHECK-IN -->
          <div id="tab-rec-checkin" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Patient Front Desk & Triage Check-In</h2>
                <p>Welcome outpatients, confirm bookings, and assign consultation rooms</p>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Appt ID</th><th>Patient</th><th>Doctor</th><th>Time</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${appointments.map(a => `
                      <tr>
                        <td><code>${a.appointment_id}</code></td>
                        <td><strong>${a.patient_name}</strong></td>
                        <td>Dr. ${a.doctor_name}</td>
                        <td>${a.time_slot}</td>
                        <td><span class="badge ${a.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">${a.status}</span></td>
                        <td>
                          <button class="btn btn-success btn-sm" onclick="App.updateApptStatus('${a.appointment_id}', 'confirmed')">Check-In Patient</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: REGISTER WALK-IN -->
          <div id="tab-rec-register" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Walk-In Patient Registration Desk</h2>
                <p>Create new patient records and generate instantaneous Hospital Patient ID cards</p>
              </div>
            </div>

            <div class="card" style="max-width: 750px;">
              <form id="form-rec-walkin" onsubmit="App.handleRegisterWalkin(event)">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="walkin-name" class="form-control" placeholder="e.g. Abena Mensah" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="walkin-email" class="form-control" placeholder="abena.mensah@gmail.com" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <input type="tel" id="walkin-phone" class="form-control" placeholder="+233 24 000 0000" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select id="walkin-gender" class="form-control" required>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" id="walkin-dob" class="form-control" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">NHIS Card Number (Optional)</label>
                    <input type="text" id="walkin-nhis" class="form-control" placeholder="GH-NHIS-123456">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Residential Address</label>
                  <input type="text" id="walkin-address" class="form-control" placeholder="e.g. Accra Central / Spintex">
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Create Patient Account & Issue ID</button>
              </form>
            </div>
          </div>

          <!-- TAB 3: DOCTORS ON DUTY -->
          <div id="tab-rec-docs" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Doctors On-Duty Directory</h2>
                <p>Active consulting doctors, specialty clinics, and daily operating hours</p>
              </div>
            </div>

            <div class="grid-3">
              ${doctors.map(d => `
                <div class="card">
                  <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <div class="user-avatar">${d.avatar_url ? `<img src="${d.avatar_url}" alt="${d.name}">` : 'Dr'}</div>
                    <div>
                      <h4 style="margin-bottom: 2px;">Dr. ${d.name}</h4>
                      <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${d.specialization}</span>
                    </div>
                  </div>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
                    Department: ${d.department}<br>
                    Phone: ${d.phone}
                  </p>
                  <span class="badge badge-success">Available for Booking</span>
                </div>
              `).join('')}
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // 8. ACCOUNTANT DASHBOARD
  async renderAccountant(container, user) {
    const invoicesRes = await API.getBillingInvoices().catch(() => ({ invoices: [] }));
    const invoices = invoicesRes.invoices || [];

    const totalBilled = invoices.reduce((acc, i) => acc + (parseFloat(i.total_amount) || 0), 0);
    const totalPaid = invoices.reduce((acc, i) => acc + (parseFloat(i.paid_amount) || 0), 0);

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div>
            <div class="user-profile-widget">
              <div class="user-avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : user.name.charAt(0)}</div>
              <div class="user-info">
                <h4>${user.name}</h4>
                <span>Hospital Accountant</span>
                <small>CA Ghana Certified</small>
              </div>
            </div>

            <ul class="sidebar-nav">
              <li><a class="sidebar-link active" data-tab="acc-invoices">💳 Invoices & Billing (${invoices.length})</a></li>
              <li><a class="sidebar-link" data-tab="acc-generate">➕ Create Invoice</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="dashboard-main">
          <!-- TAB 1: INVOICES -->
          <div id="tab-acc-invoices" class="dash-tab-pane">
            <div class="dashboard-header">
              <div>
                <h2>Hospital Revenue & Billing Management</h2>
                <p>Track cash, Mobile Money (MoMo), Card, and NHIS insurance claim settlements</p>
              </div>
            </div>

            <!-- Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-info"><span>Total Invoiced</span><h3>GHS ${totalBilled.toFixed(2)}</h3></div>
                <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">🧾</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Total Revenue Collected</span><h3>GHS ${totalPaid.toFixed(2)}</h3></div>
                <div class="stat-icon" style="background: var(--success-light); color: var(--success);">💰</div>
              </div>
              <div class="stat-card">
                <div class="stat-info"><span>Outstanding Balances</span><h3>GHS ${(totalBilled - totalPaid).toFixed(2)}</h3></div>
                <div class="stat-icon" style="background: var(--danger-light); color: var(--danger);">⏳</div>
              </div>
            </div>

            <div class="card">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr><th>Invoice ID</th><th>Patient</th><th>Total (GHS)</th><th>Paid (GHS)</th><th>Method</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    ${invoices.map(inv => `
                      <tr>
                        <td><code>${inv.invoice_id}</code></td>
                        <td><strong>${inv.patient_name || inv.patient_id}</strong></td>
                        <td><strong>GHS ${parseFloat(inv.total_amount).toFixed(2)}</strong></td>
                        <td>GHS ${parseFloat(inv.paid_amount).toFixed(2)}</td>
                        <td>${inv.payment_method}</td>
                        <td><span class="badge ${inv.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${inv.payment_status}</span></td>
                        <td>
                          ${inv.payment_status !== 'paid' ? `
                            <button class="btn btn-primary btn-sm" onclick="App.openPayModal('${inv.invoice_id}', ${inv.total_amount - inv.paid_amount})">Receive Payment</button>
                          ` : `<span style="color: var(--success); font-weight: 600;">Cleared</span>`}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: CREATE INVOICE -->
          <div id="tab-acc-generate" class="dash-tab-pane" style="display: none;">
            <div class="dashboard-header">
              <div>
                <h2>Generate New Hospital Billing Invoice</h2>
                <p>Create itemized bills for consultations, diagnostic tests, and ward beds</p>
              </div>
            </div>

            <div class="card" style="max-width: 750px;">
              <form id="form-acc-create" onsubmit="App.handleCreateInvoice(event)">
                <div class="form-group">
                  <label class="form-label">Patient ID</label>
                  <input type="text" id="inv-patient" class="form-control" placeholder="e.g. HMS-P-2026-001" required>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Service / Charge Description</label>
                    <input type="text" id="inv-item-name" class="form-control" placeholder="Specialist Consultation Fee" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Charge Amount (GHS)</label>
                    <input type="number" step="0.5" id="inv-item-amount" class="form-control" placeholder="150.00" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Payment Method</label>
                    <select id="inv-method" class="form-control">
                      <option value="Mobile Money (MTN MoMo)">Mobile Money (MTN MoMo / Telecel)</option>
                      <option value="Cash">Cash at Counter</option>
                      <option value="Card (Visa/Mastercard)">Card (Visa / Mastercard)</option>
                      <option value="NHIS Claims">NHIS Claims Coverage</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Initial Amount Paid (GHS)</label>
                    <input type="number" step="0.5" id="inv-paid" class="form-control" placeholder="0.00" value="0">
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">Create Invoice & Notify Patient</button>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupSidebarNav(container);
  },

  // Helper: Setup tab switching in sidebar
  setupSidebarNav(container) {
    const links = container.querySelectorAll('.sidebar-link');
    links.forEach(link => {
      link.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const tabKey = link.getAttribute('data-tab');
        const panes = container.querySelectorAll('.dash-tab-pane');
        panes.forEach(p => p.style.display = 'none');

        const activePane = container.querySelector(`#tab-${tabKey}`);
        if (activePane) activePane.style.display = 'block';
      });
    });
  }
};
