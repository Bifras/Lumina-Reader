import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type { Toast as ToastType } from '../types'
import './Toast.css'

interface ToastProps {
  toasts: ToastType[]
  removeToast: (id: string) => void
}

const Toast = ({ toasts, removeToast }: ToastProps) => {
  return (
    <div className="toast-container">
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
    success: <CheckCircle size={20} className="toast-icon toast-icon--success" />,
    error: <AlertCircle size={20} className="toast-icon toast-icon--error" />,
    info: <Info size={20} className="toast-icon toast-icon--info" />
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`toast toast--${toast.type}`}
    >
      {icons[toast.type] || icons.info}
      <div className="toast-content">
        {toast.title && <h4 className="toast-title">{toast.title}</h4>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="toast-close"
        aria-label="Chiudi notifica"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export default Toast
