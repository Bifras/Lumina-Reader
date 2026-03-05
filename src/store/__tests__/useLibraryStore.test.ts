import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLibraryStore } from '../useLibraryStore'
import * as db from '../../db'

// Mock the db module
vi.mock('../../db', () => ({
  getLibrary: vi.fn(),
  saveBookMetadata: vi.fn(),
  removeBook: vi.fn(),
  clearLibrary: vi.fn(),
}))

describe('useLibraryStore - Advanced Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { result } = renderHook(() => useLibraryStore())
    act(() => {
      result.current.setLibrary([])
      // Reset filters to default state (assuming these methods will exist)
      if (result.current.setAdvancedFilters) {
        result.current.setAdvancedFilters({})
      }
    })
  })

  it('should filter library by genre and minRating', () => {
    const mockLibrary = [
      { id: '1', title: 'Book 1', genre: 'Sci-Fi', rating: 5, progress: 0 },
      { id: '2', title: 'Book 2', genre: 'Fantasy', rating: 4, progress: 0 },
      { id: '3', title: 'Book 3', genre: 'Sci-Fi', rating: 3, progress: 0 },
    ]

    const { result } = renderHook(() => useLibraryStore())
    
    act(() => {
      result.current.setLibrary(mockLibrary)
    })

    // Initially should return all books (no advanced filters set)
    expect(result.current.getFilteredLibrary()).toHaveLength(3)

    // Apply advanced filters: we expect this method to be added to the store
    act(() => {
      result.current.setAdvancedFilters({ genre: 'Sci-Fi', minRating: 4 })
    })

    const filtered = result.current.getFilteredLibrary()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('should handle clearing advanced filters', () => {
    const mockLibrary = [
      { id: '1', title: 'Book 1', genre: 'Sci-Fi', rating: 5, progress: 0 },
      { id: '2', title: 'Book 2', genre: 'Fantasy', rating: 4, progress: 0 }
    ]

    const { result } = renderHook(() => useLibraryStore())
    
    act(() => {
      result.current.setLibrary(mockLibrary)
      result.current.setAdvancedFilters({ genre: 'Sci-Fi' })
    })

    expect(result.current.getFilteredLibrary()).toHaveLength(1)

    act(() => {
      result.current.clearAdvancedFilters()
    })

    expect(result.current.getFilteredLibrary()).toHaveLength(2)
  })
})
