import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getCurrentUser, logout as logoutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idleTimeout, setIdleTimeout] = useState(0);
  const lastActivity = useRef(Date.now());

  // On mount, check if user is authenticated via httpOnly cookie
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCurrentUser();
        if (!cancelled && data?.user) {
          setUser(data);
        }
      } catch {
        // Not authenticated
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
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
        logoutService();
        setUser(null);
        alert("Session expired due to inactivity.");
      }
    }, 10000);
    return () => clearInterval(checkInterval);
  }, [user, idleTimeout]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
