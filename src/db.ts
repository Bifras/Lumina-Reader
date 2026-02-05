import localforage from 'localforage'
import type { Book, Collection } from './types'

// Generate UUID with fallback for non-secure contexts
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

localforage.config({
  name: 'LuminaReader',
  storeName: 'library'
})

// --- Collections Functions ---

/**
 * Recupera tutte le collezioni
 */
export const getCollections = async (): Promise<Collection[]> => {
  const collections = await localforage.getItem<Collection[]>('collections')
  if (!collections) {
    // Initialize with default collections
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

/**
 * Crea una nuova collezione
 */
export const createCollection = async (
  collectionData: Omit<Collection, 'id' | 'type' | 'createdAt' | 'isDefault'>
): Promise<Collection> => {
  const collections = await getCollections()
  const newCollection: Collection = {
    id: generateId(),
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

/**
 * Aggiorna una collezione
 */
export const updateCollection = async (
  id: string,
  updates: Partial<Collection>
): Promise<Collection[]> => {
  const collections = await getCollections()
  const index = collections.findIndex(c => c.id === id)
  if (index !== -1 && !collections[index].isDefault) {
    collections[index] = { ...collections[index], ...updates }
    await localforage.setItem('collections', collections)
  }
  return collections
}

/**
 * Elimina una collezione
 */
export const deleteCollection = async (id: string): Promise<Collection[]> => {
  const collections = await getCollections()
  const filtered = collections.filter(c => c.id !== id || c.isDefault)
  await localforage.setItem('collections', filtered)

  // Also remove all book associations with this collection
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  for (const bookId in bookCollections) {
    bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== id)
  }
  await localforage.setItem('bookCollections', bookCollections)

  return filtered
}

/**
 * Aggiunge un libro a una collezione
 */
export const addBookToCollection = async (bookId: string, collectionId: string): Promise<void> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  if (!bookCollections[bookId]) {
    bookCollections[bookId] = []
  }
  if (!bookCollections[bookId].includes(collectionId)) {
    bookCollections[bookId].push(collectionId)
    await localforage.setItem('bookCollections', bookCollections)
  }
}

/**
 * Rimuove un libro da una collezione
 */
export const removeBookFromCollection = async (bookId: string, collectionId: string): Promise<void> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  if (bookCollections[bookId]) {
    bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== collectionId)
    await localforage.setItem('bookCollections', bookCollections)
  }
}

/**
 * Recupera le collezioni di un libro
 */
export const getBookCollections = async (bookId: string): Promise<string[]> => {
  const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
  return bookCollections[bookId] || []
}

/**
 * Recupera tutti i libri di una collezione
 */
export const getBooksInCollection = (collectionId: string, library: Book[]): Book[] => {
  switch (collectionId) {
    case 'all':
      return library
    case 'reading':
      return library.filter(b => b.progress > 0 && b.progress < 100)
    case 'finished':
      return library.filter(b => b.progress === 100)
    case 'unread':
      return library.filter(b => !b.progress || b.progress === 0)
    case 'favorites':
      // Get book IDs from favorites collection
      return library.filter(b => b.isFavorite)
    default:
      // For custom collections, filter by bookCollections mapping
      return library.filter(b => b.collectionIds?.includes(collectionId))
  }
}

/**
 * Riordina le collezioni personalizzate
 */
export const reorderCollections = async (collectionIds: string[]): Promise<Collection[]> => {
  const collections = await getCollections()
  const customCollections = collections.filter(c => c.type === 'custom' && !c.isDefault)
  const smartCollections = collections.filter(c => c.type === 'smart' || c.isDefault)

  // Create a map for quick lookup
  const collectionMap: Record<string, Collection> = {}
  customCollections.forEach(c => collectionMap[c.id] = c)

  // Reorder custom collections based on provided order
  const reorderedCustom = collectionIds.map(id => collectionMap[id]).filter(Boolean) as Collection[]

  // Combine: smart collections first, then reordered custom collections
  const updatedCollections = [...smartCollections, ...reorderedCustom]

  await localforage.setItem('collections', updatedCollections)
  return updatedCollections
}

/**
 * Conta i libri in una collezione
 */
export const countBooksInCollection = async (collectionId: string, library: Book[]): Promise<number> => {
  if (collectionId === 'favorites') {
    return library.filter(b => b.isFavorite).length
  } else if (['all', 'reading', 'finished', 'unread'].includes(collectionId)) {
    return getBooksInCollection(collectionId, library).length
  } else {
    // Custom collection - check bookCollections
    const bookCollections = await localforage.getItem<Record<string, string[]>>('bookCollections') || {}
    let count = 0
    for (const bookId in bookCollections) {
      if (bookCollections[bookId].includes(collectionId)) {
        count++
      }
    }
    return count
  }
}

/**
 * Cancella l'intera libreria (metadata)
 */
export const clearLibrary = async (): Promise<Book[]> => {
  await localforage.removeItem('books')
  return []
}

/**
 * Salva i metadati di un libro nella libreria
 */
export const saveBookMetadata = async (bookData: Book): Promise<Book[]> => {
  if (!bookData || !bookData.id || !bookData.title) {
    throw new Error('Dati libro non validi: campi obbligatori mancanti (id, titolo)')
  }
  const library = (await localforage.getItem<Book[]>('books')) || []
  const index = library.findIndex(b => b.id === bookData.id)

  const metadata: Book = {
    id: bookData.id,
    title: bookData.title,
    author: bookData.author,
    cover: bookData.cover,
    cfi: bookData.cfi,
    progress: bookData.progress,
    addedAt: bookData.addedAt
  }

  if (index !== -1) {
    library[index] = { ...library[index], ...metadata }
  } else {
    library.push(metadata)
  }

  await localforage.setItem('books', library)
  return library
}

/**
 * Recupera la lista dei libri (metadati)
 */
export const getLibrary = async (): Promise<Book[]> => {
  return (await localforage.getItem<Book[]>('books')) || []
}

/**
 * Aggiorna il progresso di lettura e l'ultima posizione (CFI)
 */
export const updateProgress = async (id: string, cfi: string, progress: number): Promise<void> => {
  if (!id) {
    throw new Error('ID libro non valido')
  }
  const library = await getLibrary()
  const index = library.findIndex(b => b.id === id)
  if (index !== -1) {
    library[index].cfi = cfi
    library[index].progress = progress
    await localforage.setItem('books', library)
  }
}

/**
 * Rimuove un libro dalla libreria (metadati)
 */
export const removeBook = async (id: string): Promise<Book[]> => {
  if (!id) {
    throw new Error('ID libro non valido')
  }
  const library = await getLibrary()
  const filtered = library.filter(b => b.id !== id)
  await localforage.setItem('books', filtered)
  return filtered
}

/**
 * Salva il file EPUB sul disco tramite Electron IPC (o IndexedDB in modalità browser)
 */
export const saveBookFile = async (
  id: string,
  arrayBuffer: ArrayBuffer
): Promise<{ success: boolean; source: string }> => {
  if (!id || !arrayBuffer) {
    throw new Error('Parametri mancanti: id o arrayBuffer')
  }
  if (window.electronAPI?.saveBookFile) {
    return await window.electronAPI.saveBookFile(id, arrayBuffer)
  }
  // Modalità browser: salva in IndexedDB
  try {
    await localforage.setItem(`book_file_${id}`, arrayBuffer)
    console.log('[DB] Book file saved to IndexedDB:', id)
    return { success: true, source: 'indexeddb' }
  } catch (error) {
    console.error('[DB] Failed to save book file to IndexedDB:', error)
    throw error
  }
}

/**
 * Elimina il file EPUB dal disco tramite Electron IPC (o IndexedDB in modalità browser)
 */
export const deleteBookFile = async (id: string): Promise<boolean> => {
  if (!id) {
    throw new Error('ID libro non valido')
  }
  if (window.electronAPI?.deleteBookFile) {
    return await window.electronAPI.deleteBookFile(id)
  }
  // Modalità browser: elimina da IndexedDB
  try {
    await localforage.removeItem(`book_file_${id}`)
    console.log('[DB] Book file deleted from IndexedDB:', id)
    return true
  } catch (error) {
    console.error('[DB] Failed to delete book file from IndexedDB:', error)
    return false
  }
}

/**
 * Recupera il file EPUB (da Electron IPC o IndexedDB in modalità browser)
 */
export const getBookFile = async (id: string): Promise<ArrayBuffer | null> => {
  if (!id) {
    throw new Error('ID libro non valido')
  }

  // Modalità Electron: usa il server HTTP
  if (window.electronAPI?.getBookServerPort) {
    try {
      const port = await window.electronAPI.getBookServerPort()
      const response = await fetch(`http://127.0.0.1:${port}/${id}.epub`)
      if (response.ok) {
        return await response.arrayBuffer()
      }
    } catch (error) {
      console.warn('[DB] Failed to fetch from Electron server:', error)
    }
  }

  // Modalità browser: recupera da IndexedDB
  try {
    const data = await localforage.getItem<ArrayBuffer>(`book_file_${id}`)
    if (data) {
      console.log('[DB] Book file retrieved from IndexedDB:', id)
      return data
    }
  } catch (error) {
    console.error('[DB] Failed to get book file from IndexedDB:', error)
  }

  return null
}
