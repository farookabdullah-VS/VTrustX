/**
 * Central API service with shared axios instance.
 * All API calls should go through this module for consistent
 * error handling, CSRF, and auth interceptors.
 */
import axios from 'axios';

const api = axios.create({
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Inherit CSRF and auth interceptors from global axios config
// (configured in axiosConfig.js and authService.js)
// This instance provides a clean import for per-domain services.

export default api;
