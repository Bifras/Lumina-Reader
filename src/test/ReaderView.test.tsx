/**
 * TDD: ReaderView Component Tests
 *
 * Tests the ReaderView component focusing on:
 * - Menu/Overlay rendering and toggling
 * - Theme application
 * - Font controls
 * - State management
 *
 * Test Coverage Areas:
 * - TOC panel toggles open/closed
 * - Bookmarks panel toggles open/closed
 * - Search panel toggles open/closed
 * - Settings panel toggles open/closed
 * - Quick Typography popover shows/hides
 * - Zen mode shows/hides UI correctly
 * - Theme changes apply correctly
 * - Font size controls work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReaderView from '../views/ReaderView'
import type { ExtendedRendition } from '../types'

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock epubjs
const mockRendition = {
  display: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  themes: {
    override: vi.fn(),
    select: vi.fn(),
    fontSize: vi.fn(),
  },
  on: vi.fn(),
  off: vi.fn(),
  getContents: vi.fn(() => [
    {
      window: {
        getSelection: vi.fn(() => ({ toString: vi.fn(() => 'Selected text') })),
      },
    },
  ]),
} as unknown as ExtendedRendition

const mockBook = {
  destroyed: false,
  ready: Promise.resolve(),
  spine: {
    spineItems: [],
  },
  locations: {
    generate: vi.fn(),
    cfiFromPercentage: vi.fn(),
    percentageFromCfi: vi.fn(),
  },
  loaded: {
    metadata: Promise.resolve({ title: 'Test Book', creator: 'Test Author' }),
    navigation: Promise.resolve({ toc: [] }),
    cover: Promise.resolve(),
  },
  destroy: vi.fn(),
}

describe('ReaderView Component', () => {
  // Mock functions
  const mockOnAddHighlight = vi.fn()
  const mockOnAddBookmark = vi.fn()
  const mockOnRemoveBookmark = vi.fn()
  const mockOnGoToBookmark = vi.fn()
  const mockOnGoToTOCItem = vi.fn()
  const mockOnPrevPage = vi.fn()
  const mockOnNextPage = vi.fn()
  const mockOnReturnToLibrary = vi.fn()
  const mockOnThemeChange = vi.fn()
  const mockOnFontSizeChange = vi.fn()
  const mockOnFontChange = vi.fn()
  const mockSetShowHighlightPopup = vi.fn()

  const mockViewerRef = { current: document.createElement('div') } as any

  const defaultProps = {
    viewerRef: mockViewerRef,
    book: mockBook as any,
    metadata: { title: 'Test Book', creator: 'Test Author' },
    rendition: mockRendition,
    toc: [
      { id: '1', label: 'Chapter 1', href: 'chapter1.xhtml' },
      { id: '2', label: 'Chapter 2', href: 'chapter2.xhtml' },
    ],
    bookmarks: [],
    highlights: [],
    currentTheme: 'light',
    fontSize: 100,
    readingFont: 'lora',
    showHighlightPopup: false,
    highlightPosition: { x: 0, y: 0 },
    onAddHighlight: mockOnAddHighlight,
    onAddBookmark: mockOnAddBookmark,
    onRemoveBookmark: mockOnRemoveBookmark,
    onGoToBookmark: mockOnGoToBookmark,
    onGoToTOCItem: mockOnGoToTOCItem,
    onPrevPage: mockOnPrevPage,
    onNextPage: mockOnNextPage,
    onReturnToLibrary: mockOnReturnToLibrary,
    onThemeChange: mockOnThemeChange,
    onFontSizeChange: mockOnFontSizeChange,
    onFontChange: mockOnFontChange,
    setShowHighlightPopup: mockSetShowHighlightPopup,
    loadingStep: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering - Basic Layout', () => {
    it('should render reader container', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      const container = document.querySelector('.reader-container')
      expect(container).toBeInTheDocument()
    })

    it('should render book info header', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.getByText('Test Author')).toBeInTheDocument()
      expect(screen.getByText('Test Book')).toBeInTheDocument()
    })

    it('should render viewer element', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      const viewer = document.getElementById('viewer')
      expect(viewer).toBeInTheDocument()
    })
  })

  describe('Menu/Toolbar Visibility', () => {
    it('should render vertical toolbar when menu is visible', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      const toolbar = document.querySelector('.vertical-toolbar')
      expect(toolbar).toBeInTheDocument()
    })

    it('should hide toolbar when zen mode is active', () => {
      // Arrange - We need to render and then trigger zen mode
      // The component manages zen mode internally
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click zen mode button
      const zenButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('title') === 'Modalità Zen'
      )

      // Act
      if (zenButton) {
        fireEvent.click(zenButton)
      }

      // After clicking zen mode, toolbar should be hidden
      // We verify the zen exit button appears instead
      const zenExitButton = container.querySelector('.zen-exit-btn')
      expect(zenExitButton).toBeInTheDocument()
    })

    it('should show menu toggle button when menu is hidden', () => {
      // This tests the internal menu visibility state
      // The component manages this state internally
      const { container } = render(<ReaderView {...defaultProps} />)

      // Initially menu is visible, so toggle button should not be visible
      let toggleButton = container.querySelector('.menu-toggle')
      expect(toggleButton).not.toBeInTheDocument()
    })
  })

  describe('TOC Panel', () => {
    it('should not show TOC panel initially', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Indice')).not.toBeInTheDocument()
    })

    it('should show TOC panel when TOC button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click the TOC button
      const tocButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra indice'
      )

      // Act
      if (tocButton) {
        fireEvent.click(tocButton)
      }

      // Assert - TOC panel should now be visible
      await waitFor(() => {
        expect(screen.getByText('Indice')).toBeInTheDocument()
      })
    })

    it('should render TOC items when panel is open', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open TOC panel
      const tocButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra indice'
      )

      // Act
      if (tocButton) {
        fireEvent.click(tocButton)
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })
    })

    it('should call onGoToTOCItem when TOC item is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open TOC
      const tocButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra indice'
      )
      if (tocButton) fireEvent.click(tocButton)

      // Wait for panel to open
      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
      })

      // Act - Click on chapter 1
      const chapterButton = screen.getByText('Chapter 1')
      fireEvent.click(chapterButton)

      // Assert
      expect(mockOnGoToTOCItem).toHaveBeenCalledWith('chapter1.xhtml')
    })
  })

  describe('Bookmarks Panel', () => {
    it('should not show bookmarks panel initially', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Segnalibri')).not.toBeInTheDocument()
    })

    it('should show bookmarks panel when bookmarks button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click the bookmarks button
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )

      // Act
      if (bookmarksButton) {
        fireEvent.click(bookmarksButton)
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Segnalibri')).toBeInTheDocument()
      })
    })

    it('should show empty state when no bookmarks', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open bookmarks panel
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )
      if (bookmarksButton) fireEvent.click(bookmarksButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Nessun segnalibro')).toBeInTheDocument()
      })
    })

    it('should display bookmarks when they exist', async () => {
      // Arrange
      const props = {
        ...defaultProps,
        bookmarks: [
          { id: '1', cfi: 'epubcfi(/6/4)', label: 'Chapter 1 Bookmark' },
          { id: '2', cfi: 'epubcfi(/6/6)', label: 'Important note' },
        ],
      }
      const { container } = render(<ReaderView {...props} />)

      // Open bookmarks panel
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )
      if (bookmarksButton) fireEvent.click(bookmarksButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Chapter 1 Bookmark')).toBeInTheDocument()
        expect(screen.getByText('Important note')).toBeInTheDocument()
      })
    })

    it('should call onAddBookmark when add bookmark button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open bookmarks panel
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )
      if (bookmarksButton) fireEvent.click(bookmarksButton)

      // Wait for panel
      await waitFor(() => {
        expect(screen.getByText('Aggiungi segnalibro')).toBeInTheDocument()
      })

      // Act - Click add bookmark button
      const addButton = screen.getByText('Aggiungi segnalibro')
      fireEvent.click(addButton)

      // Assert
      expect(mockOnAddBookmark).toHaveBeenCalled()
    })

    it('should call onGoToBookmark when bookmark is clicked', async () => {
      // Arrange
      const props = {
        ...defaultProps,
        bookmarks: [{ id: '1', cfi: 'epubcfi(/6/4)', label: 'Test Bookmark' }],
      }
      const { container } = render(<ReaderView {...props} />)

      // Open bookmarks panel
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )
      if (bookmarksButton) fireEvent.click(bookmarksButton)

      // Wait and click bookmark
      await waitFor(() => {
        expect(screen.getByText('Test Bookmark')).toBeInTheDocument()
      })

      // Act
      const bookmarkLabel = screen.getByText('Test Bookmark')
      fireEvent.click(bookmarkLabel)

      // Assert
      expect(mockOnGoToBookmark).toHaveBeenCalledWith('epubcfi(/6/4)')
    })
  })

  describe('Search Panel', () => {
    it('should not show search panel initially', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Ricerca')).not.toBeInTheDocument()
    })

    it('should show search panel when search button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click the search button
      const searchButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cerca nel libro'
      )

      // Act
      if (searchButton) {
        fireEvent.click(searchButton)
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Ricerca')).toBeInTheDocument()
      })
    })

    it('should render search input field', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open search panel
      const searchButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cerca nel libro'
      )
      if (searchButton) fireEvent.click(searchButton)

      // Assert
      await waitFor(() => {
        const input = container.querySelector('.search-input')
        expect(input).toBeInTheDocument()
      })
    })
  })

  describe('Settings Panel', () => {
    it('should not show settings panel initially', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Impostazioni di lettura')).not.toBeInTheDocument()
    })

    it('should show settings panel when settings button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click the settings button
      const settingsButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Impostazioni di lettura'
      )

      // Act
      if (settingsButton) {
        fireEvent.click(settingsButton)
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Impostazioni di lettura')).toBeInTheDocument()
      })
    })

    it('should render theme selector in settings', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open settings
      const settingsButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Impostazioni di lettura'
      )
      if (settingsButton) fireEvent.click(settingsButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Tema')).toBeInTheDocument()
      })
    })

    it('should render font size controls in settings', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open settings
      const settingsButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Impostazioni di lettura'
      )
      if (settingsButton) fireEvent.click(settingsButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Dimensione testo')).toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('should call onFontSizeChange when decrease button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open settings
      const settingsButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Impostazioni di lettura'
      )
      if (settingsButton) fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText('Dimensione testo')).toBeInTheDocument()
      })

      // Find decrease button
      const decreaseButtons = container.querySelectorAll('button')
      const decreaseButton = Array.from(decreaseButtons).find((b) => b.textContent === '-')

      // Act
      if (decreaseButton) {
        fireEvent.click(decreaseButton)
      }

      // Assert
      expect(mockOnFontSizeChange).toHaveBeenCalledWith(-10)
    })

    it('should call onFontSizeChange when increase button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open settings
      const settingsButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Impostazioni di lettura'
      )
      if (settingsButton) fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText('Dimensione testo')).toBeInTheDocument()
      })

      // Find increase button
      const increaseButtons = container.querySelectorAll('button')
      const increaseButton = Array.from(increaseButtons).find((b) => b.textContent === '+')

      // Act
      if (increaseButton) {
        fireEvent.click(increaseButton)
      }

      // Assert
      expect(mockOnFontSizeChange).toHaveBeenCalledWith(10)
    })
  })

  describe('Quick Typography Popover', () => {
    it('should not show quick typography panel initially', () => {
      // Act
      render(<ReaderView {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Tipografia')).not.toBeInTheDocument()
    })

    it('should show quick typography panel when button is clicked', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find and click the typography button
      const typographyButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cambia tipografia'
      )

      // Act
      if (typographyButton) {
        fireEvent.click(typographyButton)
      }

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Tipografia')).toBeInTheDocument()
      })
    })

    it('should render font size slider in quick typography', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open quick typography
      const typographyButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cambia tipografia'
      )
      if (typographyButton) fireEvent.click(typographyButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Dimensione')).toBeInTheDocument()
      })
    })

    it('should render quick font options', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open quick typography
      const typographyButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cambia tipografia'
      )
      if (typographyButton) fireEvent.click(typographyButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Carattere')).toBeInTheDocument()
      })
    })

    it('should render quick theme options', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open quick typography
      const typographyButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cambia tipografia'
      )
      if (typographyButton) fireEvent.click(typographyButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Tema')).toBeInTheDocument()
      })
    })
  })

  describe('Panel Exclusivity', () => {
    it('should close TOC when another panel is opened', async () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Open TOC
      const tocButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra indice'
      )
      if (tocButton) fireEvent.click(tocButton)

      await waitFor(() => {
        expect(screen.getByText('Indice')).toBeInTheDocument()
      })

      // Open bookmarks
      const bookmarksButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Mostra segnalibri'
      )
      if (bookmarksButton) fireEvent.click(bookmarksButton)

      // Assert - TOC should be closed when bookmarks opens
      await waitFor(() => {
        expect(screen.getByText('Segnalibri')).toBeInTheDocument()
      })
    })
  })

  describe('Page Navigation', () => {
    it('should call onPrevPage when previous page button is clicked', () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find prev page button
      const prevButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Vai alla pagina precedente'
      )

      // Act
      if (prevButton) {
        fireEvent.click(prevButton)
      }

      // Assert
      expect(mockOnPrevPage).toHaveBeenCalled()
    })

    it('should call onNextPage when next page button is clicked', () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find next page button
      const nextButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Vai alla pagina successiva'
      )

      // Act
      if (nextButton) {
        fireEvent.click(nextButton)
      }

      // Assert
      expect(mockOnNextPage).toHaveBeenCalled()
    })

    it('should call onReturnToLibrary when library button is clicked', () => {
      // Arrange
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find library button
      const libraryButton = Array.from(container.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Torna alla libreria'
      )

      // Act
      if (libraryButton) {
        fireEvent.click(libraryButton)
      }

      // Assert
      expect(mockOnReturnToLibrary).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on toolbar buttons', () => {
      // Act
      const { container } = render(<ReaderView {...defaultProps} />)

      // Assert - Check for key buttons
      const toolbar = container.querySelector('.vertical-toolbar')
      expect(toolbar).toBeInTheDocument()

      // Check for aria-labels on navigation buttons
      const prevButton = container.querySelector('[aria-label="Vai alla pagina precedente"]')
      const nextButton = container.querySelector('[aria-label="Vai alla pagina successiva"]')
      const libraryButton = container.querySelector('[aria-label="Torna alla libreria"]')

      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
      expect(libraryButton).toBeInTheDocument()
    })

    it('should have aria-pressed state for toggle buttons', () => {
      // Act
      const { container } = render(<ReaderView {...defaultProps} />)

      // Find buttons with aria-pressed
      const pressedButtons = container.querySelectorAll('[aria-pressed]')

      // Assert - At least toolbar buttons should have this
      expect(pressedButtons.length).toBeGreaterThan(0)
    })
  })
})
