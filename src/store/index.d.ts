// Type declarations for store module
import type { Collection } from '../types'

interface CollectionStoreState {
  collections: Collection[]
  activeCollectionId: string | null
  userCollections: Collection[]
  defaultCollections: Collection[]
}

interface CollectionStoreActions {
  addCollection: (name: string, icon: string, color?: string) => Collection
  removeCollection: (id: string) => void
  renameCollection: (id: string, name: string) => void
  reorderCollections: (newOrder: Collection[]) => Collection[]
  setActiveCollection: (id: string | null) => void
  addBookToCollection: (bookId: string, collectionId: string) => void
  removeBookFromCollection: (bookId: string, collectionId: string) => void
  toggleFavorite: (bookId: string) => void
  initializeDefaultCollections: () => void
  getDefaultCollections: () => Collection[]
  getUserCollections: () => Collection[]
  getAllCollections: () => Collection[]
}

type CollectionStore = CollectionStoreState & CollectionStoreActions

declare const useCollectionStore: () => CollectionStore

export { useCollectionStore }
export type { CollectionStore, CollectionStoreState, CollectionStoreActions }
