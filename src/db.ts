import localforage from 'localforage'
import type { Book, Collection } from './types'

/**
 * DatabaseService handles all persistent storage operations.
 * Currently uses localforage (IndexedDB), structured for future transition to SQLite.
 */
class DatabaseService {
  constructor() {
    localforage.config({
      name: 'LuminaReader',
      storeName: 'library'
    })
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
    const collections = await localforage.getItem<Collection[]>('collections')
    if (!collections) {
      const defaultCollections: Collection[] = [
        { id: 'all', name: 'Tutti i Libri', type: 'smart', icon: 'Library', isDefault: true },
        { id: 'reading', name: 'In Lettura', type: 'smart', icon: 'BookOpen', isDefault: true },
        { id: 'finished', name: 'Completati', type: 'smart', icon: 'CheckCircle', isDefault: true },
        { id: 'unread', name: 'Da Leggere', type: 'smart', icon: 'Bookmark', isDefault: true },
        { id: 'favorites', name: 'Preferiti', type: 'custom', icon: 'Heart', isDefault: true }
      ]
      await localforage.setItem('collections', defaultCollections)
      return defaultCollections
    }
    return collections
  }

  async createCollection(collectionData: Omit<Collection, 'id' | 'type' | 'createdAt' | 'isDefault'>): Promise<Collection> {
    const collections = await this.getCollections()
    const newCollection: Collection = {
      id: this.generateId(),
      name: collectionData.name,
      type: 'custom',
      icon: collectionData.icon || 'Folder',
      color: collectionData.color || '#c05d4e',
      createdAt: Date.now(),
      isDefault: false
    }
    collections.push(newCollection)
    await localforage.setItem('collections', collections)
    return newCollection
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection[]> {
    const collections = await this.getCollections()
    const index = collections.findIndex(c => c.id === id)
    if (index !== -1 && !collections[index].isDefault) {
      collections[index] = { ...collections[index], ...updates }
      await localforage.setItem('collections', collections)
    }
    return collections
  }

  async deleteCollection(id: string): Promise<Collection[]> {
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
    return (await localforage.getItem<Book[]>('books')) || []
  }

  async saveBookMetadata(bookData: Book): Promise<Book[]> {
    if (!bookData?.id || !bookData?.title) {
      throw new Error('Dati libro non validi: campi obbligatori mancanti (id, titolo)')
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
    const library = await this.getLibrary()
    const index = library.findIndex(b => b.id === id)
    if (index !== -1) {
      library[index].cfi = cfi
      library[index].progress = progress
      await localforage.setItem('books', library)
    }
  }

  async updateBookRating(id: string, rating: number): Promise<Book[]> {
    const library = await this.getLibrary()
    const index = library.findIndex(b => b.id === id)
    if (index !== -1) {
      library[index].rating = rating
      await localforage.setItem('books', library)
    }
    return library
  }

  async updateBookGenre(id: string, genre: string): Promise<Book[]> {
    const library = await this.getLibrary()
    const index = library.findIndex(b => b.id === id)
    if (index !== -1) {
      library[index].genre = genre
      await localforage.setItem('books', library)
    }
    return library
  }

  async removeBook(id: string): Promise<Book[]> {
    this.assertValidBookId(id)
    const library = await this.getLibrary()
    const filtered = library.filter(b => b.id !== id)
    await localforage.setItem('books', filtered)
    return filtered
  }

  async clearLibrary(): Promise<Book[]> {
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
}

export const dbService = new DatabaseService()

// Compatibility exports to avoid breaking changes immediately
export const getCollections = () => dbService.getCollections()
export const createCollection = (data: any) => dbService.createCollection(data)
export const updateCollection = (id: string, updates: any) => dbService.updateCollection(id, updates)
export const deleteCollection = (id: string) => dbService.deleteCollection(id)
export const addBookToCollection = async (bookId: string, collectionId: string): Promise<void> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  if (!bookCollections[bookId]) bookCollections[bookId] = []
  if (!bookCollections[bookId].includes(collectionId)) {
    bookCollections[bookId].push(collectionId)
    await localforage.setItem('bookCollections', bookCollections)
  }
}
export const removeBookFromCollection = async (bookId: string, collectionId: string): Promise<void> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  if (bookCollections[bookId]) {
    bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== collectionId)
    await localforage.setItem('bookCollections', bookCollections)
  }
}
export const getBookCollections = async (bookId: string): Promise<string[]> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  return bookCollections[bookId] || []
}
export const reorderCollections = async (collectionIds: string[]): Promise<Collection[]> => {
  const collections = await dbService.getCollections()
  const customCollections = collections.filter(c => c.type === 'custom' && !c.isDefault)
  const smartCollections = collections.filter(c => c.type === 'smart' || c.isDefault)
  const collectionMap: Record<string, Collection> = {}
  customCollections.forEach(c => collectionMap[c.id] = c)
  const reorderedCustom = collectionIds.map(id => collectionMap[id]).filter(Boolean) as Collection[]
  const updatedCollections = [...smartCollections, ...reorderedCustom]
  await localforage.setItem('collections', updatedCollections)
  return updatedCollections
}
export const countBooksInCollection = async (collectionId: string, library: Book[]): Promise<number> => {
  if (collectionId === 'favorites') return library.filter(b => b.isFavorite).length
  if (['all', 'reading', 'finished', 'unread'].includes(collectionId)) {
    return getBooksInCollection(collectionId, library).length
  }
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  let count = 0
  for (const bookId in bookCollections) {
    if (bookCollections[bookId].includes(collectionId)) count++
  }
  return count
}
export const getLibrary = () => dbService.getLibrary()
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
