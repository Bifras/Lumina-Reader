import localforage from 'localforage'
import type { Book, Collection } from './types'

/**
 * DatabaseService handles all persistent storage operations.
 * Currently uses localforage (IndexedDB), structured for future transition to SQLite.
 */
class DatabaseService {
  private useSqlite: boolean = false;

  constructor() {
    localforage.config({
      name: 'LuminaReader',
      storeName: 'library'
    })
    this.init()
  }

  private init() {
    this.useSqlite = !!window.electronAPI?.db
    this.migrateToSqlite()
  }

  /** @internal - For testing only */
  resetForTest() {
    this.init()
  }

  private async migrateToSqlite() {
    if (!this.useSqlite) return

    const migrated = localStorage.getItem('sqlite_migrated')
    if (migrated) return

    console.log('[DB] Starting migration to SQLite...')
    try {
      // 1. Migrate Books
      const books = await localforage.getItem<Book[]>('books') || []
      if (books.length > 0) {
        await window.electronAPI!.db!.batchInsertBooks(books)
        console.log(`[DB] Migrated ${books.length} books.`)
      }

      // 2. Migrate Collections
      const collections = await localforage.getItem<Collection[]>('collections') || []
      for (const collection of collections) {
        await window.electronAPI!.db!.saveCollection(collection)
      }
      console.log(`[DB] Migrated ${collections.length} collections.`)

      // 3. Migrate Book-Collection Relationships
      const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
      for (const bookId in bookCollections) {
        for (const collectionId of bookCollections[bookId]) {
          await window.electronAPI!.db!.addBookToCollection(bookId, collectionId)
        }
      }
      console.log(`[DB] Migrated book-collection relationships.`)

      localStorage.setItem('sqlite_migrated', 'true')
      console.log('[DB] Migration to SQLite completed successfully.')
    } catch (error) {
      console.error('[DB] Migration to SQLite failed:', error)
    }
  }

  // --- Utility ---

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  private assertValidBookId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('ID libro non valido')
    }
  }

  // --- Collections ---

  async getCollections(): Promise<Collection[]> {
    if (this.useSqlite) {
      const collections = await window.electronAPI!.db!.getCollections()
      if (collections.length > 0) return collections
    }

    const collections = await localforage.getItem<Collection[]>('collections')
    if (!collections) {
      const defaultCollections: Collection[] = [
        { id: 'all', name: 'Tutti i Libri', type: 'smart', icon: 'Library', isDefault: true },
        { id: 'reading', name: 'In Lettura', type: 'smart', icon: 'BookOpen', isDefault: true },
        { id: 'finished', name: 'Completati', type: 'smart', icon: 'CheckCircle', isDefault: true },
        { id: 'unread', name: 'Da Leggere', type: 'smart', icon: 'Bookmark', isDefault: true },
        { id: 'favorites', name: 'Preferiti', type: 'custom', icon: 'Heart', isDefault: true }
      ]
      
      if (this.useSqlite) {
        for (const c of defaultCollections) {
          await window.electronAPI!.db!.saveCollection(c)
        }
      } else {
        await localforage.setItem('collections', defaultCollections)
      }
      return defaultCollections
    }
    return collections
  }

  async createCollection(collectionData: Omit<Collection, 'id' | 'type' | 'createdAt' | 'isDefault'>): Promise<Collection> {
    const newCollection: Collection = {
      id: this.generateId(),
      name: collectionData.name,
      type: 'custom',
      icon: collectionData.icon || 'Folder',
      color: collectionData.color || '#c05d4e',
      createdAt: Date.now(),
      isDefault: false
    }

    if (this.useSqlite) {
      await window.electronAPI!.db!.saveCollection(newCollection)
    } else {
      const collections = await this.getCollections()
      collections.push(newCollection)
      await localforage.setItem('collections', collections)
    }
    return newCollection
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection[]> {
    if (this.useSqlite) {
      const collections = await this.getCollections()
      const index = collections.findIndex(c => c.id === id)
      if (index !== -1 && !collections[index].isDefault) {
        const updated = { ...collections[index], ...updates }
        await window.electronAPI!.db!.saveCollection(updated)
      }
      return this.getCollections()
    }

    const collections = await this.getCollections()
    const index = collections.findIndex(c => c.id === id)
    if (index !== -1 && !collections[index].isDefault) {
      collections[index] = { ...collections[index], ...updates }
      await localforage.setItem('collections', collections)
    }
    return collections
  }

  async deleteCollection(id: string): Promise<Collection[]> {
    if (this.useSqlite) {
      await window.electronAPI!.db!.deleteCollection(id)
      return this.getCollections()
    }

    const collections = await this.getCollections()
    const filtered = collections.filter(c => c.id !== id || c.isDefault)
    await localforage.setItem('collections', filtered)

    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    for (const bookId in bookCollections) {
      bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== id)
    }
    await localforage.setItem('bookCollections', bookCollections)

    return filtered
  }

  // --- Book Metadata ---

  async getLibrary(): Promise<Book[]> {
    if (this.useSqlite) {
      return await window.electronAPI!.db!.getAllBooks()
    }
    return (await localforage.getItem<Book[]>('books')) || []
  }

  async saveBookMetadata(bookData: Book): Promise<Book[]> {
    if (!bookData?.id || !bookData?.title) {
      throw new Error('Dati libro non validi: campi obbligatori mancanti (id, titolo)')
    }

    if (this.useSqlite) {
      await window.electronAPI!.db!.saveBook(bookData)
      return this.getLibrary()
    }

    const library = await this.getLibrary()
    const index = library.findIndex(b => b.id === bookData.id)

    if (index !== -1) {
      library[index] = { ...library[index], ...bookData }
    } else {
      library.push(bookData)
    }

    await localforage.setItem('books', library)
    return library
  }

  async updateProgress(id: string, cfi: string, progress: number): Promise<void> {
    this.assertValidBookId(id)
    if (this.useSqlite) {
      await window.electronAPI!.db!.updateBookProgress(id, cfi, progress)
      return
    }

    const library = await this.getLibrary()
    const index = library.findIndex(b => b.id === id)
    if (index !== -1) {
      library[index].cfi = cfi
      library[index].progress = progress
      await localforage.setItem('books', library)
    }
  }

  async updateBookRating(id: string, rating: number): Promise<Book[]> {
    const book = await this.getBookById(id)
    if (book) {
      return await this.saveBookMetadata({ ...book, rating })
    }
    return this.getLibrary()
  }

  async updateBookGenre(id: string, genre: string): Promise<Book[]> {
    const book = await this.getBookById(id)
    if (book) {
      return await this.saveBookMetadata({ ...book, genre })
    }
    return this.getLibrary()
  }

  async getBookById(id: string): Promise<Book | null> {
    if (this.useSqlite) {
      return await window.electronAPI!.db!.getBookById(id)
    }
    const library = await this.getLibrary()
    return library.find(b => b.id === id) || null
  }

  async removeBook(id: string): Promise<Book[]> {
    this.assertValidBookId(id)
    if (this.useSqlite) {
      await window.electronAPI!.db!.deleteBook(id)
      return this.getLibrary()
    }
    const library = await this.getLibrary()
    const filtered = library.filter(b => b.id !== id)
    await localforage.setItem('books', filtered)
    return filtered
  }

  async clearLibrary(): Promise<Book[]> {
    if (this.useSqlite) {
      const books = await this.getLibrary()
      for (const b of books) {
        await window.electronAPI!.db!.deleteBook(b.id)
      }
      return []
    }
    await localforage.removeItem('books')
    return []
  }

  // --- Book Files ---

  async saveBookFile(id: string, arrayBuffer: ArrayBuffer): Promise<{ success: boolean; source: string }> {
    this.assertValidBookId(id)
    if (!(arrayBuffer instanceof ArrayBuffer)) {
      throw new Error('Parametri mancanti: id o arrayBuffer')
    }

    if (window.electronAPI?.saveBookFile) {
      return await window.electronAPI.saveBookFile(id, arrayBuffer)
    }
    await localforage.setItem(`book_file_${id}`, arrayBuffer)
    return { success: true, source: 'indexeddb' }
  }

  async deleteBookFile(id: string): Promise<boolean> {
    this.assertValidBookId(id)
    if (window.electronAPI?.deleteBookFile) {
      return await window.electronAPI.deleteBookFile(id)
    }
    await localforage.removeItem(`book_file_${id}`)
    return true
  }

  async getBookFile(id: string): Promise<ArrayBuffer | null> {
    this.assertValidBookId(id)
    if (window.electronAPI?.getBookServerPort) {
      try {
        const port = await window.electronAPI.getBookServerPort()
        const response = await fetch(`http://127.0.0.1:${port}/${id}.epub`)
        if (response.ok) return await response.arrayBuffer()
      } catch (e) {
        console.warn('[DB] Failed to fetch from Electron server:', e)
      }
    }
    return await localforage.getItem<ArrayBuffer>(`book_file_${id}`)
  }

  // --- Advanced Filtering ---
  async searchBooks(filters: any): Promise<Book[]> {
    if (this.useSqlite) {
      return await window.electronAPI!.db!.searchBooks(filters)
    }
    // Fallback for non-SQLite environments: fetch all and filter in-memory
    const library = await this.getLibrary()
    return library.filter(book => {
      if (filters.genre && book.genre !== filters.genre) return false
      if (filters.minRating && (book.rating || 0) < filters.minRating) return false
      if (filters.isFavorite !== undefined && !!book.isFavorite !== filters.isFavorite) return false
      if (filters.author && !book.author?.toLowerCase().includes(filters.author.toLowerCase())) return false
      if (filters.title && !book.title.toLowerCase().includes(filters.title.toLowerCase())) return false
      return true
    })
  }

  // --- Book Collections ---

  async addBookToCollection(bookId: string, collectionId: string): Promise<void> {
    if (this.useSqlite) {
      await window.electronAPI!.db!.addBookToCollection(bookId, collectionId)
      return
    }

    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    if (!bookCollections[bookId]) bookCollections[bookId] = []
    if (!bookCollections[bookId].includes(collectionId)) {
      bookCollections[bookId].push(collectionId)
      await localforage.setItem('bookCollections', bookCollections)
    }
  }

  async removeBookFromCollection(bookId: string, collectionId: string): Promise<void> {
    if (this.useSqlite) {
      await window.electronAPI!.db!.removeBookFromCollection(bookId, collectionId)
      return
    }

    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    if (bookCollections[bookId]) {
      bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== collectionId)
      await localforage.setItem('bookCollections', bookCollections)
    }
  }

  async getBookCollections(bookId: string): Promise<string[]> {
    if (this.useSqlite) {
      return await window.electronAPI!.db!.getBookCollections(bookId)
    }
    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    return bookCollections[bookId] || []
  }

  async getCollectionBookCount(collectionId: string): Promise<number> {
    if (this.useSqlite) {
      return await window.electronAPI!.db!.getCollectionBookCount(collectionId)
    }
    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    let count = 0
    for (const bookId in bookCollections) {
      if (bookCollections[bookId].includes(collectionId)) count++
    }
    return count
  }

  async reorderCollections(collectionIds: string[]): Promise<Collection[]> {
    const collections = await this.getCollections()
    const customCollections = collections.filter(c => c.type === 'custom' && !c.isDefault)
    const smartCollections = collections.filter(c => c.type === 'smart' || c.isDefault)
    
    const collectionMap: Record<string, Collection> = {}
    customCollections.forEach(c => collectionMap[c.id] = c)
    
    const reorderedCustom = collectionIds.map(id => collectionMap[id]).filter(Boolean) as Collection[]
    
    // Update orderIndex in SQLite if applicable
    if (this.useSqlite) {
      for (let i = 0; i < reorderedCustom.length; i++) {
        const c = reorderedCustom[i]
        await window.electronAPI!.db!.saveCollection({ ...c, orderIndex: i })
      }
      return this.getCollections()
    }

    const updatedCollections = [...smartCollections, ...reorderedCustom]
    await localforage.setItem('collections', updatedCollections)
    return updatedCollections
  }
}

export const dbService = new DatabaseService()

// Compatibility exports
export const getCollections = () => dbService.getCollections()
export const createCollection = (data: any) => dbService.createCollection(data)
export const updateCollection = (id: string, updates: any) => dbService.updateCollection(id, updates)
export const deleteCollection = (id: string) => dbService.deleteCollection(id)
export const addBookToCollection = (bookId: string, collectionId: string) => dbService.addBookToCollection(bookId, collectionId)
export const removeBookFromCollection = (bookId: string, collectionId: string) => dbService.removeBookFromCollection(bookId, collectionId)
export const getBookCollections = (bookId: string) => dbService.getBookCollections(bookId)
export const reorderCollections = (collectionIds: string[]) => dbService.reorderCollections(collectionIds)
export const countBooksInCollection = async (collectionId: string, library: Book[]): Promise<number> => {
  if (collectionId === 'favorites') return library.filter(b => b.isFavorite).length
  if (['all', 'reading', 'finished', 'unread'].includes(collectionId)) {
    return getBooksInCollection(collectionId, library).length
  }
  
  return dbService.getCollectionBookCount(collectionId)
}
export const getLibrary = () => dbService.getLibrary()
export const searchBooks = (filters: any) => dbService.searchBooks(filters)
export const saveBookMetadata = (data: Book) => dbService.saveBookMetadata(data)
export const updateProgress = (id: string, cfi: string, progress: number) => dbService.updateProgress(id, cfi, progress)
export const updateBookRating = (id: string, rating: number) => dbService.updateBookRating(id, rating)
export const updateBookGenre = (id: string, genre: string) => dbService.updateBookGenre(id, genre)
export const removeBook = (id: string) => dbService.removeBook(id)
export const clearLibrary = () => dbService.clearLibrary()
export const saveBookFile = (id: string, buffer: ArrayBuffer) => dbService.saveBookFile(id, buffer)
export const deleteBookFile = (id: string) => dbService.deleteBookFile(id)
export const getBookFile = (id: string) => dbService.getBookFile(id)
export const getBooksInCollection = (cid: string, lib: Book[]) => {
  switch (cid) {
    case 'all': return lib
    case 'reading': return lib.filter(b => b.progress > 0 && b.progress < 100)
    case 'finished': return lib.filter(b => b.progress === 100)
    case 'unread': return lib.filter(b => !b.progress || b.progress === 0)
    case 'favorites': return lib.filter(b => b.isFavorite)
    default: return lib.filter(b => b.collectionIds?.includes(cid))
  }
}
