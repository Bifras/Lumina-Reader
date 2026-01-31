import { Component } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    // Clear any corrupted state
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-cream, #faf9f6)',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            padding: '3rem',
            background: 'var(--surface-card, white)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertCircle size={40} color="#EF4444" />
            </div>
            
            <h2 style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
              color: 'var(--text-main, #1a1a1a)',
              fontFamily: 'var(--font-display, serif)'
            }}>
              Oops! Something went wrong
            </h2>
            
            <p style={{
              color: 'var(--text-dim, #4a4a4a)',
              marginBottom: '2rem',
              lineHeight: 1.6
            }}>
              We're sorry, but something unexpected happened. 
              You can try reloading the app or resetting to the library view.
            </p>

            {this.state.error && (
              <details style={{
                marginBottom: '2rem',
                textAlign: 'left',
                background: 'rgba(0,0,0,0.03)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontFamily: 'monospace'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                  Error Details (for developers)
                </summary>
                <pre style={{
                  marginTop: '1rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#EF4444'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--text-main, #1a1a1a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui, sans-serif)',
                  fontWeight: 600,
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Home size={18} />
                Go to Library
              </button>
              
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: 'var(--text-main, #1a1a1a)',
                  border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui, sans-serif)',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.05)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                <RefreshCw size={18} />
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
