// Tests for db.js - Data access layer
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetStorage } from './test/mocks/localforage.js'
import localforage from 'localforage'
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBookCollections,
  getBooksInCollection,
  reorderCollections,
  countBooksInCollection,
  clearLibrary,
  saveBookMetadata,
  getLibrary,
  updateProgress,
  removeBook,
  saveBookFile,
  deleteBookFile,
  getBookFile
} from './db.ts'

describe('db.js - Collections Functions', () => {
  beforeEach(async () => {
    resetStorage()
    // Clear localforage
    await localforage.clear()
  })

  describe('getCollections', () => {
    it('should return default collections when none exist', async () => {
      const collections = await getCollections()

      expect(collections).toHaveLength(5)
      expect(collections.find(c => c.id === 'all')).toBeDefined()
      expect(collections.find(c => c.id === 'reading')).toBeDefined()
      expect(collections.find(c => c.id === 'finished')).toBeDefined()
      expect(collections.find(c => c.id === 'unread')).toBeDefined()
      expect(collections.find(c => c.id === 'favorites')).toBeDefined()
    })

    it('should store and retrieve default collections', async () => {
      await getCollections()

      const stored = await localforage.getItem('collections')
      expect(stored).toHaveLength(5)
    })

    it('should return existing collections', async () => {
      const customCollections = [
        { id: 'all', name: 'Tutti i Libri', type: 'smart', icon: 'Library', isDefault: true },
        { id: 'custom-1', name: 'My Custom', type: 'custom', icon: 'Folder', isDefault: false }
      ]
      await localforage.setItem('collections', customCollections)

      const collections = await getCollections()

      expect(collections).toEqual(customCollections)
    })
  })

  describe('createCollection', () => {
    it('should create a new custom collection', async () => {
      await getCollections() // Initialize defaults

      const newCollection = await createCollection({
        name: 'My Books',
        icon: 'Heart',
        color: '#ff0000'
      })

      expect(newCollection).toHaveProperty('id')
      expect(newCollection.name).toBe('My Books')
      expect(newCollection.type).toBe('custom')
      expect(newCollection.icon).toBe('Heart')
      expect(newCollection.color).toBe('#ff0000')
      expect(newCollection.isDefault).toBe(false)
      expect(newCollection).toHaveProperty('createdAt')
    })

    it('should add collection to storage', async () => {
      await getCollections()

      await createCollection({ name: 'Test' })

      const collections = await localforage.getItem('collections')
      expect(collections).toHaveLength(6) // 5 defaults + 1 custom
    })
  })

  describe('updateCollection', () => {
    it('should update custom collection', async () => {
      await getCollections()
      const newCollection = await createCollection({ name: 'Original Name' })

      const updated = await updateCollection(newCollection.id, { name: 'Updated Name' })

      const found = updated.find(c => c.id === newCollection.id)
      expect(found.name).toBe('Updated Name')
    })

    it('should not update default collection', async () => {
      await getCollections()

      const updated = await updateCollection('all', { name: 'Changed Name' })

      const all = updated.find(c => c.id === 'all')
      expect(all.name).toBe('Tutti i Libri') // Should remain unchanged
    })

    it('should return unchanged collections if id not found', async () => {
      await getCollections()

      const updated = await updateCollection('non-existent', { name: 'Test' })

      expect(updated).toHaveLength(5)
    })
  })

  describe('deleteCollection', () => {
    it('should delete custom collection', async () => {
      await getCollections()
      const newCollection = await createCollection({ name: 'To Delete' })

      const updated = await deleteCollection(newCollection.id)

      expect(updated.find(c => c.id === newCollection.id)).toBeUndefined()
    })

    it('should not delete default collection', async () => {
      await getCollections()

      const updated = await deleteCollection('all')

      expect(updated.find(c => c.id === 'all')).toBeDefined()
    })

    it('should remove book associations when deleting collection', async () => {
      await getCollections()
      const collection = await createCollection({ name: 'Test' })

      // Add some book associations
      await addBookToCollection('book-1', collection.id)
      await addBookToCollection('book-2', collection.id)

      await deleteCollection(collection.id)

      const bookCollections = await localforage.getItem('bookCollections')
      expect(bookCollections['book-1']).not.toContain(collection.id)
      expect(bookCollections['book-2']).not.toContain(collection.id)
    })
  })

  describe('addBookToCollection', () => {
    it('should add book to collection', async () => {
      await addBookToCollection('book-1', 'custom-1')

      const bookCollections = await localforage.getItem('bookCollections')
      expect(bookCollections['book-1']).toContain('custom-1')
    })

    it('should not add duplicate entry', async () => {
      await addBookToCollection('book-1', 'custom-1')
      await addBookToCollection('book-1', 'custom-1')

      const bookCollections = await localforage.getItem('bookCollections')
      const count = bookCollections['book-1'].filter(id => id === 'custom-1').length
      expect(count).toBe(1)
    })

    it('should add multiple collections to same book', async () => {
      await addBookToCollection('book-1', 'custom-1')
      await addBookToCollection('book-1', 'custom-2')

      const bookCollections = await localforage.getItem('bookCollections')
      expect(bookCollections['book-1']).toHaveLength(2)
    })
  })

  describe('removeBookFromCollection', () => {
    it('should remove book from collection', async () => {
      await addBookToCollection('book-1', 'custom-1')
      await removeBookFromCollection('book-1', 'custom-1')

      const bookCollections = await localforage.getItem('bookCollections')
      expect(bookCollections['book-1']).not.toContain('custom-1')
    })

    it('should handle removing from non-existent collection', async () => {
      await addBookToCollection('book-1', 'custom-1')

      await removeBookFromCollection('book-1', 'non-existent')

      const bookCollections = await localforage.getItem('bookCollections')
      expect(bookCollections['book-1']).toContain('custom-1')
    })
  })

  describe('getBookCollections', () => {
    it('should return empty array for book with no collections', async () => {
      const collections = await getBookCollections('book-1')

      expect(collections).toEqual([])
    })

    it('should return book collection IDs', async () => {
      await addBookToCollection('book-1', 'custom-1')
      await addBookToCollection('book-1', 'custom-2')

      const collections = await getBookCollections('book-1')

      expect(collections).toEqual(['custom-1', 'custom-2'])
    })
  })

  describe('getBooksInCollection', () => {
    const mockLibrary = [
      { id: 'book-1', title: 'Book 1', progress: 50 },
      { id: 'book-2', title: 'Book 2', progress: 100 },
      { id: 'book-3', title: 'Book 3', progress: 0 },
      { id: 'book-4', title: 'Book 4', progress: 30 },
      { id: 'book-5', title: 'Book 5', isFavorite: true }
    ]

    it('should return all books for "all" collection', () => {
      const books = getBooksInCollection('all', mockLibrary)
      expect(books).toEqual(mockLibrary)
    })

    it('should return reading books (progress > 0 and < 100)', () => {
      const books = getBooksInCollection('reading', mockLibrary)
      expect(books).toHaveLength(2)
      expect(books.every(b => b.progress > 0 && b.progress < 100)).toBe(true)
    })

    it('should return finished books (progress === 100)', () => {
      const books = getBooksInCollection('finished', mockLibrary)
      expect(books).toHaveLength(1)
      expect(books[0].progress).toBe(100)
    })

    it('should return unread books (progress === 0 or undefined)', () => {
      const books = getBooksInCollection('unread', mockLibrary)
      expect(books).toHaveLength(2) // book-3 has progress: 0, book-5 has undefined progress
      expect(books.every(b => !b.progress || b.progress === 0)).toBe(true)
    })

    it('should return favorite books', () => {
      const books = getBooksInCollection('favorites', mockLibrary)
      expect(books).toHaveLength(1)
      expect(books[0].isFavorite).toBe(true)
    })

    it('should return books in custom collection', () => {
      const libraryWithCollections = [
        { id: 'book-1', collectionIds: ['custom-1'] },
        { id: 'book-2', collectionIds: ['custom-2'] },
        { id: 'book-3', collectionIds: ['custom-1', 'custom-2'] }
      ]

      const books = getBooksInCollection('custom-1', libraryWithCollections)
      expect(books).toHaveLength(2)
      expect(books.every(b => b.collectionIds?.includes('custom-1'))).toBe(true)
    })
  })

  describe('reorderCollections', () => {
    it('should reorder custom collections', async () => {
      await getCollections()
      const c1 = await createCollection({ name: 'Collection 1' })
      const c2 = await createCollection({ name: 'Collection 2' })
      const c3 = await createCollection({ name: 'Collection 3' })

      const reordered = await reorderCollections([c3.id, c1.id, c2.id])

      // Filter to non-default custom collections (exclude favorites which has isDefault: true)
      const customCollections = reordered.filter(c => c.type === 'custom' && !c.isDefault)
      expect(customCollections[0].id).toBe(c3.id)
      expect(customCollections[1].id).toBe(c1.id)
      expect(customCollections[2].id).toBe(c2.id)
    })

    it('should keep smart collections at the beginning', async () => {
      await getCollections()
      await createCollection({ name: 'Custom' })

      const reordered = await reorderCollections([])

      expect(reordered[0].type).toBe('smart')
    })
  })

  describe('countBooksInCollection', () => {
    const mockLibrary = [
      { id: 'book-1', progress: 50 },
      { id: 'book-2', progress: 100 },
      { id: 'book-3', progress: 0 },
      { id: 'book-4', isFavorite: true },
      { id: 'book-5', isFavorite: true }
    ]

    it('should count favorite books', async () => {
      const count = await countBooksInCollection('favorites', mockLibrary)
      expect(count).toBe(2)
    })

    it('should count books in smart collection', async () => {
      const count = await countBooksInCollection('reading', mockLibrary)
      expect(count).toBe(1)
    })

    it('should count books in custom collection via bookCollections', async () => {
      await addBookToCollection('book-1', 'custom-1')
      await addBookToCollection('book-2', 'custom-1')
      await addBookToCollection('book-3', 'custom-2')

      const count = await countBooksInCollection('custom-1', mockLibrary)
      expect(count).toBe(2)
    })
  })
})

describe('db.js - Library Functions', () => {
  beforeEach(async () => {
    resetStorage()
    await localforage.clear()
  })

  describe('getLibrary', () => {
    it('should return empty array when no books exist', async () => {
      const library = await getLibrary()

      expect(library).toEqual([])
    })

    it('should return saved books', async () => {
      const books = [
        { id: 'book-1', title: 'Book 1', author: 'Author 1' },
        { id: 'book-2', title: 'Book 2', author: 'Author 2' }
      ]
      await localforage.setItem('books', books)

      const library = await getLibrary()

      expect(library).toEqual(books)
    })
  })

  describe('saveBookMetadata', () => {
    it('should add new book to library', async () => {
      const bookData = {
        id: 'book-1',
        title: 'Test Book',
        author: 'Test Author',
        cover: 'cover.jpg',
        cfi: 'epubcfi(/6/4)',
        progress: 0,
        addedAt: Date.now()
      }

      const library = await saveBookMetadata(bookData)

      expect(library).toHaveLength(1)
      expect(library[0].id).toBe('book-1')
      expect(library[0].title).toBe('Test Book')
    })

    it('should update existing book in library', async () => {
      const originalBook = {
        id: 'book-1',
        title: 'Original Title',
        author: 'Author',
        progress: 0,
        addedAt: Date.now()
      }
      await saveBookMetadata(originalBook)

      const updatedBook = {
        id: 'book-1',
        title: 'Updated Title',
        author: 'Author',
        progress: 50
      }

      const library = await saveBookMetadata(updatedBook)

      expect(library).toHaveLength(1)
      expect(library[0].title).toBe('Updated Title')
      expect(library[0].progress).toBe(50)
    })

    it('should throw error for invalid book data', async () => {
      await expect(saveBookMetadata(null)).rejects.toThrow()
      await expect(saveBookMetadata({})).rejects.toThrow()
      await expect(saveBookMetadata({ id: 'test' })).rejects.toThrow()
    })
  })

  describe('updateProgress', () => {
    it('should update book progress and CFI', async () => {
      const book = { id: 'book-1', title: 'Test', progress: 0 }
      await saveBookMetadata(book)

      await updateProgress('book-1', 'epubcfi(/6/4[ch1]!/4/2/1:0)', 50)

      const library = await getLibrary()
      const updated = library.find(b => b.id === 'book-1')

      expect(updated.cfi).toBe('epubcfi(/6/4[ch1]!/4/2/1:0)')
      expect(updated.progress).toBe(50)
    })

    it('should throw error for invalid book ID', async () => {
      await expect(updateProgress(null, 'cfi', 50)).rejects.toThrow()
    })

    it('should not update non-existent book', async () => {
      await updateProgress('non-existent', 'cfi', 50)

      const library = await getLibrary()
      expect(library).toHaveLength(0)
    })
  })

  describe('removeBook', () => {
    it('should remove book from library', async () => {
      const book1 = { id: 'book-1', title: 'Book 1', progress: 0 }
      const book2 = { id: 'book-2', title: 'Book 2', progress: 0 }
      await saveBookMetadata(book1)
      await saveBookMetadata(book2)

      const updated = await removeBook('book-1')

      expect(updated).toHaveLength(1)
      expect(updated.find(b => b.id === 'book-1')).toBeUndefined()
    })

    it('should throw error for invalid book ID', async () => {
      await expect(removeBook(null)).rejects.toThrow()
      await expect(removeBook('')).rejects.toThrow()
    })
  })

  describe('clearLibrary', () => {
    it('should clear all books', async () => {
      await saveBookMetadata({ id: 'book-1', title: 'Test', progress: 0 })
      await saveBookMetadata({ id: 'book-2', title: 'Test 2', progress: 0 })

      const cleared = await clearLibrary()

      expect(cleared).toEqual([])
      expect(await localforage.getItem('books')).toBeNull()
    })
  })
})

describe('db.js - File Storage Functions', () => {
  beforeEach(async () => {
    resetStorage()
    await localforage.clear()
    // Mock electronAPI
    global.window = Object.create(global.window)
    global.window.electronAPI = {
      saveBookFile: vi.fn(() => Promise.resolve(true)),
      deleteBookFile: vi.fn(() => Promise.resolve(true)),
      getBookServerPort: vi.fn(() => Promise.resolve(12345))
    }
  })

  describe('saveBookFile', () => {
    it('should use Electron API when available', async () => {
      const arrayBuffer = new ArrayBuffer(1024)
      await saveBookFile('book-1', arrayBuffer)

      expect(window.electronAPI.saveBookFile).toHaveBeenCalledWith('book-1', arrayBuffer)
    })

    it('should throw error for invalid parameters', async () => {
      await expect(saveBookFile(null, new ArrayBuffer(1))).rejects.toThrow()
      await expect(saveBookFile('book-1', null)).rejects.toThrow()
    })

    it('should fall back to IndexedDB in browser mode', async () => {
      global.window.electronAPI = undefined

      const arrayBuffer = new ArrayBuffer(1024)
      const result = await saveBookFile('book-1', arrayBuffer)

      expect(result.success).toBe(true)
      expect(result.source).toBe('indexeddb')
    })
  })

  describe('deleteBookFile', () => {
    it('should use Electron API when available', async () => {
      await deleteBookFile('book-1')

      expect(window.electronAPI.deleteBookFile).toHaveBeenCalledWith('book-1')
    })

    it('should throw error for invalid book ID', async () => {
      await expect(deleteBookFile(null)).rejects.toThrow()
    })

    it('should fall back to IndexedDB in browser mode', async () => {
      global.window.electronAPI = undefined

      // First save a file
      await localforage.setItem('book_file_book-1', new ArrayBuffer(1024))

      const result = await deleteBookFile('book-1')

      expect(result).toBe(true)
      expect(await localforage.getItem('book_file_book-1')).toBeNull()
    })
  })

  describe('getBookFile', () => {
    it('should fetch from Electron server when available', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        })
      )

      const result = await getBookFile('book-1')

      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:12345/book-1.epub')
    })

    it('should throw error for invalid book ID', async () => {
      await expect(getBookFile(null)).rejects.toThrow()
    })

    it('should fall back to IndexedDB when Electron API unavailable', async () => {
      global.window.electronAPI = undefined

      const testData = new ArrayBuffer(1024)
      await localforage.setItem('book_file_book-1', testData)

      const result = await getBookFile('book-1')

      expect(result).toEqual(testData)
    })

    it('should return null when file not found', async () => {
      global.window.electronAPI = undefined
      global.fetch = vi.fn(() => Promise.reject(new Error('Not found')))

      const result = await getBookFile('non-existent')

      expect(result).toBeNull()
    })
  })
})
