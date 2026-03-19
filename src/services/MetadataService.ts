export interface WebMetadata {
  title: string
  author: string
  cover?: string
  genre?: string
  description?: string
  publishedDate?: string
  publisher?: string
  source: 'google' | 'openlibrary' | 'itunes'
}

export interface MetadataSearchResult {
  results: WebMetadata[]
  googleFailed: boolean
  openLibraryFailed: boolean
  itunesFailed: boolean
}

export class MetadataService {
  private static TIMEOUT_MS = 8000

  private static async timedFetch(url: string): Promise<Response | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS)
    try {
      return await fetch(url, { signal: controller.signal })
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  static async searchMetadata(title: string, author?: string): Promise<MetadataSearchResult> {
    const query = `${title}${author ? ` ${author}` : ''}`

    const [googleResult, openLibraryResult, itunesResult] = await Promise.allSettled([
      this.fetchFromGoogleBooks(query),
      this.fetchFromOpenLibrary(query),
      this.fetchFromITunes(query)
    ])

    const results: WebMetadata[] = []
    const googleFailed = googleResult.status !== 'fulfilled' || googleResult.value.length === 0
    const openLibraryFailed = openLibraryResult.status !== 'fulfilled' || openLibraryResult.value.length === 0
    const itunesFailed = itunesResult.status !== 'fulfilled' || itunesResult.value.length === 0

    if (googleResult.status === 'fulfilled') results.push(...googleResult.value)
    if (openLibraryResult.status === 'fulfilled') results.push(...openLibraryResult.value)
    if (itunesResult.status === 'fulfilled') results.push(...itunesResult.value)

    return { results, googleFailed, openLibraryFailed, itunesFailed }
  }

  private static async fetchFromGoogleBooks(query: string): Promise<WebMetadata[]> {
    try {
      const response = await this.timedFetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
      )
      if (!response) return []
      if (response.status === 429) return []
      if (!response.ok) return []

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
          source: 'google' as const
        }
      })
    } catch { return [] }
  }

  private static async fetchFromOpenLibrary(query: string): Promise<WebMetadata[]> {
    try {
      const response = await this.timedFetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`
      )
      if (!response || !response.ok) return []

      const data = await response.json()
      if (!data.docs) return []

      return data.docs.map((doc: any) => ({
        title: doc.title,
        author: doc.author_name ? doc.author_name.join(', ') : 'Autore sconosciuto',
        cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
        genre: doc.subject ? doc.subject[0] : undefined,
        publishedDate: doc.first_publish_year?.toString(),
        publisher: doc.publisher ? doc.publisher[0] : undefined,
        source: 'openlibrary' as const
      }))
    } catch { return [] }
  }

  private static async fetchFromITunes(query: string): Promise<WebMetadata[]> {
    try {
      const response = await this.timedFetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=ebook&limit=5`
      )
      if (!response || !response.ok) return []

      const data = await response.json()
      if (!data.results?.length) return []

      return data.results.map((item: any) => ({
        title: item.trackName,
        author: item.artistName || 'Autore sconosciuto',
        cover: item.artworkUrl100?.replace('100x100', '600x600'),
        genre: item.genres?.[0],
        publishedDate: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined,
        publisher: item.sellerName,
        source: 'itunes' as const
      }))
    } catch { return [] }
  }
}
