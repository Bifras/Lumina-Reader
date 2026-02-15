import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// Types
import { AnimatePresence } from 'framer-motion'
import localforage from 'localforage'

// Components
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'
import LibraryView from './views/LibraryView'
import ReaderView from './views/ReaderView'

// Hooks
import { useToast, useBookLoader, useHighlights } from './hooks'

// Services & DB
import { dbService, getBooksInCollection, updateProgress } from './db'
import { LibraryService } from './services/LibraryService'

// Store
import { useCollectionStore, useAppStore } from './store'
import { useLibrarySettingsStore } from './store/useLibrarySettingsStore'

// Types
import type { Book, Bookmark, ExtendedRendition, ReaderViewRenditionType } from './types'

// Styles
import './App.css'

function App(): React.ReactElement {
  // Library State
  const [library, setLibrary] = useState<Book[]>([])
  const [isLibraryLoading, setIsLibraryLoading] = useState<boolean>(true)
  const [activeBook, setActiveBook] = useState<Book | null>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentSort, setCurrentSort] = useState<'recent' | 'title' | 'author'>('recent')

  // Reader Settings - from Zustand store (single source of truth)
  const {
    currentTheme,
    fontSize,
    readingFont,
    setTheme,
    setReadingFont,
    increaseFontSize,
    decreaseFontSize
  } = useAppStore()

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // Reading Progress State
  const [readingProgress, setReadingProgress] = useState<number>(0)

  // Refs
  const viewerRef = useRef<HTMLDivElement>(null)
  const progressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hooks
  const { toasts, addToast, removeToast } = useToast()
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)

  // Memoized filtered and sorted library
  const filteredLibrary = useMemo(() => {
    const collectionBooks = getBooksInCollection(activeCollectionId, library)

    // Filter
    let result = collectionBooks
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((b: Book) =>
        b.title.toLowerCase().includes(query) ||
        (b.author || '').toLowerCase().includes(query)
      )
    }

    // Sort
    return [...result].sort((a, b) => {
      if (currentSort === 'title') return a.title.localeCompare(b.title)
      if (currentSort === 'author') return (a.author || '').localeCompare(b.author || '')
      return b.addedAt - a.addedAt // Default: recent
    })
  }, [activeCollectionId, library, searchQuery, currentSort])

  // Load library on mount (reader settings are persisted via Zustand)
  useEffect(() => {
    setIsLibraryLoading(true)
    LibraryService.getLibrary()
      .then(setLibrary)
      .finally(() => {
        // Add a small delay for smoother transition
        setTimeout(() => setIsLibraryLoading(false), 600)
      })

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
    goToNextPage,
    goToPrevPage,
    pageInfo
  } = useBookLoader(viewerRef as React.RefObject<HTMLDivElement>, addToast, currentTheme as 'light' | 'sepia' | 'dark', fontSize, readingFont, (progress, cfi) => {
    setReadingProgress(progress)
    currentCfiRef.current = cfi
  })

  const {
    highlights,
    showHighlightPopup,
    highlightPosition,
    addHighlight,
    setShowHighlightPopup
  } = useHighlights(activeBook, rendition as unknown as ExtendedRendition | null)

  // Cast rendition to ExtendedRendition for full API access
  const extendedRendition = rendition as unknown as ExtendedRendition | null

  // Load bookmarks when book changes
  useEffect(() => {
    if (!activeBook) {
      setBookmarks([])
      return
    }
    localforage.getItem(`bookmarks_${activeBook.id}`).then(data => {
      if (data && Array.isArray(data)) {
        setBookmarks(data as Bookmark[])
      }
    })
  }, [activeBook])

  // Save bookmarks when changed
  useEffect(() => {
    if (!activeBook) return
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

    const checkViewer = (): boolean => {
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

  // Track reading progress for database/library updates
  const currentProgressRef = useRef<number>(0)
  const currentCfiRef = useRef<string>('')

  useEffect(() => {
    if (readingProgress !== currentProgressRef.current && activeBook?.id) {
      currentProgressRef.current = readingProgress

      // Debounce database/library update (500ms)
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }

      progressUpdateTimeoutRef.current = setTimeout(() => {
        updateProgress(activeBook.id, currentCfiRef.current, readingProgress)
        setLibrary(prev => prev.map(b =>
          b.id === activeBook.id ? { ...b, progress: readingProgress, cfi: currentCfiRef.current } : b
        ))
      }, 500)
    }

    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
        progressUpdateTimeoutRef.current = null
      }
    }
  }, [readingProgress, activeBook])

  // Load book when pendingBookLoad is set and viewer is ready
  useEffect(() => {
    if (pendingBookLoad && viewerReady && viewerRef.current) {
      setIsLoading(true)
      loadBookIntoViewer(pendingBookLoad)
    }
  }, [pendingBookLoad, viewerReady, loadBookIntoViewer, setIsLoading])

  // Get library settings store for theme synchronization
  const libraryTheme = useLibrarySettingsStore(state => state.libraryTheme)
  const setLibraryTheme = useLibrarySettingsStore(state => state.setLibraryTheme)

  // Apply theme to documentElement for CSS cascading and sync with library theme
  useEffect(() => {
    // Apply reader theme to documentElement
    document.documentElement.setAttribute('data-theme', currentTheme)
    
    // Sync library theme to match reader theme (unified experience)
    // Only override library theme if it's not set to 'auto'
    if (libraryTheme !== 'auto') {
      // Map reader themes to library themes (light/dark only)
      const mappedTheme = currentTheme === 'dark' ? 'dark' : 'light'
      if (libraryTheme !== mappedTheme) {
        setLibraryTheme(mappedTheme as 'light' | 'dark')
      }
    }
  }, [currentTheme, libraryTheme, setLibraryTheme])

  // Handlers
  const handleFileUpload = useCallback(async (file: File | null): Promise<void> => {
    if (!file) return
    setIsLoading(true)
    try {
      const newBook = await LibraryService.importBook(file)
      setLibrary(prev => [...prev, newBook])
      addToast(`"${newBook.title}" aggiunto`, 'success', 'Libro aggiunto')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Errore durante il caricamento', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, setIsLoading])

  // Function to regenerate missing covers from EPUB files
  const handleRegenerateCovers = useCallback(async (): Promise<void> => {
    const booksWithoutCover = library.filter(book => !book.cover)
    if (booksWithoutCover.length === 0) {
      addToast('Tutti i libri hanno già una copertina', 'info', 'Nessuna azione necessaria')
      return
    }

    addToast(`Rigenerazione copertine per ${booksWithoutCover.length} libro/i...`, 'info', 'Riparazione')
    setIsLoading(true)

    try {
      const { library: updatedLibrary, successCount, failCount } = await LibraryService.regenerateMissingCovers(booksWithoutCover)
      setLibrary(updatedLibrary)

      if (successCount > 0) {
        addToast(
          `${successCount} copertine rigenerate${failCount > 0 ? `, ${failCount} fallite` : ''}`,
          'success',
          'Completato'
        )
      } else {
        addToast('Nessuna copertina trovata nei file EPUB', 'warning', 'Nessun risultato')
      }
    } catch (error) {
      console.error('[REGEN] Error regenerating covers:', error)
      addToast('Errore durante la rigenerazione copertine', 'error', 'Errore')
    } finally {
      setIsLoading(false)
    }
  }, [library, addToast, setIsLoading])

  const handleLoadBook = useCallback((file: File | null, savedCfi?: string, bookId?: string): void => {
    if (bookId) {
      const book = library.find(b => b.id === bookId)
      if (!book) return
      setActiveBook(book)
    }
    setPendingBookLoad({ file: file || undefined, savedCfi, bookId })
  }, [library])

  const handleReturnToLibrary = useCallback((): void => {
    resetReader()
    setActiveBook(null)
    setBookmarks([])
  }, [resetReader])

  const handleDeleteBook = useCallback(async (id: string): Promise<void> => {
    if (confirm('Sei sicuro di voler eliminare questo libro?')) {
      try {
        await LibraryService.deleteBook(id)
        setLibrary(prev => prev.filter(b => b.id !== id))
        addToast('Libro eliminato', 'info')
      } catch (error) {
        console.error('[DELETE] Error deleting book:', error)
        addToast('Impossibile eliminare il libro', 'error', 'Errore')
      }
    }
  }, [addToast])

  const handleClearLibrary = useCallback(async (): Promise<void> => {
    if (confirm('Vuoi davvero svuotare tutta la libreria?')) {
      const newLib = await dbService.clearLibrary()
      setLibrary(newLib)
      addToast('Libreria svuotata', 'info')
    }
  }, [addToast])

  const handleAddBookmark = useCallback((): void => {
    if (!extendedRendition || !activeBook) return

    const location = extendedRendition.currentLocation()
    if (!location?.start?.cfi) return

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      cfi: location.start.cfi,
      label: `Pagina ${location.start.displayed?.page || '?'}`,
      createdAt: Date.now()
    }

    setBookmarks(prev => [newBookmark, ...prev])
    addToast('Segnalibro aggiunto', 'success')
  }, [extendedRendition, activeBook, addToast])

  const handleRemoveBookmark = useCallback((id: string): void => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    addToast('Segnalibro rimosso', 'info')
  }, [addToast])

  const handleGoToBookmark = useCallback((cfi: string): void => {
    rendition?.display(cfi)
  }, [rendition])

  const handleGoToTOCItem = useCallback((href: string): void => {
    rendition?.display(href)
  }, [rendition])

  const handlePrevPage = useCallback((): void => {
    goToPrevPage()
  }, [goToPrevPage])

  const handleNextPage = useCallback((): void => {
    goToNextPage()
  }, [goToNextPage])

  const handleFontSizeChange = useCallback((delta: number): void => {
    if (delta > 0) {
      increaseFontSize()
    } else {
      decreaseFontSize()
    }
  }, [increaseFontSize, decreaseFontSize])

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
            onUpdateLibrary={setLibrary}
            onRegenerateCovers={handleRegenerateCovers}
            onSearchChange={setSearchQuery}
            onSortChange={setCurrentSort}
            currentSort={currentSort}
            isLoading={isLibraryLoading}
          />
        ) : (
          <ReaderView
            viewerRef={viewerRef as React.RefObject<HTMLDivElement>}
            book={bookEngine}
            metadata={metadata}
            rendition={rendition as unknown as ReaderViewRenditionType | null}
            toc={toc}
            bookmarks={bookmarks}
            highlights={highlights}
            currentTheme={currentTheme}
            fontSize={fontSize}
            readingFont={readingFont}
            readingProgress={readingProgress}
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
            onThemeChange={setTheme}
            onFontSizeChange={handleFontSizeChange}
            onReadingFontChange={setReadingFont}
            setShowHighlightPopup={setShowHighlightPopup}
            loadingStep={loadingStep as string | null}
            pageInfo={pageInfo}
          />
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isLoading} loadingStep={loadingStep as string | null} />
    </div>
  )
}

export default App
