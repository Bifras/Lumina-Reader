// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { BookOpen, Trash2 } from 'lucide-react'

const BookCard = ({ book, onClick, onDelete }) => {
  return (
    <motion.div
      className="book-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
    >
      <div className="book-cover-wrapper">
        {book.cover ? (
          <img src={book.cover} alt={book.title} />
        ) : (
          <div className="no-cover">
            <BookOpen size={40} opacity={0.3} />
          </div>
        )}
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
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
          <span style={{ fontSize: '12px' }}>⏱</span>
          {book.progress || 0}% letto
        </div>
      </div>
    </motion.div>
  )
}

export default BookCard
