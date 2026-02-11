import axios from 'axios';

export const contactsApi = {
    getAll: (signal) => axios.get('/api/contacts', { signal }),
    getById: (id, signal) => axios.get(`/api/contacts/${id}`, { signal }),
    create: (data) => axios.post('/api/contacts', data),
    update: (id, data) => axios.put(`/api/contacts/${id}`, data),
    delete: (id) => axios.delete(`/api/contacts/${id}`),
    import: (data) => axios.post('/api/contacts/import', data),
};
