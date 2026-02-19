import { memo, MouseEventHandler, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Trash2, Clock, User, Folder, Calendar, Tag } from 'lucide-react'
import StarRating from './StarRating'
import type { Book } from '../types'

interface BookCardProps {
  book: Book
  onClick: () => void
  onDelete: () => void
  onRate?: (rating: number) => void
  viewMode?: 'grid' | 'list' | 'compact'
  showProgress?: boolean
  showAuthor?: boolean
  showDate?: boolean
  showCollection?: boolean
  showGenre?: boolean
  showRating?: boolean
  interactiveRating?: boolean
  cardSize?: number
}

const BookCard = memo(function BookCard({ 
  book, 
  onClick, 
  onDelete,
  onRate,
  viewMode = 'grid',
  showProgress = true,
  showAuthor = true,
  showDate = false,
  showCollection = true,
  showGenre = true,
  showRating = true,
  interactiveRating = true,
  cardSize = 180
}: BookCardProps) {
  const [coverError, setCoverError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    onDelete()
  }

  const handleCoverError = () => {
    setCoverError(true)
  }

  const handleRate = useCallback((rating: number) => {
    onRate?.(rating)
  }, [onRate])

  const handleRateClick: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation()
  }

  // Format date
  const formattedDate = useMemo(() => {
    if (!book.addedAt) return ''
    const date = new Date(book.addedAt)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }, [book.addedAt])

  // Get primary collection
  const primaryCollection = useMemo(() => {
    return book.collection || (book.collectionIds && book.collectionIds[0])
  }, [book.collection, book.collectionIds])

  // Dynamic styles based on view mode and size
  const cardStyle = useMemo(() => {
    if (viewMode === 'list') {
      return {
        display: 'grid' as const,
        gridTemplateColumns: '80px 1fr auto',
        gap: 'var(--space-md)',
        alignItems: 'center'
      }
    }
    
    return {
      width: viewMode === 'compact' ? 'auto' : `${cardSize}px`,
      maxWidth: '100%'
    }
  }, [viewMode, cardSize])

  const coverHeight = viewMode === 'compact' ? 160 : viewMode === 'list' ? 100 : Math.round(cardSize * 1.5)

  if (viewMode === 'list') {
    return (
      <motion.div
        className="book-card book-card--list"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ backgroundColor: 'var(--surface-hover)' }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={cardStyle}
        role="listitem"
      >
        <div 
          className="book-cover-wrapper book-cover-wrapper--small"
          style={{ height: coverHeight, width: 80 }}
        >
          {book.cover && !coverError ? (
            <img 
              src={book.cover} 
              alt={book.title}
              onError={handleCoverError}
              loading="lazy"
            />
          ) : (
            <div className="no-cover">
              <BookOpen size={24} aria-hidden="true" />
            </div>
          )}
          {showProgress && book.progress > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${book.progress}%` }}
                aria-label={`${book.progress}% completato`}
              />
            </div>
          )}
        </div>

        <div className="book-meta book-meta--list">
          <h4>{book.title}</h4>
          <div className="book-meta-row">
            {showAuthor && book.author && (
              <span className="meta-item">
                <User size={12} aria-hidden="true" />
                <span>{book.author}</span>
              </span>
            )}
            {showCollection && primaryCollection && (
              <span className="meta-item">
                <Folder size={12} aria-hidden="true" />
                <span>{primaryCollection}</span>
              </span>
            )}
            {showDate && (
              <span className="meta-item">
                <Calendar size={12} aria-hidden="true" />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>          
          <div className="book-meta-row book-meta-row--secondary">
            {showProgress && book.progress > 0 && (
              <span className="progress-text">{book.progress}% letto</span>
            )}
            {showGenre && book.genre && (
              <span className="genre-label">
                <Tag size={12} aria-hidden="true" />
                <span>{book.genre}</span>
              </span>
            )}
            {showRating && onRate && (
              <div 
                className="book-card__rating-wrapper"
                onClick={handleRateClick}
              >
                <StarRating 
                  rating={book.rating || 0} 
                  size={16}
                  interactive={interactiveRating}
                  onRate={handleRate}
                />
              </div>
            )}
            {showRating && !onRate && book.rating !== undefined && book.rating > 0 && (
              <span className="rating-label">{book.rating}/5</span>
            )}
          </div>
        </div>

        <motion.button
          className="delete-btn delete-btn--list"
          onClick={handleDelete}
          aria-label={`Elimina ${book.title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.6 : 0 }}
          whileHover={{ opacity: 1, scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={18} />
        </motion.button>
      </motion.div>
    )
  }

  // Grid / Compact view
  return (
    <motion.div
      className={`book-card ${viewMode === 'compact' ? 'book-card--compact' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cardStyle}
      role="listitem"
      aria-label={`${book.title}${book.author ? ` di ${book.author}` : ''}`}
    >
      <div 
        className="book-cover-wrapper"
        style={{ height: coverHeight }}
      >
        {book.cover && !coverError ? (
          <img 
            src={book.cover} 
            alt={book.title}
            onError={handleCoverError}
            loading="lazy"
          />
        ) : (
          <div className="no-cover">
            <BookOpen size={viewMode === 'compact' ? 32 : 40} aria-hidden="true" />
          </div>
        )}
        
        <div className="delete-btn-hitbox" onClick={handleDelete}>
          <motion.button
            className="delete-btn"
            aria-label={`Elimina ${book.title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-warm)' }}
            whileTap={{ scale: 0.9 }}
          >
            <Trash2 size={16} />
          </motion.button>
        </div>

        {showProgress && (
          <div className="progress-bar" aria-hidden="true">
            <div
              className="progress-fill"
              style={{ width: `${book.progress || 0}%` }}
            />
          </div>
        )}

        {book.progress === 100 && (
          <div className="completed-badge">
            <span>Completato</span>
          </div>
        )}
      </div>

      <div className="book-meta">
        <h4 title={book.title}>{book.title}</h4>
        
        {(showAuthor && book.author) || (showDate && formattedDate) ? (
          <div className="book-meta-row author-date-row">
            {showAuthor && book.author && (
              <span className="author" title={book.author}>{book.author}</span>
            )}
            {showAuthor && book.author && showDate && formattedDate && (
              <span className="separator" aria-hidden="true">•</span>
            )}
            {showDate && formattedDate && (
              <span className="date">{formattedDate}</span>
            )}
          </div>
        ) : null}
        
        <div className="book-meta-bottom">
          {showProgress && book.progress > 0 && (
            <span className="progress-text">{book.progress}% letto</span>
          )}
          
          {showRating && onRate && (
            <div 
              className="book-card__rating-wrapper"
              onClick={handleRateClick}
              aria-label="Valuta questo libro"
            >
              <StarRating 
                rating={book.rating || 0} 
                size={16}
                interactive={interactiveRating}
                onRate={handleRate}
              />
            </div>
          )}
          
          {showRating && !onRate && book.rating !== undefined && book.rating > 0 && (
            <span className="rating-label" aria-label={`Valutazione: ${book.rating} su 5 stelle`}>
              ★ {book.rating}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export default BookCard
