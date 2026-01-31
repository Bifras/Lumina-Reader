import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import localforage from 'localforage'
import ePub from 'epubjs'

// Components
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'
import LibraryView from './views/LibraryView'
import ReaderView from './views/ReaderView'

// Hooks
import { useToast, useBookLoader, useHighlights } from './hooks'

// DB
import {
  saveBookMetadata,
  getLibrary,
  updateProgress,
  removeBook,
  clearLibrary,
  saveBookFile,
  deleteBookFile,
  getBooksInCollection
} from './db'

// Store
import { useCollectionStore } from './store'

// Styles
import './App.css'

const THEMES = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Sepia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

const FONT_OPTIONS = [
  { id: 'lora', name: 'Lora', family: 'Lora' },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible' },
  { id: 'bitter', name: 'Bitter', family: 'Bitter' },
  { id: 'dyslexic', name: 'OpenDyslexic', family: 'OpenDyslexic' }
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Generate UUID with fallback for non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function App() {
  // Library State
  const [library, setLibrary] = useState([])
  const [activeBook, setActiveBook] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCollectionSidebar, setShowCollectionSidebar] = useState(false)

  // Reader Settings
  const [currentTheme, setCurrentTheme] = useState('light')
  const [fontSize, setFontSize] = useState(100)
  const [readingFont, setReadingFont] = useState('lora')

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState([])

  // Refs
  const viewerRef = useRef(null)

  // Hooks
  const { toasts, addToast, removeToast } = useToast()
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)

  const filteredLibrary = useMemo(() => {
    return getBooksInCollection(activeCollectionId, library)
  }, [activeCollectionId, library])

  const {
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
  } = useBookLoader(viewerRef, addToast)

  const {
    highlights,
    showHighlightPopup,
    highlightPosition,
    addHighlight,
    setShowHighlightPopup
  } = useHighlights(activeBook, rendition)

  // Load library on mount
  useEffect(() => {
    getLibrary().then(setLibrary)

    // Manual reset
    if (window.location.search.includes('reset=true')) {
      if (confirm('RESET MANUALE: Cancellare tutta la libreria?')) {
        localforage.clear().then(() => {
          addToast('Libreria cancellata! Ricarica la pagina.', 'success')
          window.location.search = ''
        })
      }
    }
  }, [addToast])

  // Load bookmarks when book changes
  useEffect(() => {
    if (!activeBook) {
      setBookmarks([])
      return
    }
    localforage.getItem(`bookmarks_${activeBook.id}`).then(data => {
      if (data) setBookmarks(data)
    })
  }, [activeBook])

  // Save bookmarks when changed
  useEffect(() => {
    if (!activeBook || bookmarks.length === 0) return
    localforage.setItem(`bookmarks_${activeBook.id}`, bookmarks)
  }, [bookmarks, activeBook])

  // Track viewer element availability
  useEffect(() => {
    if (!activeBook) {
      if (viewerReady) setViewerReady(false)
      return
    }

    let attempts = 0
    const maxAttempts = 50

    const checkViewer = () => {
      attempts++
      if (viewerRef.current) {
        setViewerReady(true)
        return true
      }
      if (attempts >= maxAttempts) {
        addToast('Errore: Elemento viewer non trovato', 'error')
        return true
      }
      return false
    }

    if (!checkViewer()) {
      const interval = setInterval(() => {
        if (checkViewer()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [activeBook, viewerReady, setViewerReady, addToast])

  // Load book when pendingBookLoad is set and viewer is ready
  useEffect(() => {
    if (pendingBookLoad && viewerReady && viewerRef.current) {
      setIsLoading(true)
      loadBookIntoViewer(pendingBookLoad).then((result) => {
        if (result?.book && activeBook?.id) {
          // Setup progress tracking
          const listener = (location) => {
            const percent = result.book.locations.percentageFromCfi(location.start.cfi)
            const progress = Math.floor(percent * 100)
            updateProgress(activeBook.id, location.start.cfi, progress)
            setLibrary(prev => prev.map(b => 
              b.id === activeBook.id ? { ...b, progress, cfi: location.start.cfi } : b
            ))
          }
          if (relocatedListenerRef) {
            relocatedListenerRef.current = listener
          }
        }
      })
    }
  }, [pendingBookLoad, viewerReady, loadBookIntoViewer, setIsLoading, activeBook, relocatedListenerRef])

  // Apply theme
  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  // Apply font settings to rendition
  useEffect(() => {
    if (!rendition || !activeBook) return

    try {
      const theme = THEMES[currentTheme]
      const font = FONT_OPTIONS.find(f => f.id === readingFont)?.family || 'Lora'
      const contents = rendition.getContents()

      if (!contents || contents.length === 0) return

      contents.forEach(content => {
        if (!content || typeof content.addStylesheetRules !== 'function') return

        content.addStylesheetRules({
          'body': {
            'background-color': 'transparent !important',
            'color': theme.body.color + ' !important',
            'font-family': `${font}, serif !important`
          },
          'html': {
            'background-color': 'transparent !important'
          },
          'p, span, div, h1, h2, h3, h4, h5, h6, li, section, article': {
            'color': theme.body.color + ' !important',
            'font-family': `${font}, serif !important`
          },
          'a': {
            'color': 'var(--accent-warm) !important'
          }
        })
      })

      rendition.themes.select(currentTheme)
      rendition.themes.fontSize(`${fontSize}%`)
      localforage.setItem('reading-font', readingFont)
    } catch (error) {
      console.error('[ERROR] Failed to apply styles:', error)
    }
  }, [currentTheme, readingFont, fontSize, rendition, activeBook])

  // Handlers
  const handleFileUpload = useCallback(async (file) => {
    if (!file) {
      addToast('Nessun file selezionato', 'error', 'Errore')
      return
    }

    if (!file.name.toLowerCase().endsWith('.epub')) {
      addToast('Il file deve avere estensione .epub', 'error', 'Formato non valido')
      return
    }

    if (file.size === 0) {
      addToast('Il file è vuoto (0 bytes)', 'error', 'File non valido')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      addToast(`File troppo grande (${sizeMB}MB). Max: 100MB`, 'error', 'Dimensione eccessiva')
      return
    }

    setIsLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('FILE_EMPTY')
      }
      
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04
      if (!isZip) {
        throw new Error('NOT_ZIP')
      }

      const book = ePub(arrayBuffer)
      
      let metadata
      try {
        metadata = await Promise.race([
          book.loaded.metadata,
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
        ])
      } catch {
        throw new Error('METADATA_ERROR')
      }

      if (!metadata || (!metadata.title && !file.name)) {
        throw new Error('NO_METADATA')
      }

      let coverUrl = null
      try {
        coverUrl = await book.coverUrl()
      } catch {
        console.log('[UPLOAD] No cover found, using default')
      }

      const bookId = generateId()
      
      try {
        await saveBookFile(bookId, arrayBuffer)
      } catch {
        throw new Error('SAVE_ERROR')
      }

      const newLibrary = await saveBookMetadata({
        id: bookId,
        title: metadata.title || file.name.replace('.epub', ''),
        author: metadata.creator || 'Autore sconosciuto',
        cover: coverUrl,
        addedAt: Date.now(),
        progress: 0,
        cfi: null
      })

      setLibrary(newLibrary)
      addToast(`"${metadata.title || file.name}" aggiunto`, 'success', 'Libro aggiunto')
    } catch (error) {
      console.error('[UPLOAD] Error:', error)
      
      const errorMessages = {
        'FILE_EMPTY': ['Il file è vuoto', 'Errore lettura'],
        'NOT_ZIP': ['Il file non è un EPUB valido', 'Formato non valido'],
        'METADATA_TIMEOUT': ['L\'EPUB impiega troppo tempo', 'Timeout'],
        'METADATA_ERROR': ['Impossibile leggere i metadati', 'EPUB corrotto'],
        'NO_METADATA': ['L\'EPUB non contiene informazioni valide', 'Metadati mancanti'],
        'SAVE_ERROR': ['Errore durante il salvataggio', 'Errore salvataggio']
      }
      
      const [msg, title] = errorMessages[error.message] || ['Errore durante il caricamento', 'Errore']
      addToast(msg, 'error', title)
    } finally {
      setIsLoading(false)
    }
  }, [addToast, setIsLoading])

  const handleLoadBook = useCallback((file, savedCfi = null, bookId = null) => {
    if (bookId) {
      const book = library.find(b => b.id === bookId)
      if (!book) {
        addToast('Libro non trovato nella libreria', 'error')
        return
      }
      setActiveBook(book)
    } else if (file) {
      setActiveBook({ id: 'temp', title: 'Caricamento...' })
    }

    setTimeout(() => {
      setPendingBookLoad({ file, savedCfi, bookId })
    }, 0)
  }, [library, addToast, setPendingBookLoad])

  const handleReturnToLibrary = useCallback(() => {
    resetReader()
    setActiveBook(null)
    setBookmarks([])
  }, [resetReader])

  const handleDeleteBook = useCallback(async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo libro?')) {
      try {
        await deleteBookFile(id)
        const newLibrary = await removeBook(id)
        setLibrary(newLibrary)
        addToast('Libro eliminato dalla libreria', 'info', 'Eliminazione')
      } catch (error) {
        console.error('Delete error:', error)
        addToast('Impossibile eliminare il libro', 'error', 'Errore')
      }
    }
  }, [addToast])

  const handleClearLibrary = useCallback(async () => {
    if (confirm('Vuoi davvero svuotare tutta la libreria?')) {
      const newLib = await clearLibrary()
      setLibrary(newLib)
      addToast('Libreria svuotata', 'info')
    }
  }, [addToast])

  const handleAddBookmark = useCallback(() => {
    if (!rendition || !activeBook) return

    const location = rendition.currentLocation()
    
    if (!location?.start?.cfi) {
      addToast('Impossibile aggiungere segnalibro: posizione non disponibile', 'error')
      return
    }
    
    const newBookmark = {
      id: Date.now(),
      cfi: location.start.cfi,
      label: `Pagina ${location.start.displayed?.page || '?'}`,
      timestamp: Date.now()
    }

    setBookmarks(prev => [newBookmark, ...prev])
    addToast('Segnalibro aggiunto', 'success')
  }, [rendition, activeBook, addToast])

  const handleRemoveBookmark = useCallback((id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    addToast('Segnalibro rimosso', 'info')
  }, [addToast])

  const handleGoToBookmark = useCallback((cfi) => {
    if (rendition) {
      rendition.display(cfi)
    }
  }, [rendition])

  const handleGoToTOCItem = useCallback((href) => {
    if (rendition) {
      rendition.display(href)
    }
  }, [rendition])

  const handlePrevPage = useCallback(() => {
    rendition?.prev()
  }, [rendition])

  const handleNextPage = useCallback(() => {
    rendition?.next()
  }, [rendition])

  const handleFontSizeChange = useCallback((delta) => {
    setFontSize(prev => Math.max(50, Math.min(200, prev + delta)))
  }, [])

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <AnimatePresence mode="wait">
        {!activeBook ? (
          <LibraryView
            library={library}
            filteredLibrary={filteredLibrary}
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
            onFileUpload={handleFileUpload}
            onLoadBook={handleLoadBook}
            onDeleteBook={handleDeleteBook}
            onClearLibrary={handleClearLibrary}
            showCollectionSidebar={showCollectionSidebar}
            setShowCollectionSidebar={setShowCollectionSidebar}
          />
        ) : (
          <ReaderView
            viewerRef={viewerRef}
            book={bookEngine}
            metadata={metadata}
            rendition={rendition}
            toc={toc}
            bookmarks={bookmarks}
            highlights={highlights}
            currentTheme={currentTheme}
            fontSize={fontSize}
            readingFont={readingFont}
            showHighlightPopup={showHighlightPopup}
            highlightPosition={highlightPosition}
            onAddHighlight={addHighlight}
            onAddBookmark={handleAddBookmark}
            onRemoveBookmark={handleRemoveBookmark}
            onGoToBookmark={handleGoToBookmark}
            onGoToTOCItem={handleGoToTOCItem}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onReturnToLibrary={handleReturnToLibrary}
            onThemeChange={setCurrentTheme}
            onFontSizeChange={handleFontSizeChange}
            onFontChange={setReadingFont}
            setShowHighlightPopup={setShowHighlightPopup}
            loadingStep={loadingStep}
          />
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isLoading} loadingStep={loadingStep} />
    </div>
  )
}

export default App
