import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vtrustx_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && parsed.token) ? parsed : null;
    } catch { return null; }
  });

  const [idleTimeout, setIdleTimeout] = useState(0);
  const lastActivity = useRef(Date.now());

  // Configure Axios Auth Header whenever user changes
  useEffect(() => {
    if (user && user.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
      localStorage.setItem('vtrustx_user', JSON.stringify(user));
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('vtrustx_user');
    }
  }, [user]);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Fetch Settings for Idle Timeout
  useEffect(() => {
    if (user) {
      axios.get('/api/settings')
        .then(res => {
          if (res.data.idle_timeout) {
            setIdleTimeout(parseInt(res.data.idle_timeout, 10));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Track Activity
  useEffect(() => {
    const updateActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);

  // Check Idle Status
  useEffect(() => {
    if (!user || idleTimeout <= 0) return;
    const checkInterval = setInterval(() => {
      const limit = idleTimeout * 60 * 1000;
      if (Date.now() - lastActivity.current > limit) {
        setUser(null);
        alert("Session expired due to inactivity.");
      }
    }, 10000);
    return () => clearInterval(checkInterval);
  }, [user, idleTimeout]);

  const isAuthenticated = !!(user && user.token);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
