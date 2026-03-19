import { useEffect } from 'react'

type ShortcutHandler = {
  key: string | string[]
  ctrlOrMeta?: boolean
  preventDefault?: boolean
  action: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandler[],
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const handler of handlers) {
        const keyMatch = Array.isArray(handler.key) ? handler.key.includes(e.key) : e.key === handler.key
        
        // Match numbers 1-9
        let isNumberMatch = false
        if (typeof handler.key === 'string' && handler.key === '1-9' && e.key >= '1' && e.key <= '9') {
          isNumberMatch = true
        }

        const modifierMatch = handler.ctrlOrMeta ? (e.metaKey || e.ctrlKey) : true

        if ((keyMatch || isNumberMatch) && modifierMatch) {
          if (handler.preventDefault) {
            e.preventDefault()
          }
          handler.action(e)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers, isActive])
}
