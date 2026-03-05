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
import { getBooksInCollection, updateProgress } from './db'
import { LibraryService } from './services/LibraryService'

// Store
import { useCollectionStore, useAppStore, useLibraryStore } from './store'
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
  const lastSearch = useLibrarySettingsStore(state => state.lastSearch)
  const [searchQuery, setSearchQuery] = useState<string>(lastSearch || '')

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
  const librarySwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readerCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hooks
  const { toasts, addToast, removeToast } = useToast()
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)

  const advancedFilters = useLibraryStore(state => state.advancedFilters)

  // Memoized filtered library (sorting is handled in LibraryView settings)
  const filteredLibrary = useMemo(() => {
    let collectionBooks = getBooksInCollection(activeCollectionId, library)

    // Apply advanced filters
    if (advancedFilters.genre) {
      collectionBooks = collectionBooks.filter((b: Book) => b.genre === advancedFilters.genre)
    }
    if (advancedFilters.minRating !== undefined) {
      collectionBooks = collectionBooks.filter((b: Book) => (b.rating || 0) >= advancedFilters.minRating!)
    }
    if (advancedFilters.isFavorite !== undefined) {
      collectionBooks = collectionBooks.filter((b: Book) => !!b.isFavorite === advancedFilters.isFavorite)
    }

    if (!searchQuery.trim()) {
      return collectionBooks
    }

    const query = searchQuery.toLowerCase()
    return collectionBooks.filter((b: Book) =>
      b.title.toLowerCase().includes(query) ||
      (b.author || '').toLowerCase().includes(query)
    )
  }, [activeCollectionId, library, searchQuery, advancedFilters])

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

  useEffect(() => {
    return () => {
      if (librarySwitchTimeoutRef.current) {
        clearTimeout(librarySwitchTimeoutRef.current)
        librarySwitchTimeoutRef.current = null
      }
      if (readerCleanupTimeoutRef.current) {
        clearTimeout(readerCleanupTimeoutRef.current)
        readerCleanupTimeoutRef.current = null
      }
    }
  }, [])

  // Load book when pendingBookLoad is set and viewer is ready
  useEffect(() => {
    if (pendingBookLoad && viewerReady && viewerRef.current) {
      setIsLoading(true)
      loadBookIntoViewer(pendingBookLoad)
    }
  }, [pendingBookLoad, viewerReady, loadBookIntoViewer, setIsLoading])

  // Apply theme to documentElement for CSS cascading
  useEffect(() => {
    // Apply global theme to documentElement
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

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
    if (librarySwitchTimeoutRef.current) {
      clearTimeout(librarySwitchTimeoutRef.current)
      librarySwitchTimeoutRef.current = null
    }

    if (readerCleanupTimeoutRef.current) {
      clearTimeout(readerCleanupTimeoutRef.current)
      readerCleanupTimeoutRef.current = null
    }

    if (bookId) {
      const book = library.find(b => b.id === bookId)
      if (!book) return
      setActiveBook(book)
    }
    setPendingBookLoad({ file: file || undefined, savedCfi, bookId })
  }, [library, setPendingBookLoad])

  const handleReturnToLibrary = useCallback((): void => {
    if (librarySwitchTimeoutRef.current) {
      clearTimeout(librarySwitchTimeoutRef.current)
      librarySwitchTimeoutRef.current = null
    }

    if (readerCleanupTimeoutRef.current) {
      clearTimeout(readerCleanupTimeoutRef.current)
      readerCleanupTimeoutRef.current = null
    }

    // Move UI switch out of the click event to avoid long blocking handlers.
    librarySwitchTimeoutRef.current = setTimeout(() => {
      setActiveBook(null)
      setBookmarks([])
      librarySwitchTimeoutRef.current = null

      // Run heavy EPUB teardown later, after Library has had time to paint.
      readerCleanupTimeoutRef.current = setTimeout(() => {
        resetReader()
        readerCleanupTimeoutRef.current = null
      }, 120)
    }, 0)
  }, [resetReader])

  const handleDeleteBook = useCallback(async (id: string): Promise<void> => {
    try {
      await LibraryService.deleteBook(id)
      setLibrary(prev => prev.filter(b => b.id !== id))
      addToast('Libro eliminato', 'info')
    } catch (error) {
      console.error('[DELETE] Error deleting book:', error)
      addToast('Impossibile eliminare il libro', 'error', 'Errore')
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
            onUpdateLibrary={setLibrary}
            onRegenerateCovers={handleRegenerateCovers}
            onSearchChange={setSearchQuery}
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





