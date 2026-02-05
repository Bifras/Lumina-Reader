import { create } from 'zustand'
import { getLibrary, saveBookMetadata, removeBook, clearLibrary } from '../db'
import type { Book } from '../types'

export type SortBy = 'addedAt' | 'title' | 'author' | 'progress' | 'lastRead'
export type SortOrder = 'asc' | 'desc'
export type FilterBy = 'all' | 'reading' | 'finished' | 'unread'
export type ViewMode = 'grid' | 'list'

export interface LibraryStoreState {
  library: Book[]
  isLoading: boolean
  searchQuery: string
  sortBy: SortBy
  sortOrder: SortOrder
  filterBy: FilterBy
  viewMode: ViewMode
}

export interface LibraryStoreActions {
  // Actions
  setLibrary: (library: Book[]) => void
  loadLibrary: () => Promise<void>
  addBook: (bookData: Omit<Book, 'id' | 'addedAt'> & { id?: string; addedAt?: number }) => Promise<Book[]>
  removeBook: (bookId: string) => Promise<Book[]>
  clearLibrary: () => Promise<Book[]>
  updateBookProgress: (bookId: string, progress: number, cfi?: string) => void
  
  // Search and filter
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: SortBy) => void
  setSortOrder: (sortOrder: SortOrder) => void
  setFilterBy: (filterBy: FilterBy) => void
  setViewMode: (viewMode: ViewMode) => void
  toggleSortOrder: () => void
  
  // Computed
  getFilteredLibrary: () => Book[]
  getCurrentlyReading: () => Book | undefined
  getRecentBooks: (count?: number) => Book[]
}

export type LibraryStore = LibraryStoreState & LibraryStoreActions

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // State
  library: [],
  isLoading: false,
  searchQuery: '',
  sortBy: 'addedAt',
  sortOrder: 'desc',
  filterBy: 'all',
  viewMode: 'grid',
  
  // Actions
  setLibrary: (library) => set({ library }),
  
  loadLibrary: async () => {
    set({ isLoading: true })
    try {
      const library = await getLibrary()
      set({ library, isLoading: false })
    } catch (error) {
      console.error('[LibraryStore] Error loading library:', error)
      set({ isLoading: false })
    }
  },
  
  addBook: async (bookData) => {
    try {
      const newLibrary = await saveBookMetadata(bookData as Book)
      set({ library: newLibrary })
      return newLibrary
    } catch (error) {
      console.error('[LibraryStore] Error adding book:', error)
      throw error
    }
  },
  
  removeBook: async (bookId) => {
    try {
      const newLibrary = await removeBook(bookId)
      set({ library: newLibrary })
      return newLibrary
    } catch (error) {
      console.error('[LibraryStore] Error removing book:', error)
      throw error
    }
  },
  
  clearLibrary: async () => {
    try {
      const newLibrary = await clearLibrary()
      set({ library: newLibrary })
      return newLibrary
    } catch (error) {
      console.error('[LibraryStore] Error clearing library:', error)
      throw error
    }
  },
  
  updateBookProgress: (bookId, progress, cfi) => {
    set((state) => ({
      library: state.library.map(book =>
        book.id === bookId 
          ? { ...book, progress, cfi, lastReadAt: Date.now() }
          : book
      )
    }))
  },
  
  // Search and filter
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setFilterBy: (filterBy) => set({ filterBy }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleSortOrder: () => set((state) => ({ 
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' 
  })),
  
  // Computed
  getFilteredLibrary: () => {
    const { library, searchQuery, sortBy, sortOrder, filterBy } = get()
    
    let filtered = [...library]
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query)
      )
    }
    
    // Apply filter
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'reading':
          filtered = filtered.filter(book => book.progress > 0 && book.progress < 100)
          break
        case 'finished':
          filtered = filtered.filter(book => book.progress === 100)
          break
        case 'unread':
          filtered = filtered.filter(book => book.progress === 0)
          break
      }
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'author':
          comparison = (a.author || '').localeCompare(b.author || '')
          break
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0)
          break
        case 'lastRead':
          comparison = ((a as Book & { lastReadAt?: number }).lastReadAt || 0) - ((b as Book & { lastReadAt?: number }).lastReadAt || 0)
          break
        case 'addedAt':
        default:
          comparison = (a.addedAt || 0) - (b.addedAt || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  },
  
  getCurrentlyReading: () => {
    const { library } = get()
    return library.find(book => book.progress > 0 && book.progress < 100) || library[0]
  },
  
  getRecentBooks: (count = 5) => {
    const { library } = get()
    return [...library]
      .sort((a, b) => {
        const aTime = (a as Book & { lastReadAt?: number }).lastReadAt || a.addedAt
        const bTime = (b as Book & { lastReadAt?: number }).lastReadAt || b.addedAt
        return bTime - aTime
      })
      .slice(0, count)
  },
}))
