import axios from 'axios';

export const analyticsApi = {
    getDashboard: (signal) => axios.get('/api/analytics/dashboard', { signal }),
    getFormAnalytics: (formId, signal) => axios.get(`/api/analytics/forms/${formId}`, { signal }),
    getExport: (params, signal) => axios.get('/api/exports', { params, signal }),
    getReports: (signal) => axios.get('/api/reports', { signal }),
    createReport: (data) => axios.post('/api/reports', data),
};
