// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

const getProgressWidth = (loadingStep) => {
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

const LoadingOverlay = ({ isVisible, loadingStep }) => {
  if (!isVisible) return null

  return (
    <div className="loader-container">
      <div className="loader-content">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 48,
            height: 48,
            border: '3px solid var(--accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            marginBottom: '1.5rem'
          }}
        />
        <p style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          {loadingStep || "Preparazione del libro..."}
        </p>
        {/* Progress Bar */}
        <div
          style={{
            width: '200px',
            height: '4px',
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: getProgressWidth(loadingStep) }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'var(--accent)',
              borderRadius: '2px'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
