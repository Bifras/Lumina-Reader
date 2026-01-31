import { useState, useRef, useCallback } from 'react'
import ePub from 'epubjs'
import { getBookFile } from '../db'

const THEMES = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Seppia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

export const useBookLoader = (viewerRef, addToast) => {
  const [rendition, setRendition] = useState(null)
  const [bookEngine, setBookEngine] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [toc, setToc] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(null)
  const [pendingBookLoad, setPendingBookLoad] = useState(null)
  const [viewerReady, setViewerReady] = useState(false)
  
  const loadingRef = useRef(false)
  const relocatedListenerRef = useRef(null)

  const cleanupPreviousBook = useCallback(() => {
    // Clean up previous rendition listeners
    if (rendition && relocatedListenerRef.current) {
      try {
        rendition.off("relocated", relocatedListenerRef.current)
      } catch (e) {
        console.warn("[WARN] Failed to remove relocated listener:", e)
      }
      relocatedListenerRef.current = null
    }

    // Clear all annotations when book changes
    if (rendition?.annotations) {
      try {
        rendition.annotations.clear()
      } catch (e) {
        console.warn("[WARN] Failed to clear annotations:", e)
      }
    }
    
    if (bookEngine) {
      try {
        bookEngine.destroy()
      } catch (e) {
        console.warn("[WARN] Book engine destroy failed:", e)
      }
    }
  }, [rendition, bookEngine])

  const loadBookIntoViewer = useCallback(async ({ file, savedCfi, bookId }) => {
    if (loadingRef.current) {
      console.log("[DEBUG] loadBookIntoViewer aborted - already loading")
      return
    }

    if (!viewerRef.current) {
      console.error("[ERROR] Viewer ref is null - cannot load book")
      addToast("Errore: Elemento viewer non pronto.", "error", "Errore Viewer")
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
      return
    }

    loadingRef.current = true
    console.log("[DEBUG] loadBookIntoViewer starting:", { hasFile: !!file, bookId, savedCfi })

    setLoadingStep("Pulizia precedente...")
    cleanupPreviousBook()

    try {
      setLoadingStep("Preparazione dati...")
      let bookData
      let book

      if (file) {
        bookData = await file.arrayBuffer()
        console.log("[DEBUG] File book data size:", bookData.byteLength, "bytes")
        
        if (bookData.byteLength === 0) {
          throw new Error("Book file is empty (0 bytes)")
        }
        
        book = ePub(bookData)
        setBookEngine(book)
      } else if (bookId) {
        setLoadingStep("Caricamento libro...")
        bookData = await getBookFile(bookId)
        
        if (!bookData) {
          throw new Error("Book file not found")
        }
        
        console.log("[DEBUG] Book data loaded, size:", bookData.byteLength, "bytes")
        
        if (bookData.byteLength === 0) {
          throw new Error("Book file is empty (0 bytes)")
        }
        
        book = ePub(bookData)
        setBookEngine(book)
      } else {
        throw new Error("No file or bookId provided")
      }

      setLoadingStep("Rendering...")
      
      const newRendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        manager: "default"
      })

      setRendition(newRendition)

      const meta = await book.loaded.metadata
      setMetadata(meta)

      newRendition.themes.register("light", THEMES.light)
      newRendition.themes.register("sepia", THEMES.sepia)
      newRendition.themes.register("dark", THEMES.dark)

      // Display book
      const displayPromise = newRendition.display(savedCfi || undefined)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout display dopo 5 secondi")), 8000)
      )

      try {
        await Promise.race([displayPromise, timeoutPromise])
      } catch (displayError) {
        if (savedCfi) {
          console.log("[DEBUG] Retrying display from start...")
          await newRendition.display()
        } else {
          throw displayError
        }
      }

      // Setup relocated listener for progress tracking
      relocatedListenerRef.current = (location) => {
        const percent = book.locations.percentageFromCfi(location.start.cfi)
        const progress = Math.floor(percent * 100)
        return { cfi: location.start.cfi, progress }
      }
      newRendition.on("relocated", relocatedListenerRef.current)

      // Generate locations for progress calculation
      try {
        await book.locations.generate(1024)
      } catch (locError) {
        console.warn("[WARN] Location generation failed (non-critical):", locError)
      }

      // Load TOC
      try {
        const nav = await book.loaded.navigation
        setToc(nav.toc)
      } catch (e) {
        console.log("No TOC available", e)
        setToc([])
      }

      setLoadingStep("Completato!")
      addToast("Libro caricato con successo", "success", "Successo")

      return { book, rendition: newRendition, metadata: meta }

    } catch (error) {
      console.error("[ERROR] Load book error:", error)

      const errorDetails = {
        'Libro corrotto o non valido': error.message?.toLowerCase()?.includes('xml') || error.message?.toLowerCase()?.includes('parse'),
        'Timeout caricamento': error.message?.toLowerCase()?.includes('timeout'),
        'Errore visualizzazione': error.message?.toLowerCase()?.includes('render') || error.message?.toLowerCase()?.includes('display'),
        'Errore server': error.message?.toLowerCase()?.includes('fetch') || error.message?.toLowerCase()?.includes('server'),
        'Errore sconosciuto': !error.message
      }

      const errorMessage = Object.entries(errorDetails).find(([, reason]) => reason)?.[0] || 'Errore durante il caricamento'
      addToast(errorMessage, "error", "Errore Caricamento")
      throw error

    } finally {
      loadingRef.current = false
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
    }
  }, [viewerRef, cleanupPreviousBook, addToast])

  const resetReader = useCallback(() => {
    loadingRef.current = false
    cleanupPreviousBook()
    setBookEngine(null)
    setRendition(null)
    setMetadata(null)
    setToc([])
    setViewerReady(false)
    setPendingBookLoad(null)
    setIsLoading(false)
    setLoadingStep(null)
  }, [cleanupPreviousBook])

  return {
    rendition,
    bookEngine,
    metadata,
    toc,
    isLoading,
    loadingStep,
    pendingBookLoad,
    viewerReady,
    setViewerReady,
    setPendingBookLoad,
    setIsLoading,
    loadBookIntoViewer,
    resetReader,
    relocatedListenerRef
  }
}
