import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { useFocusTrap } from '../hooks'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  isDestructive = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogRef, isOpen)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={onCancel}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="confirm-dialog glass-panel"
          >
            <div className="confirm-dialog__header">
              <div className="confirm-dialog__title-wrap">
                {isDestructive && <AlertCircle size={20} className="confirm-dialog__icon" aria-hidden="true" />}
                <h3 id="confirm-title" className="confirm-dialog__title">{title}</h3>
              </div>
              <button 
                onClick={onCancel} 
                className="confirm-dialog__close"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="confirm-dialog__content">
              <p id="confirm-desc">{message}</p>
            </div>
            
            <div className="confirm-dialog__actions">
              <button 
                onClick={onCancel} 
                className="confirm-dialog__btn confirm-dialog__btn--cancel"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm()
                }} 
                className={`confirm-dialog__btn confirm-dialog__btn--confirm ${isDestructive ? 'confirm-dialog__btn--danger' : ''}`}
                autoFocus
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
