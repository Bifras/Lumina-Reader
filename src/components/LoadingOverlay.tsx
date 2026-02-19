import { motion } from 'framer-motion'

const getProgressWidth = (loadingStep?: string | null): string => {
  if (loadingStep?.includes('Lettura')) return '25%'
  if (loadingStep?.includes('Analisi')) return '50%'
  if (loadingStep?.includes('Salvataggio')) return '75%'
  if (loadingStep?.includes('Completato')) return '100%'
  if (loadingStep?.includes('Pulizia')) return '10%'
  if (loadingStep?.includes('Preparazione')) return '30%'
  if (loadingStep?.includes('Caricamento')) return '40%'
  if (loadingStep?.includes('Rendering')) return '70%'
  return '50%'
}

interface LoadingOverlayProps {
  isVisible: boolean
  loadingStep?: string | null
}

const LoadingOverlay = ({ isVisible, loadingStep }: LoadingOverlayProps) => {
  if (!isVisible) return null

  const spinnerStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    border: '3px solid var(--accent)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    marginBottom: '1.5rem'
  }

  const progressBarStyle: React.CSSProperties = {
    width: '200px',
    height: '4px',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: '2px',
    overflow: 'hidden'
  }

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: '2px'
  }

  return (
    <div 
      className="loader-container"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loader-content" role="status">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={spinnerStyle}
          aria-hidden="true"
        />
        <p style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          {loadingStep || "Preparazione del libro..."}
        </p>
        <div style={progressBarStyle} role="progressbar" aria-valuenow={parseInt(getProgressWidth(loadingStep))} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: getProgressWidth(loadingStep) }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={progressFillStyle}
          />
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
