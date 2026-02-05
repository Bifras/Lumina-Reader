import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  message: string
  type: ToastType
  title: string
  duration: number
}

export interface ToastStoreState {
  toasts: Toast[]
}

export interface ToastStoreActions {
  addToast: (message: string, type?: ToastType, title?: string, duration?: number) => number
  removeToast: (id: number) => void
  success: (message: string, title?: string) => number
  error: (message: string, title?: string) => number
  info: (message: string, title?: string) => number
}

export type ToastStore = ToastStoreState & ToastStoreActions

export const useToastStore = create<ToastStore>((set, get) => ({
  // State
  toasts: [],
  
  // Actions
  addToast: (message, type = 'info', title = '', duration = 4000) => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, title, duration }]
    }))
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
    
    return id
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },
  
  // Convenience methods
  success: (message, title = '') => get().addToast(message, 'success', title),
  error: (message, title = '') => get().addToast(message, 'error', title),
  info: (message, title = '') => get().addToast(message, 'info', title),
}))
