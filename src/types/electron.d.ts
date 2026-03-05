/**
 * Type definitions for Electron IPC API
 * Exposed via window.electronAPI in the renderer process
 */

export interface ElectronAPI {
  /**
   * Get the user data path from Electron app
   */
  getAppPath(): Promise<string>

  /**
   * Save an EPUB file to the filesystem
   * @param id - Book ID
   * @param arrayBuffer - Book file content
   */
  saveBookFile(id: string, arrayBuffer: ArrayBuffer): Promise<{ success: boolean; source: string }>

  /**
   * Delete an EPUB file from the filesystem
   * @param id - Book ID
   */
  deleteBookFile(id: string): Promise<boolean>

  /**
   * Get the port of the local HTTP server serving EPUB files
   */
  getBookServerPort(): Promise<number>

  /**
   * Window controls
   */
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>

  /**
   * Database API
   */
  db?: {
    getAllBooks(): Promise<any[]>
    saveBook(book: any): Promise<any>
    getBookById(id: string): Promise<any>
    deleteBook(id: string): Promise<void>
    updateBookProgress(id: string, cfi: string, progress: number): Promise<void>
    batchInsertBooks(books: any[]): Promise<void>

    getCollections(): Promise<any[]>
    saveCollection(collection: any): Promise<any>
    deleteCollection(id: string): Promise<void>

    getBookCollections(bookId: string): Promise<string[]>
    addBookToCollection(bookId: string, collectionId: string): Promise<void>
    removeBookFromCollection(bookId: string, collectionId: string): Promise<void>

    getAllTags(): Promise<any[]>
    saveTag(tag: any): Promise<any>
    deleteTag(id: string): Promise<void>
    addTagToBook(bookId: string, tagId: string): Promise<void>
    removeTagFromBook(bookId: string, tagId: string): Promise<void>
    getBookTags(bookId: string): Promise<any[]>

    searchBooks(filters: any): Promise<any[]>

    getHighlights(bookId: string): Promise<any[]>
    saveHighlight(highlight: any): Promise<any>
    deleteHighlight(id: string): Promise<void>

    getSetting(key: string): Promise<any>
    setSetting(key: string, value: any): Promise<void>
  }
}

/**
 * Extend the Window interface to include electronAPI
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
