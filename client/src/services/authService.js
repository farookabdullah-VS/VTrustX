import axios from 'axios';

// Login user — server sets httpOnly cookies
export const login = async (username, password) => {
    const response = await axios.post('/api/auth/login', { username, password });
    return response.data;
};

// Logout user — server clears cookies and revokes refresh token
export const logout = async () => {
    try {
        await axios.post('/api/auth/logout');
    } catch (e) {
        // Best-effort — cookie may already be expired
    }
};

// Register new user
export const register = async (userData) => {
    const response = await axios.post('/api/auth/register', userData);
    return response.data;
};

// Get current user from server (cookie-based)
export const getCurrentUser = async () => {
    try {
        const response = await axios.get('/api/auth/me');
        return response.data;
    } catch (e) {
        return null;
    }
};

// Refresh access token using refresh token cookie
export const refreshAccessToken = async () => {
    const response = await axios.post('/api/auth/refresh');
    return response.data;
};

// Auto-refresh on 401 (access token expired) — retry original request once
let isRefreshing = false;
let refreshQueue = [];

axios.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't retry refresh/login/register endpoints
        const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
        if (skipPaths.some(p => originalRequest.url?.includes(p))) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._authRetry) {
            originalRequest._authRetry = true;

            if (isRefreshing) {
                // Queue concurrent requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject, config: originalRequest });
                });
            }

            isRefreshing = true;

            try {
                await refreshAccessToken();

                // Retry all queued requests
                refreshQueue.forEach(({ resolve, config }) => resolve(axios(config)));
                refreshQueue = [];

                return axios(originalRequest);
            } catch (refreshError) {
                // Refresh failed — redirect to login
                refreshQueue.forEach(({ reject }) => reject(refreshError));
                refreshQueue = [];

                if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/s/') && !window.location.pathname.startsWith('/login')) {
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
