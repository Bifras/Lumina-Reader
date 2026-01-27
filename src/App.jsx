import { useState, useEffect, useRef, useCallback } from 'react'
import localforage from 'localforage'
import ePub from 'epubjs'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Upload, BookOpen, Settings, X, Plus, Trash2, Clock, List, Bookmark, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { saveBookMetadata, getLibrary, updateProgress, removeBook, clearLibrary, saveBookFile, deleteBookFile } from './db'
import Toast from './components/Toast'
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

  const viewerRef = useRef(null)
  const [loadingStep, setLoadingStep] = useState(null)

  const handleFileUpload = async (file) => {
    if (!file || !file.name.endsWith('.epub')) {
      addToast("Per favore carica un file EPUB valido", "error")
      return
    }

    setIsLoading(true)
    setLoadingStep("Analisi del libro...")

    try {
      const arrayBuffer = await file.arrayBuffer()
      const book = ePub(arrayBuffer)
      const metadata = await book.loaded.metadata
      const coverUrl = await book.coverUrl()

      const bookId = crypto.randomUUID()

      setLoadingStep("Salvataggio nel database...")
      await saveBookFile(bookId, arrayBuffer)

      const newLibrary = await saveBookMetadata({
        id: bookId,
        title: metadata.title || file.name,
        author: metadata.creator || "Autore Sconosciuto",
        cover: coverUrl,
        addedAt: Date.now(),
        progress: 0,
        cfi: null
      })

      setLibrary(newLibrary)
      addToast("Libro aggiunto con successo", "success")
    } catch (error) {
      console.error("Upload error:", error)
      addToast("Errore durante il caricamento del libro", "error")
    } finally {
      setIsLoading(false)
      setLoadingStep(null)
    }
  }

  const loadBook = async (file, savedCfi = null, bookId = null) => {
    setIsLoading(true)
    setLoadingStep("Verifica elemento viewer...")
    
    if (!viewerRef.current) {
      // If we are not in reader view yet (viewerRef is null), switch view and retry
      if (bookId && !activeBook) {
        const book = library.find(b => b.id === bookId)
        if (book) {
          setActiveBook(book)
          // Wait for render cycle
          setTimeout(() => loadBook(file, savedCfi, bookId), 100)
          return
        }
      }

      console.error("[ERROR] Viewer ref is null - cannot load book")
      addToast("Errore: Elemento viewer non pronto. Attendi 2 secondi.", "error", "Errore Viewer")
      setTimeout(() => {
        if (!viewerRef.current) {
          addToast("Viewer ancora non pronto. Il libro potrebbe essere troppo grande o corrotto.", "error", "Viewer Non Pronto")
        }
      }, 2000)
      
      setIsLoading(false)
      setLoadingStep(null)
      return
    }

    setLoadingStep("Pulizia precedente...")
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
        book = ePub(bookData)
        setBookEngine(book)
      } else if (bookId) {
        try {
          setLoadingStep("Connessione al server libri...")
          const port = await window.electronAPI?.getBookServerPort()

          if (!port) {
            throw new Error("Server port non disponibile")
          }

          setLoadingStep("Scaricamento libro...")
          const response = await fetch(`http://127.0.0.1:${port}/${bookId}.epub`)

          if (!response.ok) {
            throw new Error(`Server response: ${response.status} ${response.statusText}`)
          }

          bookData = await response.arrayBuffer()
          book = ePub(bookData)
          setBookEngine(book)
        } catch (fetchError) {
          console.error("[ERROR] Fetch failed:", fetchError)
          addToast(`Errore scaricamento libro: ${fetchError.message}`, "error", "Errore Download")
          throw fetchError
        }
      } else {
        console.error("[ERROR] No file or bookId provided")
        addToast("Nessun file o libro selezionato", "error", "Parametri Mancanti")
        setIsLoading(false)
        setLoadingStep(null)
        return
      }

      setLoadingStep("Rendering...")
      
      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        manager: "default"
      })

      setRendition(rendition)

      const meta = await book.loaded.metadata
      setMetadata(meta)

      rendition.themes.register("light", THEMES.light)
      rendition.themes.register("sepia", THEMES.sepia)
      rendition.themes.register("dark", THEMES.dark)

      rendition.themes.select(currentTheme)
      rendition.themes.fontSize(`${fontSize}%`)

      const displayWithTimeout = async (rend, location) => {
        const displayPromise = rendition.display(location)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout display dopo 5 secondi")), 5000)
        )

        return Promise.race([displayPromise, timeoutPromise])
      }

      await displayWithTimeout(rendition, savedCfi || undefined)

      rendition.on("relocated", (location) => {
        const percent = book.locations.percentageFromCfi(location.start.cfi)
        const progress = Math.floor(percent * 100)
        if (bookId) {
          updateProgress(bookId, location.start.cfi, progress)
          setLibrary(prev => prev.map(b => b.id === bookId ? { ...b, progress, cfi: location.start.cfi } : b))
        }
      })

      setActiveBook(bookId ? library.find(b => b.id === bookId) : { id: 'temp', title: meta.title })

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
      setIsLoading(false)
      setLoadingStep(null)
    }
  }

  const prevPage = useCallback(() => rendition?.prev(), [rendition])
  const nextPage = useCallback(() => rendition?.next(), [rendition])

  const handleReturnToLibrary = () => {
    if (bookEngine) {
      bookEngine.destroy()
    }
    setActiveBook(null)
    setRendition(null)
    setBookEngine(null)
    setMetadata(null)
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
      if (!rendition) return
      if (e.key === "ArrowLeft") prevPage()
      if (e.key === "ArrowRight") nextPage()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [rendition, prevPage, nextPage])

  const addToast = (message, type = 'info', title = '', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, title, duration }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

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
    const newBookmark = {
      id: Date.now(),
      cfi: location.start.cfi,
      label: `Pagina ${location.start.displayed.page || '?'}`,
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

    await bookEngine.spine.each(async (item) => {
      try {
        const doc = await item.load(bookEngine.load.bind(bookEngine))
        const text = doc.body.textContent

        if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
          const index = text.toLowerCase().indexOf(searchQuery.toLowerCase())
          const snippet = text.substring(Math.max(0, index - 50), Math.min(text.length, index + searchQuery.length + 50))

          results.push({
            cfi: item.cfiBase,
            snippet: '...' + snippet + '...',
            href: item.href
          })
        }
      } catch (e) {
        console.log("Search error in item", e)
      }
    })

    setSearchResults(results)
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
      content.document.addEventListener('mouseup', handleSelection)
    })

    return () => {
      contents.forEach(content => {
        content.document.removeEventListener('mouseup', handleSelection)
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

            <div className="library-section">
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

              {library.length === 0 ? (
                <div className="empty-state">
                  <div className={`dropzone ${isDragOver ? 'active' : ''}`}>
                    <Upload size={48} strokeWidth={1} color="var(--accent)" />
                    <p>Trascina qui il tuo primo libro per iniziare</p>
                  </div>
                </div>
              ) : (
                <div className="book-grid">
                  {library.map(book => (
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
                        <button className="delete-btn" onClick={(e) => handleDeleteBook(e, book.id)} aria-label="Elimina libro"><Trash2 size={16} /></button>
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

            <div id="viewer" ref={viewerRef} style={{ width: '100%', flex: 1, minHeight: 0 }}></div>

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
                  aria-label="Mostra menu"
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
                  <button className="nav-button" onClick={prevPage} title="Pagina precedente" aria-label="Pagina precedente">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="divider" />
                  <button className={`nav-button ${showTOC ? 'active' : ''}`} onClick={() => {
                    setShowTOC(!showTOC)
                    setShowBookmarks(false)
                    setShowSearch(false)
                  }} title="Indice" aria-label="Indice">
                    <List size={20} />
                  </button>
                  <button className={`nav-button ${showBookmarks ? 'active' : ''}`} onClick={() => {
                    setShowBookmarks(!showBookmarks)
                    setShowTOC(false)
                    setShowSearch(false)
                  }} title="Segnalibri" aria-label="Segnalibri">
                    <Bookmark size={20} />
                  </button>
                  <button className={`nav-button ${showSearch ? 'active' : ''}`} onClick={() => {
                    setShowSearch(!showSearch)
                    setShowTOC(false)
                    setShowBookmarks(false)
                  }} title="Cerca" aria-label="Cerca">
                    <Search size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={handleReturnToLibrary} title="Torna alla Libreria" aria-label="Torna alla Libreria">
                    <BookOpen size={20} />
                  </button>
                  <button className={`nav-button ${showSettings ? 'active' : ''}`} onClick={() => {
                    setShowSettings(!showSettings)
                    setShowTOC(false)
                    setShowBookmarks(false)
                    setShowSearch(false)
                  }} title="Impostazioni" aria-label="Impostazioni">
                    <Settings size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={nextPage} title="Pagina successiva" aria-label="Pagina successiva">
                    <ChevronRight size={20} />
                  </button>
                  <div className="divider" />
                  <button className="nav-button" onClick={() => setMenuVisible(false)} title="Nascondi menu" aria-label="Nascondi menu">
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
                    <button onClick={() => setShowSettings(false)} aria-label="Chiudi impostazioni"><X size={18} /></button>
                  </div>
                  <div className="setting-group">
                    <label>Tema</label>
                    <div className="theme-selector">
                      {Object.keys(THEMES).map(t => (
                        <button key={t} className={`theme-btn ${currentTheme === t ? 'active' : ''}`}
                          style={{ background: THEMES[t].body.background, border: `1px solid ${currentTheme === t ? 'var(--accent)' : 'rgba(0,0,0,0.1)'}` }}
                          aria-label={`Tema ${THEMES[t].name}`}
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
                      }} aria-label="Diminuisci dimensione font">-</button>
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
                      }} aria-label="Aumenta dimensione font">+</button>
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
                    <button onClick={() => setShowTOC(false)} aria-label="Chiudi indice"><X size={18} /></button>
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
                      <button onClick={addBookmark} className="add-bookmark-btn" title="Aggiungi segnalibro" aria-label="Aggiungi segnalibro">
                        <Plus size={18} />
                      </button>
                      <button onClick={() => setShowBookmarks(false)} aria-label="Chiudi segnalibri"><X size={18} /></button>
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
                              aria-label="Rimuovi segnalibro"
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
                    <button onClick={() => setShowSearch(false)} aria-label="Chiudi ricerca"><X size={18} /></button>
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
                      <button onClick={performSearch} className="search-btn" aria-label="Cerca">
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
                    <button onClick={() => addHighlight('#ffeb3b')} style={{ background: '#ffeb3b' }} title="Giallo" aria-label="Evidenziatore Giallo" />
                    <button onClick={() => addHighlight('#81c784')} style={{ background: '#81c784' }} title="Verde" aria-label="Evidenziatore Verde" />
                    <button onClick={() => addHighlight('#64b5f6')} style={{ background: '#64b5f6' }} title="Blu" aria-label="Evidenziatore Blu" />
                    <button onClick={() => addHighlight('#ffb74d')} style={{ background: '#ffb74d' }} title="Arancione" aria-label="Evidenziatore Arancione" />
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
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 40, height: 40, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }} />
            <p>{loadingStep || "Preparazione del libro..."}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
