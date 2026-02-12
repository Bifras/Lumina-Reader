import { memo, useMemo, useCallback, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { Upload, Plus, BookOpen, ImageIcon } from 'lucide-react'
import BookCard from '../components/BookCard'
import CollectionSidebar from '../components/CollectionSidebar'
import { useCollectionStore } from '../store/useCollectionStore'
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
  onRegenerateCovers?: () => void
}

const LibraryView = memo(function LibraryView({
  library,
  filteredLibrary,
  isDragOver,
  setIsDragOver,
  onFileUpload,
  onLoadBook,
  onDeleteBook,
  onClearLibrary,
  onRegenerateCovers
}: LibraryViewProps) {
  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  // Hero cover error state
  const [heroCoverError, setHeroCoverError] = useState(false)
  
  // Optimized store selector
  useCollectionStore(
    useShallow(state => ({ activeCollectionId: state.activeCollectionId }))
  )

  // Memoized: Find currently reading book for hero section
  const heroBook = useMemo((): Book | null => {
    if (library.length === 0) return null
    const reading = library.find(b => b.progress > 0 && b.progress < 100)
    return reading || library.reduce((latest, b) => 
      b.addedAt > latest.addedAt ? b : latest, library[0])
  }, [library])

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

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="library-view"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Fixed Collection Sidebar */}
      <CollectionSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        library={library}
      />

      {/* Main Content Area - shifts based on sidebar state */}
      <div className={`library-main ${isSidebarCollapsed ? 'library-main--sidebar-collapsed' : ''}`}>
        {/* Hero Section */}
        {heroBook && (
          <div key={heroBook.id} className="library-hero">
            {heroBook.cover && !heroCoverError && (
              <div className="hero-ambient-bg">
                <div
                  className="hero-ambient-img"
                  style={{ backgroundImage: `url(${heroBook.cover})` }}
                  onError={() => setHeroCoverError(true)}
                />
                <div className="hero-ambient-overlay" />
              </div>
            )}
            <div className="hero-content">
              <div
                className="hero-book-preview"
                onClick={() => onLoadBook(null, heroBook.cfi, heroBook.id)}
              >
                {heroBook.cover && !heroCoverError ? (
                  <img 
                    src={heroBook.cover} 
                    alt={heroBook.title} 
                    onError={() => setHeroCoverError(true)}
                  />
                ) : (
                  <div className="no-cover">
                    <BookOpen size={60} opacity={0.3} />
                  </div>
                )}
              </div>
              <div className="hero-details">
                <div className="hero-label">
                  {heroBook.progress > 0 && heroBook.progress < 100 
                    ? 'Stai leggendo' 
                    : 'Aggiunto di recente'}
                </div>
                <h1 className="hero-title">{heroBook.title}</h1>
                <p className="hero-author">{heroBook.author}</p>
                <button
                  className="primary-button"
                  onClick={() => onLoadBook(null, heroBook.cfi, heroBook.id)}
                >
                  <BookOpen size={18} /> 
                  {heroBook.progress > 0 ? 'Continua a leggere' : 'Inizia a leggere'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Library Section */}
        <div className="library-section">
          <div className="library-section-header">
            <h2>La tua Libreria</h2>
            <div className="library-actions">
              {library.length > 0 && (
                <button onClick={onClearLibrary} className="reset-btn">
                  Reset
                </button>
              )}
              {onRegenerateCovers && library.some(b => !b.cover) && (
                <button onClick={onRegenerateCovers} className="secondary-button" title="Rigenera copertine mancanti">
                  <ImageIcon size={18} /> Ripara Copertine
                </button>
              )}
              {library.length > 0 && (
                <label htmlFor="lib-upload" className="primary-button">
                  <Plus size={18} /> Aggiungi Libro
                </label>
              )}
            </div>
          </div>

          <input
            type="file"
            id="lib-upload"
            accept=".epub"
            hidden
            onChange={handleFileInputChange}
          />

          {filteredLibrary.length === 0 ? (
            <div className="empty-state">
              <div className={`dropzone ${isDragOver ? 'active' : ''}`}>
                <Upload size={48} strokeWidth={1} color="var(--accent)" />
                <p>
                  {library.length === 0
                    ? 'Trascina qui il tuo primo libro per iniziare'
                    : 'Nessun libro in questa collezione'}
                </p>
              </div>
              {library.length === 0 && (
                <label htmlFor="lib-upload" className="primary-button" style={{ marginTop: '2rem' }}>
                  <Plus size={18} /> Aggiungi Libro
                </label>
              )}
            </div>
          ) : (
            <div className="book-grid">
              {filteredLibrary.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => onLoadBook(null, book.cfi, book.id)}
                  onDelete={() => onDeleteBook(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default LibraryView
