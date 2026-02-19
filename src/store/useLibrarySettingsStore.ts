import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'grid' | 'list' | 'compact'
export type LibraryTheme = 'auto' | 'light' | 'dark'
export type SortOption = 'recent' | 'title' | 'author' | 'progress' | 'added'
export type GroupByOption = 'none' | 'author' | 'genre' | 'collection'

interface LibrarySettingsState {
  // Visual settings
  viewMode: ViewMode
  cardSize: number
  libraryTheme: LibraryTheme
  
  // Sorting and grouping
  sortBy: SortOption
  groupBy: GroupByOption
  sortDirection: 'asc' | 'desc'
  
  // Display options
  showProgress: boolean
  showAuthor: boolean
  showDate: boolean
  showCollection: boolean
  showGenre: boolean
  showRating: boolean
  
  // Filter persistence
  lastFilter: string
  lastSearch: string
}

interface LibrarySettingsActions {
  setViewMode: (mode: ViewMode) => void
  setCardSize: (size: number) => void
  setLibraryTheme: (theme: LibraryTheme) => void
  
  setSortBy: (sort: SortOption) => void
  setGroupBy: (group: GroupByOption) => void
  toggleSortDirection: () => void
  
  setShowProgress: (show: boolean) => void
  setShowAuthor: (show: boolean) => void
  setShowDate: (show: boolean) => void
  setShowCollection: (show: boolean) => void
  setShowGenre: (show: boolean) => void
  setShowRating: (show: boolean) => void
  
  setLastFilter: (filter: string) => void
  setLastSearch: (search: string) => void
  
  resetToDefaults: () => void
}

type LibrarySettingsStore = LibrarySettingsState & LibrarySettingsActions

const defaultSettings: LibrarySettingsState = {
  viewMode: 'grid',
  cardSize: 180,
  libraryTheme: 'auto',
  sortBy: 'recent',
  groupBy: 'none',
  sortDirection: 'desc',
  showProgress: true,
  showAuthor: true,
  showDate: false,
  showCollection: true,
  showGenre: true,
  showRating: true,
  lastFilter: '',
  lastSearch: '',
}

export const useLibrarySettingsStore = create<LibrarySettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setViewMode: (mode) => set({ viewMode: mode }),
      setCardSize: (size) => set({ cardSize: Math.max(120, Math.min(280, size)) }),
      setLibraryTheme: (theme) => {
        set({ libraryTheme: theme })
        // Theme is applied via data-library-theme attribute in LibraryView component
        // No need to set document.documentElement attribute here
      },
      
      setSortBy: (sort) => set({ sortBy: sort }),
      setGroupBy: (group) => set({ groupBy: group }),
      toggleSortDirection: () => set((state) => ({ 
        sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' 
      })),
      
      setShowProgress: (show) => set({ showProgress: show }),
      setShowAuthor: (show) => set({ showAuthor: show }),
      setShowDate: (show) => set({ showDate: show }),
      setShowCollection: (show) => set({ showCollection: show }),
      setShowGenre: (show) => set({ showGenre: show }),
      setShowRating: (show) => set({ showRating: show }),

      setLastFilter: (filter) => set({ lastFilter: filter }),
      setLastSearch: (search) => set({ lastSearch: search }),
      
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'lumina-library-settings',
      partialize: (state) => ({
        viewMode: state.viewMode,
        cardSize: state.cardSize,
        libraryTheme: state.libraryTheme,
        sortBy: state.sortBy,
        groupBy: state.groupBy,
        sortDirection: state.sortDirection,
        showProgress: state.showProgress,
        showAuthor: state.showAuthor,
        showDate: state.showDate,
        showCollection: state.showCollection,
        showGenre: state.showGenre,
        showRating: state.showRating,
        lastFilter: state.lastFilter,
        lastSearch: state.lastSearch,
      }),
      onRehydrateStorage: () => () => {
        // Library theme is applied via data-library-theme attribute in LibraryView component
        // Theme will be applied when LibraryView mounts and reads the persisted state
      },
    }
  )
)
