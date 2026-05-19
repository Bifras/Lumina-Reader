import { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Square, Trash2, X } from 'lucide-react'
import LibraryBooksContent, { type LibraryBookCardDisplayOptions } from '../components/LibraryBooksContent'
import CollectionSidebar from '../components/CollectionSidebar'
import LibrarySectionHeader from '../components/LibrarySectionHeader'
import { useLibrarySettingsStore } from '../store/useLibrarySettingsStore'
import { useCollectionStore } from '../store/useCollectionStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useDebounce } from '../hooks'
import { updateBookRating, getBookFile } from '../db'
import { LibraryService } from '../services/LibraryService'
import { ChapterDetector } from '../services/ChapterDetector'
import type { Book, TOCEntry } from '../types'
import { getLastReadBook, sortAndGroupBooks } from './libraryViewUtils'
import ConfirmDialog from '../components/ConfirmDialog'
import EditMetadataModal from '../components/EditMetadataModal'
import StatsView from './StatsView'
import { MetadataService } from '../services/MetadataService'

interface LibraryViewProps {
  library: Book[]
  filteredLibrary: Book[]
  isDragOver: boolean
  setIsDragOver: (dragOver: boolean) => void
  onFileUpload: (file: File | null) => void
  onLoadBook: (file: null, cfi?: string, id?: string) => void
  onDeleteBook: (id: string) => void
  onDeleteBooks?: (ids: string[]) => void
  onUpdateLibrary?: (library: Book[]) => void
  onRegenerateCovers?: () => void
  onSearchChange?: (query: string) => void
  isLoading?: boolean
  addToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string, duration?: number) => void
}

const LibraryView = memo(function LibraryView({
  library,
  filteredLibrary,
  isDragOver,
  setIsDragOver,
  onFileUpload,
  onLoadBook,
  onDeleteBook,
  onDeleteBooks,
  onUpdateLibrary,
  onRegenerateCovers,
  onSearchChange,
  isLoading = false,
  addToast
}: LibraryViewProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)

  // Get settings from store
  const {
    viewMode,
    cardSize,
    libraryTheme,
    sortBy,
    groupBy,
    sortDirection,
    showProgress,
    showAuthor,
    showDate,
    showCollection,
    showGenre,
    showRating,
    lastSearch,
    setLastFilter,
    setLastSearch
  } = useLibrarySettingsStore()
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)

  // Multiselect State
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set())
  const [showConfirmDeleteBatch, setShowConfirmDeleteBatch] = useState(false)

  // Library theme is now handled centrally by App.tsx and useLibrarySettingsStore
  // The data-library-theme attribute is applied to documentElement for global CSS cascading

  // Search state with debounce
  const [searchValue, setSearchValue] = useState(() => lastSearch || '')
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null)
  const isTestEnv = process.env.NODE_ENV === 'test'
  const debouncedSearchValue = useDebounce(searchValue, isTestEnv ? 0 : 300)

  // Apply debounced search
  useEffect(() => {
    onSearchChange?.(debouncedSearchValue)
    setLastSearch(debouncedSearchValue)
  }, [debouncedSearchValue, onSearchChange, setLastSearch])

  useEffect(() => {
    setLastFilter(activeCollectionId)
  }, [activeCollectionId, setLastFilter])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [library.length, activeCollectionId])

  // Find most recent in-progress book
  const lastReadBook = useMemo(() => getLastReadBook(library), [library])

  // Sort and group books
  const sortedAndGroupedBooks = useMemo(
    () => sortAndGroupBooks(filteredLibrary, sortBy, sortDirection, groupBy),
    [filteredLibrary, sortBy, sortDirection, groupBy]
  )

  // Memoized callbacks
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    onFileUpload(file || null)
  }, [setIsDragOver, onFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [setIsDragOver])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [setIsDragOver])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    onFileUpload(file || null)
    e.target.value = ''
  }, [onFileUpload])

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false)
    window.requestAnimationFrame(() => {
      settingsButtonRef.current?.focus()
    })
  }, [])

  const handleLoadBook = useCallback((id: string, cfi?: string) => {
    onLoadBook(null, cfi, id)
  }, [onLoadBook])

  const handleResumeRead = useCallback((book: Book) => {
    onLoadBook(null, book.cfi, book.id)
  }, [onLoadBook])

  const handleDeleteBook = useCallback((id: string) => {
    setBookToDelete(id)
  }, [])

  const executeDelete = useCallback(() => {
    if (bookToDelete) {
      onDeleteBook(bookToDelete)
      setBookToDelete(null)
    }
  }, [bookToDelete, onDeleteBook])

  // Multiselect Actions
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedBookIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleSelectWithMode = useCallback((id: string) => {
    setIsSelectMode(true)
    setSelectedBookIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isAllFilteredSelected = useMemo(() => {
    if (filteredLibrary.length === 0) return false
    return filteredLibrary.every(b => selectedBookIds.has(b.id))
  }, [filteredLibrary, selectedBookIds])

  const handleSelectAll = useCallback(() => {
    if (isAllFilteredSelected) {
      setSelectedBookIds(new Set())
    } else {
      setSelectedBookIds(new Set(filteredLibrary.map(b => b.id)))
    }
  }, [filteredLibrary, isAllFilteredSelected])

  const handleCancelSelection = useCallback(() => {
    setSelectedBookIds(new Set())
    setIsSelectMode(false)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedBookIds.size > 0) {
      setShowConfirmDeleteBatch(true)
    }
  }, [selectedBookIds])

  const executeDeleteBatch = useCallback(() => {
    if (onDeleteBooks && selectedBookIds.size > 0) {
      onDeleteBooks(Array.from(selectedBookIds))
      setSelectedBookIds(new Set())
      setIsSelectMode(false)
    }
    setShowConfirmDeleteBatch(false)
  }, [onDeleteBooks, selectedBookIds])

  const handleEditBook = useCallback((book: Book) => {
    setBookToEdit(book)
  }, [])

  const handleSaveMetadata = useCallback(async (updatedBookData: Partial<Book>) => {
    if (!bookToEdit) return
    
    try {
      const updatedLibrary = await LibraryService.updateBookMetadata(bookToEdit.id, updatedBookData)
      useLibraryStore.getState().setLibrary(updatedLibrary)
      onUpdateLibrary?.(updatedLibrary)
      if (addToast) addToast('Metadati aggiornati con successo', 'success')
    } catch (error) {
      console.error('Failed to save metadata:', error)
      if (addToast) addToast('Errore nel salvataggio dei metadati', 'error')
    }
  }, [bookToEdit, onUpdateLibrary, addToast])

  const handleDetectChapters = useCallback(async (): Promise<TOCEntry[]> => {
    if (!bookToEdit) return []
    const buffer = await getBookFile(bookToEdit.id)
    if (!buffer) throw new Error('File non trovato')
    return ChapterDetector.generateOptimizedTOCFromFile(buffer)
  }, [bookToEdit])

  const handleAutoCalibrate = useCallback(async (draft: { title: string; author: string }) => {
    if (!bookToEdit) {
      return { updates: {}, toc: [], bestMetadataFound: false }
    }

    const buffer = await getBookFile(bookToEdit.id)
    if (!buffer) throw new Error('File non trovato')

    const calibration = await LibraryService.buildBookCalibrationDraft(bookToEdit, buffer, draft)

    if (addToast) {
      const parts: string[] = []
      if (calibration.bestMetadataFound) parts.push('metadati dal web trovati')
      if (calibration.toc.length > 0) parts.push(`indice ottimizzato (${calibration.toc.length})`)
      addToast(
        parts.length > 0 ? parts.join(' • ') : 'Nessun miglioramento automatico trovato',
        parts.length > 0 ? 'success' : 'warning'
      )
    }

    return calibration
  }, [bookToEdit, addToast])

  // Handle rating change
  const handleRate = useCallback(async (bookId: string, rating: number) => {
    const newLibrary = await updateBookRating(bookId, rating)
    useLibraryStore.getState().setLibrary(newLibrary)
    onUpdateLibrary?.(newLibrary)
  }, [onUpdateLibrary])

  const handleAutoFillMetadataBatch = useCallback(async () => {
    const eligibleBooks = library.filter(
      b => !b.cover || !b.genre || !b.author || b.author === 'Autore sconosciuto'
    )

    if (eligibleBooks.length === 0) {
      if (addToast) {
        addToast('Tutti i libri hanno metadati completi', 'info')
      }
      return
    }

    setIsBatchProcessing(true)
    if (addToast) {
      addToast('Ricerca metadati in corso...', 'info')
    }

    try {
      let updatedCount = 0
      for (let i = 0; i < eligibleBooks.length; i++) {
        const book = eligibleBooks[i]
        
        try {
          const searchResult = await MetadataService.searchMetadata(
            book.title,
            book.author !== 'Autore sconosciuto' ? book.author : undefined
          )

          if (searchResult.results.length > 0) {
            const match = searchResult.results[0]
            const updates: Partial<Book> = {}

            if (!book.cover && match.cover) {
              updates.cover = match.cover
            }
            if (!book.genre && match.genre) {
              updates.genre = match.genre
            }
            if ((!book.author || book.author === 'Autore sconosciuto') && match.author && match.author !== 'Autore sconosciuto') {
              updates.author = match.author
            }

            if (Object.keys(updates).length > 0) {
              const updatedLibrary = await LibraryService.updateBookMetadata(book.id, updates)
              useLibraryStore.getState().setLibrary(updatedLibrary)
              onUpdateLibrary?.(updatedLibrary)
              updatedCount++
            }
          }
        } catch (error) {
          console.error(`Errore durante l'autocompilazione di "${book.title}":`, error)
        }

        if (addToast) {
          addToast(`Scansione: ${i + 1}/${eligibleBooks.length} libri...`, 'info')
        }

        // Delay artificiale anti-429
        if (i < eligibleBooks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600))
        }
      }

      if (addToast) {
        if (updatedCount > 0) {
          addToast(`Autocompilazione batch completata! Aggiornati ${updatedCount} libri.`, 'success')
        } else {
          addToast('Autocompilazione batch completata! Nessun nuovo metadato trovato.', 'info')
        }
      }
    } catch (error) {
      console.error('Errore nell\'autocompilazione batch:', error)
      if (addToast) {
        addToast('Errore durante l\'autocompilazione batch', 'error')
      }
    } finally {
      setIsBatchProcessing(false)
    }
  }, [library, onUpdateLibrary, addToast])

  // Grid style based on view mode and card size
  const gridStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {}

    switch (viewMode) {
      case 'compact':
        return {
          ...baseStyle,
          gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(140, cardSize - 40)}px, 1fr))`,
          gap: 'var(--space-md)'
        }
      case 'list':
        return {
          ...baseStyle,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 'var(--space-sm)'
        }
      case 'grid':
      default:
        return {
          ...baseStyle,
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
          gap: 'var(--space-xl) var(--space-lg)'
        }
    }
  }, [viewMode, cardSize])

  // Book card props based on view mode
  const bookCardDisplayOptions = useMemo<LibraryBookCardDisplayOptions>(() => ({
    viewMode,
    showProgress,
    showAuthor,
    showDate,
    showCollection,
    showGenre,
    showRating,
    cardSize
  }), [viewMode, showProgress, showAuthor, showDate, showCollection, showGenre, showRating, cardSize])

  const showRegenerateButton = Boolean(onRegenerateCovers) && library.some(b => !b.cover)

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`library-view library-view--${viewMode} ${isSidebarCollapsed ? 'library-view--sidebar-collapsed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
      data-library-theme={libraryTheme === 'auto' ? undefined : libraryTheme}
    >
      {/* Fixed Collection Sidebar */}
      <CollectionSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        library={library}
        addToast={addToast}
      />

      {/* Main Content Area */}
      <motion.div
        ref={mainRef}
        layout
        transition={{ type: 'tween', duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className={`library-main ${isSidebarCollapsed ? 'library-main--sidebar-collapsed' : ''}`}
      >
        <div className="library-section">
          {activeCollectionId === 'stats' ? (
            <StatsView library={library} />
          ) : (
            <>
              <LibrarySectionHeader
                filteredCount={filteredLibrary.length}
                libraryCount={library.length}
                lastReadBook={lastReadBook}
                searchValue={searchValue}
                onSearchValueChange={setSearchValue}
                showSettings={showSettings}
                settingsRef={settingsRef}
                settingsButtonRef={settingsButtonRef}
                onToggleSettings={toggleSettings}
                onCloseSettings={handleCloseSettings}
                showRegenerateButton={showRegenerateButton}
                onRegenerateCovers={onRegenerateCovers}
                onFileInputChange={handleFileInputChange}
                onResumeRead={handleResumeRead}
                onAutoFillBatch={handleAutoFillMetadataBatch}
                isBatchProcessing={isBatchProcessing}
                onEnterSelectMode={() => setIsSelectMode(true)}
              />
              <LibraryBooksContent
                isLoading={isLoading}
                libraryCount={library.length}
                filteredLibrary={filteredLibrary}
                isDragOver={isDragOver}
                viewMode={viewMode}
                groupBy={groupBy}
                gridStyle={gridStyle}
                sortedAndGroupedBooks={sortedAndGroupedBooks}
                bookCardDisplayOptions={bookCardDisplayOptions}
                onLoadBook={handleLoadBook}
                onDeleteBook={handleDeleteBook}
                onEditBook={handleEditBook}
                onRate={handleRate}
                isSelectMode={isSelectMode}
                selectedBookIds={selectedBookIds}
                onToggleSelectBook={isSelectMode ? handleToggleSelect : handleToggleSelectWithMode}
              />
            </>
          )}
        </div>
      </motion.div>

      <ConfirmDialog
        isOpen={bookToDelete !== null}
        title="Elimina Libro"
        message="Sei sicuro di voler eliminare questo libro dalla libreria? Questa azione non può essere annullata."
        confirmText="Elimina"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setBookToDelete(null)}
      />

      <ConfirmDialog
        isOpen={showConfirmDeleteBatch}
        title="Elimina Libri Selezionati"
        message={`Sei sicuro di voler eliminare i ${selectedBookIds.size} libri selezionati dalla libreria? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        isDestructive={true}
        onConfirm={executeDeleteBatch}
        onCancel={() => setShowConfirmDeleteBatch(false)}
      />

      <EditMetadataModal
        isOpen={bookToEdit !== null}
        book={bookToEdit}
        onClose={() => setBookToEdit(null)}
        onSave={handleSaveMetadata}
        onDetectChapters={handleDetectChapters}
        onAutoCalibrate={handleAutoCalibrate}
      />

      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            className="library-action-bar"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="action-bar-content glass-panel">
              <div className="selected-count">
                <span>{selectedBookIds.size} {selectedBookIds.size === 1 ? 'libro selezionato' : 'libri selezionati'}</span>
              </div>
              <div className="action-bar-buttons">
                <button
                  className="action-btn text-button"
                  onClick={handleSelectAll}
                  title={isAllFilteredSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                >
                  {isAllFilteredSelected ? <Square size={16} /> : <CheckSquare size={16} />}
                  <span>{isAllFilteredSelected ? 'Deseleziona' : 'Seleziona Tutti'}</span>
                </button>
                <button
                  className="action-btn text-button"
                  onClick={handleCancelSelection}
                >
                  <X size={16} />
                  <span>Annulla</span>
                </button>
                <button
                  className="action-btn primary-button-small destructive"
                  onClick={handleDeleteSelected}
                  disabled={selectedBookIds.size === 0}
                >
                  <Trash2 size={16} />
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default LibraryView








