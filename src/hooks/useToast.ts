import { useState, useRef, useCallback } from 'react'
import type { Toast } from '../types'

interface UseToastReturn {
  toasts: Toast[]
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdCounter = useRef(0)

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', title: string = '', duration: number = 4000) => {
    toastIdCounter.current += 1
    const id = `${Date.now()}-${toastIdCounter.current}`
    setToasts(prev => [...prev, { id, message, type, title, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
