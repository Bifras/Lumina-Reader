import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],
  
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
