import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './axiosConfig';
import './i18n';
import App from './App.jsx';

// Error Boundary definition
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
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
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Critical: Root element not found!');
} else {
  console.log('Mounting React Application...');
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('React Application Mounted.');
  } catch (err) {
    console.error('Failed to mount React app:', err);
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
