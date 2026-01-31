// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Upload, Plus, BookOpen } from 'lucide-react'
import BookCard from '../components/BookCard'
import CollectionSidebar from '../components/CollectionSidebar'
import { useCollectionStore } from '../store'

const LibraryView = ({
  library,
  filteredLibrary,
  isDragOver,
  setIsDragOver,
  onFileUpload,
  onLoadBook,
  onDeleteBook,
  onClearLibrary,
  showCollectionSidebar,
  setShowCollectionSidebar
}) => {
  // Track active collection for UI state
  useCollectionStore(state => state.activeCollectionId)

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="library-view"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        onFileUpload(e.dataTransfer.files[0])
      }}
    >
      {/* Hero Section */}
      {library.length > 0 && (
        <div className="library-hero">
          {library[0].cover && (
            <div className="hero-ambient-bg">
              <div
                className="hero-ambient-img"
                style={{ backgroundImage: `url(${library[0].cover})` }}
              />
              <div className="hero-ambient-overlay" />
            </div>
          )}
          <div className="hero-content">
            <div
              className="hero-book-preview"
              onClick={() => onLoadBook(null, library[0].cfi, library[0].id)}
            >
              {library[0].cover ? (
                <img src={library[0].cover} alt={library[0].title} />
              ) : (
                <div className="no-cover">
                  <BookOpen size={60} opacity={0.3} />
                </div>
              )}
            </div>
            <div className="hero-details">
              <div className="hero-label">Stai leggendo</div>
              <h1 className="hero-title">{library[0].title}</h1>
              <p className="hero-author">{library[0].author}</p>
              <button
                className="primary-button"
                onClick={() => onLoadBook(null, library[0].cfi, library[0].id)}
              >
                <BookOpen size={18} /> Continua a leggere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Sidebar Toggle */}
      <button
        onClick={() => setShowCollectionSidebar(true)}
        className="collection-toggle-btn"
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
        ☰ Collezioni
      </button>

      {/* Collection Sidebar */}
      <CollectionSidebar
        isOpen={showCollectionSidebar}
        onClose={() => setShowCollectionSidebar(false)}
      />

      {/* Main Library Section */}
      <div
        className="library-section"
        style={{ marginLeft: showCollectionSidebar ? '260px' : '0' }}
      >
        <div className="library-section-header">
          <h2>La tua Libreria</h2>
          <div className="library-actions">
            {library.length > 0 && (
              <button onClick={onClearLibrary} className="reset-btn">
                Reset
              </button>
            )}
            <label htmlFor="lib-upload" className="primary-button">
              <Plus size={20} style={{ marginRight: '8px' }} /> Aggiungi Libro
            </label>
          </div>
          <input
            type="file"
            id="lib-upload"
            accept=".epub"
            hidden
            onChange={(e) => onFileUpload(e.target.files[0])}
          />
        </div>

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
    </motion.div>
  )
}

export default LibraryView
