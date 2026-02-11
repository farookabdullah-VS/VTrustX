import axios from 'axios';

export const formsApi = {
    getAll: (signal) => axios.get('/api/forms', { signal }),
    getById: (id, signal) => axios.get(`/api/forms/${id}`, { signal }),
    getBySlug: (slug, signal) => axios.get(`/api/forms/slug/${slug}`, { signal }),
    create: (data) => axios.post('/api/forms', data),
    update: (id, data) => axios.put(`/api/forms/${id}`, data),
    delete: (id) => axios.delete(`/api/forms/${id}`),
    publish: (id) => axios.post(`/api/forms/${id}/publish`),
    requestApproval: (id) => axios.post(`/api/forms/${id}/request-approval`),
    approve: (id) => axios.post(`/api/forms/${id}/approve`),
    reject: (id) => axios.post(`/api/forms/${id}/reject`),
    createDraft: (id) => axios.post(`/api/forms/${id}/draft`),
    checkPassword: (id, password) => axios.post(`/api/forms/${id}/check-password`, { password }),
    getSubmissions: (id, signal) => axios.get(`/api/forms/${id}/submissions/raw-data`, { signal }),
};
