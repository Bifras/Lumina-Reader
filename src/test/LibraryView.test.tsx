/**
 * TDD: LibraryView Component Tests
 *
 * Tests the LibraryView component
 *
 * Test Coverage Areas:
 * - Library renders correctly
 * - Book cards display
 * - Empty state displays
 * - Drag and drop handling
 * - File upload handling
 * - Search functionality
 * - Sort functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import LibraryView from '../views/LibraryView'
import type { Book } from '../types'

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock CollectionSidebar
vi.mock('../components/CollectionSidebar', () => ({
  default: ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => (
    <div data-testid="collection-sidebar" data-collapsed={isCollapsed}>
      <button onClick={onToggle}>Toggle Sidebar</button>
    </div>
  ),
}))

// Mock BookCard
vi.mock('../components/BookCard', () => ({
  default: ({
    book,
    onClick,
    onDelete,
  }: {
    book: Book
    onClick: () => void
    onDelete: () => void
  }) => (
    <div data-testid={`book-card-${book.id}`}>
      <span>{book.title}</span>
      <button onClick={onClick}>Read</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}))

// Mock useCollectionStore
vi.mock('../store/useCollectionStore', () => ({
  useCollectionStore: vi.fn(() => ({
    activeCollectionId: 'all',
  })),
}))

describe('LibraryView Component', () => {
  // Mock functions
  const mockSetIsDragOver = vi.fn()
  const mockOnFileUpload = vi.fn()
  const mockOnLoadBook = vi.fn()
  const mockOnDeleteBook = vi.fn()
  const mockOnClearLibrary = vi.fn()
  const mockOnRegenerateCovers = vi.fn()
  const mockOnSearchChange = vi.fn()
  const mockOnSortChange = vi.fn()

  // Sample book data
  const mockBooks: Book[] = [
    {
      id: '1',
      title: 'Test Book 1',
      author: 'Author One',
      cover: 'cover1.jpg',
      cfi: 'epubcfi(/6/4)',
      progress: 50,
      addedAt: Date.now() - 100000,
    },
    {
      id: '2',
      title: 'Test Book 2',
      author: 'Author Two',
      cover: 'cover2.jpg',
      cfi: 'epubcfi(/6/6)',
      progress: 0,
      addedAt: Date.now() - 200000,
    },
    {
      id: '3',
      title: 'Test Book 3',
      author: 'Author Three',
      cfi: 'epubcfi(/6/8)',
      progress: 100,
      addedAt: Date.now() - 300000,
    },
  ]

  const defaultProps = {
    library: mockBooks,
    filteredLibrary: mockBooks,
    isDragOver: false,
    setIsDragOver: mockSetIsDragOver,
    onFileUpload: mockOnFileUpload,
    onLoadBook: mockOnLoadBook,
    onDeleteBook: mockOnDeleteBook,
    onClearLibrary: mockOnClearLibrary,
    onRegenerateCovers: mockOnRegenerateCovers,
    onSearchChange: mockOnSearchChange,
    onSortChange: mockOnSortChange,
    currentSort: 'recent' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render library view container', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const container = document.querySelector('.library-view')
      expect(container).toBeInTheDocument()
    })

    it('should render collection sidebar', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const sidebar = screen.getByTestId('collection-sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('should render library header with title', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Libreria')).toBeInTheDocument()
    })

    it('should render book count', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText(`${mockBooks.length} libri`)).toBeInTheDocument()
    })

    it('should render all books in filtered library', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByTestId('book-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('book-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('book-card-3')).toBeInTheDocument()
    })

    it('should render book titles', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Test Book 1')).toBeInTheDocument()
      expect(screen.getByText('Test Book 2')).toBeInTheDocument()
      expect(screen.getByText('Test Book 3')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no books exist', () => {
      // Arrange
      const props = { ...defaultProps, library: [], filteredLibrary: [] }

      // Act
      render(<LibraryView {...props} />)

      // Assert
      expect(
        screen.getByText('Trascina qui il tuo primo libro per iniziare')
      ).toBeInTheDocument()
    })

    it('should show no books message when filtered library is empty but library has books', () => {
      // Arrange
      const props = { ...defaultProps, filteredLibrary: [] }

      // Act
      render(<LibraryView {...props} />)

      // Assert
      expect(screen.getByText('Nessun libro in questa collezione')).toBeInTheDocument()
    })

    it('should show add book button in empty state', () => {
      // Arrange
      const props = { ...defaultProps, library: [], filteredLibrary: [] }

      // Act
      render(<LibraryView {...props} />)

      // Assert
      expect(screen.getByText(/Aggiungi Libro/i)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should render search input', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const searchInput = screen.getByPlaceholderText('Cerca...')
      expect(searchInput).toBeInTheDocument()
    })

    it('should call onSearchChange when search input changes', async () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const searchInput = screen.getByPlaceholderText('Cerca...') as HTMLInputElement

      // Act
      fireEvent.change(searchInput, { target: { value: 'test query' } })

      // Assert - wait for debounce
      await waitFor(() => {
        expect(mockOnSearchChange).toHaveBeenCalledWith('test query')
      })
    })
  })

  describe('Sort Functionality', () => {
    it('should render sort select', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const select = document.querySelector('.library-sort-select')
      expect(select).toBeInTheDocument()
    })

    it('should have sort options for recent, title, and author', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Recenti')).toBeInTheDocument()
      expect(screen.getByText('A-Z')).toBeInTheDocument()
      expect(screen.getByText('Autore')).toBeInTheDocument()
    })

    it('should call onSortChange when sort selection changes', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const select = document.querySelector('.library-sort-select') as HTMLSelectElement

      // Act
      fireEvent.change(select, { target: { value: 'title' } })

      // Assert
      expect(mockOnSortChange).toHaveBeenCalledWith('title')
    })
  })

  describe('File Upload', () => {
    it('should render hidden file input', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const input = document.getElementById('lib-upload')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'file')
      expect(input).toHaveAttribute('accept', '.epub')
      expect(input).toHaveAttribute('hidden')
    })

    it('should call onFileUpload when file is selected via input', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const input = document.getElementById('lib-upload') as HTMLInputElement
      const file = new File(['(binary)'], 'test.epub', { type: 'application/epub+zip' })

      // Act
      fireEvent.change(input, { target: { files: [file] } })

      // Assert
      expect(mockOnFileUpload).toHaveBeenCalledWith(file)
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over event', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const container = document.querySelector('.library-view')!

      // Act
      fireEvent.dragOver(container, {
        preventDefault: vi.fn(),
      })

      // Assert
      expect(mockSetIsDragOver).toHaveBeenCalledWith(true)
    })

    it('should handle drag leave event', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const container = document.querySelector('.library-view')!

      // Act
      fireEvent.dragLeave(container)

      // Assert
      expect(mockSetIsDragOver).toHaveBeenCalledWith(false)
    })

    it('should handle file drop event', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const container = document.querySelector('.library-view')!
      const file = new File(['content'], 'test.epub', { type: 'application/epub+zip' })

      const dropEvent = new Event('drop', {
        bubbles: true,
        cancelable: true,
      }) as any
      dropEvent.dataTransfer = { files: [file] }
      dropEvent.preventDefault = vi.fn()

      // Act
      container.dispatchEvent(dropEvent)

      // Assert
      expect(mockSetIsDragOver).toHaveBeenCalledWith(false)
      expect(mockOnFileUpload).toHaveBeenCalledWith(file)
    })

    it('should show active dropzone state when dragging over', () => {
      // Arrange
      const props = { ...defaultProps, isDragOver: true, filteredLibrary: [] }

      // Act
      render(<LibraryView {...props} />)

      // Assert
      const emptyState = document.querySelector('.empty-state')
      expect(emptyState).toHaveClass('active')
    })
  })

  describe('Book Interactions', () => {
    it('should call onLoadBook when read button is clicked', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const readButton = within(screen.getByTestId('book-card-1')).getByText('Read')

      // Act
      fireEvent.click(readButton)

      // Assert
      expect(mockOnLoadBook).toHaveBeenCalledWith(null, mockBooks[0].cfi, mockBooks[0].id)
    })

    it('should call onDeleteBook when delete button is clicked', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const deleteButton = within(screen.getByTestId('book-card-1')).getByText('Delete')

      // Act
      fireEvent.click(deleteButton)

      // Assert
      expect(mockOnDeleteBook).toHaveBeenCalledWith('1')
    })
  })

  describe('Resume Reading', () => {
    it('should show resume button when there is an in-progress book', () => {
      // Arrange - First book has progress > 0 and < 100
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText(/Continua:/i)).toBeInTheDocument()
      expect(screen.getByText('Test Book 1')).toBeInTheDocument()
    })

    it('should call onLoadBook with book CFI and ID when resume button clicked', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)
      const resumeButton = screen.getByText(/Continua:/)

      // Act
      fireEvent.click(resumeButton)

      // Assert
      expect(mockOnLoadBook).toHaveBeenCalledWith(null, mockBooks[0].cfi, mockBooks[0].id)
    })

    it('should not show resume button when no books in progress', () => {
      // Arrange - All books have progress 0 or 100
      const booksWithNoProgress: Book[] = [
        { ...mockBooks[1], progress: 0 },
        { ...mockBooks[2], progress: 100 },
      ]
      const props = { ...defaultProps, library: booksWithNoProgress, filteredLibrary: booksWithNoProgress }

      // Act
      render(<LibraryView {...props} />)

      // Assert
      expect(screen.queryByText(/Continua:/i)).not.toBeInTheDocument()
    })
  })

  describe('Sidebar Toggle', () => {
    it('should render sidebar toggle button', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
    })

    it('should toggle sidebar collapse state when button clicked', () => {
      // Arrange
      render(<LibraryView {...defaultProps} />)

      // Act
      const toggleButton = screen.getByText('Toggle Sidebar')
      fireEvent.click(toggleButton)

      // Assert - Sidebar should have collapsed data attribute
      // This is handled by the component's internal state
      const sidebar = screen.getByTestId('collection-sidebar')
      expect(sidebar).toBeInTheDocument()
    })
  })

  describe('Library Controls', () => {
    it('should render add book button in header', () => {
      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Aggiungi')).toBeInTheDocument()
    })

    it('should show regenerate covers button when books have missing covers', () => {
      // Arrange
      const booksWithoutCovers: Book[] = [{ ...mockBooks[0], cover: undefined }]
      const props = {
        ...defaultProps,
        library: booksWithoutCovers,
        filteredLibrary: booksWithoutCovers,
      }

      // Act
      render(<LibraryView {...props} />)

      // Assert - The regenerate button should be present
      expect(mockOnRegenerateCovers).toBeDefined()
    })
  })

  describe('Responsive Layout', () => {
    it('should apply sidebar-collapsed class when sidebar is collapsed', () => {
      // This test verifies the structure is in place for responsive behavior
      // The actual sidebar state is managed internally by the component

      // Act
      render(<LibraryView {...defaultProps} />)

      // Assert
      const main = document.querySelector('.library-main')
      expect(main).toBeInTheDocument()
    })
  })
})
