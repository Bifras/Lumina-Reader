// Tests for useCollectionStore
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCollectionStore } from '../useCollectionStore.ts'
import * as db from '../../db.ts'

// Mock all db functions
vi.mock('../../db.ts', () => ({
  getCollections: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  addBookToCollection: vi.fn(),
  removeBookFromCollection: vi.fn(),
  getBookCollections: vi.fn(),
  reorderCollections: vi.fn(),
  countBooksInCollection: vi.fn()
}))

describe('useCollectionStore', () => {
  const mockCollections = [
    { id: 'all', name: 'Tutti i Libri', type: 'smart', icon: 'Library', isDefault: true },
    { id: 'reading', name: 'In Lettura', type: 'smart', icon: 'BookOpen', isDefault: true },
    { id: 'custom-1', name: 'My Collection', type: 'custom', icon: 'Folder', isDefault: false }
  ]

  beforeEach(() => {
    // Reset store state before each test
    useCollectionStore.setState({
      collections: [],
      activeCollectionId: 'all',
      bookCollections: {},
      isLoading: false
    })
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCollectionStore.getState()
      expect(state.collections).toEqual([])
      expect(state.activeCollectionId).toBe('all')
      expect(state.bookCollections).toEqual({})
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Load Collections', () => {
    it('should load collections successfully', async () => {
      db.getCollections.mockResolvedValue(mockCollections)

      await useCollectionStore.getState().loadCollections()

      const state = useCollectionStore.getState()
      expect(state.collections).toEqual(mockCollections)
      expect(state.isLoading).toBe(false)
      expect(db.getCollections).toHaveBeenCalled()
    })

    it('should set loading state during load', async () => {
      // Create a promise we can resolve manually
      let resolveCollections
      db.getCollections.mockReturnValue(new Promise(resolve => {
        resolveCollections = resolve
      }))

      const loadPromise = useCollectionStore.getState().loadCollections()

      // Check loading state is set
      expect(useCollectionStore.getState().isLoading).toBe(true)

      // Resolve and wait
      resolveCollections(mockCollections)
      await loadPromise

      expect(useCollectionStore.getState().isLoading).toBe(false)
    })

    it('should handle loading errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      db.getCollections.mockRejectedValue(new Error('Load failed'))

      await useCollectionStore.getState().loadCollections()

      expect(useCollectionStore.getState().isLoading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Active Collection', () => {
    it('should set active collection', () => {
      useCollectionStore.setState({ collections: mockCollections })

      useCollectionStore.getState().setActiveCollection('reading')

      expect(useCollectionStore.getState().activeCollectionId).toBe('reading')
    })

    it('should get active collection', () => {
      useCollectionStore.setState({
        collections: mockCollections,
        activeCollectionId: 'reading'
      })

      const active = useCollectionStore.getState().getActiveCollection()

      expect(active).toEqual(mockCollections[1])
      expect(active.id).toBe('reading')
    })

    it('should return first collection if active not found', () => {
      useCollectionStore.setState({
        collections: mockCollections,
        activeCollectionId: 'non-existent'
      })

      const active = useCollectionStore.getState().getActiveCollection()

      expect(active).toEqual(mockCollections[0])
    })
  })

  describe('Create Collection', () => {
    it('should create new collection and add to list', async () => {
      const newCollection = {
        id: 'custom-2',
        name: 'New Collection',
        type: 'custom',
        icon: 'Folder'
      }

      db.createCollection.mockResolvedValue(newCollection)

      const result = await useCollectionStore.getState().createNewCollection({
        name: 'New Collection',
        icon: 'Folder'
      })

      expect(result).toEqual(newCollection)
      expect(useCollectionStore.getState().collections).toContainEqual(newCollection)
      expect(db.createCollection).toHaveBeenCalledWith({
        name: 'New Collection',
        icon: 'Folder'
      })
    })

    it('should handle creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      db.createCollection.mockRejectedValue(new Error('Create failed'))

      await expect(
        useCollectionStore.getState().createNewCollection({ name: 'Test' })
      ).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Update Collection', () => {
    it('should update collection', async () => {
      const updatedCollections = [
        { ...mockCollections[0] },
        { ...mockCollections[1] },
        { ...mockCollections[2], name: 'Updated Name' }
      ]

      db.updateCollection.mockResolvedValue(updatedCollections)

      await useCollectionStore.getState().updateCollectionData('custom-1', {
        name: 'Updated Name'
      })

      expect(useCollectionStore.getState().collections).toEqual(updatedCollections)
      expect(db.updateCollection).toHaveBeenCalledWith('custom-1', {
        name: 'Updated Name'
      })
    })
  })

  describe('Delete Collection', () => {
    it('should delete collection and update list', async () => {
      const filteredCollections = mockCollections.filter(c => c.id !== 'custom-1')
      db.deleteCollection.mockResolvedValue(filteredCollections)

      useCollectionStore.setState({ collections: mockCollections })

      await useCollectionStore.getState().deleteCollectionById('custom-1')

      expect(useCollectionStore.getState().collections).toEqual(filteredCollections)
      expect(db.deleteCollection).toHaveBeenCalledWith('custom-1')
    })

    it('should reset active collection if deleted collection was active', async () => {
      const filteredCollections = mockCollections.filter(c => c.id !== 'custom-1')
      db.deleteCollection.mockResolvedValue(filteredCollections)

      useCollectionStore.setState({
        collections: mockCollections,
        activeCollectionId: 'custom-1'
      })

      await useCollectionStore.getState().deleteCollectionById('custom-1')

      expect(useCollectionStore.getState().activeCollectionId).toBe('all')
    })

    it('should not reset active collection if deleting different collection', async () => {
      const filteredCollections = mockCollections.filter(c => c.id !== 'custom-1')
      db.deleteCollection.mockResolvedValue(filteredCollections)

      useCollectionStore.setState({
        collections: mockCollections,
        activeCollectionId: 'reading'
      })

      await useCollectionStore.getState().deleteCollectionById('custom-1')

      expect(useCollectionStore.getState().activeCollectionId).toBe('reading')
    })
  })

  describe('Reorder Collections', () => {
    it('should reorder collections', async () => {
      const reorderedCollections = [
        mockCollections[0],
        mockCollections[1],
        mockCollections[2]
      ]
      db.reorderCollections.mockResolvedValue(reorderedCollections)

      await useCollectionStore.getState().reorderCollections(['custom-1'])

      expect(useCollectionStore.getState().collections).toEqual(reorderedCollections)
      expect(db.reorderCollections).toHaveBeenCalledWith(['custom-1'])
    })
  })

  describe('Book Count', () => {
    it('should get book count for collection', async () => {
      const mockLibrary = [
        { id: 'book-1', progress: 50 },
        { id: 'book-2', progress: 100 }
      ]

      db.countBooksInCollection.mockResolvedValue(2)

      const count = await useCollectionStore.getState().getBookCount('reading', mockLibrary)

      expect(count).toBe(2)
      expect(db.countBooksInCollection).toHaveBeenCalledWith('reading', mockLibrary)
    })

    it('should return 0 on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      db.countBooksInCollection.mockRejectedValue(new Error('Count failed'))

      const count = await useCollectionStore.getState().getBookCount('reading', [])

      expect(count).toBe(0)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Book-Collection Relationships', () => {
    it('should add book to collection', async () => {
      db.addBookToCollection.mockResolvedValue()

      await useCollectionStore.getState().addBook('book-1', 'custom-1')

      const state = useCollectionStore.getState()
      expect(state.bookCollections['book-1']).toContain('custom-1')
      expect(db.addBookToCollection).toHaveBeenCalledWith('book-1', 'custom-1')
    })

    it('should append to existing book collections', async () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading'] }
      })
      db.addBookToCollection.mockResolvedValue()

      await useCollectionStore.getState().addBook('book-1', 'custom-1')

      expect(useCollectionStore.getState().bookCollections['book-1']).toEqual([
        'reading',
        'custom-1'
      ])
    })

    it('should remove book from collection', async () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading', 'custom-1'] }
      })
      db.removeBookFromCollection.mockResolvedValue()

      await useCollectionStore.getState().removeBook('book-1', 'reading')

      expect(useCollectionStore.getState().bookCollections['book-1']).toEqual([
        'custom-1'
      ])
      expect(db.removeBookFromCollection).toHaveBeenCalledWith('book-1', 'reading')
    })

    it('should load book collections', async () => {
      db.getBookCollections.mockResolvedValue(['reading', 'favorites'])

      const result = await useCollectionStore.getState().loadBookCollections('book-1')

      expect(result).toEqual(['reading', 'favorites'])
      expect(useCollectionStore.getState().bookCollections['book-1']).toEqual([
        'reading',
        'favorites'
      ])
    })

    it('should toggle book in collection - add when not present', async () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading'] }
      })
      db.addBookToCollection.mockResolvedValue()

      await useCollectionStore.getState().toggleBookInCollection('book-1', 'favorites')

      expect(db.addBookToCollection).toHaveBeenCalledWith('book-1', 'favorites')
      expect(useCollectionStore.getState().bookCollections['book-1']).toContain(
        'favorites'
      )
    })

    it('should toggle book in collection - remove when present', async () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading', 'favorites'] }
      })
      db.removeBookFromCollection.mockResolvedValue()

      await useCollectionStore.getState().toggleBookInCollection('book-1', 'favorites')

      expect(db.removeBookFromCollection).toHaveBeenCalledWith('book-1', 'favorites')
      expect(useCollectionStore.getState().bookCollections['book-1']).not.toContain(
        'favorites'
      )
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      useCollectionStore.setState({ collections: mockCollections })
    })

    it('should get custom collections', () => {
      const custom = useCollectionStore.getState().getCustomCollections()

      expect(custom).toHaveLength(1)
      expect(custom[0].id).toBe('custom-1')
      expect(custom[0].type).toBe('custom')
    })

    it('should get smart collections', () => {
      const smart = useCollectionStore.getState().getSmartCollections()

      expect(smart).toHaveLength(2)
      expect(smart.every(c => c.type === 'smart')).toBe(true)
    })

    it('should check if book is in collection', () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading', 'favorites'] }
      })

      expect(useCollectionStore.getState().isBookInCollection('book-1', 'reading')).toBe(
        true
      )
      expect(
        useCollectionStore.getState().isBookInCollection('book-1', 'custom-1')
      ).toBe(false)
    })

    it('should get book collection IDs', () => {
      useCollectionStore.setState({
        bookCollections: { 'book-1': ['reading', 'favorites'] }
      })

      const ids = useCollectionStore.getState().getBookCollectionIds('book-1')

      expect(ids).toEqual(['reading', 'favorites'])
    })

    it('should return empty array for book with no collections', () => {
      const ids = useCollectionStore.getState().getBookCollectionIds('book-2')

      expect(ids).toEqual([])
    })
  })
})
