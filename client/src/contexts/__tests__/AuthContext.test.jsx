import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock axios
vi.mock('axios', () => ({
  default: {
    defaults: { headers: { common: {} } },
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Test component that exposes auth context
function TestConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</span>
      <span data-testid="username">{user?.user?.username || 'none'}</span>
      <button data-testid="login-btn" onClick={() => login({ token: 'test-token', user: { username: 'testuser' } })}>Login</button>
      <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should start unauthenticated when no stored user', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('username').textContent).toBe('none');
  });

  it('should authenticate on login', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
  });

  it('should clear auth on logout', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');

    act(() => {
      screen.getByTestId('logout-btn').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
  });

  it('should persist user to localStorage on login', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    const stored = localStorage.getItem('vtrustx_user');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored).token).toBe('test-token');
  });

  it('should clear localStorage on logout', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('login-btn').click();
    });
    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(localStorage.getItem('vtrustx_user')).toBeNull();
  });

  it('should restore user from localStorage', () => {
    localStorage.setItem('vtrustx_user', JSON.stringify({
      token: 'saved-token',
      user: { username: 'saveduser' },
    }));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('username').textContent).toBe('saveduser');
  });
});
