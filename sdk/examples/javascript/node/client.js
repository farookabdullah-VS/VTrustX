import fetch from 'node-fetch';

/**
 * VTrustX API Client for Node.js
 *
 * Full-featured client for backend automation and integration
 */
export class VTrustXClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.token = null;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Make HTTP request to API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // ========== Authentication ==========

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.token = data.token;
    return data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ========== Forms/Surveys ==========

  async getForms(options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/forms?${params}`);
  }

  async getForm(id) {
    return this.request(`/forms/${id}`);
  }

  async getFormBySlug(slug) {
    return this.request(`/forms/slug/${slug}`);
  }

  async createForm(data) {
    return this.request('/forms', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateForm(id, data) {
    return this.request(`/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteForm(id) {
    return this.request(`/forms/${id}`, { method: 'DELETE' });
  }

  async publishForm(id) {
    return this.request(`/forms/${id}/publish`, { method: 'POST' });
  }

  // ========== Submissions ==========

  async getSubmissions(formId) {
    const params = new URLSearchParams({ formId });
    return this.request(`/submissions?${params}`);
  }

  async submitForm(formId, data, metadata = {}) {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        formId,
        data,
        metadata: {
          platform: 'nodejs',
          ...metadata
        }
      })
    });
  }

  // ========== Users ==========

  async getUsers() {
    return this.request('/users');
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async createUser(data) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  // ========== Roles ==========

  async getRoles() {
    return this.request('/roles');
  }

  async createRole(data) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ========== Tenants ==========

  async getTenants() {
    return this.request('/tenants');
  }

  async getTenant(id) {
    return this.request(`/tenants/${id}`);
  }

  async createTenant(data) {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ========== Analytics ==========

  async getAnalytics(formId, options = {}) {
    const params = new URLSearchParams({ formId, ...options });
    return this.request(`/analytics?${params}`);
  }

  // ========== Export ==========

  async exportSubmissions(formId, format = 'json') {
    return this.request(`/submissions/export?formId=${formId}&format=${format}`);
  }
}

export default VTrustXClient;
