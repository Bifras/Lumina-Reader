import { useState, useRef, useCallback } from 'react'

export const useToast = () => {
  const [toasts, setToasts] = useState([])
  const toastIdCounter = useRef(0)

  const addToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
    toastIdCounter.current += 1
    const id = `${Date.now()}-${toastIdCounter.current}`
    setToasts(prev => [...prev, { id, message, type, title, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
