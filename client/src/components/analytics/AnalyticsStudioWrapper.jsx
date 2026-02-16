/**
 * Analytics Studio Wrapper
 *
 * Provides backward compatibility during migration from legacy to refactored Analytics Studio.
 * Users can toggle between versions using localStorage preference.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import AnalyticsStudio from './AnalyticsStudio';
import NewAnalyticsStudio from './NewAnalyticsStudio';

const STORAGE_KEY = 'analytics_use_new_version';
const DISMISSED_BANNER_KEY = 'analytics_beta_banner_dismissed';

/**
 * Beta Banner Component
 * Displays information about the new Analytics Studio and allows switching
 */
function BetaBanner({ onSwitch, onDismiss, isUsingNew }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <AlertCircle size={24} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>
            {isUsingNew ? 'New Analytics Studio (Beta)' : 'Enhanced Analytics Available'}
          </strong>
          <p style={{ fontSize: '0.875rem', margin: 0, opacity: 0.95 }}>
            {isUsingNew
              ? 'You are using the new Analytics Studio with enhanced features, better performance, and improved UX.'
              : 'Try the new Analytics Studio with advanced features like report templates, PDF/PowerPoint export, cohort analysis, and predictive forecasting.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onSwitch}
          aria-label={isUsingNew ? 'Switch to legacy version' : 'Switch to new version'}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          <RefreshCw size={16} />
          {isUsingNew ? 'Use Legacy Version' : 'Try New Version'}
        </button>

        <button
          onClick={onDismiss}
          aria-label="Dismiss banner"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * Feature Comparison Modal
 * Helps users understand differences between versions
 */
function FeatureComparisonModal({ onClose, onSelectVersion }) {
  return (
    <div
      role="dialog"
      aria-labelledby="comparison-title"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 id="comparison-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            Analytics Studio Versions
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Legacy Version */}
            <div
              style={{
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                Legacy Version
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                Stable and proven analytics platform with core features.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', color: '#10b981' }}>
                  ✓ Available Features
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#4b5563' }}>
                  <li>Custom report builder</li>
                  <li>Multiple chart types</li>
                  <li>KPI cards</li>
                  <li>Key driver analysis</li>
                  <li>Text analytics</li>
                  <li>Anomaly detection</li>
                  <li>Excel export</li>
                  <li>Real-time updates (SSE)</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onSelectVersion('legacy');
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                Use Legacy Version
              </button>
            </div>

            {/* New Version */}
            <div
              style={{
                border: '2px solid #8b5cf6',
                borderRadius: '8px',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%)'
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '12px' }}>
                New Version (Beta)
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
                Enhanced platform with advanced analytics and better performance.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px', color: '#10b981' }}>
                  ✓ All Legacy Features Plus
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#4b5563' }}>
                  <li><strong>Report Templates</strong> - Pre-built dashboards</li>
                  <li><strong>PDF & PowerPoint Export</strong> - Professional reports</li>
                  <li><strong>Scheduled Reports</strong> - Automated delivery</li>
                  <li><strong>Cohort Analysis</strong> - Track user segments</li>
                  <li><strong>Predictive Forecasting</strong> - Trend predictions</li>
                  <li><strong>Advanced Filtering</strong> - Better UX</li>
                  <li><strong>Improved Performance</strong> - Pagination & caching</li>
                  <li><strong>Mobile Responsive</strong> - Works on all devices</li>
                  <li><strong>Better Accessibility</strong> - ARIA compliant</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onSelectVersion('new');
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              >
                Try New Version
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Note:</strong> You can switch between versions at any time. Your reports and data remain unchanged.
              The new version is in beta and we welcome your feedback!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Analytics Studio Wrapper
 * Main component that manages version switching
 */
export default function AnalyticsStudioWrapper() {
  const [useNewVersion, setUseNewVersion] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const [showBanner, setShowBanner] = useState(() => {
    const dismissed = localStorage.getItem(DISMISSED_BANNER_KEY);
    return dismissed !== 'true';
  });

  const [showComparison, setShowComparison] = useState(false);

  // Update localStorage when version preference changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(useNewVersion));
  }, [useNewVersion]);

  const handleSwitch = () => {
    const willUseNew = !useNewVersion;
    setUseNewVersion(willUseNew);

    // Show a toast notification about the switch
    if (window.showToast) {
      window.showToast({
        type: 'success',
        message: willUseNew
          ? 'Switched to new Analytics Studio. Enjoy the enhanced features!'
          : 'Switched to legacy Analytics Studio.'
      });
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_BANNER_KEY, 'true');
  };

  const handleSelectVersion = (version) => {
    setUseNewVersion(version === 'new');
  };

  // Allow users to open comparison modal via keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + Shift + V to open version comparison
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setShowComparison(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      {showBanner && (
        <BetaBanner
          onSwitch={handleSwitch}
          onDismiss={handleDismissBanner}
          isUsingNew={useNewVersion}
        />
      )}

      {/* Version Comparison Modal */}
      {showComparison && (
        <FeatureComparisonModal
          onClose={() => setShowComparison(false)}
          onSelectVersion={handleSelectVersion}
        />
      )}

      {/* Render selected version */}
      {useNewVersion ? <NewAnalyticsStudio /> : <AnalyticsStudio />}

      {/* Floating toggle button (always accessible) */}
      <button
        onClick={() => setShowComparison(true)}
        aria-label="Compare Analytics Studio versions"
        title="Compare versions (Ctrl+Shift+V)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 999,
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        }}
      >
        <RefreshCw size={24} />
      </button>
    </>
  );
}
