import { memo, type CSSProperties } from 'react'
import { Plus, Upload } from 'lucide-react'
import type { GroupByOption, ViewMode } from '../store/useLibrarySettingsStore'
import type { Book } from '../types'
import BookCard from './BookCard'
import BookCardSkeleton from './BookCardSkeleton'

export interface LibraryBookCardDisplayOptions {
  viewMode: ViewMode
  showProgress: boolean
  showAuthor: boolean
  showDate: boolean
  showCollection: boolean
  showGenre: boolean
  showRating: boolean
  cardSize: number
}

interface LibraryBooksContentProps {
  isLoading: boolean
  libraryCount: number
  filteredLibrary: Book[]
  isDragOver: boolean
  viewMode: ViewMode
  groupBy: GroupByOption
  gridStyle: CSSProperties
  sortedAndGroupedBooks: Record<string, Book[]>
  bookCardDisplayOptions: LibraryBookCardDisplayOptions
  onLoadBook: (id: string, cfi?: string) => void
  onDeleteBook: (id: string) => void
  onEditBook: (book: Book) => void
  onRate: (bookId: string, rating: number) => void
}

const LibraryBooksContent = memo(function LibraryBooksContent({
  isLoading,
  libraryCount,
  filteredLibrary,
  isDragOver,
  viewMode,
  groupBy,
  gridStyle,
  sortedAndGroupedBooks,
  bookCardDisplayOptions,
  onLoadBook,
  onDeleteBook,
  onEditBook,
  onRate,
}: LibraryBooksContentProps) {
  if (isLoading) {
    return (
      <div
        className={`book-grid book-grid--${viewMode}`}
        style={gridStyle}
      >
        {[...Array(8)].map((_, i) => (
          <BookCardSkeleton key={i} viewMode={viewMode} cardSize={bookCardDisplayOptions.cardSize} />
        ))}
      </div>
    )
  }

  if (filteredLibrary.length === 0) {
    return (
      <div className="empty-state">
        <div className={`dropzone ${isDragOver ? 'active' : ''}`}>
          <Upload size={48} strokeWidth={1} color="var(--accent)" aria-hidden="true" />
          <p>
            {libraryCount === 0
              ? 'Trascina qui il tuo primo libro per iniziare'
              : 'Nessun libro in questa collezione'}
          </p>
        </div>
        {libraryCount === 0 && (
          <label htmlFor="lib-upload" className="primary-button-small prominent-action empty-state__action">
            <Plus size={20} aria-hidden="true" />
            <span>Aggiungi Libro</span>
          </label>
        )}
      </div>
    )
  }

  if (groupBy === 'none') {
    return (
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
            onClick={() => onLoadBook(book.id, book.cfi)}
            onDelete={() => onDeleteBook(book.id)}
            onEdit={() => onEditBook(book)}
            onRate={(rating) => onRate(book.id, rating)}
            {...bookCardDisplayOptions}
          />
        ))}
      </div>
    )
  }

  return (
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
                onClick={() => onLoadBook(book.id, book.cfi)}
                onDelete={() => onDeleteBook(book.id)}
                onEdit={() => onEditBook(book)}
                onRate={(rating) => onRate(book.id, rating)}
                {...bookCardDisplayOptions}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

export default LibraryBooksContent

