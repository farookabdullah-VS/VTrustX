import axios from 'axios';

export const getReports = async () => {
    const res = await axios.get('/api/reports');
    return res.data;
};

export const saveReport = async (report) => {
    // If has ID, update, else create
    if (report.id && !report.id.toString().startsWith('r-')) { // Check if real database ID
        const res = await axios.put(`/api/reports/${report.id}`, report);
        return res.data;
    } else {
        const res = await axios.post('/api/reports', report);
        return res.data;
    }
};

export const deleteReport = async (id) => {
    const res = await axios.delete(`/api/reports/${id}`);
    return res.data;
};
