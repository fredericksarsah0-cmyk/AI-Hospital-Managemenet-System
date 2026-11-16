// public/js/api.js
// Client API service handling HTTP requests and auth session management

const API = {
  getToken() {
    return localStorage.getItem('hms_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('hms_token', token);
    else localStorage.removeItem('hms_token');
  },

  getCurrentUser() {
    try {
      const u = localStorage.getItem('hms_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) localStorage.setItem('hms_user', JSON.stringify(user));
    else localStorage.removeItem('hms_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth methods
  async login(identifier, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  async demoLogin(role) {
    const data = await this.request('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  async register(formData) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  async getMe() {
    const data = await this.request('/api/auth/me');
    this.setCurrentUser(data.user);
    return data.user;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.setToken(null);
    this.setCurrentUser(null);
  },

  // Dashboard Stats
  async getStats() {
    return this.request('/api/dashboard/stats');
  },

  // Doctors & Directory
  async getDoctors() {
    return this.request('/api/doctors');
  },

  // Patients
  async getPatients(q = '') {
    return this.request(`/api/patients${q ? '?q=' + encodeURIComponent(q) : ''}`);
  },

  async getPatientDossier(patientId) {
    return this.request(`/api/patients/${patientId}`);
  },

  // Appointments
  async getAppointments() {
    return this.request('/api/appointments');
  },

  async bookAppointment(payload) {
    return this.request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateAppointmentStatus(appointmentId, payload) {
    return this.request(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Medical Records (EMR)
  async getMedicalRecords(patientId = '') {
    return this.request(`/api/medical-records${patientId ? '?patient_id=' + patientId : ''}`);
  },

  async createMedicalRecord(payload) {
    return this.request('/api/medical-records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Vitals
  async getVitals(patientId = '') {
    return this.request(`/api/vitals${patientId ? '?patient_id=' + patientId : ''}`);
  },

  async recordVitals(payload) {
    return this.request('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Prescriptions
  async getPrescriptions() {
    return this.request('/api/prescriptions');
  },

  async issuePrescription(payload) {
    return this.request('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async dispensePrescription(rxId) {
    return this.request(`/api/prescriptions/${rxId}/dispense`, {
      method: 'PUT'
    });
  },

  // Laboratory
  async getLabRequests() {
    return this.request('/api/lab-requests');
  },

  async orderLabTest(payload) {
    return this.request('/api/lab-requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async enterLabResult(labId, payload) {
    return this.request(`/api/lab-requests/${labId}/result`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Pharmacy Inventory
  async getPharmacyInventory() {
    return this.request('/api/pharmacy');
  },

  async addPharmacyItem(payload) {
    return this.request('/api/pharmacy', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updatePharmacyStock(drugId, payload) {
    return this.request(`/api/pharmacy/${drugId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Inpatient Admissions
  async getAdmissions() {
    return this.request('/api/admissions');
  },

  async admitPatient(payload) {
    return this.request('/api/admissions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async dischargePatient(admissionId) {
    return this.request(`/api/admissions/${admissionId}/discharge`, {
      method: 'PUT'
    });
  },

  // Billing
  async getBillingInvoices() {
    return this.request('/api/billing');
  },

  async createInvoice(payload) {
    return this.request('/api/billing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async payInvoice(invoiceId, payload) {
    return this.request(`/api/billing/${invoiceId}/pay`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Notifications
  async getNotifications() {
    return this.request('/api/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  // Admin & Compliance
  async getAdminUsers() {
    return this.request('/api/admin/users');
  },

  async verifyUser(userId, status) {
    return this.request(`/api/admin/users/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async getAuditLogs() {
    return this.request('/api/admin/audit-logs');
  },

  // Knowledge Base
  async getKnowledge(q = '', category = '') {
    let url = '/api/knowledge';
    const params = [];
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.request(url);
  },

  // AI Assistant Chat
  async chatWithAI(message, roleMode = 'patient') {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, role_mode: roleMode })
    });
  }
};
