import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReaderView from '../views/ReaderView'
import type { Bookmark, TOCEntry } from '../types'

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock HighlightPopup
vi.mock('../components/HighlightPopup', () => ({
  default: () => <div data-testid="highlight-popup">Highlight Popup</div>
}))

const mockRendition = {
  display: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  themes: {
    override: vi.fn(),
    select: vi.fn(),
    fontSize: vi.fn(),
  },
  getContents: vi.fn(() => []),
}

const mockBook = {
  destroyed: false,
  ready: Promise.resolve(),
  spine: {
    spineItems: [],
  },
}

describe('ReaderView Component', () => {
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
  const mockOnReadingFontChange = vi.fn()
  const mockSetShowHighlightPopup = vi.fn()

  const mockViewerRef = { current: document.createElement('div') } as any

  const defaultProps = {
    viewerRef: mockViewerRef,
    book: mockBook as any,
    metadata: { title: 'Test Book', creator: 'Test Author' },
    rendition: mockRendition as any,
    toc: [
      { id: '1', label: 'Chapter 1', href: 'chapter1.xhtml' },
      { id: '2', label: 'Chapter 2', href: 'chapter2.xhtml' },
    ],
    bookmarks: [] as Bookmark[],
    highlights: [],
    currentTheme: 'light',
    fontSize: 100,
    readingFont: 'lora',
    readingProgress: 45,
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
    onReadingFontChange: mockOnReadingFontChange,
    setShowHighlightPopup: mockSetShowHighlightPopup,
    loadingStep: null,
    pageInfo: { current: 10, total: 100 }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering - Basic Layout', () => {
    it('should render reader container', () => {
      render(<ReaderView {...defaultProps} />)
      const container = document.querySelector('.reader-container')
      expect(container).toBeInTheDocument()
    })

    it('should render book info header', () => {
      render(<ReaderView {...defaultProps} />)
      expect(screen.getByText('Test Author')).toBeInTheDocument()
      expect(screen.getByText('Test Book')).toBeInTheDocument()
    })

    it('should render viewer element', () => {
      render(<ReaderView {...defaultProps} />)
      const viewer = document.getElementById('viewer')
      expect(viewer).toBeInTheDocument()
    })

    it('should render progress bar with correct value', () => {
      render(<ReaderView {...defaultProps} />)
      expect(screen.getByText('45%')).toBeInTheDocument()
    })
  })

  describe('Collapsible Floating Menu (Pill)', () => {
    it('should render collapsed menu button initially', () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      expect(collapsedBtn).toBeInTheDocument()
      expect(collapsedBtn?.getAttribute('aria-label')).toBe('Apri menu di lettura')
    })

    it('should expand menu when collapsed button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      
      if (collapsedBtn) {
        fireEvent.click(collapsedBtn)
      }

      await waitFor(() => {
        const expandedPill = container.querySelector('.floating-pill-expanded')
        expect(expandedPill).toBeInTheDocument()
      })
    })
  })

  describe('Zen Mode', () => {
    it('should enter zen mode and hide menu when zen button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      
      // Expand menu
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      if (collapsedBtn) fireEvent.click(collapsedBtn)

      // Find Zen Mode button
      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })
      const zenBtn = container.querySelector('[aria-label="Attiva modalità Zen"]')
      expect(zenBtn).toBeInTheDocument()

      // Click Zen button
      if (zenBtn) fireEvent.click(zenBtn)

      // Check if menu is hidden and exit button appears
      await waitFor(() => {
        expect(container.querySelector('.floating-pill-container')).not.toBeInTheDocument()
        expect(container.querySelector('.zen-exit-btn')).toBeInTheDocument()
      })
    })
  })

  describe('Unified Panels', () => {
    const expandPill = (container: HTMLElement) => {
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      if (collapsedBtn) fireEvent.click(collapsedBtn)
    }

    it('should open unified panel with TOC initially when Indice button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const tocBtn = container.querySelector('[aria-label="Apri indice"]')
      if (tocBtn) fireEvent.click(tocBtn)

      await waitFor(() => {
        expect(screen.getByText('Indice')).toBeInTheDocument()
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })
    })

    it('should call onGoToTOCItem when TOC item is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const tocBtn = container.querySelector('[aria-label="Apri indice"]')
      if (tocBtn) fireEvent.click(tocBtn)

      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Chapter 1'))
      expect(mockOnGoToTOCItem).toHaveBeenCalledWith('chapter1.xhtml')
    })

    it('should open unified panel with Bookmarks tab when Bookmarks button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const bookmarkBtn = container.querySelector('[aria-label="Apri segnalibri"]')
      if (bookmarkBtn) fireEvent.click(bookmarkBtn)

      await waitFor(() => {
        expect(screen.getByText('Segnalibri')).toBeInTheDocument()
        expect(screen.getByText('Aggiungi segnalibro')).toBeInTheDocument()
      })
    })

    it('should show bookmarks list and call actions', async () => {
      const props = {
        ...defaultProps,
        bookmarks: [
          { id: 'bm-1', label: 'Segnalibro 1', cfi: 'cfi-1', createdAt: 123 }
        ]
      }
      const { container } = render(<ReaderView {...props} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const bookmarkBtn = container.querySelector('[aria-label="Apri segnalibri"]')
      if (bookmarkBtn) fireEvent.click(bookmarkBtn)

      await waitFor(() => {
        expect(screen.getByText('Segnalibro 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Segnalibro 1'))
      expect(mockOnGoToBookmark).toHaveBeenCalledWith('cfi-1')
    })
  })

  describe('Settings Panel', () => {
    const expandPill = (container: HTMLElement) => {
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      if (collapsedBtn) fireEvent.click(collapsedBtn)
    }

    it('should open settings panel when Settings button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const settingsBtn = container.querySelector('[aria-label="Apri impostazioni"]')
      if (settingsBtn) fireEvent.click(settingsBtn)

      await waitFor(() => {
        expect(screen.getByText('Impostazioni')).toBeInTheDocument()
        expect(screen.getByText('Dimensione testo')).toBeInTheDocument()
      })
    })

    it('should call onFontSizeChange when increase/decrease size buttons are clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const settingsBtn = container.querySelector('[aria-label="Apri impostazioni"]')
      if (settingsBtn) fireEvent.click(settingsBtn)

      await waitFor(() => {
        expect(screen.getByText('Dimensione testo')).toBeInTheDocument()
      })

      const decBtn = screen.getByText('-')
      const incBtn = screen.getByText('+')

      fireEvent.click(decBtn)
      expect(mockOnFontSizeChange).toHaveBeenCalledWith(-10)

      fireEvent.click(incBtn)
      expect(mockOnFontSizeChange).toHaveBeenCalledWith(10)
    })
  })

  describe('Page Navigation', () => {
    const expandPill = (container: HTMLElement) => {
      const collapsedBtn = container.querySelector('.floating-pill-collapsed')
      if (collapsedBtn) fireEvent.click(collapsedBtn)
    }

    it('should call onPrevPage when previous page button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const prevBtn = container.querySelector('[aria-label="Pagina precedente"]')
      expect(prevBtn).toBeInTheDocument()

      if (prevBtn) fireEvent.click(prevBtn)
      expect(mockOnPrevPage).toHaveBeenCalled()
    })

    it('should call onNextPage when next page button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const nextBtn = container.querySelector('[aria-label="Pagina successiva"]')
      expect(nextBtn).toBeInTheDocument()

      if (nextBtn) fireEvent.click(nextBtn)
      expect(mockOnNextPage).toHaveBeenCalled()
    })

    it('should call onReturnToLibrary when library button is clicked', async () => {
      const { container } = render(<ReaderView {...defaultProps} />)
      expandPill(container)

      await waitFor(() => {
        expect(container.querySelector('.floating-pill-expanded')).toBeInTheDocument()
      })

      const libBtn = container.querySelector('[aria-label="Torna alla libreria"]')
      expect(libBtn).toBeInTheDocument()

      if (libBtn) fireEvent.click(libBtn)
      expect(mockOnReturnToLibrary).toHaveBeenCalled()
    })
  })
})
