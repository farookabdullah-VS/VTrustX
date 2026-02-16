/**
 * Unit tests for AnalyticsStudioWrapper
 * Tests version switching, localStorage persistence, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsStudioWrapper from '../AnalyticsStudioWrapper';

// Mock the Analytics Studio components
jest.mock('../AnalyticsStudio', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-analytics">Legacy Analytics Studio</div>
}));

jest.mock('../NewAnalyticsStudio', () => ({
  __esModule: true,
  default: () => <div data-testid="new-analytics">New Analytics Studio</div>
}));

describe('AnalyticsStudioWrapper', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Mock window.showToast
    window.showToast = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
    delete window.showToast;
  });

  describe('Initial Rendering', () => {
    test('renders legacy version by default', () => {
      render(<AnalyticsStudioWrapper />);

      expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('new-analytics')).not.toBeInTheDocument();
    });

    test('shows beta banner on first visit', () => {
      render(<AnalyticsStudioWrapper />);

      expect(screen.getByText(/Enhanced Analytics Available/i)).toBeInTheDocument();
    });

    test('respects localStorage preference for new version', () => {
      localStorage.setItem('analytics_use_new_version', 'true');

      render(<AnalyticsStudioWrapper />);

      expect(screen.getByTestId('new-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('legacy-analytics')).not.toBeInTheDocument();
    });

    test('respects banner dismissal preference', () => {
      localStorage.setItem('analytics_beta_banner_dismissed', 'true');

      render(<AnalyticsStudioWrapper />);

      expect(screen.queryByText(/Enhanced Analytics Available/i)).not.toBeInTheDocument();
    });
  });

  describe('Version Switching', () => {
    test('switches to new version when switch button clicked', async () => {
      render(<AnalyticsStudioWrapper />);

      // Initially showing legacy version
      expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();

      // Click switch button in banner
      const switchButton = screen.getByRole('button', { name: /Try New Version/i });
      fireEvent.click(switchButton);

      // Should now show new version
      await waitFor(() => {
        expect(screen.getByTestId('new-analytics')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('legacy-analytics')).not.toBeInTheDocument();
    });

    test('persists version preference in localStorage', async () => {
      render(<AnalyticsStudioWrapper />);

      const switchButton = screen.getByRole('button', { name: /Try New Version/i });
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(localStorage.getItem('analytics_use_new_version')).toBe('true');
      });
    });

    test('switches back to legacy version', async () => {
      localStorage.setItem('analytics_use_new_version', 'true');

      render(<AnalyticsStudioWrapper />);

      // Initially showing new version
      expect(screen.getByTestId('new-analytics')).toBeInTheDocument();

      // Click switch button
      const switchButton = screen.getByRole('button', { name: /Use Legacy Version/i });
      fireEvent.click(switchButton);

      // Should now show legacy version
      await waitFor(() => {
        expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();
      });

      expect(localStorage.getItem('analytics_use_new_version')).toBe('false');
    });

    test('shows toast notification on version switch', async () => {
      render(<AnalyticsStudioWrapper />);

      const switchButton = screen.getByRole('button', { name: /Try New Version/i });
      fireEvent.click(switchButton);

      await waitFor(() => {
        expect(window.showToast).toHaveBeenCalledWith({
          type: 'success',
          message: expect.stringContaining('Switched to new Analytics Studio')
        });
      });
    });
  });

  describe('Beta Banner', () => {
    test('displays correct message for legacy version', () => {
      render(<AnalyticsStudioWrapper />);

      expect(screen.getByText(/Try the new Analytics Studio/i)).toBeInTheDocument();
    });

    test('displays correct message for new version', () => {
      localStorage.setItem('analytics_use_new_version', 'true');

      render(<AnalyticsStudioWrapper />);

      expect(screen.getByText(/You are using the new Analytics Studio/i)).toBeInTheDocument();
    });

    test('dismisses banner when close button clicked', async () => {
      render(<AnalyticsStudioWrapper />);

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Enhanced Analytics Available/i)).not.toBeInTheDocument();
      });

      expect(localStorage.getItem('analytics_beta_banner_dismissed')).toBe('true');
    });

    test('banner stays dismissed after reload', () => {
      localStorage.setItem('analytics_beta_banner_dismissed', 'true');

      render(<AnalyticsStudioWrapper />);

      expect(screen.queryByText(/Enhanced Analytics Available/i)).not.toBeInTheDocument();
    });
  });

  describe('Feature Comparison Modal', () => {
    test('opens comparison modal when floating button clicked', async () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });
    });

    test('opens comparison modal with keyboard shortcut', async () => {
      render(<AnalyticsStudioWrapper />);

      fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });
    });

    test('opens comparison modal with Cmd+Shift+V on Mac', async () => {
      render(<AnalyticsStudioWrapper />);

      fireEvent.keyDown(window, { key: 'V', metaKey: true, shiftKey: true });

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });
    });

    test('closes modal when close button clicked', async () => {
      render(<AnalyticsStudioWrapper />);

      // Open modal
      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /Close modal/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
      });
    });

    test('closes modal when clicking backdrop', async () => {
      render(<AnalyticsStudioWrapper />);

      // Open modal
      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });

      // Click backdrop (modal overlay)
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
      });
    });

    test('displays feature comparison for both versions', async () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        // Legacy features
        expect(screen.getByText('Legacy Version')).toBeInTheDocument();
        expect(screen.getByText(/Custom report builder/i)).toBeInTheDocument();

        // New features
        expect(screen.getByText('New Version (Beta)')).toBeInTheDocument();
        expect(screen.getByText(/Report Templates/i)).toBeInTheDocument();
        expect(screen.getByText(/PDF & PowerPoint Export/i)).toBeInTheDocument();
        expect(screen.getByText(/Cohort Analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/Predictive Forecasting/i)).toBeInTheDocument();
      });
    });

    test('switches to new version from comparison modal', async () => {
      render(<AnalyticsStudioWrapper />);

      // Open comparison modal
      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });

      // Click "Try New Version" button in modal
      const tryNewButton = screen.getByRole('button', { name: /Try New Version/i });
      fireEvent.click(tryNewButton);

      // Modal should close and new version should be active
      await waitFor(() => {
        expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
        expect(screen.getByTestId('new-analytics')).toBeInTheDocument();
      });
    });

    test('switches to legacy version from comparison modal', async () => {
      localStorage.setItem('analytics_use_new_version', 'true');

      render(<AnalyticsStudioWrapper />);

      // Open comparison modal
      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        expect(screen.getByText('Analytics Studio Versions')).toBeInTheDocument();
      });

      // Click "Use Legacy Version" button in modal
      const useLegacyButton = screen.getByRole('button', { name: /Use Legacy Version/i });
      fireEvent.click(useLegacyButton);

      // Modal should close and legacy version should be active
      await waitFor(() => {
        expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
        expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('banner has proper ARIA attributes', () => {
      render(<AnalyticsStudioWrapper />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    test('comparison modal has proper ARIA attributes', async () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      fireEvent.click(floatingButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'comparison-title');
      });
    });

    test('all buttons have proper labels', () => {
      render(<AnalyticsStudioWrapper />);

      expect(screen.getByRole('button', { name: /Try New Version/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dismiss banner/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Compare Analytics Studio versions/i })).toBeInTheDocument();
    });

    test('floating button has descriptive title', () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });
      expect(floatingButton).toHaveAttribute('title', 'Compare versions (Ctrl+Shift+V)');
    });
  });

  describe('Edge Cases', () => {
    test('handles missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;

      expect(() => {
        render(<AnalyticsStudioWrapper />);
      }).not.toThrow();

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });

    test('handles invalid localStorage values', () => {
      localStorage.setItem('analytics_use_new_version', 'invalid');

      render(<AnalyticsStudioWrapper />);

      // Should default to legacy version
      expect(screen.getByTestId('legacy-analytics')).toBeInTheDocument();
    });

    test('handles rapid version switching', async () => {
      render(<AnalyticsStudioWrapper />);

      const switchButton = screen.getByRole('button', { name: /Try New Version/i });

      // Click multiple times rapidly
      fireEvent.click(switchButton);
      fireEvent.click(switchButton);
      fireEvent.click(switchButton);

      // Should end up in consistent state
      await waitFor(() => {
        const isNewVersion = screen.queryByTestId('new-analytics') !== null;
        const isLegacyVersion = screen.queryByTestId('legacy-analytics') !== null;

        // Exactly one version should be visible
        expect(isNewVersion !== isLegacyVersion).toBe(true);
      });
    });

    test('keyboard shortcut does not trigger when other modifiers are pressed', () => {
      render(<AnalyticsStudioWrapper />);

      // Try with Alt key (should not open modal)
      fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true, altKey: true });

      expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
    });

    test('keyboard shortcut only triggers for V key', () => {
      render(<AnalyticsStudioWrapper />);

      // Try with different key
      fireEvent.keyDown(window, { key: 'A', ctrlKey: true, shiftKey: true });

      expect(screen.queryByText('Analytics Studio Versions')).not.toBeInTheDocument();
    });
  });

  describe('Floating Toggle Button', () => {
    test('floating button is always visible', () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });

      expect(floatingButton).toBeInTheDocument();
      expect(floatingButton).toHaveStyle({
        position: 'fixed',
        bottom: '24px',
        right: '24px'
      });
    });

    test('floating button has hover effects', () => {
      render(<AnalyticsStudioWrapper />);

      const floatingButton = screen.getByRole('button', { name: /Compare Analytics Studio versions/i });

      // Simulate hover
      fireEvent.mouseEnter(floatingButton);

      expect(floatingButton).toHaveStyle({
        transform: 'scale(1.1)'
      });

      // Simulate mouse leave
      fireEvent.mouseLeave(floatingButton);

      expect(floatingButton).toHaveStyle({
        transform: 'scale(1)'
      });
    });
  });

  describe('Version Persistence', () => {
    test('version preference persists across component remounts', () => {
      const { unmount } = render(<AnalyticsStudioWrapper />);

      // Switch to new version
      const switchButton = screen.getByRole('button', { name: /Try New Version/i });
      fireEvent.click(switchButton);

      // Unmount component
      unmount();

      // Remount component
      render(<AnalyticsStudioWrapper />);

      // Should still show new version
      expect(screen.getByTestId('new-analytics')).toBeInTheDocument();
    });

    test('banner dismissal persists across component remounts', () => {
      const { unmount } = render(<AnalyticsStudioWrapper />);

      // Dismiss banner
      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
      fireEvent.click(dismissButton);

      // Unmount component
      unmount();

      // Remount component
      render(<AnalyticsStudioWrapper />);

      // Banner should not appear
      expect(screen.queryByText(/Enhanced Analytics Available/i)).not.toBeInTheDocument();
    });
  });
});
