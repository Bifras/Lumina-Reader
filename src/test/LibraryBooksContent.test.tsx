import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Book } from '../types'
import LibraryBooksContent, { type LibraryBookCardDisplayOptions } from '../components/LibraryBooksContent'

vi.mock('../components/BookCard', () => ({
  default: ({ book, onClick, onDelete, onRate }: { book: Book; onClick: () => void; onDelete: () => void; onRate?: (rating: number) => void }) => (
    <div data-testid={`book-card-${book.id}`}>
      <span>{book.title}</span>
      <button onClick={onClick}>Read</button>
      <button onClick={onDelete}>Delete</button>
      <button onClick={() => onRate?.(4)}>Rate</button>
    </div>
  ),
}))

vi.mock('../components/BookCardSkeleton', () => ({
  default: () => <div data-testid="book-card-skeleton" />,
}))

function makeBook(overrides: Partial<Book>): Book {
  return {
    id: overrides.id || 'id',
    title: overrides.title || 'Title',
    author: overrides.author,
    progress: overrides.progress ?? 0,
    addedAt: overrides.addedAt ?? Date.now(),
    cfi: overrides.cfi,
    cover: overrides.cover,
    genre: overrides.genre,
    collection: overrides.collection,
  }
}

describe('LibraryBooksContent', () => {
  const onLoadBook = vi.fn()
  const onDeleteBook = vi.fn()
  const onRate = vi.fn()

  const displayOptions: LibraryBookCardDisplayOptions = {
    viewMode: 'grid',
    showProgress: true,
    showAuthor: true,
    showDate: false,
    showCollection: true,
    showGenre: true,
    showRating: true,
    cardSize: 180,
  }

  const books: Book[] = [
    makeBook({ id: '1', title: 'Book One', cfi: 'epubcfi(/6/2)' }),
    makeBook({ id: '2', title: 'Book Two', cfi: 'epubcfi(/6/4)' }),
  ]

  it('renders skeletons while loading', () => {
    render(
      <LibraryBooksContent
        isLoading={true}
        libraryCount={2}
        filteredLibrary={books}
        isDragOver={false}
        viewMode="grid"
        groupBy="none"
        gridStyle={{}}
        sortedAndGroupedBooks={{ ungrouped: books }}
        bookCardDisplayOptions={displayOptions}
        onLoadBook={onLoadBook}
        onDeleteBook={onDeleteBook}
        onRate={onRate}
      />,
    )

    expect(screen.getAllByTestId('book-card-skeleton')).toHaveLength(8)
  })

  it('renders empty state for empty library', () => {
    render(
      <LibraryBooksContent
        isLoading={false}
        libraryCount={0}
        filteredLibrary={[]}
        isDragOver={false}
        viewMode="grid"
        groupBy="none"
        gridStyle={{}}
        sortedAndGroupedBooks={{ ungrouped: [] }}
        bookCardDisplayOptions={displayOptions}
        onLoadBook={onLoadBook}
        onDeleteBook={onDeleteBook}
        onRate={onRate}
      />,
    )

    expect(screen.getByText(/Trascina qui il tuo primo libro/i)).toBeInTheDocument()
    expect(screen.getByText('Aggiungi Libro')).toBeInTheDocument()
  })

  it('renders collection empty message when library has books but filtered is empty', () => {
    render(
      <LibraryBooksContent
        isLoading={false}
        libraryCount={2}
        filteredLibrary={[]}
        isDragOver={false}
        viewMode="grid"
        groupBy="none"
        gridStyle={{}}
        sortedAndGroupedBooks={{ ungrouped: [] }}
        bookCardDisplayOptions={displayOptions}
        onLoadBook={onLoadBook}
        onDeleteBook={onDeleteBook}
        onRate={onRate}
      />,
    )

    expect(screen.getByText(/Nessun libro in questa collezione/i)).toBeInTheDocument()
  })

  it('renders ungrouped books and triggers callbacks', () => {
    render(
      <LibraryBooksContent
        isLoading={false}
        libraryCount={2}
        filteredLibrary={books}
        isDragOver={false}
        viewMode="grid"
        groupBy="none"
        gridStyle={{}}
        sortedAndGroupedBooks={{ ungrouped: books }}
        bookCardDisplayOptions={displayOptions}
        onLoadBook={onLoadBook}
        onDeleteBook={onDeleteBook}
        onRate={onRate}
      />,
    )

    expect(screen.getByTestId('book-card-1')).toBeInTheDocument()

    fireEvent.click(screen.getAllByText('Read')[0])
    fireEvent.click(screen.getAllByText('Delete')[0])
    fireEvent.click(screen.getAllByText('Rate')[0])

    expect(onLoadBook).toHaveBeenCalledWith('1', 'epubcfi(/6/2)')
    expect(onDeleteBook).toHaveBeenCalledWith('1')
    expect(onRate).toHaveBeenCalledWith('1', 4)
  })

  it('renders grouped books view', () => {
    const grouped = {
      Fantasy: [books[0]],
      Classici: [books[1]],
    }

    render(
      <LibraryBooksContent
        isLoading={false}
        libraryCount={2}
        filteredLibrary={books}
        isDragOver={false}
        viewMode="grid"
        groupBy="genre"
        gridStyle={{}}
        sortedAndGroupedBooks={grouped}
        bookCardDisplayOptions={displayOptions}
        onLoadBook={onLoadBook}
        onDeleteBook={onDeleteBook}
        onRate={onRate}
      />,
    )

    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(screen.getByText('Classici')).toBeInTheDocument()
  })
})
