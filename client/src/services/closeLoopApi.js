import axios from 'axios';

export const getAlerts = (formId, { status, alertLevel, page = 1, limit = 20 } = {}) => {
    const params = { formId, page, limit };
    if (status) params.status = status;
    if (alertLevel) params.alertLevel = alertLevel;
    return axios.get('/api/close-loop/alerts', { params }).then(r => r.data);
};

export const getStats = (formId) => {
    return axios.get('/api/close-loop/stats', { params: { formId } }).then(r => r.data);
};

export const createTicketFromAlert = (alertId, { subject, priority, assignee_id } = {}) => {
    return axios.post(`/api/close-loop/alerts/${alertId}/ticket`, { subject, priority, assignee_id }).then(r => r.data);
};

export const updateAlert = (alertId, { status, notes } = {}) => {
    return axios.put(`/api/close-loop/alerts/${alertId}`, { status, notes }).then(r => r.data);
};

export const scanForm = (formId) => {
    return axios.post('/api/close-loop/scan', { formId }).then(r => r.data);
};
