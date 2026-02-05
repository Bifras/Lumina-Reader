import { useState, useEffect, useCallback } from 'react'
import localforage from 'localforage'
import type { Highlight } from '../types'

interface UseHighlightsReturn {
  highlights: Highlight[]
  showHighlightPopup: boolean
  highlightPosition: { x: number; y: number }
  selectedText: string
  addHighlight: (color: string) => void
  removeHighlight: (id: string | number) => void
  setShowHighlightPopup: (show: boolean) => void
}

interface Book {
  id: string
}

// Extended Rendition type with epub.js specific methods
interface ExtendedRendition {
  display(location: string): void
  next(): void
  prev(): void
  on(eventName: string, handler: (...args: unknown[]) => void): void
  off(eventName: string, handler?: (...args: unknown[]) => void): void
  themes: {
    font(value: string): void
    fontSize(value: string): void
    register(name: string, theme: unknown): void
    select(name: string): void
    override(prop: string, value: string, important: boolean): void
  }
  annotations: {
    add(type: string, cfi: string, options: unknown, callback: () => void, className: string, styles: { fill: string; 'fill-opacity': string }): void
    clear(): void
  }
  getContents: () => unknown
  getRange: (range: Range) => string
}

export const useHighlights = (activeBook: Book | null, rendition: ExtendedRendition | null): UseHighlightsReturn => {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectedCfiRange, setSelectedCfiRange] = useState<string | null>(null)

  // Load highlights from storage when book changes
  useEffect(() => {
    let cancelled = false

    if (!activeBook) {
      // Use microtask to avoid setState in render phase
      Promise.resolve().then(() => {
        if (!cancelled) setHighlights([])
      })
      return () => { cancelled = true }
    }

    localforage.getItem(`highlights_${activeBook.id}`).then(data => {
      if (!cancelled && data) setHighlights(data as Highlight[])
    })

    return () => { cancelled = true }
  }, [activeBook])

  // Save highlights when changed
  useEffect(() => {
    if (!activeBook || highlights.length === 0) return
    localforage.setItem(`highlights_${activeBook.id}`, highlights)
  }, [highlights, activeBook])

  // Re-apply highlights when rendition changes
  useEffect(() => {
    if (!rendition || highlights.length === 0) return

    highlights.forEach(h => {
      rendition.annotations.add('highlight', h.cfi, {}, () => {}, 'epub-highlight', {
        fill: h.color || 'yellow',
        'fill-opacity': '0.3'
      })
    })

    return () => {
      if (rendition?.annotations) {
        try {
          rendition.annotations.clear()
        } catch (e) {
          console.warn('[WARN] Failed to clear annotations in cleanup:', e)
        }
      }
    }
  }, [rendition, highlights])

  const handleTextSelection = useCallback(() => {
    if (!rendition) return

    const contents = rendition.getContents()
    if (!contents) return

    // Handle epub.js Contents which can be array-like
    const contentsArray = Array.isArray(contents) ? contents : [contents]
    if (contentsArray.length === 0) return

    const content = contentsArray[0] as { window?: { getSelection: () => Selection } }
    if (!content?.window) return

    const selection = content.window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowHighlightPopup(false)
      return
    }

    const text = selection.toString().trim()
    if (text.length > 0) {
      try {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const cfiRange = rendition.getRange(range)

        setSelectedText(text)
        setSelectedCfiRange(cfiRange)
        setHighlightPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 })
        setShowHighlightPopup(true)
      } catch (e) {
        console.log('Selection error', e)
      }
    }
  }, [rendition])

  // Setup selection listeners
  useEffect(() => {
    if (!rendition) return

    const contents = rendition.getContents()
    if (!contents) return

    const contentsArray = Array.isArray(contents) ? contents : [contents]
    contentsArray.forEach((content) => {
      const doc = content as { document?: { addEventListener: (event: string, handler: () => void) => void; removeEventListener: (event: string, handler: () => void) => void } }
      if (doc?.document) {
        doc.document.addEventListener('mouseup', handleTextSelection)
      }
    })

    return () => {
      contentsArray.forEach((content) => {
        const doc = content as { document?: { removeEventListener: (event: string, handler: () => void) => void } }
        if (doc?.document) {
          try {
            doc.document.removeEventListener('mouseup', handleTextSelection)
          } catch {
            // Document may already be inaccessible, ignore
          }
        }
      })
    }
  }, [rendition, handleTextSelection])

  const addHighlight = useCallback((color: string) => {
    if (!selectedCfiRange || !selectedText) return

    const newHighlight: Highlight = {
      id: `${Date.now()}`,
      cfi: selectedCfiRange.toString(),
      text: selectedText,
      color: color,
      createdAt: Date.now()
    }

    setHighlights(prev => [...prev, newHighlight])

    // Apply highlight to rendition
    if (rendition) {
      rendition.annotations.add('highlight', selectedCfiRange.toString(), {}, () => {}, 'epub-highlight', {
        fill: color,
        'fill-opacity': '0.3'
      })
    }

    setShowHighlightPopup(false)
    setSelectedText('')
    setSelectedCfiRange(null)
  }, [selectedCfiRange, selectedText, rendition])

  const removeHighlight = useCallback((id: string | number) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  return {
    highlights,
    showHighlightPopup,
    highlightPosition,
    selectedText,
    addHighlight,
    removeHighlight,
    setShowHighlightPopup
  }
}
