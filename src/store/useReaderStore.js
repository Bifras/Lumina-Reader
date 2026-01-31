import { create } from 'zustand'

export const useReaderStore = create((set, get) => ({
  // Book state
  activeBook: null,
  bookEngine: null,
  rendition: null,
  metadata: null,
  
  // Loading state
  isLoading: false,
  loadingStep: null,
  viewerReady: false,
  pendingBookLoad: null,
  
  // Reader UI state
  showTOC: false,
  showBookmarks: false,
  showSearch: false,
  
  // Content state
  toc: [],
  bookmarks: [],
  highlights: [],
  searchQuery: '',
  searchResults: [],
  
  // Highlight popup state
  showHighlightPopup: false,
  highlightPosition: { x: 0, y: 0 },
  selectedText: '',
  selectedCfiRange: null,
  
  // Actions
  setActiveBook: (book) => set({ activeBook: book }),
  setBookEngine: (engine) => set({ bookEngine: engine }),
  setRendition: (rendition) => set({ rendition }),
  setMetadata: (metadata) => set({ metadata }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadingStep: (step) => set({ loadingStep: step }),
  setViewerReady: (ready) => set({ viewerReady: ready }),
  setPendingBookLoad: (load) => set({ pendingBookLoad: load }),
  
  // Panel toggles
  toggleTOC: () => set((state) => ({ 
    showTOC: !state.showTOC,
    showBookmarks: false,
    showSearch: false 
  })),
  toggleBookmarks: () => set((state) => ({ 
    showBookmarks: !state.showBookmarks,
    showTOC: false,
    showSearch: false 
  })),
  toggleSearch: () => set((state) => ({ 
    showSearch: !state.showSearch,
    showTOC: false,
    showBookmarks: false 
  })),
  closeAllPanels: () => set({ 
    showTOC: false, 
    showBookmarks: false, 
    showSearch: false 
  }),
  
  setTOC: (toc) => set({ toc }),
  setBookmarks: (bookmarks) => set({ bookmarks }),
  setHighlights: (highlights) => set({ highlights }),
  
  addBookmark: (bookmark) => set((state) => ({
    bookmarks: [bookmark, ...state.bookmarks]
  })),
  
  removeBookmark: (bookmarkId) => set((state) => ({
    bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId)
  })),
  
  addHighlight: (highlight) => set((state) => ({
    highlights: [...state.highlights, highlight]
  })),
  
  removeHighlight: (highlightId) => set((state) => ({
    highlights: state.highlights.filter(h => h.id !== highlightId)
  })),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  
  // Highlight popup
  showHighlightPopupAt: (position, text, cfiRange) => set({
    showHighlightPopup: true,
    highlightPosition: position,
    selectedText: text,
    selectedCfiRange: cfiRange
  }),
  
  hideHighlightPopup: () => set({
    showHighlightPopup: false,
    selectedText: '',
    selectedCfiRange: null
  }),
  
  // Reset reader state
  resetReader: () => set({
    activeBook: null,
    bookEngine: null,
    rendition: null,
    metadata: null,
    isLoading: false,
    loadingStep: null,
    viewerReady: false,
    pendingBookLoad: null,
    showTOC: false,
    showBookmarks: false,
    showSearch: false,
    toc: [],
    searchQuery: '',
    searchResults: [],
    showHighlightPopup: false,
    selectedText: '',
    selectedCfiRange: null,
  }),
  
  // Navigation
  goToLocation: (cfi) => {
    const { rendition } = get()
    if (rendition) {
      rendition.display(cfi)
    }
  },
  
  prevPage: () => {
    const { rendition } = get()
    if (rendition) {
      rendition.prev()
    }
  },
  
  nextPage: () => {
    const { rendition } = get()
    if (rendition) {
      rendition.next()
    }
  },
}))
