import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Automatically configure API Base URL
if (Capacitor.isNativePlatform()) {
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://vtrustx-service-ewhlzzsutq-uc.a.run.app';
} else {
    // Web: Use env var or rely on Vite proxy (relative paths)
    if (import.meta.env.VITE_API_BASE_URL) {
        axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
    }
}

// Send cookies with every request (httpOnly cookie auth)
axios.defaults.withCredentials = true;

// --- CSRF Token Management ---
let csrfToken = null;

export async function fetchCsrfToken() {
    try {
        const res = await axios.get('/api/auth/csrf-token');
        csrfToken = res.data.csrfToken;
        return csrfToken;
    } catch (e) {
        console.error("Failed to fetch CSRF token:", e);
        return null;
    }
}

// Fetch CSRF token on init
fetchCsrfToken();

// Attach CSRF token to all state-changing requests
axios.interceptors.request.use((config) => {
    if (csrfToken && !['get', 'head', 'options'].includes(config.method)) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

// Auto-refresh CSRF token on 403 (CSRF mismatch)
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const errorData = error.response?.data?.error;

        if (
            error.response?.status === 403 &&
            (errorData?.code === 'EBADCSRFTOKEN' || (typeof errorData === 'string' && errorData.includes('csrf')) || errorData?.message?.toLowerCase().includes('csrf')) &&
            !originalRequest._csrfRetry
        ) {
            originalRequest._csrfRetry = true;
            await fetchCsrfToken();
            if (csrfToken) {
                originalRequest.headers['X-CSRF-Token'] = csrfToken;
                return axios(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);
