export interface WebMetadata {
  title: string
  author: string
  cover?: string
  genre?: string
  description?: string
  publishedDate?: string
  publisher?: string
  source: 'google' | 'openlibrary'
}

export class MetadataService {
  static async searchMetadata(title: string, author?: string): Promise<WebMetadata[]> {
    const query = `${title}${author ? ` ${author}` : ''}`
    const results: WebMetadata[] = []

    try {
      const [googleResults, openLibraryResults] = await Promise.allSettled([
        this.fetchFromGoogleBooks(query),
        this.fetchFromOpenLibrary(query)
      ])

      if (googleResults.status === 'fulfilled') {
        results.push(...googleResults.value)
      }
      if (openLibraryResults.status === 'fulfilled') {
        results.push(...openLibraryResults.value)
      }
    } catch (error) {
      console.error('Metadata search failed:', error)
    }

    return results
  }

  private static async fetchFromGoogleBooks(query: string): Promise<WebMetadata[]> {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`)
      const data = await response.json()

      if (!data.items) return []

      return data.items.map((item: any) => {
        const info = item.volumeInfo
        return {
          title: info.title,
          author: info.authors ? info.authors.join(', ') : 'Autore sconosciuto',
          cover: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
          genre: info.categories ? info.categories[0] : undefined,
          description: info.description,
          publishedDate: info.publishedDate,
          publisher: info.publisher,
          source: 'google'
        }
      })
    } catch (e) {
      console.warn('Google Books API failed:', e)
      return []
    }
  }

  private static async fetchFromOpenLibrary(query: string): Promise<WebMetadata[]> {
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`)
      const data = await response.json()

      if (!data.docs) return []

      return data.docs.map((doc: any) => ({
        title: doc.title,
        author: doc.author_name ? doc.author_name.join(', ') : 'Autore sconosciuto',
        cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
        genre: doc.subject ? doc.subject[0] : undefined,
        publishedDate: doc.first_publish_year?.toString(),
        publisher: doc.publisher ? doc.publisher[0] : undefined,
        source: 'openlibrary'
      }))
    } catch (e) {
      console.warn('Open Library API failed:', e)
      return []
    }
  }
}
