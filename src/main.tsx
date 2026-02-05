import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Error boundary class component for unhandled errors
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#dc2626', background: '#fef2f2', height: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Sigh... l'applicazione si è bloccata.</h1>
          <pre style={{ background: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #fee2e2', overflow: 'auto' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Riprova
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Get the root element and create the React root
const rootElement = document.getElementById('root')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} else {
  console.error('Root element not found')
}
