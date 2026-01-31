import { useState, useEffect, useCallback } from 'react'
import localforage from 'localforage'

export const useHighlights = (activeBook, rendition) => {
  const [highlights, setHighlights] = useState([])
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectedCfiRange, setSelectedCfiRange] = useState(null)

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
      if (!cancelled && data) setHighlights(data)
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
        fill: h.color,
        'fill-opacity': '0.3'
      })
    })

    return () => {
      if (rendition?.annotations) {
        try {
          rendition.annotations.clear()
        } catch (e) {
          console.warn("[WARN] Failed to clear annotations in cleanup:", e)
        }
      }
    }
  }, [rendition, highlights])

  const handleTextSelection = useCallback(() => {
    if (!rendition) return

    const contents = rendition.getContents()
    if (!contents || contents.length === 0) return

    const selection = contents[0].window.getSelection()
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
        console.log("Selection error", e)
      }
    }
  }, [rendition])

  // Setup selection listeners
  useEffect(() => {
    if (!rendition) return

    const contents = rendition.getContents()
    contents.forEach(content => {
      if (content?.document) {
        content.document.addEventListener('mouseup', handleTextSelection)
      }
    })

    return () => {
      contents.forEach(content => {
        if (content?.document) {
          try {
            content.document.removeEventListener('mouseup', handleTextSelection)
          } catch {
            // Document may already be inaccessible, ignore
          }
        }
      })
    }
  }, [rendition, handleTextSelection])

  const addHighlight = useCallback((color) => {
    if (!selectedCfiRange || !selectedText) return

    const newHighlight = {
      id: Date.now(),
      cfi: selectedCfiRange.toString(),
      text: selectedText,
      color: color,
      timestamp: Date.now()
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

  const removeHighlight = useCallback((id) => {
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
