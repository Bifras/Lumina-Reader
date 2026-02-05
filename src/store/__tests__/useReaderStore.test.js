// Tests for useReaderStore
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReaderStore } from '../useReaderStore.ts'

describe('useReaderStore', () => {
  // Mock rendition object
  const mockRendition = {
    display: vi.fn(),
    next: vi.fn(),
    prev: vi.fn()
  }

  beforeEach(() => {
    // Reset store state before each test
    useReaderStore.getState().resetReader()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useReaderStore.getState()
      expect(state.activeBook).toBeNull()
      expect(state.bookEngine).toBeNull()
      expect(state.rendition).toBeNull()
      expect(state.metadata).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.viewerReady).toBe(false)
      expect(state.toc).toEqual([])
      expect(state.bookmarks).toEqual([])
      expect(state.highlights).toEqual([])
    })
  })

  describe('Book State Management', () => {
    it('should set active book', () => {
      const mockBook = { id: 'book-1', title: 'Test Book' }
      useReaderStore.getState().setActiveBook(mockBook)

      expect(useReaderStore.getState().activeBook).toEqual(mockBook)
    })

    it('should set book engine', () => {
      const mockEngine = { destroy: vi.fn() }
      useReaderStore.getState().setBookEngine(mockEngine)

      expect(useReaderStore.getState().bookEngine).toEqual(mockEngine)
    })

    it('should set rendition', () => {
      useReaderStore.getState().setRendition(mockRendition)

      expect(useReaderStore.getState().rendition).toEqual(mockRendition)
    })

    it('should set metadata', () => {
      const mockMetadata = { title: 'Test', author: 'Author' }
      useReaderStore.getState().setMetadata(mockMetadata)

      expect(useReaderStore.getState().metadata).toEqual(mockMetadata)
    })
  })

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { setIsLoading } = useReaderStore.getState()

      setIsLoading(true)
      expect(useReaderStore.getState().isLoading).toBe(true)

      setIsLoading(false)
      expect(useReaderStore.getState().isLoading).toBe(false)
    })

    it('should set loading step', () => {
      const { setLoadingStep } = useReaderStore.getState()

      setLoadingStep('Caricamento libro...')
      expect(useReaderStore.getState().loadingStep).toBe('Caricamento libro...')

      setLoadingStep('Rendering EPUB...')
      expect(useReaderStore.getState().loadingStep).toBe('Rendering EPUB...')
    })

    it('should set viewer ready state', () => {
      const { setViewerReady } = useReaderStore.getState()

      setViewerReady(true)
      expect(useReaderStore.getState().viewerReady).toBe(true)

      setViewerReady(false)
      expect(useReaderStore.getState().viewerReady).toBe(false)
    })

    it('should set pending book load', () => {
      const mockBook = { id: 'pending-1' }
      useReaderStore.getState().setPendingBookLoad(mockBook)

      expect(useReaderStore.getState().pendingBookLoad).toEqual(mockBook)
    })
  })

  describe('Panel Toggles', () => {
    beforeEach(() => {
      // Reset to ensure panels start closed
      useReaderStore.setState({
        showTOC: false,
        showBookmarks: false,
        showSearch: false
      })
    })

    it('should toggle TOC and close other panels', () => {
      const { toggleTOC } = useReaderStore.getState()

      toggleTOC()
      expect(useReaderStore.getState().showTOC).toBe(true)
      expect(useReaderStore.getState().showBookmarks).toBe(false)
      expect(useReaderStore.getState().showSearch).toBe(false)

      toggleTOC()
      expect(useReaderStore.getState().showTOC).toBe(false)
    })

    it('should toggle bookmarks and close other panels', () => {
      const { toggleBookmarks } = useReaderStore.getState()

      toggleBookmarks()
      expect(useReaderStore.getState().showBookmarks).toBe(true)
      expect(useReaderStore.getState().showTOC).toBe(false)
      expect(useReaderStore.getState().showSearch).toBe(false)

      toggleBookmarks()
      expect(useReaderStore.getState().showBookmarks).toBe(false)
    })

    it('should toggle search and close other panels', () => {
      const { toggleSearch } = useReaderStore.getState()

      toggleSearch()
      expect(useReaderStore.getState().showSearch).toBe(true)
      expect(useReaderStore.getState().showTOC).toBe(false)
      expect(useReaderStore.getState().showBookmarks).toBe(false)

      toggleSearch()
      expect(useReaderStore.getState().showSearch).toBe(false)
    })

    it('should close all panels', () => {
      useReaderStore.setState({
        showTOC: true,
        showBookmarks: true,
        showSearch: true
      })

      useReaderStore.getState().closeAllPanels()

      expect(useReaderStore.getState().showTOC).toBe(false)
      expect(useReaderStore.getState().showBookmarks).toBe(false)
      expect(useReaderStore.getState().showSearch).toBe(false)
    })
  })

  describe('Bookmarks Management', () => {
    it('should add bookmark to beginning of list', () => {
      const bookmark1 = { id: 'bm-1', cfi: 'cfi-1', label: 'Chapter 1' }
      const bookmark2 = { id: 'bm-2', cfi: 'cfi-2', label: 'Chapter 2' }

      useReaderStore.getState().addBookmark(bookmark1)
      useReaderStore.getState().addBookmark(bookmark2)

      const bookmarks = useReaderStore.getState().bookmarks
      expect(bookmarks).toHaveLength(2)
      expect(bookmarks[0]).toEqual(bookmark2) // Most recent first
      expect(bookmarks[1]).toEqual(bookmark1)
    })

    it('should remove bookmark by ID', () => {
      // Start with clean state - explicitly set empty bookmarks
      useReaderStore.setState({ bookmarks: [] })

      const bookmark1 = { id: 'bm-1', cfi: 'cfi-1' }
      const bookmark2 = { id: 'bm-2', cfi: 'cfi-2' }

      useReaderStore.getState().addBookmark(bookmark1)
      useReaderStore.getState().addBookmark(bookmark2)

      useReaderStore.getState().removeBookmark('bm-1')

      const bookmarks = useReaderStore.getState().bookmarks
      expect(bookmarks).toHaveLength(1)
      expect(bookmarks[0].id).toBe('bm-2')
    })

    it('should set bookmarks list', () => {
      const bookmarks = [
        { id: 'bm-1', cfi: 'cfi-1' },
        { id: 'bm-2', cfi: 'cfi-2' }
      ]

      useReaderStore.getState().setBookmarks(bookmarks)

      expect(useReaderStore.getState().bookmarks).toEqual(bookmarks)
    })
  })

  describe('Highlights Management', () => {
    it('should add highlight to end of list', () => {
      const highlight1 = { id: 'hl-1', cfi: 'cfi-1', text: 'text 1', color: 'yellow' }
      const highlight2 = { id: 'hl-2', cfi: 'cfi-2', text: 'text 2', color: 'yellow' }

      useReaderStore.getState().addHighlight(highlight1)
      useReaderStore.getState().addHighlight(highlight2)

      const highlights = useReaderStore.getState().highlights
      expect(highlights).toHaveLength(2)
      expect(highlights[0]).toEqual(highlight1)
      expect(highlights[1]).toEqual(highlight2)
    })

    it('should remove highlight by ID', () => {
      // Start with clean state - explicitly set empty highlights
      useReaderStore.setState({ highlights: [] })

      const highlight1 = { id: 'hl-1', cfi: 'cfi-1' }
      const highlight2 = { id: 'hl-2', cfi: 'cfi-2' }

      useReaderStore.getState().addHighlight(highlight1)
      useReaderStore.getState().addHighlight(highlight2)

      useReaderStore.getState().removeHighlight('hl-1')

      const highlights = useReaderStore.getState().highlights
      expect(highlights).toHaveLength(1)
      expect(highlights[0].id).toBe('hl-2')
    })

    it('should set highlights list', () => {
      const highlights = [
        { id: 'hl-1', cfi: 'cfi-1' },
        { id: 'hl-2', cfi: 'cfi-2' }
      ]

      useReaderStore.getState().setHighlights(highlights)

      expect(useReaderStore.getState().highlights).toEqual(highlights)
    })
  })

  describe('Search Management', () => {
    it('should set search query', () => {
      useReaderStore.getState().setSearchQuery('test query')

      expect(useReaderStore.getState().searchQuery).toBe('test query')
    })

    it('should set search results', () => {
      const results = [
        { cfi: 'cfi-1', text: 'result 1' },
        { cfi: 'cfi-2', text: 'result 2' }
      ]

      useReaderStore.getState().setSearchResults(results)

      expect(useReaderStore.getState().searchResults).toEqual(results)
    })
  })

  describe('Highlight Popup', () => {
    it('should show highlight popup at position', () => {
      const position = { x: 100, y: 200 }
      const text = 'Selected text'
      const cfiRange = 'epubcfi(/6/4...)'

      useReaderStore.getState().showHighlightPopupAt(position, text, cfiRange)

      const state = useReaderStore.getState()
      expect(state.showHighlightPopup).toBe(true)
      expect(state.highlightPosition).toEqual(position)
      expect(state.selectedText).toBe(text)
      expect(state.selectedCfiRange).toBe(cfiRange)
    })

    it('should hide highlight popup and clear selection', () => {
      useReaderStore.setState({
        showHighlightPopup: true,
        selectedText: 'text',
        selectedCfiRange: 'cfi'
      })

      useReaderStore.getState().hideHighlightPopup()

      const state = useReaderStore.getState()
      expect(state.showHighlightPopup).toBe(false)
      expect(state.selectedText).toBe('')
      expect(state.selectedCfiRange).toBeNull()
    })
  })

  describe('Navigation', () => {
    it('should go to location if rendition exists', () => {
      useReaderStore.getState().setRendition(mockRendition)

      useReaderStore.getState().goToLocation('epubcfi(/6/4...)')

      expect(mockRendition.display).toHaveBeenCalledWith('epubcfi(/6/4...)')
    })

    it('should not navigate if rendition does not exist', () => {
      useReaderStore.getState().goToLocation('epubcfi(/6/4...)')

      // Should not throw error, just do nothing
      expect(mockRendition.display).not.toHaveBeenCalled()
    })

    it('should go to next page if rendition exists', () => {
      useReaderStore.getState().setRendition(mockRendition)

      useReaderStore.getState().nextPage()

      expect(mockRendition.next).toHaveBeenCalled()
    })

    it('should go to previous page if rendition exists', () => {
      useReaderStore.getState().setRendition(mockRendition)

      useReaderStore.getState().prevPage()

      expect(mockRendition.prev).toHaveBeenCalled()
    })
  })

  describe('Reset Reader', () => {
    it('should reset all state to initial values', () => {
      // Set some state
      useReaderStore.setState({
        activeBook: { id: 'book-1' },
        bookEngine: { destroy: vi.fn() },
        rendition: mockRendition,
        metadata: { title: 'Test' },
        isLoading: true,
        showTOC: true,
        bookmarks: [{ id: 'bm-1' }],
        highlights: [{ id: 'hl-1' }],
        searchQuery: 'test'
      })

      useReaderStore.getState().resetReader()

      const state = useReaderStore.getState()
      expect(state.activeBook).toBeNull()
      expect(state.bookEngine).toBeNull()
      expect(state.rendition).toBeNull()
      expect(state.metadata).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.loadingStep).toBeNull()
      expect(state.viewerReady).toBe(false)
      expect(state.pendingBookLoad).toBeNull()
      expect(state.showTOC).toBe(false)
      expect(state.showBookmarks).toBe(false)
      expect(state.showSearch).toBe(false)
      expect(state.toc).toEqual([])
      expect(state.bookmarks).toEqual([])
      expect(state.highlights).toEqual([])
      expect(state.searchQuery).toBe('')
      expect(state.searchResults).toEqual([])
      expect(state.showHighlightPopup).toBe(false)
      expect(state.selectedText).toBe('')
      expect(state.selectedCfiRange).toBeNull()
    })
  })
})
