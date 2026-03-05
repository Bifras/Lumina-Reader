import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LibraryService } from './LibraryService'
import { dbService } from '../db'
import type { Book } from '../types'

vi.mock('../db', () => ({
  dbService: {
    saveBookFile: vi.fn(),
    saveBookMetadata: vi.fn(),
    getBookFile: vi.fn(),
    deleteBookFile: vi.fn(),
    removeBook: vi.fn(),
    getLibrary: vi.fn(),
    searchBooks: vi.fn() // The new method we expect on dbService for SQLite advanced search
  }
}))

describe('LibraryService - Advanced Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock window.electronAPI to test SQLite specific behavior if needed
    if (typeof window !== 'undefined') {
      global.window.electronAPI = {
        db: {
          searchBooks: vi.fn()
        }
      } as any
    }
  })

  it('should call dbService.searchBooks when using advanced search', async () => {
    const mockResults: Book[] = [
      { id: '1', title: 'A', genre: 'Sci-Fi', addedAt: 1, progress: 0 }
    ]
    
    // We expect dbService to have a searchBooks method that delegates to IPC
    vi.mocked(dbService.searchBooks).mockResolvedValue(mockResults)

    const filters = { genre: 'Sci-Fi', minRating: 4 }
    
    // Call the new method we're designing
    const results = await LibraryService.searchBooks(filters)

    expect(dbService.searchBooks).toHaveBeenCalledWith(filters)
    expect(results).toEqual(mockResults)
  })
})
