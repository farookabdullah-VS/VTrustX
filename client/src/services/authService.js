import axios from 'axios';

// Login user and store response
export const login = async (username, password) => {
    try {
        const response = await axios.post('/api/auth/login', { username, password });
        if (response.data.token) {
            localStorage.setItem('vtrustx_user', JSON.stringify(response.data));
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Logout user
export const logout = () => {
    localStorage.removeItem('vtrustx_user');
    delete axios.defaults.headers.common['Authorization'];
};

// Register new user
export const register = async (userData) => {
    try {
        const response = await axios.post('/api/auth/register', userData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Get current user from storage
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem('vtrustx_user');
        if (userStr) return JSON.parse(userStr);
    } catch (e) {
        console.error("Auth storage corruption:", e);
        localStorage.removeItem('vtrustx_user');
    }
    return null;
};

// Setup Axios Interceptor for Session Expiry
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.token) {
                console.warn("Session expired. Logging out.");
                logout();
                window.location.href = '/'; // Force reload/redirect to login
            }
        }
        return Promise.reject(error);
    }
);
