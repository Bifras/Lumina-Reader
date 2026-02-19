import { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Plus, 
  BookOpen, 
  ImageIcon, 
  Search, 
  Settings, 
  Grid3X3, 
  List, 
  LayoutGrid, 
  Sun, 
  Moon, 
  Monitor,
  RotateCcw,
  X,
  ChevronDown,
  ArrowUpDown,
  Check
} from 'lucide-react'
import BookCard from '../components/BookCard'
import BookCardSkeleton from '../components/BookCardSkeleton'
import CollectionSidebar from '../components/CollectionSidebar'
import { useLibrarySettingsStore, type GroupByOption, type SortOption } from '../store/useLibrarySettingsStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useDebounce } from '../hooks'
import { updateBookRating } from '../db'
import type { Book } from '../types'

interface LibraryViewProps {
  library: Book[]
  filteredLibrary: Book[]
  isDragOver: boolean
  setIsDragOver: (dragOver: boolean) => void
  onFileUpload: (file: File | null) => void
  onLoadBook: (file: null, cfi?: string, id?: string) => void
  onDeleteBook: (id: string) => void
  onClearLibrary: () => void
  onUpdateLibrary?: (library: Book[]) => void
  onRegenerateCovers?: () => void
  onSearchChange?: (query: string) => void
  onSortChange?: (sort: { by: 'recent' | 'title' | 'author'; direction: 'asc' | 'desc' }) => void
  currentSort?: { by: 'recent' | 'title' | 'author'; direction: 'asc' | 'desc' }
  isLoading?: boolean
}

// Enhanced Settings Menu Component
const SettingsMenu = memo(function SettingsMenu({
  isOpen,
  onClose,
  settingsRef
}: {
  isOpen: boolean
  onClose: () => void
  settingsRef: React.RefObject<HTMLDivElement | null>
}) {
  const {
    viewMode,
    setViewMode,
    cardSize,
    setCardSize,
    libraryTheme,
    setLibraryTheme,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
    sortDirection,
    toggleSortDirection,
    showProgress,
    setShowProgress,
    showAuthor,
    setShowAuthor,
    showDate,
    setShowDate,
    showCollection,
    setShowCollection,
    showGenre,
    setShowGenre,
    showRating,
    setShowRating,
    resetToDefaults
  } = useLibrarySettingsStore()

  const handleReset = useCallback(() => {
    if (confirm('Ripristinare tutte le impostazioni predefinite?')) {
      resetToDefaults()
    }
  }, [resetToDefaults])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, settingsRef])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !settingsRef.current) return

    const dropdown = settingsRef.current.querySelector('.library-settings-dropdown')
    if (!dropdown) return

    const focusableElements = dropdown.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
    
    document.addEventListener('keydown', handleTabKey)
    firstElement.focus()
    
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen, settingsRef])

  const viewModes = [
    { id: 'grid' as const, icon: LayoutGrid, label: 'Griglia' },
    { id: 'compact' as const, icon: Grid3X3, label: 'Compatta' },
    { id: 'list' as const, icon: List, label: 'Lista' }
  ]

  const themes = [
    { id: 'auto' as const, icon: Monitor, label: 'Automatico' },
    { id: 'light' as const, icon: Sun, label: 'Chiaro' },
    { id: 'dark' as const, icon: Moon, label: 'Scuro' }
  ]

  const sortOptions = [
    { id: 'recent' as const, label: 'Recenti' },
    { id: 'title' as const, label: 'Titolo' },
    { id: 'author' as const, label: 'Autore' },
    { id: 'progress' as const, label: 'Progresso' },
    { id: 'added' as const, label: 'Data aggiunta' }
  ]

  const groupOptions = [
    { id: 'none' as const, label: 'Nessuno' },
    { id: 'author' as const, label: 'Autore' },
    { id: 'genre' as const, label: 'Genere' },
    { id: 'collection' as const, label: 'Collezione' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="library-settings-dropdown"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          role="dialog"
          aria-modal="false"
          aria-label="Impostazioni libreria"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="library-settings-header">
            <span className="library-settings-title">Impostazioni</span>
            <div className="library-settings-header-actions">
              <button 
                className="library-settings-reset-btn"
                onClick={handleReset}
                title="Ripristina predefiniti"
                aria-label="Ripristina impostazioni predefinite"
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="library-settings-close-btn"
                onClick={onClose}
                title="Chiudi impostazioni"
                aria-label="Chiudi impostazioni"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* View Mode */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="view-mode-label">Modalità vista</label>
            <div 
              className="library-settings-segmented" 
              role="radiogroup" 
              aria-labelledby="view-mode-label"
            >
              {viewModes.map(({ id, icon: Icon, label }) => (
                <button 
                  key={id}
                  className={`library-settings-chip ${viewMode === id ? 'active' : ''}`}
                  onClick={() => setViewMode(id)}
                  title={label}
                  role="radio"
                  aria-checked={viewMode === id}
                  aria-label={`Vista ${label}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="library-settings-chip-text">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Size */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="card-size-label">
              Dimensione card
              <span className="library-settings-size-value">{cardSize}px</span>
            </label>
            <div className="library-settings-size-control">
              <span className="library-settings-size-label">Piccolo</span>
              <input 
                type="range"
                min="120"
                max="280"
                step="10"
                value={cardSize}
                onChange={(e) => setCardSize(parseInt(e.target.value, 10))}
                className="library-settings-size-slider"
                aria-labelledby="card-size-label"
                aria-valuemin={120}
                aria-valuemax={280}
                aria-valuenow={cardSize}
              />
              <span className="library-settings-size-label">Grande</span>
            </div>
          </div>

          {/* Theme */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="theme-label">Tema libreria</label>
            <div 
              className="library-settings-segmented" 
              role="radiogroup" 
              aria-labelledby="theme-label"
            >
              {themes.map(({ id, icon: Icon, label }) => (
                <button 
                  key={id}
                  className={`library-settings-chip ${libraryTheme === id ? 'active' : ''}`}
                  onClick={() => setLibraryTheme(id)}
                  title={label}
                  role="radio"
                  aria-checked={libraryTheme === id}
                  aria-label={`Tema ${label}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="library-settings-chip-text">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="library-settings-divider" />

          {/* Sort */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="sort-label">Ordina per</label>
            <div className="library-settings-sort-control">
              <div className="library-settings-select-wrapper">
                <select 
                  className="library-settings-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-labelledby="sort-label"
                >
                  {sortOptions.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="library-settings-select-icon" aria-hidden="true" />
              </div>
              <button 
                className={`library-settings-sort-direction ${sortDirection}`}
                onClick={toggleSortDirection}
                title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
                aria-label={`Ordine ${sortDirection === 'asc' ? 'crescente' : 'decrescente'}`}
              >
                <ArrowUpDown size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Group By */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="group-label">Raggruppa per</label>
            <div className="library-settings-select-wrapper">
              <select 
                className="library-settings-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                aria-labelledby="group-label"
              >
                {groupOptions.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="library-settings-select-icon" aria-hidden="true" />
            </div>
          </div>

          {/* Divider */}
          <div className="library-settings-divider" />

          {/* Display Options */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="display-label">Mostra elementi</label>
            <div className="library-settings-display-options" role="group" aria-labelledby="display-label">
              {[
                { id: 'progress', label: 'Progresso', checked: showProgress, onChange: setShowProgress },
                { id: 'author', label: 'Autore', checked: showAuthor, onChange: setShowAuthor },
                { id: 'collection', label: 'Collezione', checked: showCollection, onChange: setShowCollection },
                { id: 'date', label: 'Data aggiunta', checked: showDate, onChange: setShowDate },
                { id: 'genre', label: 'Genere', checked: showGenre, onChange: setShowGenre },
                { id: 'rating', label: 'Valutazione', checked: showRating, onChange: setShowRating }
              ].map((opt) => (
                <label key={opt.id} className={`library-settings-display-option ${opt.checked ? 'active' : ''}`}>
                  <input 
                    type="checkbox"
                    checked={opt.checked}
                    onChange={(e) => opt.onChange(e.target.checked)}
                    aria-label={`Mostra ${opt.label.toLowerCase()}`}
                  />
                  <span className="library-settings-check-icon" aria-hidden="true">
                    {opt.checked && <Check size={12} />}
                  </span>
                  <span className="library-settings-option-label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

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
  isLoading = false
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
    setLastSearch
  } = useLibrarySettingsStore()
  
  // Library theme is now handled centrally by App.tsx and useLibrarySettingsStore
  // The data-library-theme attribute is applied to documentElement for global CSS cascading
  
  // Search state with debounce
  const [searchValue, setSearchValue] = useState('')
  const isTestEnv = process.env.NODE_ENV === 'test'
  const debouncedSearchValue = useDebounce(searchValue, isTestEnv ? 0 : 300)
  
  // Apply debounced search
  useEffect(() => {
    onSearchChange?.(debouncedSearchValue)
    setLastSearch(debouncedSearchValue)
  }, [debouncedSearchValue, onSearchChange, setLastSearch])

  // Find most recent in-progress book
  const lastReadBook = useMemo(() => {
    return library.find(b => b.progress > 0 && b.progress < 100)
  }, [library])

  // Sort and group books
  const sortedAndGroupedBooks = useMemo(() => {
    // First sort
    const sorted = [...filteredLibrary]
    
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => sortDirection === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
        )
        break
      case 'author':
        sorted.sort((a, b) => {
          const authorA = a.author || ''
          const authorB = b.author || ''
          return sortDirection === 'asc'
            ? authorA.localeCompare(authorB)
            : authorB.localeCompare(authorA)
        })
        break
      case 'progress':
        sorted.sort((a, b) => sortDirection === 'asc'
          ? a.progress - b.progress
          : b.progress - a.progress
        )
        break
      case 'added':
        sorted.sort((a, b) => sortDirection === 'asc'
          ? (a.addedAt || 0) - (b.addedAt || 0)
          : (b.addedAt || 0) - (a.addedAt || 0)
        )
        break
      case 'recent':
      default:
        sorted.sort((a, b) => sortDirection === 'asc'
          ? (a.lastOpened || 0) - (b.lastOpened || 0)
          : (b.lastOpened || 0) - (a.lastOpened || 0)
        )
        break
    }
    
    // Then group if needed
    if (groupBy === 'none') {
      return { ungrouped: sorted }
    }
    
    const grouped: Record<string, Book[]> = {}
    sorted.forEach(book => {
      let key = ''
      switch (groupBy) {
        case 'author':
          key = book.author || 'Sconosciuto'
          break
        case 'genre':
          key = book.genre || 'Senza genere'
          break
        case 'collection':
          key = book.collection || 'Nessuna collezione'
          break
        default:
          key = 'Tutti'
      }
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(book)
    })
    
    return grouped
  }, [filteredLibrary, sortBy, sortDirection, groupBy])

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

  const handleDeleteBook = useCallback((id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo libro dalla libreria?')) {
      onDeleteBook(id)
    }
  }, [onDeleteBook])

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
  const bookCardProps = useMemo(() => ({
    viewMode,
    showProgress,
    showAuthor,
    showDate,
    showCollection,
    showGenre,
    showRating,
    cardSize
  }), [viewMode, showProgress, showAuthor, showDate, showCollection, showGenre, showRating, cardSize])

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`library-view library-view--${viewMode}`}
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
      />

      {/* Main Content Area */}
      <div className={`library-main ${isSidebarCollapsed ? 'library-main--sidebar-collapsed' : ''}`}>
        <div className="library-section">
          {/* Header */}
          <div className="library-section-header">
            <div className="header-left">
              <h2>Libreria</h2>
              <div className="header-meta">
                <span className="book-count" aria-label={`${filteredLibrary.length} ${filteredLibrary.length === 1 ? 'libro' : 'libri'}`}>
                  {filteredLibrary.length} {filteredLibrary.length === 1 ? 'libro' : 'libri'}
                </span>
                {lastReadBook && (
                  <button 
                    className="resume-pill resume-pill--compact"
                    onClick={() => onLoadBook(null, lastReadBook.cfi, lastReadBook.id)}
                    aria-label={`Continua: ${lastReadBook.title} (${lastReadBook.progress || 0}%)`}
                    title={`Continua: ${lastReadBook.title}`}
                  >
                    <BookOpen size={12} aria-hidden="true" />
                    <span className="resume-pill__title">{lastReadBook.title}</span>
                    <span className="resume-pill__progress">{lastReadBook.progress || 0}%</span>
                  </button>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="library-controls">
              {/* Search */}
              <div className="search-wrapper">
                <Search size={20} className="search-icon" aria-hidden="true" />
                <input 
                  type="text" 
                  placeholder="Cerca libri..." 
                  className="library-search-input"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  aria-label="Cerca nella libreria"
                />
              </div>

              {/* Settings Button */}
              <div className="settings-wrapper" ref={settingsRef}>
                <button 
                  ref={settingsButtonRef}
                  className={`icon-button settings-toggle ${showSettings ? 'active' : ''}`}
                  onClick={toggleSettings}
                  aria-label="Apri impostazioni libreria"
                  aria-expanded={showSettings}
                  aria-haspopup="dialog"
                >
                  <Settings size={20} aria-hidden="true" />
                </button>
                
                <SettingsMenu
                  isOpen={showSettings}
                  onClose={handleCloseSettings}
                  settingsRef={settingsRef}
                />
              </div>

              {/* Actions */}
              <div className="library-actions">
                {onRegenerateCovers && library.some(b => !b.cover) && (
                  <button 
                    onClick={onRegenerateCovers} 
                    className="icon-button" 
                    title="Ripara Copertine"
                    aria-label="Ripara copertine mancanti"
                  >
                    <ImageIcon size={20} aria-hidden="true" />
                  </button>
                )}
                <label htmlFor="lib-upload" className="primary-button-small prominent-action">
                  <Plus size={20} aria-hidden="true" />
                  <span>Aggiungi Libro</span>
                </label>
              </div>
            </div>

            <input
              type="file"
              id="lib-upload"
              accept=".epub"
              hidden
              onChange={handleFileInputChange}
              aria-label="Carica file EPUB"
            />
          </div>

          {/* Content */}
          {isLoading ? (
            <div 
              className={`book-grid book-grid--${viewMode}`}
              style={gridStyle}
            >
              {[...Array(8)].map((_, i) => (
                <BookCardSkeleton key={i} viewMode={viewMode} cardSize={cardSize} />
              ))}
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="empty-state">
              <div className={`dropzone ${isDragOver ? 'active' : ''}`}>
                <Upload size={48} strokeWidth={1} color="var(--accent)" aria-hidden="true" />
                <p>
                  {library.length === 0
                    ? 'Trascina qui il tuo primo libro per iniziare'
                    : 'Nessun libro in questa collezione'}
                </p>
              </div>
              {library.length === 0 && (
                <label htmlFor="lib-upload-empty" className="primary-button" style={{ marginTop: '2rem' }}>
                  <Plus size={20} style={{ marginRight: '8px' }} aria-hidden="true" /> 
                  Aggiungi Libro
                </label>
              )}
            </div>
          ) : groupBy === 'none' ? (
            // Ungrouped view
            <div 
              className={`book-grid book-grid--${viewMode}`}
              style={gridStyle}
              role="list"
              aria-label={`Elenco di ${filteredLibrary.length} libri`}
            >
              {sortedAndGroupedBooks.ungrouped?.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => handleLoadBook(book.id, book.cfi)}
                  onDelete={() => handleDeleteBook(book.id)}
                  onRate={(rating) => handleRate(book.id, rating)}
                  {...bookCardProps}
                />
              ))}
            </div>
          ) : (
            // Grouped view
            <div className="book-groups" role="list" aria-label="Libri raggruppati">
              {Object.entries(sortedAndGroupedBooks).map(([groupName, books]) => (
                <div key={groupName} className="book-group">
                  <h3 className="book-group-title">{groupName}</h3>
                  <div 
                    className={`book-grid book-grid--${viewMode}`}
                    style={gridStyle}
                    role="list"
                    aria-label={`Libri nel gruppo ${groupName}`}
                  >
                    {books.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onClick={() => handleLoadBook(book.id, book.cfi)}
                        onDelete={() => handleDeleteBook(book.id)}
                        onRate={(rating) => handleRate(book.id, rating)}
                        {...bookCardProps}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})


export default LibraryView
