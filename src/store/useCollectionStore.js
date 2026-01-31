import { create } from 'zustand'
import { 
  getCollections, 
  createCollection, 
  updateCollection, 
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
  getBookCollections
} from '../db'

export const useCollectionStore = create((set, get) => ({
  // State
  collections: [],
  activeCollectionId: 'all',
  bookCollections: {}, // Map of bookId -> [collectionIds]
  isLoading: false,
  
  // Actions
  loadCollections: async () => {
    set({ isLoading: true })
    try {
      const collections = await getCollections()
      set({ collections, isLoading: false })
    } catch (error) {
      console.error('[CollectionStore] Error loading collections:', error)
      set({ isLoading: false })
    }
  },
  
  setActiveCollection: (collectionId) => {
    set({ activeCollectionId: collectionId })
  },
  
  createNewCollection: async (collectionData) => {
    try {
      const newCollection = await createCollection(collectionData)
      set((state) => ({
        collections: [...state.collections, newCollection]
      }))
      return newCollection
    } catch (error) {
      console.error('[CollectionStore] Error creating collection:', error)
      throw error
    }
  },
  
  updateCollectionData: async (collectionId, updates) => {
    try {
      const updatedCollections = await updateCollection(collectionId, updates)
      set({ collections: updatedCollections })
    } catch (error) {
      console.error('[CollectionStore] Error updating collection:', error)
      throw error
    }
  },
  
  deleteCollectionById: async (collectionId) => {
    try {
      const updatedCollections = await deleteCollection(collectionId)
      set((state) => ({
        collections: updatedCollections,
        activeCollectionId: state.activeCollectionId === collectionId ? 'all' : state.activeCollectionId
      }))
    } catch (error) {
      console.error('[CollectionStore] Error deleting collection:', error)
      throw error
    }
  },
  
  // Book-Collection relationships
  addBook: async (bookId, collectionId) => {
    try {
      await addBookToCollection(bookId, collectionId)
      set((state) => ({
        bookCollections: {
          ...state.bookCollections,
          [bookId]: [...(state.bookCollections[bookId] || []), collectionId]
        }
      }))
    } catch (error) {
      console.error('[CollectionStore] Error adding book to collection:', error)
      throw error
    }
  },
  
  removeBook: async (bookId, collectionId) => {
    try {
      await removeBookFromCollection(bookId, collectionId)
      set((state) => ({
        bookCollections: {
          ...state.bookCollections,
          [bookId]: (state.bookCollections[bookId] || []).filter(id => id !== collectionId)
        }
      }))
    } catch (error) {
      console.error('[CollectionStore] Error removing book from collection:', error)
      throw error
    }
  },
  
  loadBookCollections: async (bookId) => {
    try {
      const collectionIds = await getBookCollections(bookId)
      set((state) => ({
        bookCollections: {
          ...state.bookCollections,
          [bookId]: collectionIds
        }
      }))
      return collectionIds
    } catch (error) {
      console.error('[CollectionStore] Error loading book collections:', error)
      return []
    }
  },
  
  // Toggle book in collection (add if not present, remove if present)
  toggleBookInCollection: async (bookId, collectionId) => {
    const { bookCollections, addBook, removeBook } = get()
    const currentCollections = bookCollections[bookId] || []
    
    if (currentCollections.includes(collectionId)) {
      await removeBook(bookId, collectionId)
    } else {
      await addBook(bookId, collectionId)
    }
  },
  
  // Getters
  getActiveCollection: () => {
    const { collections, activeCollectionId } = get()
    return collections.find(c => c.id === activeCollectionId) || collections[0]
  },
  
  getCustomCollections: () => {
    const { collections } = get()
    return collections.filter(c => c.type === 'custom')
  },
  
  getSmartCollections: () => {
    const { collections } = get()
    return collections.filter(c => c.type === 'smart')
  },
  
  isBookInCollection: (bookId, collectionId) => {
    const { bookCollections } = get()
    return (bookCollections[bookId] || []).includes(collectionId)
  },
  
  getBookCollectionIds: (bookId) => {
    const { bookCollections } = get()
    return bookCollections[bookId] || []
  },
}))
