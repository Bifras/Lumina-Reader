import { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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

interface LibraryViewProps {
  library: Book[]
  filteredLibrary: Book[]
  isDragOver: boolean
  setIsDragOver: (dragOver: boolean) => void
  onFileUpload: (file: File | null) => void
  onLoadBook: (file: null, cfi?: string, id?: string) => void
  onDeleteBook: (id: string) => void
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
  onUpdateLibrary,
  onRegenerateCovers,
  onSearchChange,
  isLoading = false,
  addToast
}: LibraryViewProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
    return ChapterDetector.detectFromFile(buffer)
  }, [bookToEdit])

  // Handle rating change
  const handleRate = useCallback(async (bookId: string, rating: number) => {
    const newLibrary = await updateBookRating(bookId, rating)
    useLibraryStore.getState().setLibrary(newLibrary)
    onUpdateLibrary?.(newLibrary)
  }, [onUpdateLibrary])

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
        layout
        transition={{ type: 'tween', duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className={`library-main ${isSidebarCollapsed ? 'library-main--sidebar-collapsed' : ''}`}
      >
        <div className="library-section">
          <LibrarySectionHeader
            filteredCount={filteredLibrary.length}
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
          />
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

      <EditMetadataModal
        isOpen={bookToEdit !== null}
        book={bookToEdit}
        onClose={() => setBookToEdit(null)}
        onSave={handleSaveMetadata}
        onDetectChapters={handleDetectChapters}
      />
    </motion.div>
  )
})

export default LibraryView








