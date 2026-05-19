import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MetadataService } from '../services/MetadataService'

describe('MetadataService Unit Tests', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('Private Helpers (via cast a any)', () => {
    it('should translate and normalize genres correctly via normalizeGenre', () => {
      const ms = MetadataService as any
      
      expect(ms.normalizeGenre('fiction')).toBe('Narrativa')
      expect(ms.normalizeGenre('classics')).toBe('Classici')
      expect(ms.normalizeGenre('historical fiction')).toBe('Narrativa storica')
      expect(ms.normalizeGenre('Mystery & Detective')).toBe('Giallo / Poliziesco')
      expect(ms.normalizeGenre('unknown-genre-abc')).toBe('Unknown-genre-abc') // Capitalizza se sconosciuto
      expect(ms.normalizeGenre(undefined)).toBeUndefined()
    })

    it('should deduce genre from title/description text via deduceGenreFromText', () => {
      const ms = MetadataService as any

      expect(ms.deduceGenreFromText('Una raccolta di poesie bellissime')).toBe('Poesia')
      expect(ms.deduceGenreFromText('Il saggio filosofico della natura')).toBe('Saggistica')
      expect(ms.deduceGenreFromText('La mia autobiografia e memorie')).toBe('Biografia')
      expect(ms.deduceGenreFromText('Un racconto breve di fantascienza con draghi')).toBe('Raccolta di racconti') // Primo match in ordine di regole
      expect(ms.deduceGenreFromText('Un delitto misterioso', 'L\'investigatore indaga sull\'omicidio')).toBe('Giallo / Poliziesco')
      expect(ms.deduceGenreFromText('Un libro a caso', 'Nessun indizio speciale qui')).toBeUndefined()
    })

    it('should deduce genre from classical narrative authors via deduceGenreFromAuthor', () => {
      const ms = MetadataService as any

      expect(ms.deduceGenreFromAuthor('Osamu Dazai')).toBe('Narrativa / Classici')
      expect(ms.deduceGenreFromAuthor('Dostoevskij')).toBe('Narrativa / Classici')
      expect(ms.deduceGenreFromAuthor('Alessandro Manzoni')).toBe('Narrativa / Classici')
      expect(ms.deduceGenreFromAuthor('Autore sconosciuto')).toBeUndefined()
      expect(ms.deduceGenreFromAuthor('Qualche Scrittore Moderno')).toBeUndefined()
    })

    it('should match authors properly via isAuthorMatch', () => {
      const ms = MetadataService as any

      expect(ms.isAuthorMatch('Osamu Dazai', 'Dazai')).toBe(true)
      expect(ms.isAuthorMatch('Osamu Dazai', 'Osamu Dazai')).toBe(true)
      expect(ms.isAuthorMatch('Osamu Dazai', 'Nicola Gardini')).toBe(false)
      expect(ms.isAuthorMatch('Alessandro Manzoni', 'A. Manzoni')).toBe(true)
      expect(ms.isAuthorMatch('Autore sconosciuto', 'Magnus')).toBe(true)
      expect(ms.isAuthorMatch(undefined, 'Magnus')).toBe(true)
    })
  })

  describe('searchMetadata and API fallbacks', () => {
    it('should return a virtual fallback result with deduced genre if all APIs return empty', async () => {
      // Mock fetch to return empty response
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [], docs: [], results: [] })
        } as Response)
      )

      const result = await MetadataService.searchMetadata('Lo sconosciuto', 'Osamu Dazai')

      expect(result.results.length).toBe(1)
      expect(result.results[0].title).toBe('Lo sconosciuto')
      expect(result.results[0].author).toBe('Osamu Dazai')
      expect(result.results[0].genre).toBe('Narrativa / Classici') // Dedotto da autore!
      expect(result.results[0].cover).toBeUndefined()
    })

    it('should filter out results from other authors and keep matching ones', async () => {
      // Mock fetch di iTunes e Google Books
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('itunes.apple.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              results: [
                { trackName: 'Lo sconosciuto', artistName: 'Nicola Gardini', genres: ['Fiction'] },
                { trackName: 'Lo squalificato', artistName: 'Osamu Dazai', genres: ['Fiction'] }
              ]
            })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ items: [] })
        } as Response)
      })

      const result = await MetadataService.searchMetadata('Lo sconosciuto', 'Osamu Dazai')

      // Nicola Gardini deve essere filtrato via perché stiamo cercando Osamu Dazai
      // Rimane solo Osamu Dazai (in questo caso "Lo squalificato" che è nella lista mockata)
      expect(result.results.every(r => r.author === 'Osamu Dazai')).toBe(true)
      expect(result.results[0].genre).toBe('Narrativa') // Tradotto da Fiction!
    })
  })
})
