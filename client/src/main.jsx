import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './axiosConfig';
import './i18n';
import App from './App.jsx';
import { initSentry, ErrorBoundary as SentryErrorBoundary } from './config/sentry';

// Initialize Sentry as early as possible
initSentry();

// Fallback Error Boundary (used if Sentry is not configured)
class FallbackErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', background: 'white', minHeight: '100vh' }}>
          <h1>Something went wrong.</h1>
          <p>Please check the console for more details.</p>
          <details style={{ whiteSpace: 'pre-wrap', background: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use Sentry ErrorBoundary if configured, otherwise use fallback
const ErrorBoundary = import.meta.env.VITE_SENTRY_DSN ? SentryErrorBoundary : FallbackErrorBoundary;

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.textContent = 'Critical: Root element not found!';
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary
          fallback={({ error, componentStack, resetError }) => (
            <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', background: 'white', minHeight: '100vh' }}>
              <h1>Something went wrong.</h1>
              <p>The error has been reported to our team.</p>
              <details style={{ whiteSpace: 'pre-wrap', background: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>
                {error && error.toString()}
                <br />
                {componentStack}
              </details>
              <button onClick={resetError || (() => window.location.href = '/')} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
                Try Again
              </button>
            </div>
          )}
        >
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err) {
    // Mount failure — render fallback UI
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:red; padding:20px;';
    const h1 = document.createElement('h1');
    h1.textContent = 'Failed to mount App';
    const pre = document.createElement('pre');
    pre.textContent = err.message;
    errDiv.appendChild(h1);
    errDiv.appendChild(pre);
    rootElement.replaceChildren(errDiv);
  }
}
