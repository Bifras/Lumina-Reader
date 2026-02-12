import { memo, useCallback, MouseEventHandler, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { BookOpen, Trash2, Clock } from 'lucide-react'
import type { Book } from '../types'

interface BookCardProps {
  book: Book
  onLoadBook: (file: null, cfi?: string, id?: string) => void
  onDeleteBook: (id: string) => void
}

const BookCard = memo(function BookCard({ book, onLoadBook, onDeleteBook }: BookCardProps) {
  const [coverError, setCoverError] = useState(false)

  const handleClick = useCallback(() => {
    onLoadBook(null, book.cfi, book.id)
  }, [onLoadBook, book.cfi, book.id])

  const handleDelete: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation()
    onDeleteBook(book.id)
  }, [onDeleteBook, book.id])

  const handleCoverError = useCallback(() => {
    setCoverError(true)
  }, [])

  return (
    <motion.div
      className="book-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      onClick={handleClick}
    >
      <div className="book-cover-wrapper">
        {book.cover && !coverError ? (
          <img src={book.cover} alt={book.title} onError={handleCoverError} />
        ) : (
          <div className="no-cover">
            <BookOpen size={40} opacity={0.3} />
          </div>
        )}
        <button
          className="delete-btn"
          onClick={handleDelete}
          aria-label="Elimina libro"
        >
          <Trash2 size={16} />
        </button>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${book.progress || 0}%` }}
          />
        </div>
      </div>
      <div className="book-meta">
        <h4>{book.title}</h4>
        <p>{book.author}</p>
        <div className="progress-label">
          <Clock size={12} />
          {book.progress || 0}% letto
        </div>
      </div>
    </motion.div>
  )
})

export default BookCard
