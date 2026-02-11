import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './common/LoadingSpinner';

/**
 * ProtectedRoute component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--background-color)'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole) {
    const userRole = user?.role || user?.roleId;

    // Admin has access to everything
    if (userRole === 'admin' || userRole === 1) {
      return children;
    }

    // Check if user has required role
    const hasRequiredRole = Array.isArray(requiredRole)
      ? requiredRole.includes(userRole)
      : requiredRole === userRole;

    if (!hasRequiredRole) {
      // Unauthorized - redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
}

/**
 * Hook to check if user has a specific role
 */
export function useRole() {
  const { user } = useAuth();

  const hasRole = React.useCallback((role) => {
    const userRole = user?.role || user?.roleId;

    if (userRole === 'admin' || userRole === 1) return true; // Admin has all roles

    if (Array.isArray(role)) {
      return role.includes(userRole);
    }

    return userRole === role;
  }, [user]);

  const isAdmin = React.useMemo(() => {
    const userRole = user?.role || user?.roleId;
    return userRole === 'admin' || userRole === 1;
  }, [user]);

  return { hasRole, isAdmin };
}
