import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import localforage from 'localforage'
import ePub from 'epubjs'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Upload, BookOpen, Settings, X, Plus, Trash2, Clock, List, Bookmark, Search, ChevronDown, ChevronUp, Menu } from 'lucide-react'
import { saveBookMetadata, getLibrary, updateProgress, removeBook, clearLibrary, saveBookFile, deleteBookFile, getBookFile, getBooksInCollection } from './db'
import Toast from './components/Toast'
import CollectionSidebar from './components/CollectionSidebar'
import { useCollectionStore } from './store'
import './App.css'

const THEMES = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Seppia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

const fontOptions = [
  {
    id: 'lora', name: 'Lora', family: 'Lora',
    desc: 'Raffinato editoriale. Progettato per offrire un feeling classico ma moderno, perfetto per lunghe sessioni di lettura.'
  },
  {
    id: 'atkinson', name: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible',
    desc: 'Progettato dal Braille Institute. Massima leggibilità e distinzione delle lettere, ideale per chi ha affaticamento visivo.'
  },
  {
    id: 'bitter', name: 'Bitter', family: 'Bitter',
    desc: 'Slab Serif contemporaneo. Progettato specificamente per la lettura confortevole su schermi digitali con ottimo bilanciamento visivo.'
  },
  {
    id: 'dyslexic', name: 'OpenDyslexic', family: 'OpenDyslexic',
    desc: 'Con base pesante. Aiuta a prevenire la rotazione o il salto delle lettere, specifico per lettori con dislessia.'
  }
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Generate UUID with fallback for non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function App() {
  const [library, setLibrary] = useState([])
  const [activeBook, setActiveBook] = useState(null)
  const [rendition, setRendition] = useState(null)
  const [bookEngine, setBookEngine] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('light')
  const [fontSize, setFontSize] = useState(100)
  const [readingFont, setReadingFont] = useState('lora')
  const [toasts, setToasts] = useState([])

  // New features state
  const [showTOC, setShowTOC] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [menuVisible, setMenuVisible] = useState(true)
  const [toc, setToc] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [highlights, setHighlights] = useState([])
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectedCfiRange, setSelectedCfiRange] = useState(null)
  
  // Collection sidebar state
  const [showCollectionSidebar, setShowCollectionSidebar] = useState(false)
  
  // Get active collection from store
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)
  
  // Filter library based on active collection
  const filteredLibrary = useMemo(() => {
    return getBooksInCollection(activeCollectionId, library)
  }, [activeCollectionId, library])

  const viewerRef = useRef(null)
  const relocatedListenerRef = useRef(null)  // Store listener for cleanup
  const [loadingStep, setLoadingStep] = useState(null)
  const [pendingBookLoad, setPendingBookLoad] = useState(null)
  const [viewerReady, setViewerReady] = useState(false)
  const loadingRef = useRef(false)  // Track if we're currently loading to prevent state interference

  const handleFileUpload = async (file) => {
    // Validazione file
    if (!file) {
      addToast("Nessun file selezionato", "error", "Errore")
      return
    }

    // Validazione estensione
    if (!file.name.toLowerCase().endsWith('.epub')) {
      addToast("Il file deve avere estensione .epub", "error", "Formato non valido")
      return
    }

    // Validazione dimensione
    if (file.size === 0) {
      addToast("Il file è vuoto (0 bytes)", "error", "File non valido")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      addToast(`File troppo grande (${sizeMB}MB). Max: 100MB`, "error", "Dimensione eccessiva")
      return
    }

    setIsLoading(true)
    setLoadingStep("Lettura file...")

    let arrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error("FILE_EMPTY")
      }
      
      // Validazione base: verifica che sia un ZIP (EPUB è un ZIP)
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04
      if (!isZip) {
        throw new Error("NOT_ZIP")
      }
    } catch (readError) {
      setIsLoading(false)
      setLoadingStep(null)
      
      if (readError.message === "FILE_EMPTY") {
        addToast("Il file è vuoto", "error", "Errore lettura")
      } else if (readError.message === "NOT_ZIP") {
        addToast("Il file non è un EPUB valido (deve essere un archivio ZIP)", "error", "Formato non valido")
      } else {
        addToast("Errore durante la lettura del file", "error", "Errore")
      }
      console.error("[UPLOAD] File read error:", readError)
      return
    }

    setLoadingStep("Analisi EPUB...")

    try {
      const book = ePub(arrayBuffer)
      
      // Verifica che l'EPUB sia valido cercando di caricare i metadati
      let metadata
      try {
        metadata = await Promise.race([
          book.loaded.metadata,
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 10000))
        ])
      } catch (metaError) {
        if (metaError.message === "TIMEOUT") {
          throw new Error("METADATA_TIMEOUT")
        }
        throw new Error("METADATA_ERROR")
      }

      // Verifica che ci sia almeno un titolo
      if (!metadata || (!metadata.title && !file.name)) {
        throw new Error("NO_METADATA")
      }

      let coverUrl = null
      try {
        coverUrl = await book.coverUrl()
      } catch {
        console.log("[UPLOAD] No cover found, using default")
      }

      const bookId = generateId()

      setLoadingStep("Salvataggio...")
      
      try {
        await saveBookFile(bookId, arrayBuffer)
      } catch {
        throw new Error("SAVE_ERROR")
      }

      const newLibrary = await saveBookMetadata({
        id: bookId,
        title: metadata.title || file.name.replace('.epub', ''),
        author: metadata.creator || "Autore sconosciuto",
        cover: coverUrl,
        addedAt: Date.now(),
        progress: 0,
        cfi: null
      })

      setLibrary(newLibrary)
      addToast(`"${metadata.title || file.name}" aggiunto`, "success", "Libro aggiunto")
    } catch (error) {
      console.error("[UPLOAD] Error:", error)
      
      // Messaggi di errore specifici
      const errorMessages = {
        'METADATA_TIMEOUT': ["L'EPUB impiega troppo tempo a rispondere. Potrebbe essere corrotto.", "Timeout"],
        'METADATA_ERROR': ["Impossibile leggere i metadati dell'EPUB. Il file potrebbe essere danneggiato.", "EPUB corrotto"],
        'NO_METADATA': ["L'EPUB non contiene informazioni valide.", "Metadati mancanti"],
        'SAVE_ERROR': ["Errore durante il salvataggio. Spazio insufficiente?", "Errore salvataggio"]
      }
      
      const [msg, title] = errorMessages[error.message] || ["Errore durante il caricamento del libro", "Errore"]
      addToast(msg, "error", title)
    } finally {
      setIsLoading(false)
      setLoadingStep(null)
    }
  }

  // Actually load book into viewer (called from useEffect when DOM is ready)
  const loadBookIntoViewer = async ({ file, savedCfi, bookId }) => {
    // Abort if already loading (prevents state interference from concurrent loads)
    if (loadingRef.current) {
      console.log("[DEBUG] loadBookIntoViewer aborted - already loading")
      return
    }

    loadingRef.current = true
    console.log("[DEBUG] loadBookIntoViewer starting:", { hasFile: !!file, bookId, savedCfi })

    if (!viewerRef.current) {
      console.error("[ERROR] Viewer ref is null - cannot load book")
      addToast("Errore: Elemento viewer non pronto.", "error", "Errore Viewer")
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
      loadingRef.current = false
      return
    }

    setLoadingStep("Pulizia precedente...")
    
    // Clean up previous rendition listeners
    if (rendition && relocatedListenerRef.current) {
      try {
        rendition.off("relocated", relocatedListenerRef.current)
        console.log("[DEBUG] Cleaned up previous relocated listener")
      } catch (e) {
        console.warn("[WARN] Failed to remove relocated listener:", e)
      }
      relocatedListenerRef.current = null
    }

    // Clear all annotations when book changes
    if (rendition?.annotations) {
      try {
        rendition.annotations.clear()
        console.log("[DEBUG] Cleared all annotations")
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
      setBookEngine(null)
    }

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
        console.log("[DEBUG] EPUB book object created from file")
      } else if (bookId) {
        try {
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
          console.log("[DEBUG] EPUB book object created")
        } catch (fetchError) {
          console.error("[ERROR] Failed to load book file:", fetchError)
          addToast(`Errore caricamento libro: ${fetchError.message}`, "error", "Errore Download")
          throw fetchError
        }
      } else {
        console.error("[ERROR] No file or bookId provided")
        addToast("Nessun file o libro selezionato", "error", "Parametri Mancanti")
        setIsLoading(false)
        setLoadingStep(null)
        setPendingBookLoad(null)
        return
      }

      setLoadingStep("Rendering...")
      console.log("[DEBUG] Calling book.renderTo() with viewer element:", viewerRef.current)

      let rendition
      try {
        rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default"
        })
        console.log("[DEBUG] Rendition created successfully:", !!rendition)
      } catch (renderError) {
        console.error("[ERROR] Failed to create rendition:", renderError)
        throw new Error(`Failed to create book renderer: ${renderError.message}`)
      }

      setRendition(rendition)

      const meta = await book.loaded.metadata
      setMetadata(meta)
      setActiveBook(bookId ? library.find(b => b.id === bookId) : { id: 'temp', title: meta.title })

      rendition.themes.register("light", THEMES.light)
      rendition.themes.register("sepia", THEMES.sepia)
      rendition.themes.register("dark", THEMES.dark)

      rendition.themes.select(currentTheme)
      rendition.themes.fontSize(`${fontSize}%`)

      const displayWithTimeout = async (rend, location) => {
        console.log("[DEBUG] Displaying at location:", location || "start")
        const displayPromise = rendition.display(location)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout display dopo 5 secondi")), 8000)
        )

        return Promise.race([displayPromise, timeoutPromise])
      }

      try {
        await displayWithTimeout(rendition, savedCfi || undefined)
        console.log("[DEBUG] Book displayed successfully")
      } catch (displayError) {
        console.error("[ERROR] Failed to display book:", displayError)
        // Try displaying without saved location as fallback
        if (savedCfi) {
          console.log("[DEBUG] Retrying display from start...")
          await rendition.display()
        } else {
          throw displayError
        }
      }

      // Store listener reference for cleanup
      relocatedListenerRef.current = (location) => {
        const percent = book.locations.percentageFromCfi(location.start.cfi)
        const progress = Math.floor(percent * 100)
        if (bookId) {
          updateProgress(bookId, location.start.cfi, progress)
          setLibrary(prev => prev.map(b => b.id === bookId ? { ...b, progress, cfi: location.start.cfi } : b))
        }
      }
      rendition.on("relocated", relocatedListenerRef.current)

      try {
        await book.locations.generate(1024)
      } catch (locError) {
        console.warn("[WARN] Location generation failed (non-critical):", locError)
      }

      setLoadingStep("Completato!")
      addToast("Libro caricato con successo", "success", "Successo")

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

    } finally {
      loadingRef.current = false
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
    }
  }

  const loadBook = async (file, savedCfi = null, bookId = null) => {
    console.log("[DEBUG] loadBook called with:", { hasFile: !!file, bookId, savedCfi })

    // Switch to reader view first (this triggers re-render)
    if (bookId) {
      const book = library.find(b => b.id === bookId)
      if (!book) {
        console.error("[ERROR] Book not found in library:", bookId)
        addToast("Libro non trovato nella libreria", "error")
        return
      }
      setActiveBook(book)
    } else if (file) {
      setActiveBook({ id: 'temp', title: 'Caricamento...' })
    }

    // Wait for DOM to update, then set pending load
    // Use setTimeout to ensure React has re-rendered
    setTimeout(() => {
      console.log("[DEBUG] Setting pendingBookLoad after re-render")
      setPendingBookLoad({ file, savedCfi, bookId })
    }, 0)
  }

  const prevPage = useCallback(() => rendition?.prev(), [rendition])
  const nextPage = useCallback(() => rendition?.next(), [rendition])

  // Track when viewer element is available in DOM
  useEffect(() => {
    if (!activeBook) {
      // Reset viewer ready when returning to library
      if (viewerReady) {
        console.log("[DEBUG] Resetting viewer ready (returned to library)")
        setViewerReady(false)
      }
      return
    }
    
    // Poll for viewer element since AnimatePresence causes delay
    let attempts = 0
    const maxAttempts = 50  // 5 seconds max
    
    const checkViewer = () => {
      attempts++
      const isReady = !!viewerRef.current
      
      if (isReady) {
        console.log("[DEBUG] Viewer element found after", attempts, "attempts")
        setViewerReady(true)
        return true
      }
      
      if (attempts >= maxAttempts) {
        console.error("[ERROR] Viewer element not found after", maxAttempts, "attempts")
        addToast("Errore: Elemento viewer non trovato", "error")
        return true  // Stop polling
      }
      
      return false
    }
    
    // Check immediately first
    if (!checkViewer()) {
      // Then poll every 100ms
      const interval = setInterval(() => {
        if (checkViewer()) {
          clearInterval(interval)
        }
      }, 100)
      
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBook])  // viewerRef.current is a mutable ref, not a dependency

  // Load book when pendingBookLoad is set and viewer is ready
  useEffect(() => {
    console.log("[DEBUG] Load effect check:", { 
      hasPending: !!pendingBookLoad, 
      viewerReady, 
      hasViewer: !!viewerRef.current,
      loading: loadingRef.current 
    })
    
    if (pendingBookLoad && viewerReady && viewerRef.current) {
      console.log("[DEBUG] All conditions met - loading book into viewer")
      setIsLoading(true)
      loadBookIntoViewer(pendingBookLoad)
    } else if (pendingBookLoad && !viewerReady) {
      console.log("[DEBUG] Waiting for viewer to be ready...")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBookLoad, viewerReady])  // loadBookIntoViewer is defined in component, causes infinite loop if included

  const handleReturnToLibrary = () => {
    // Reset loading ref to prevent stuck state
    loadingRef.current = false
    
    // Clean up rendition listeners
    if (rendition && relocatedListenerRef.current) {
      try {
        rendition.off("relocated", relocatedListenerRef.current)
      } catch (e) {
        console.warn("[WARN] Failed to remove relocated listener on return:", e)
      }
      relocatedListenerRef.current = null
    }
    
    if (bookEngine) {
      bookEngine.destroy()
    }
    setActiveBook(null)
    setRendition(null)
    setBookEngine(null)
    setMetadata(null)
    setViewerReady(false)
    setPendingBookLoad(null)
    setIsLoading(false)
    setLoadingStep(null)
  }

  const handleDeleteBook = async (e, id) => {
    e.stopPropagation()
    if (confirm("Sei sicuro di voler eliminare questo libro?")) {
      try {
        await deleteBookFile(id)
        const newLibrary = await removeBook(id)
        setLibrary(newLibrary)
        addToast("Libro eliminato dalla libreria", "info", "Eliminazione")
      } catch (error) {
        console.error("Delete error:", error)
        addToast("Impossibile eliminare il libro. Riprova più tardi.", "error", "Errore Eliminazione")
      }
    }
  }

  const handleClearLibrary = async () => {
    if (confirm("Vuoi davvero svuotare tutta la libreria?")) {
      const newLib = await clearLibrary()
      setLibrary(newLib)
      addToast("Libreria svuotata", "info")
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") rendition?.prev()
      if (e.key === "ArrowRight") rendition?.next()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [rendition])

  const addToast = (message, type = 'info', title = '', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, title, duration }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Apply theme to document body for CSS selectors to work
  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  useEffect(() => {
    getLibrary().then(setLibrary)

    // Reset manuale per la versione vecchia
    if (window.location.search.includes('reset=true')) {
      if (confirm("RESET MANUALE: Cancellare tutta la libreria?")) {
        localforage.clear().then(() => {
          addToast("Libreria cancellata! Ricarica la pagina.", "success")
          window.location.search = ''
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!rendition || !activeBook) {
      return
    }

    try {
      const theme = THEMES[currentTheme]
      const font = fontOptions.find(f => f.id === readingFont)?.family || 'Lora'
      const contents = rendition.getContents()

      if (!contents || contents.length === 0) {
        return
      }

      // Apply combined styles (theme + font) to all contents
      contents.forEach(content => {
        if (!content || typeof content.addStylesheetRules !== 'function') {
          return
        }

        content.addStylesheetRules({
          "body": {
            "background-color": "transparent !important",
            "color": theme.body.color + " !important",
            "font-family": `${font}, serif !important`
          },
          "html": {
            "background-color": "transparent !important"
          },
          "p, span, div, h1, h2, h3, h4, h5, h6, li, section, article": {
            "color": theme.body.color + " !important",
            "font-family": `${font}, serif !important`
          },
          "a": {
            "color": "var(--accent-warm) !important"
          }
        })
      })

      // Apply theme to rendition
      rendition.themes.select(currentTheme)
      rendition.themes.fontSize(`${fontSize}%`)

      // Save preferences
      localforage.setItem('reading-font', readingFont)
    } catch (error) {
      console.error("[ERROR] Failed to apply styles:", error)
    }
  }, [currentTheme, readingFont, fontSize, rendition, activeBook])

  // Load saved font preference on startup
  useEffect(() => {
    localforage.getItem('reading-font').then(savedFont => {
      if (savedFont) {
        setReadingFont(savedFont)
      }
    })
  }, [])

  // Load TOC when book is ready
  useEffect(() => {
    if (!bookEngine) return

    bookEngine.loaded.navigation.then(nav => {
      setToc(nav.toc)
    }).catch(e => console.log("No TOC available", e))
  }, [bookEngine])

  // Load bookmarks and highlights from storage
  useEffect(() => {
    if (!activeBook) return

    localforage.getItem(`bookmarks_${activeBook.id}`).then(data => {
      if (data) setBookmarks(data)
    })

    localforage.getItem(`highlights_${activeBook.id}`).then(data => {
      if (data) setHighlights(data)
    })
  }, [activeBook])

  // Save bookmarks when changed
  useEffect(() => {
    if (!activeBook || bookmarks.length === 0) return
    localforage.setItem(`bookmarks_${activeBook.id}`, bookmarks)
  }, [bookmarks, activeBook])

  // Save highlights when changed
  useEffect(() => {
    if (!activeBook || highlights.length === 0) return
    localforage.setItem(`highlights_${activeBook.id}`, highlights)
  }, [highlights, activeBook])

  const addBookmark = () => {
    if (!rendition || !activeBook) return

    const location = rendition.currentLocation()
    
    // Validate location data before creating bookmark
    if (!location?.start?.cfi) {
      console.warn("[WARN] Cannot add bookmark: location not available")
      addToast("Impossibile aggiungere segnalibro: posizione non disponibile", "error")
      return
    }
    
    const newBookmark = {
      id: Date.now(),
      cfi: location.start.cfi,
      label: `Pagina ${location.start.displayed?.page || '?'}`,
      timestamp: Date.now()
    }

    setBookmarks(prev => [newBookmark, ...prev])
    addToast("Segnalibro aggiunto", "success")
  }

  const removeBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    addToast("Segnalibro rimosso", "info")
  }

  const goToBookmark = (cfi) => {
    if (rendition) {
      rendition.display(cfi)
      setShowBookmarks(false)
    }
  }

  const goToTOCItem = (href) => {
    if (rendition) {
      rendition.display(href)
      setShowTOC(false)
    }
  }

  const performSearch = async () => {
    if (!bookEngine || !searchQuery.trim()) return

    setSearchResults([])
    const results = []
    const searchLower = searchQuery.toLowerCase()

    // spine.each doesn't await async callbacks, so we collect promises
    const searchPromises = bookEngine.spine.spineItems.map(async (item) => {
      try {
        const doc = await item.load(bookEngine.load.bind(bookEngine))
        // Check if doc and doc.body exist before accessing textContent
        if (!doc || !doc.body) {
          return
        }
        const text = doc.body.textContent

        if (text && text.toLowerCase().includes(searchLower)) {
          const index = text.toLowerCase().indexOf(searchLower)
          const snippet = text.substring(Math.max(0, index - 50), Math.min(text.length, index + searchLower.length + 50))

          results.push({
            cfi: item.cfiBase,
            snippet: '...' + snippet + '...',
            href: item.href
          })
        }
        
        // Unload to free memory
        item.unload()
      } catch (e) {
        console.log("[WARN] Search error in item:", e.message)
      }
    })

    // Wait for all spine items to be searched
    await Promise.all(searchPromises)
    
    // Sort results by CFI for consistent ordering
    results.sort((a, b) => a.cfi.localeCompare(b.cfi))
    
    setSearchResults(results)
    console.log(`[DEBUG] Search completed: ${results.length} results found`)
  }

  const goToSearchResult = (cfi) => {
    if (rendition) {
      rendition.display(cfi)
      setShowSearch(false)
    }
  }

  // Handle text selection for highlights
  useEffect(() => {
    if (!rendition) return

    const handleSelection = () => {
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
    }

    const contents = rendition.getContents()
    contents.forEach(content => {
      if (content?.document) {
        content.document.addEventListener('mouseup', handleSelection)
      }
    })

    return () => {
      contents.forEach(content => {
        // Guard against null document (iframe may have been removed)
        if (content?.document) {
          try {
            content.document.removeEventListener('mouseup', handleSelection)
          } catch {
            // Document may already be inaccessible, ignore
          }
        }
      })
    }
  }, [rendition])

  const addHighlight = (color) => {
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
    rendition.annotations.add('highlight', selectedCfiRange.toString(), {}, (e) => {
      console.log('Highlight clicked', e)
    }, 'epub-highlight', { fill: color, 'fill-opacity': '0.3' })

    setShowHighlightPopup(false)
    setSelectedText('')
    setSelectedCfiRange(null)
  }

  // Re-apply highlights when rendition changes location
  useEffect(() => {
    if (!rendition || highlights.length === 0) return

    highlights.forEach(h => {
      rendition.annotations.add('highlight', h.cfi, {}, () => { }, 'epub-highlight', {
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

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <AnimatePresence mode="wait">
        {!activeBook ? (
          <motion.div
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="library-view"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileUpload(e.dataTransfer.files[0]) }}
          >
            {/* Hero Section - Featured Book (Most recent or random) */}
            {library.length > 0 && (
              <div className="library-hero">
                {library[0].cover && (<div className="hero-ambient-bg"><div className="hero-ambient-img" style={{ backgroundImage: `url(${library[0].cover})` }} /><div className="hero-ambient-overlay" /></div>)}<div className="hero-content">
                  <div
                    className="hero-book-preview"
                    onClick={() => loadBook(null, library[0].cfi, library[0].id)}
                  >
                    {library[0].cover ? <img src={library[0].cover} alt={library[0].title} /> : <div className="no-cover"><BookOpen size={60} opacity={0.3} /></div>}
                  </div>
                  <div className="hero-details">
                    <div className="hero-label">Stai leggendo</div>
                    <h1 className="hero-title">{library[0].title}</h1>
                    <p className="hero-author">{library[0].author}</p>
                    <button className="primary-button" onClick={() => loadBook(null, library[0].cfi, library[0].id)}>
                      <BookOpen size={18} /> Continua a leggere
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Sidebar Toggle */}
            <button
              onClick={() => setShowCollectionSidebar(true)}
              style={{
                position: 'fixed',
                left: '20px',
                top: '50px',
                zIndex: 30,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--surface-card)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                color: 'var(--text-main)'
              }}
            >
              <Menu size={20} /> Collezioni
            </button>
            
            {/* Collection Sidebar */}
            <CollectionSidebar
              isOpen={showCollectionSidebar}
              onClose={() => setShowCollectionSidebar(false)}
            />

            <div className="library-section" style={{ marginLeft: showCollectionSidebar ? '260px' : '0' }}>
              <div className="library-section-header">
                <h2>La tua Libreria</h2>
                <div className="library-actions">
                  {library.length > 0 && (
                    <button
                      onClick={handleClearLibrary}
                      className="reset-btn"
                    >
                      Reset
                    </button>
                  )}
                  <label htmlFor="lib-upload" className="primary-button">
                    <Plus size={20} style={{ marginRight: '8px' }} /> Aggiungi Libro
                  </label>
                </div>
                <input type="file" id="lib-upload" accept=".epub" hidden onChange={(e) => handleFileUpload(e.target.files[0])} />
              </div>

              {filteredLibrary.length === 0 ? (
                <div className="empty-state">
                  <div className={`dropzone ${isDragOver ? 'active' : ''}`}>
                    <Upload size={48} strokeWidth={1} color="var(--accent)" />
                    <p>{library.length === 0 ? 'Trascina qui il tuo primo libro per iniziare' : 'Nessun libro in questa collezione'}</p>
                  </div>
                </div>
              ) : (
                <div className="book-grid">
                  {filteredLibrary.map(book => (
                    <motion.div
                      key={book.id}
                      className="book-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      whileHover={{ y: -5 }}
                      onClick={() => loadBook(null, book.cfi, book.id)}
                    >
                      <div className="book-cover-wrapper">
                        {book.cover ? <img src={book.cover} alt={book.title} /> : <div className="no-cover"><BookOpen size={40} opacity={0.3} /></div>}
                        <button className="delete-btn" onClick={(e) => handleDeleteBook(e, book.id)}><Trash2 size={16} /></button>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${book.progress || 0}%` }} /></div>
                      </div>
                      <div className="book-meta">
                        <h4>{book.title}</h4>
                        <p>{book.author}</p>
                        <div className="progress-label">
                          <Clock size={12} /> {book.progress || 0}% letto
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="reader-container"
          >
            {/* Minimal header in Reader View */}
            <div className="book-info" style={{ textAlign: 'center', width: '100%', padding: '1.5rem 0 0.5rem 0', zIndex: 10 }}>
              <h3 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.2rem' }}>{metadata?.creator}</h3>
              <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0 }}>{metadata?.title}</h2>
            </div>

            <div id="viewer" ref={viewerRef} style={{ width: '100%', height: '100%' }}></div>

            {/* Menu toggle button */}
            <AnimatePresence>
              {!menuVisible && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="menu-toggle glass-panel"
                  onClick={() => setMenuVisible(true)}
                  title="Mostra menu"
                >
                  <ChevronUp size={20} />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {menuVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="controls glass-panel"
                >
                  <button className="nav-button" onClick={prevPage} title="Pagina precedente">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="divider" />
                  <button className={`nav-button ${showTOC ? 'active' : ''}`} onClick={() => {
                    setShowTOC(!showTOC)
                    setShowBookmarks(false)
                    setShowSearch(false)
                  }} title="Indice">
                    <List size={20} />
                  </button>
                  <button className={`nav-button ${showBookmarks ? 'active' : ''}`} onClick={() => {
                    setShowBookmarks(!showBookmarks)
                    setShowTOC(false)
                    setShowSearch(false)
                  }} title="Segnalibri">
                    <Bookmark size={20} />
                  </button>
                  <button className={`nav-button ${showSearch ? 'active' : ''}`} onClick={() => {
                    setShowSearch(!showSearch)
                    setShowTOC(false)
                    setShowBookmarks(false)
                  }} title="Cerca">
                    <Search size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={handleReturnToLibrary} title="Torna alla Libreria">
                    <BookOpen size={20} />
                  </button>
                  <button className={`nav-button ${showSettings ? 'active' : ''}`} onClick={() => {
                    setShowSettings(!showSettings)
                    setShowTOC(false)
                    setShowBookmarks(false)
                    setShowSearch(false)
                  }} title="Impostazioni">
                    <Settings size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={nextPage} title="Pagina successiva">
                    <ChevronRight size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={() => setMenuVisible(false)} title="Nascondi menu">
                    <ChevronDown size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="settings-panel glass-panel"
                >
                  <div className="settings-header">
                    <h4>Impostazioni</h4>
                    <button onClick={() => setShowSettings(false)}><X size={18} /></button>
                  </div>
                  <div className="setting-group">
                    <label>Tema</label>
                    <div className="theme-selector">
                      {Object.keys(THEMES).map(t => (
                        <button key={t} className={`theme-btn ${currentTheme === t ? 'active' : ''}`}
                          style={{ background: THEMES[t].body.background, border: `1px solid ${currentTheme === t ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}` }}
                          onClick={async () => {
                            setCurrentTheme(t)
                            if (rendition) {
                              rendition.themes.select(t)
                              rendition.themes.fontSize(`${fontSize}%`)
                              const location = rendition.currentLocation()
                              if (location && location.start.cfi) {
                                await rendition.display(location.start.cfi)
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="setting-group">
                    <label>Font di Lettura</label>
                    <div className="font-selector">
                      {fontOptions.map(font => (
                        <button
                          key={font.id}
                          className={`font-option ${readingFont === font.id ? 'active' : ''}`}
                          onClick={() => setReadingFont(font.id)}
                          style={{ fontFamily: font.family }}
                        >
                          <div className="font-name">{font.name}</div>
                          <div className="font-desc">{font.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-group">
                    <label>Dimensione Font</label>
                    <div className="font-controls">
                      <button onClick={async () => {
                        const s = Math.max(fontSize - 10, 60)
                        setFontSize(s)
                        if (rendition) {
                          rendition.themes.fontSize(`${s}%`)
                          const location = rendition.currentLocation()
                          if (location && location.start.cfi) {
                            await rendition.display(location.start.cfi)
                          }
                        }
                      }}>-</button>
                      <span>{fontSize}%</span>
                      <button onClick={async () => {
                        const s = Math.min(fontSize + 10, 200)
                        setFontSize(s)
                        if (rendition) {
                          rendition.themes.fontSize(`${s}%`)
                          const location = rendition.currentLocation()
                          if (location && location.start.cfi) {
                            await rendition.display(location.start.cfi)
                          }
                        }
                      }}>+</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TOC Panel */}
            <AnimatePresence>
              {showTOC && (
                <motion.div
                  initial={{ x: -380, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -380, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="side-panel glass-panel"
                >
                  <div className="settings-header">
                    <h4>Indice</h4>
                    <button onClick={() => setShowTOC(false)}><X size={18} /></button>
                  </div>
                  <div className="panel-content">
                    {toc.length === 0 ? (
                      <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>Nessun indice disponibile</p>
                    ) : (
                      <div className="toc-list">
                        {toc.map((item, i) => (
                          <button
                            key={i}
                            className="toc-item"
                            onClick={() => goToTOCItem(item.href)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bookmarks Panel */}
            <AnimatePresence>
              {showBookmarks && (
                <motion.div
                  initial={{ x: -380, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -380, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="side-panel glass-panel"
                >
                  <div className="settings-header">
                    <h4>Segnalibri</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addBookmark} className="add-bookmark-btn" title="Aggiungi segnalibro">
                        <Plus size={18} />
                      </button>
                      <button onClick={() => setShowBookmarks(false)}><X size={18} /></button>
                    </div>
                  </div>
                  <div className="panel-content">
                    {bookmarks.length === 0 ? (
                      <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>Nessun segnalibro salvato</p>
                    ) : (
                      <div className="bookmark-list">
                        {bookmarks.map((bookmark) => (
                          <div key={bookmark.id} className="bookmark-item">
                            <button
                              className="bookmark-label"
                              onClick={() => goToBookmark(bookmark.cfi)}
                            >
                              {bookmark.label}
                            </button>
                            <button
                              className="bookmark-delete"
                              onClick={() => removeBookmark(bookmark.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Panel */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ x: -380, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -380, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="side-panel glass-panel"
                >
                  <div className="settings-header">
                    <h4>Cerca nel libro</h4>
                    <button onClick={() => setShowSearch(false)}><X size={18} /></button>
                  </div>
                  <div className="panel-content">
                    <div className="search-box">
                      <input
                        type="text"
                        placeholder="Cerca..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                      />
                      <button onClick={performSearch} className="search-btn">
                        <Search size={18} />
                      </button>
                    </div>
                    <div className="search-results">
                      {searchResults.length === 0 ? (
                        <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
                          {searchQuery ? 'Nessun risultato trovato' : 'Inserisci un termine di ricerca'}
                        </p>
                      ) : (
                        searchResults.map((result, i) => (
                          <button
                            key={i}
                            className="search-result-item"
                            onClick={() => goToSearchResult(result.cfi)}
                          >
                            <p>{result.snippet}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Highlight Popup */}
            <AnimatePresence>
              {showHighlightPopup && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="highlight-popup glass-panel"
                  style={{
                    position: 'fixed',
                    left: highlightPosition.x,
                    top: highlightPosition.y,
                    transform: 'translate(-50%, -100%)',
                    zIndex: 1000
                  }}
                >
                  <div className="highlight-colors">
                    <button onClick={() => addHighlight('#ffeb3b')} style={{ background: '#ffeb3b' }} title="Giallo" />
                    <button onClick={() => addHighlight('#81c784')} style={{ background: '#81c784' }} title="Verde" />
                    <button onClick={() => addHighlight('#64b5f6')} style={{ background: '#64b5f6' }} title="Blu" />
                    <button onClick={() => addHighlight('#ffb74d')} style={{ background: '#ffb74d' }} title="Arancione" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="loader-container">
          <div className="loader-content">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} 
              style={{ width: 48, height: 48, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1.5rem' }} 
            />
            <p style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
              {loadingStep || "Preparazione del libro..."}
            </p>
            {/* Progress Bar */}
            <div style={{ width: '200px', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: loadingStep?.includes('Lettura') ? '25%' : 
                         loadingStep?.includes('Analisi') ? '50%' :
                         loadingStep?.includes('Salvataggio') ? '75%' :
                         loadingStep?.includes('Completato') ? '100%' :
                         loadingStep?.includes('Pulizia') ? '10%' :
                         loadingStep?.includes('Preparazione') ? '30%' :
                         loadingStep?.includes('Caricamento') ? '40%' :
                         loadingStep?.includes('Rendering') ? '70%' :
                         '50%'
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
