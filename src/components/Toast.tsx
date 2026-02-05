import { useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type { Toast as ToastType } from '../types'

interface ToastProps {
  toasts: ToastType[]
  removeToast: (id: string) => void
}

const Toast = ({ toasts, removeToast }: ToastProps) => {
  return (
    <div className="toast-container" style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: ToastType
  removeToast: (id: string) => void
}

const ToastItem = ({ toast, removeToast }: ToastItemProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration || 4000)

    return () => clearTimeout(timer)
  }, [toast, removeToast])

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle size={20} color="var(--accent-warm)" />,
    error: <AlertCircle size={20} color="#EF4444" />,
    info: <Info size={20} color="#3B82F6" />
  }

  const getToastStyles = (type: ToastType['type']) => {
    const isDark = document.body.getAttribute('data-theme') === 'dark'
    
    if (isDark) {
      const darkBgColors: Record<string, string> = {
        success: 'rgba(192, 93, 78, 0.15)',
        error: 'rgba(239, 68, 68, 0.15)',
        info: 'rgba(59, 130, 246, 0.15)'
      }
      const darkBorderColors: Record<string, string> = {
        success: 'rgba(192, 93, 78, 0.3)',
        error: 'rgba(239, 68, 68, 0.3)',
        info: 'rgba(59, 130, 246, 0.3)'
      }
      return {
        background: darkBgColors[type] || 'rgba(30, 30, 30, 0.9)',
        border: '1px solid ' + (darkBorderColors[type] || 'rgba(255, 255, 255, 0.1)'),
        color: '#e6e6e6'
      }
    }
    
    const bgColors: Record<string, string> = {
      success: '#F0FDF4',
      error: '#FEF2F2',
      info: '#EFF6FF'
    }
    const borderColors: Record<string, string> = {
      success: '#BBF7D0',
      error: '#FECACA',
      info: '#BFDBFE'
    }
    return {
      background: bgColors[type] || '#fff',
      border: '1px solid ' + (borderColors[type] || '#e5e7eb'),
      color: '#1f2937'
    }
  }

  const toastStyles = getToastStyles(toast.type)
  const isDark = document.body.getAttribute('data-theme') === 'dark'

  const containerStyle: React.CSSProperties = {
    background: toastStyles.background,
    border: toastStyles.border,
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: '300px',
    maxWidth: '400px',
    pointerEvents: 'auto',
    color: toastStyles.color
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      style={containerStyle}
    >
      {icons[toast.type] || icons.info}
      <div style={{ flex: 1 }}>
        {toast.title && <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{toast.title}</h4>}
        <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#a0a0a0' : '#4b5563' }}>{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: isDark ? '#666666' : '#9ca3af' }}
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export default Toast
