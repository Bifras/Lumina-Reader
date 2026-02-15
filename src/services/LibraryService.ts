import { dbService } from '../db'
import type { Book } from '../types'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export class LibraryService {
  static async importBook(file: File): Promise<Book> {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      throw new Error('Il file deve avere estensione .epub')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File troppo grande. Max: 100MB`)
    }

    const arrayBuffer = await file.arrayBuffer()
    const { default: ePub } = await import('epubjs')
    const book = ePub(arrayBuffer)
    let metadata: { title?: string; creator?: string } = {}
    let coverUrl: string | undefined

    try {
      metadata = await book.loaded.metadata as { title?: string; creator?: string }
      coverUrl = await this.extractCover(book)
    } finally {
      if (typeof book.destroy === 'function') {
        book.destroy()
      }
    }
    
    const bookId = crypto.randomUUID()
    await dbService.saveBookFile(bookId, arrayBuffer)

    const bookData: Book = {
      id: bookId,
      title: metadata.title || file.name.replace('.epub', ''),
      author: metadata.creator || 'Autore sconosciuto',
      cover: coverUrl,
      addedAt: Date.now(),
      progress: 0
    }

    await dbService.saveBookMetadata(bookData)
    return bookData
  }

  static async regenerateMissingCovers(books: Book[]): Promise<{
    library: Book[]
    successCount: number
    failCount: number
  }> {
    let successCount = 0
    let failCount = 0
    const { default: ePub } = await import('epubjs')

    for (const book of books) {
      let epubBook: any = null
      try {
        const fileData = await dbService.getBookFile(book.id)
        if (!fileData) {
          failCount++
          continue
        }

        epubBook = ePub(fileData)
        const coverUrl = await this.extractCover(epubBook)

        if (coverUrl) {
          await dbService.saveBookMetadata({ ...book, cover: coverUrl })
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.warn(`[LibraryService] Failed to regenerate cover for "${book.title}":`, error)
        failCount++
      } finally {
        if (epubBook && typeof epubBook.destroy === 'function') {
          try {
            epubBook.destroy()
          } catch (error) {
            console.warn('[LibraryService] Failed to destroy temporary EPUB instance:', error)
          }
        }
      }
    }

    const library = await this.getLibrary()
    return { library, successCount, failCount }
  }

  private static async extractCover(book: any): Promise<string | undefined> {
    try {
      const tempUrl = await book.coverUrl()
      if (!tempUrl) return undefined
      
      const response = await fetch(tempUrl)
      const blob = await response.blob()
      
      if (blob.size > 1024 * 1024) return undefined // Max 1MB for cover

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('[LibraryService] Failed to extract cover:', e)
      return undefined
    }
  }

  static async deleteBook(id: string): Promise<void> {
    await dbService.deleteBookFile(id)
    await dbService.removeBook(id)
  }

  static async getLibrary(): Promise<Book[]> {
    const books = await dbService.getLibrary()
    // Clean up expired blob URLs
    return books.map(book => {
      if (book.cover?.startsWith('blob:')) {
        return { ...book, cover: undefined }
      }
      return book
    })
  }
}
