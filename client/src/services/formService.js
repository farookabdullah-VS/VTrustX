import axios from 'axios';

// Get only forms (surveys) for the tenant
export const getForms = async () => {
    const res = await axios.get('/api/forms');
    return res.data;
};

// Get all submissions for a form (Raw Data)
export const getSubmissionsForForm = async (formId) => {
    const res = await axios.get(`/api/forms/${formId}/submissions/raw-data`);
    return res.data;
};
