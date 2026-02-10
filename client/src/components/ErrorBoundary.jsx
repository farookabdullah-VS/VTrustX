import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#b91c1c' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', background: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
                        Reload Page
                    </button>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ marginTop: '20px', marginLeft: '10px', padding: '10px 20px', cursor: 'pointer' }}>
                        Clear Cache & Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
