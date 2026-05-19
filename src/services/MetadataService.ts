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

export interface RankedMetadataSearchResult extends MetadataSearchResult {
  bestMatch: WebMetadata | null
}

export class MetadataService {
  private static TIMEOUT_MS = 8000

  private static GENRE_MAP: Record<string, string> = {
    'fiction': 'Narrativa',
    'classics': 'Classici',
    'historical fiction': 'Narrativa storica',
    'historical romance': 'Romanzi rosa storici',
    'romance': 'Narrativa rosa',
    'drama': 'Drammatico',
    'mystery': 'Giallo / Poliziesco',
    'detective and mystery stories': 'Giallo / Poliziesco',
    'thriller': 'Thriller',
    'suspense': 'Suspense',
    'science fiction': 'Fantascienza',
    'fantasy': 'Fantasy',
    'biography': 'Biografia',
    'autobiography': 'Biografia',
    'biography & autobiography': 'Biografia',
    'history': 'Storia',
    'poetry': 'Poesia',
    'philosophy': 'Filosofia',
    'psychology': 'Psicologia',
    'essays': 'Saggistica',
    'juvenile fiction': 'Narrativa per ragazzi',
    'young adult fiction': 'Narrativa Young Adult',
    'art': 'Arte',
    'comics & graphic novels': 'Fumetto / Manga',
    'literary criticism': 'Critica Letteraria',
    'general': 'Generale'
  };

  private static normalizeGenre(genre?: string): string | undefined {
    if (!genre) return undefined;
    const clean = genre.toLowerCase().trim().replace(/[.\-_]/g, ' ');
    
    // Controlla corrispondenza esatta nella mappa
    if (this.GENRE_MAP[clean]) {
      return this.GENRE_MAP[clean];
    }
    
    // Controlla corrispondenze parziali
    for (const [key, value] of Object.entries(this.GENRE_MAP)) {
      if (clean.includes(key) || key.includes(clean)) {
        return value;
      }
    }
    
    // Capitalizza la prima lettera se non è mappato
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  }

  private static deduceGenreFromText(title: string, description?: string): string | undefined {
    const textToAnalyze = `${title} ${description || ''}`.toLowerCase();
    
    const rules = [
      { pattern: /\b(poesia|poesie|lirica|liriche|versi|poetry|poems)\b/, genre: 'Poesia' },
      { pattern: /\b(racconto|racconti|novella|novelle|short stories|anthology)\b/, genre: 'Raccolta di racconti' },
      { pattern: /\b(saggio|saggi|trattato|critica|studio|essays|essay|treatise)\b/, genre: 'Saggistica' },
      { pattern: /\b(biografia|biografie|autobiografia|autobiografie|memorie|memoirs?|biography)\b/, genre: 'Biografia' },
      { pattern: /\b(giallo|poliziesco|investigatore|delitto|omicidio|detective|mystery|crime)\b/, genre: 'Giallo / Poliziesco' },
      { pattern: /\b(thriller|suspense|tensione)\b/, genre: 'Thriller' },
      { pattern: /\b(fantascienza|sci-fi|astronave|futuro|distopia|distopico|cyberpunk)\b/, genre: 'Fantascienza' },
      { pattern: /\b(fantasy|magia|draghi|elfi|incantesimo|wizard|magic)\b/, genre: 'Fantasy' },
      { pattern: /\b(storia|storico|storica|guerra|medioevo|historical)\b/, genre: 'Storia / Storico' },
      { pattern: /\b(fumetto|fumetti|manga|comics|graphic novel)\b/, genre: 'Fumetto / Manga' },
      { pattern: /\b(teatro|commedia|tragedia|dramma|opera|play)\b/, genre: 'Teatro / Drammatico' },
      { pattern: /\b(filosofia|filosofico|philosoph)\b/, genre: 'Filosofia' }
    ];

    for (const rule of rules) {
      if (rule.pattern.test(textToAnalyze)) {
        return rule.genre;
      }
    }
    
    return undefined;
  }

  private static deduceGenreFromAuthor(author?: string): string | undefined {
    if (!author || author === 'Autore sconosciuto') return undefined;
    const cleanAuthor = author.toLowerCase();
    
    const narrativeAuthors = [
      'dazai', 'murakami', 'dostoevsky', 'dostoevskij', 'tolstoy', 'tolstoj',
      'manzoni', 'woolf', 'kafka', 'camus', 'sartre', 'joyce', 'orwell',
      'hemingway', 'fitzgerald', 'faulkner', 'marquez', 'calvino', 'eco',
      'pirandello', 'svevo', 'moravia', 'pavese', 'verga', 'leopardi',
      'allende', 'austen', 'bronte', 'dickens', 'dumas', 'hugo', 'balzac',
      'flaubert', 'stendhal', 'zola', 'proust', 'chekhov', 'cechov', 'gogol',
      'turgenev', 'pushkin', 'suskind', 'mann', 'hesse', 'remarque', 'böll'
    ];
    
    for (const name of narrativeAuthors) {
      if (cleanAuthor.includes(name)) {
        return 'Narrativa / Classici';
      }
    }
    
    return undefined;
  }

  private static isAuthorMatch(searchedAuthor?: string, foundAuthor?: string): boolean {
    if (!searchedAuthor || searchedAuthor === 'Autore sconosciuto') return true;
    if (!foundAuthor || foundAuthor === 'Autore sconosciuto') return true;
    
    const sAuth = searchedAuthor.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const fAuth = foundAuthor.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    
    const sWords = sAuth.split(/\s+/).filter(w => w.length > 2);
    const fWords = fAuth.split(/\s+/).filter(w => w.length > 2);
    
    if (sWords.length === 0 || fWords.length === 0) return true;
    
    return sWords.some(sWord => fWords.some(fWord => fWord.includes(sWord) || sWord.includes(fWord)));
  }

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
    const cleanAuthor = author === 'Autore sconosciuto' ? undefined : author;

    const [googleResult, openLibraryResult, itunesResult] = await Promise.allSettled([
      this.fetchFromGoogleBooks(title, cleanAuthor),
      this.fetchFromOpenLibrary(title, cleanAuthor),
      this.fetchFromITunes(title, cleanAuthor)
    ])

    let results: WebMetadata[] = []
    const googleFailed = googleResult.status !== 'fulfilled' || googleResult.value.length === 0
    const openLibraryFailed = openLibraryResult.status !== 'fulfilled' || openLibraryResult.value.length === 0
    const itunesFailed = itunesResult.status !== 'fulfilled' || itunesResult.value.length === 0

    if (googleResult.status === 'fulfilled') results.push(...googleResult.value)
    if (openLibraryResult.status === 'fulfilled') results.push(...openLibraryResult.value)
    if (itunesResult.status === 'fulfilled') results.push(...itunesResult.value)

    // Filtriamo i risultati per eliminare quelli di autori diversi (se l'autore cercato è specificato)
    if (cleanAuthor) {
      results = results.filter(res => this.isAuthorMatch(cleanAuthor, res.author));
    }

    // Se non ci sono risultati reali rimasti (es. "Lo sconosciuto" di "Osamu Dazai"), generiamo un risultato virtuale pulito
    if (results.length === 0 && (title || cleanAuthor)) {
      let deducedGenre = this.deduceGenreFromText(title);
      if (!deducedGenre && cleanAuthor) {
        deducedGenre = this.deduceGenreFromAuthor(cleanAuthor);
      }
      
      results.push({
        title: title,
        author: cleanAuthor || 'Autore sconosciuto',
        genre: deducedGenre || 'Narrativa',
        source: 'google' // Sorgente coerente
      });
    } else {
      // Arricchimento post-processo sui risultati reali
      results.forEach(res => {
        if (!res.genre) {
          res.genre = this.deduceGenreFromText(res.title, res.description);
        }
        if (!res.genre && (res.author || cleanAuthor)) {
          res.genre = this.deduceGenreFromAuthor(res.author || cleanAuthor);
        }
      });
    }

    return { results, googleFailed, openLibraryFailed, itunesFailed }
  }

  static async searchBestMetadata(title: string, author?: string): Promise<RankedMetadataSearchResult> {
    const result = await this.searchMetadata(title, author)
    return {
      ...result,
      bestMatch: this.pickBestMatch(title, author, result.results)
    }
  }

  static pickBestMatch(title: string, author: string | undefined, results: WebMetadata[]): WebMetadata | null {
    const scored = results
      .map((item) => ({
        item,
        score: this.scoreMetadataMatch(title, author, item)
      }))
      .sort((a, b) => b.score - a.score)

    if (scored.length === 0 || scored[0].score < 0.45) {
      return null
    }

    return scored[0].item
  }

  private static scoreMetadataMatch(title: string, author: string | undefined, item: WebMetadata): number {
    const titleScore = this.computeSimilarity(title, item.title)
    const authorScore = author?.trim()
      ? this.computeSimilarity(author, item.author)
      : 0.5

    return (
      (titleScore * 0.72) +
      (authorScore * 0.23) +
      (this.sourceWeight(item.source) * 0.05)
    )
  }

  private static computeSimilarity(left: string, right: string): number {
    const a = this.normalizeText(left)
    const b = this.normalizeText(right)

    if (!a || !b) return 0
    if (a === b) return 1
    if (a.includes(b) || b.includes(a)) return 0.9

    const aTokens = new Set(a.split(' ').filter(token => token.length > 1))
    const bTokens = new Set(b.split(' ').filter(token => token.length > 1))
    const union = new Set([...aTokens, ...bTokens])
    if (union.size === 0) return 0

    let intersection = 0
    for (const token of aTokens) {
      if (bTokens.has(token)) intersection += 1
    }

    return intersection / union.size
  }

  private static normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  private static sourceWeight(source: WebMetadata['source']): number {
    switch (source) {
      case 'google':
        return 1
      case 'openlibrary':
        return 0.95
      case 'itunes':
        return 0.9
      default:
        return 0.85
    }
  }

  private static async fetchFromGoogleBooks(title: string, author?: string): Promise<WebMetadata[]> {
    const queries: string[] = [];
    
    if (author && author !== 'Autore sconosciuto') {
      queries.push(`intitle:${title}+inauthor:${author}`);
      queries.push(`${title} ${author}`);
    } else {
      queries.push(`intitle:${title}`);
      queries.push(title);
    }
    
    if (author && author !== 'Autore sconosciuto') {
      queries.push(`intitle:${title}`);
    }

    for (const q of queries) {
      try {
        const response = await this.timedFetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&hl=it&maxResults=5`
        );
        if (!response || response.status === 429 || !response.ok) {
          continue;
        }

        const data = await response.json();
        if (!data.items || data.items.length === 0) {
          continue;
        }

        return data.items.map((item: any) => {
          const info = item.volumeInfo;
          let genre = this.normalizeGenre(info.categories ? info.categories[0] : undefined);
          if (!genre) {
            genre = this.deduceGenreFromText(info.title, info.description);
          }
          if (!genre && author) {
            genre = this.deduceGenreFromAuthor(author);
          }

          return {
            title: info.title,
            author: info.authors ? info.authors.join(', ') : 'Autore sconosciuto',
            cover: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
            genre: genre,
            description: info.description,
            publishedDate: info.publishedDate,
            publisher: info.publisher,
            source: 'google' as const
          };
        });
      } catch {
        // Ignora l'errore per questa query e passa al fallback successivo
      }
    }
    return [];
  }

  private static async fetchFromOpenLibrary(title: string, author?: string): Promise<WebMetadata[]> {
    const queries: string[] = [];
    if (author && author !== 'Autore sconosciuto') {
      queries.push(`${title} ${author}`);
    }
    queries.push(title);

    for (const q of queries) {
      try {
        const response = await this.timedFetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`
        );
        if (!response || !response.ok) continue;

        const data = await response.json();
        if (!data.docs || data.docs.length === 0) continue;

        let docs = data.docs;
        if (author && author !== 'Autore sconosciuto' && q === title) {
          docs = data.docs.filter((doc: any) => this.isAuthorMatch(author, doc.author_name ? doc.author_name.join(', ') : undefined));
          if (docs.length === 0) {
            docs = data.docs;
          }
        }

        return docs.map((doc: any) => {
          let genre = this.normalizeGenre(doc.subject ? doc.subject[0] : undefined);
          if (!genre && author) {
            genre = this.deduceGenreFromAuthor(author);
          }

          return {
            title: doc.title,
            author: doc.author_name ? doc.author_name.join(', ') : 'Autore sconosciuto',
            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
            genre: genre,
            publishedDate: doc.first_publish_year?.toString(),
            publisher: doc.publisher ? doc.publisher[0] : undefined,
            source: 'openlibrary' as const
          };
        });
      } catch {
        // Continua
      }
    }
    return [];
  }

  private static async fetchFromITunes(title: string, author?: string): Promise<WebMetadata[]> {
    const queries: string[] = [];
    if (author && author !== 'Autore sconosciuto') {
      queries.push(`${title} ${author}`);
    }
    queries.push(title);

    for (const q of queries) {
      try {
        const response = await this.timedFetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=ebook&country=IT&lang=it_it&limit=5`
        );
        if (!response || !response.ok) continue;

        const data = await response.json();
        if (!data.results?.length) continue;

        let filteredResults = data.results;
        if (author && author !== 'Autore sconosciuto' && q === title) {
          filteredResults = data.results.filter((item: any) => this.isAuthorMatch(author, item.artistName));
          if (filteredResults.length === 0) {
            filteredResults = data.results;
          }
        }

        return filteredResults.map((item: any) => {
          let genre = this.normalizeGenre(item.genres?.[0]);
          if (!genre && author) {
            genre = this.deduceGenreFromAuthor(author);
          }

          return {
            title: item.trackName,
            author: item.artistName || 'Autore sconosciuto',
            cover: item.artworkUrl100?.replace('100x100', '600x600'),
            genre: genre,
            publishedDate: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined,
            publisher: item.sellerName,
            source: 'itunes' as const
          };
        });
      } catch {
        // Continua
      }
    }
    return [];
  }
}
