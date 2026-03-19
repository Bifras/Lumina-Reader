import { memo, MouseEventHandler, useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Edit2, User, Folder, Calendar, Tag } from 'lucide-react'
import StarRating from './StarRating'
import type { Book } from '../types'

interface BookCardProps {
  book: Book
  onClick: () => void
  onDelete: () => void
  onEdit?: () => void
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

type CoverPresentation = 'fill' | 'fit'

const FIT_RATIO_MIN = 0.58
const FIT_RATIO_MAX = 0.82

const BookCard = memo(function BookCard({ 
  book, 
  onClick, 
  onDelete,
  onEdit,
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
  const [coverPresentation, setCoverPresentation] = useState<CoverPresentation>('fill')

  useEffect(() => {
    setCoverError(false)
    setCoverPresentation('fill')
  }, [book.cover])

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    onDelete()
  }

  const handleCoverError = useCallback(() => {
    setCoverError(true)
    setCoverPresentation('fill')
  }, [])

  const handleCoverLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget

    if (!naturalWidth || !naturalHeight) {
      return
    }

    const ratio = naturalWidth / naturalHeight
    const shouldFit = ratio < FIT_RATIO_MIN || ratio > FIT_RATIO_MAX
    setCoverPresentation(shouldFit ? 'fit' : 'fill')
  }, [])

  const handleEdit: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    if (onEdit) onEdit()
  }

  const handleRate = useCallback((rating: number) => {
    onRate?.(rating)
  }, [onRate])

  const handleRateClick: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation()
  }

  const formattedDate = useMemo(() => {
    if (!book.addedAt) return ''
    const date = new Date(book.addedAt)
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }, [book.addedAt])

  const primaryCollection = useMemo(() => {
    return typeof book.collection === 'string' ? book.collection.trim() : ''
  }, [book.collection])

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

  const noCoverClassName = useMemo(() => {
    // Generate a consistent color index (0-7) based on title hash
    let hash = 0
    for (let i = 0; i < book.title.length; i++) {
      hash = book.title.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colorIndex = Math.abs(hash) % 8
    
    // Choose texture based on author name length or other stable property
    const textureClass = (book.author?.length || 0) % 2 === 0 ? 'no-cover--texture-linen' : 'no-cover--texture-paper'
    
    const baseClasses = ['no-cover', `no-cover--color-${colorIndex}`, textureClass]

    if (viewMode === 'list') baseClasses.push('no-cover--list')
    else if (viewMode === 'compact') baseClasses.push('no-cover--compact')
    else baseClasses.push('no-cover--grid')

    return baseClasses.join(' ')
  }, [book.title, book.author, viewMode])

  const coverMediaClassName = useMemo(() => {
    const classes = ['book-cover-media']

    if (viewMode === 'list') {
      classes.push('book-cover-media--small')
    } else if (viewMode === 'compact') {
      classes.push('book-cover-media--compact')
    }

    if (coverPresentation === 'fit') {
      classes.push('book-cover-media--fit')
    }

    return classes.join(' ')
  }, [coverPresentation, viewMode])

  const renderNoCover = useCallback(() => (
    <div className={noCoverClassName} aria-hidden="true">
      <div className="no-cover__content">
        <div className="no-cover__text">
          <span className="no-cover__title" title={book.title}>{book.title}</span>
          {book.author && (
            <span className="no-cover__author" title={book.author}>
              {book.author}
            </span>
          )}
        </div>
      </div>
    </div>
  ), [book.author, book.title, noCoverClassName])

  const renderCoverArt = useCallback(() => {
    const hasCover = book.cover && book.cover.trim() !== '' && book.cover !== 'null';
    if (!hasCover || coverError) {
      return renderNoCover()
    }

    return (
      <div className={coverMediaClassName}>
        <img
          src={book.cover}
          alt={book.title}
          onError={handleCoverError}
          onLoad={handleCoverLoad}
          loading="lazy"
        />
      </div>
    )
  }, [book.cover, book.title, coverError, coverMediaClassName, handleCoverError, handleCoverLoad, renderNoCover])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }, [onClick])

  if (viewMode === 'list') {
    return (
      <motion.div
        className="book-card book-card--list"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ backgroundColor: 'var(--surface-hover)' }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={cardStyle}
        role="listitem"
        tabIndex={0}
      >
        <div
          className="book-cover-wrapper book-cover-wrapper--small"
          style={{
            height: coverHeight,
            width: 80,
            ...(book.cover && !coverError ? { '--cover-bg': `url("${book.cover}")` } : {}) as React.CSSProperties
          }}
        >
          {renderCoverArt()}
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

        <div className="list-actions" style={{ display: 'flex', gap: '4px' }}>
          {onEdit && (
            <motion.button
              className="delete-btn delete-btn--list"
              onClick={handleEdit}
              aria-label={`Modifica metadati ${book.title}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 0.6 : 0 }}
              whileHover={{ opacity: 1, scale: 1.1, color: 'var(--text-main)' }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit2 size={18} />
            </motion.button>
          )}
          <motion.button
            className="delete-btn delete-btn--list"
            onClick={handleDelete}
            aria-label={`Elimina ${book.title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.6 : 0 }}
            whileHover={{ opacity: 1, scale: 1.1, color: '#ef4444' }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`book-card ${viewMode === 'compact' ? 'book-card--compact' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cardStyle}
      role="listitem"
      tabIndex={0}
      aria-label={`${book.title}${book.author ? ` di ${book.author}` : ''}`}
    >
      <div
        className="book-cover-wrapper"
        style={{
          height: coverHeight,
          ...(book.cover && !coverError ? { '--cover-bg': `url("${book.cover}")` } : {}) as React.CSSProperties
        }}
      >
        {renderCoverArt()}

        <div className="card-actions-hitbox" style={{ position: 'absolute', top: 0, right: 0, padding: '8px', display: 'flex', gap: '4px', zIndex: 25 }} onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <motion.button
              className="edit-btn"
              onClick={handleEdit}
              aria-label={`Modifica ${book.title}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              whileHover={{ scale: 1.1, backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', borderColor: 'var(--border-subtle)' }}
              whileTap={{ scale: 0.9 }}
              style={{ 
                width: '32px', 
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'color-mix(in srgb, var(--text-main) 60%, transparent)',
                color: 'var(--bg-ivory)',
                border: '1px solid color-mix(in srgb, var(--bg-ivory) 30%, transparent)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                cursor: 'pointer'
              } as any}
            >
              <Edit2 size={14} />
            </motion.button>
          )}
          <motion.button
            className="delete-btn"
            onClick={handleDelete}
            aria-label={`Elimina ${book.title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-warm)' }}
            whileTap={{ scale: 0.9 }}
            style={{ width: '32px', height: '32px' }}
          >
            <Trash2 size={14} />
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
            {showDate && formattedDate && (
              <span className="date">{formattedDate}</span>
            )}
          </div>
        ) : null}

        {((showGenre && book.genre) || (showCollection && primaryCollection) || (book as any).tags?.length > 0) && (
          <div className="book-meta-row tags-row">
            {showGenre && book.genre && (
              <span className="meta-tag genre-tag" title={book.genre}>{book.genre}</span>
            )}
            {showCollection && primaryCollection && (
              <span className="meta-tag collection-tag" title={primaryCollection}>{primaryCollection}</span>
            )}
            {(book as any).tags?.map((tag: any) => (
              <span key={tag.id} className="meta-tag custom-tag" title={tag.name}>
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {((showProgress && book.progress > 0) ||
          (showRating && onRate) ||
          (showRating && !onRate && book.rating !== undefined && book.rating > 0)) && (
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
        )}
      </div>
    </motion.div>
  )
})

export default BookCard

