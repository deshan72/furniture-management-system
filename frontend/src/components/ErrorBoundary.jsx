import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="panel"
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '12px',
            margin: '20px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
            Module Display Issue Detected
          </h2>
          <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: '520px', lineHeight: 1.6, margin: 0 }}>
            A temporary display error occurred while rendering this module. You can reload this view or switch back to another tab safely.
          </p>
          {this.state.error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '12px 16px',
                maxWidth: '680px',
                width: '100%',
                textAlign: 'left',
                overflowX: 'auto',
                fontSize: '0.8rem',
                color: '#991B1B',
                fontFamily: 'monospace',
              }}
            >
              <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
              {this.state.error.stack && (
                <pre style={{ margin: '8px 0 0 0', fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} /> Reload Module View
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Full Browser Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

