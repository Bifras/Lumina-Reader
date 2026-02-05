import { useState, useRef, useCallback, RefObject } from 'react'
import type { Rendition, TOCEntry } from '../types'
import { getBookFile } from '../db'
import { FONT_CONFIG } from '../config/fonts'

// Lazy-loaded epubjs instance
let ePub: typeof import('epubjs').default | null = null
const getEpub = async () => {
  if (!ePub) {
    const module = await import('epubjs')
    ePub = module.default
  }
  return ePub
}

const THEMES: Record<string, { name: string; body: { background: string; color: string } }> = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Seppia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

interface LoadBookParams {
  file?: File
  savedCfi?: string
  bookId?: string
}

interface LoadBookResult {
  book: import('epubjs').Book
  rendition: Rendition
  metadata: Record<string, unknown>
}

interface UseBookLoaderReturn {
  rendition: Rendition | null
  bookEngine: import('epubjs').Book | null
  metadata: Record<string, unknown> | null
  toc: TOCEntry[]
  isLoading: boolean
  loadingStep: string | null
  pendingBookLoad: LoadBookParams | null
  viewerReady: boolean
  setViewerReady: (ready: boolean) => void
  setPendingBookLoad: (load: LoadBookParams | null) => void
  setIsLoading: (loading: boolean) => void
  loadBookIntoViewer: (params: LoadBookParams) => Promise<LoadBookResult | void>
  resetReader: () => void
  relocatedListenerRef: React.MutableRefObject<((location: { start: { cfi: string } }) => { cfi: string; progress: number }) | null>
}

interface AddToastFn {
  (message: string, type: 'info' | 'success' | 'warning' | 'error', title?: string): void
}

type ThemeOption = 'light' | 'sepia' | 'dark'

export const useBookLoader = (
  viewerRef: RefObject<HTMLDivElement>,
  addToast: AddToastFn,
  currentTheme: ThemeOption = 'light',
  fontSize: number = 100,
  readingFont: string = 'georgia'
): UseBookLoaderReturn => {
  const [rendition, setRendition] = useState<Rendition | null>(null)
  const [bookEngine, setBookEngine] = useState<import('epubjs').Book | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)
  const [toc, setToc] = useState<TOCEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<string | null>(null)
  const [pendingBookLoad, setPendingBookLoad] = useState<LoadBookParams | null>(null)
  const [viewerReady, setViewerReady] = useState(false)

  const loadingRef = useRef(false)
  const locatedListenerRef = useRef<((location: { start: { cfi: string } }) => { cfi: string; progress: number }) | null>(null)
  const renderedListenerRef = useRef<((section: { idref?: string }) => void) | null>(null)
  const fontRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanupPreviousBook = useCallback(() => {
    // Clean up timeout
    if (fontRetryTimeoutRef.current) {
      clearTimeout(fontRetryTimeoutRef.current)
      fontRetryTimeoutRef.current = null
    }

    // Clean up previous rendition listeners
    if (rendition) {
      if (locatedListenerRef.current) {
        try {
          rendition.off('relocated', locatedListenerRef.current)
        } catch (e) {
          console.warn('[WARN] Failed to remove relocated listener:', e)
        }
        locatedListenerRef.current = null
      }

      if (renderedListenerRef.current) {
        try {
          rendition.off('rendered', renderedListenerRef.current)
        } catch (e) {
          console.warn('[WARN] Failed to remove rendered listener:', e)
        }
        renderedListenerRef.current = null
      }
    }

    // Clear all annotations when book changes
    if ((rendition as { annotations?: { clear: () => void } } | null)?.annotations) {
      try {
        (rendition as { annotations?: { clear: () => void } }).annotations?.clear()
      } catch (e) {
        console.warn('[WARN] Failed to clear annotations:', e)
      }
    }

    if (bookEngine) {
      try {
        bookEngine.destroy()
      } catch (e) {
        console.warn('[WARN] Book engine destroy failed:', e)
      }
    }
  }, [rendition, bookEngine])

  const loadBookIntoViewer = useCallback(async ({ file, savedCfi, bookId }: LoadBookParams): Promise<LoadBookResult | void> => {
    if (loadingRef.current) {
      console.log('[DEBUG] loadBookIntoViewer aborted - already loading')
      return
    }

    if (!viewerRef.current) {
      console.error('[ERROR] Viewer ref is null - cannot load book')
      addToast('Errore: Elemento viewer non pronto.', 'error', 'Errore Viewer')
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
      return
    }

    loadingRef.current = true
    console.log('[DEBUG] loadBookIntoViewer starting:', { hasFile: !!file, bookId, savedCfi })

    setLoadingStep('Pulizia precedente...')
    cleanupPreviousBook()

    try {
      setLoadingStep('Preparazione dati...')
      let bookData: ArrayBuffer
      let book: import('epubjs').Book

      if (file) {
        bookData = await file.arrayBuffer()
        console.log('[DEBUG] File book data size:', bookData.byteLength, 'bytes')

        if (bookData.byteLength === 0) {
          throw new Error('Book file is empty (0 bytes)')
        }

        const ePubModule = await getEpub()
        book = ePubModule(bookData)
        setBookEngine(book)
      } else if (bookId) {
        setLoadingStep('Caricamento libro...')
        const fileData = await getBookFile(bookId)

        if (!fileData) {
          throw new Error('Book file not found')
        }
        bookData = fileData

        console.log('[DEBUG] Book data loaded, size:', bookData.byteLength, 'bytes')

        if (bookData.byteLength === 0) {
          throw new Error('Book file is empty (0 bytes)')
        }

        const ePubModule = await getEpub()
        book = ePubModule(bookData)
        setBookEngine(book)
      } else {
        throw new Error('No file or bookId provided')
      }

      setLoadingStep('Rendering...')

      // Get theme colors BEFORE rendering to prevent white flash
      const themeBgColor = THEMES[currentTheme]?.body?.background || '#f9f7f2'
      const themeTextColor = THEMES[currentTheme]?.body?.color || '#1a1a1a'

      const newRendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        manager: 'default',
        // Inject stylesheet to prevent white flash - aggressive approach
        stylesheet: `
          * {
            background: transparent !important;
            background-color: transparent !important;
          }
          html, body {
            background-color: ${themeBgColor} !important;
            background: ${themeBgColor} !important;
            color: ${themeTextColor} !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `
      })

      setRendition(newRendition)

      const meta = await book.loaded.metadata
      setMetadata(meta as unknown as Record<string, unknown>)

      newRendition.themes.register('light', THEMES.light)
      newRendition.themes.register('sepia', THEMES.sepia)
      newRendition.themes.register('dark', THEMES.dark)

      // Display book
      const displayPromise = newRendition.display(savedCfi || undefined)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout display dopo 5 secondi')), 8000)
      )

      try {
        await Promise.race([displayPromise, timeoutPromise])
      } catch (displayError) {
        if (savedCfi) {
          console.log('[DEBUG] Retrying display from start...')
          await newRendition.display()
        } else {
          throw displayError
        }
      }

      // Apply theme, font size and text color immediately
      try {
        newRendition.themes.select(currentTheme)
        newRendition.themes.fontSize(`${fontSize}%`)
        newRendition.themes.override('color', themeTextColor, true)
        newRendition.themes.override('background', themeBgColor, true)
        newRendition.themes.override('background-color', themeBgColor, true)
      } catch (themeError) {
        console.warn('[WARN] Failed to apply theme immediately:', themeError)
      }

      // Force reflow/re-render to apply fonts correctly
      const forceReflow = (doc: Document) => {
        if (!doc || !doc.documentElement) return
        try {
          const html = doc.documentElement
          html.style.display = 'none'
          void html.offsetHeight // Force reflow
          html.style.display = ''
        } catch (e) {
          console.warn('[FONT] Failed to force reflow:', e)
        }
      }

      // Function to apply font with retry mechanism
      const applyFontToContents = async (attempt = 1, maxAttempts = 5) => {
        const fontConfig = FONT_CONFIG[readingFont] || FONT_CONFIG.georgia
        const fontFamily = fontConfig.family

        try {
          const contents = newRendition.getContents()

          if (!contents) {
            if (attempt < maxAttempts) {
              console.log(`[DEBUG] Contents not ready, retrying... (${attempt}/${maxAttempts})`)
              fontRetryTimeoutRef.current = setTimeout(() => {
                applyFontToContents(attempt + 1, maxAttempts)
              }, 100 * attempt)
              return
            }
            console.warn('[WARN] Contents still not available after retries')
            return
          }

          let appliedCount = 0
          const docsToReflow: Document[] = []

          // Handle epub.js Contents which can be array-like
          const contentsArray = Array.isArray(contents) ? contents : [contents]
          contentsArray.forEach((content) => {
            if (content && content.document && content.document.head) {
              const doc = content.document

              // Remove existing font style if present
              const existingStyle = doc.getElementById('lumina-font-override')
              if (existingStyle) {
                existingStyle.remove()
              }

              // Create new style with font AND theme colors (aggressive override)
              const style = doc.createElement('style')
              style.id = 'lumina-font-override'
              style.textContent = `
                /* Background on html/body only */
                html, body {
                  background-color: ${themeBgColor} !important;
                  background: ${themeBgColor} !important;
                }
                /* Text containers - force background */
                p, div, span, h1, h2, h3, h4, h5, h6,
                section, article, header, footer, nav, aside,
                li, blockquote, pre, code, em, strong, b, i,
                .chapter, [class*="chapter"], .title, [class*="title"],
                [class*="header"], [class*="head"] {
                  background-color: ${themeBgColor} !important;
                }
                /* Images and their containers stay transparent */
                img, svg, image, picture, video, canvas,
                object, embed, figure, figcaption,
                [src*="cover"], [src*="image"], [class*="cover"],
                [class*="image"], [id*="cover"] {
                  background-color: transparent !important;
                }
                /* Text color on all elements */
                * {
                  font-family: ${fontFamily} !important;
                  color: ${themeTextColor} !important;
                }
                /* Links */
                a, a:link, a:visited {
                  color: #c05d4e !important;
                }
              `
              doc.head.appendChild(style)

              // Force inline styles on body only
              doc.body.style.setProperty('background-color', themeBgColor, 'important')
              doc.body.style.setProperty('color', themeTextColor, 'important')
              appliedCount++
              docsToReflow.push(doc)
            }
          })

          if (appliedCount > 0) {
            console.log(`[DEBUG] Font applied to ${appliedCount} content section(s)`)

            // Wait for fonts to load, then force reflow
            try {
              await Promise.race([
                Promise.all(docsToReflow.map(doc => doc.fonts?.ready || Promise.resolve())),
                new Promise(resolve => setTimeout(resolve, 500))
              ])

              // Force reflow for each document to ensure font application
              docsToReflow.forEach(doc => forceReflow(doc))
            } catch (fontError) {
              console.warn('[FONT] Font loading issue:', fontError)
            }
          } else if (attempt < maxAttempts) {
            console.log(`[DEBUG] No contents with document.head found, retrying... (${attempt}/${maxAttempts})`)
            fontRetryTimeoutRef.current = setTimeout(() => {
              applyFontToContents(attempt + 1, maxAttempts)
            }, 100 * attempt)
          }
        } catch (error) {
          console.warn(`[WARN] Failed to apply font (attempt ${attempt}):`, error)
          if (attempt < maxAttempts) {
            fontRetryTimeoutRef.current = setTimeout(() => {
              applyFontToContents(attempt + 1, maxAttempts)
            }, 100 * attempt)
          }
        }
      }

      // Apply font immediately (in case contents are already available)
      applyFontToContents()

      // Also apply font when content is rendered (for new sections)
      renderedListenerRef.current = (section) => {
        console.log('[DEBUG] Section rendered:', section?.idref)
        // Small delay to ensure DOM is ready
        fontRetryTimeoutRef.current = setTimeout(() => {
          applyFontToContents(1, 3)
        }, 50)
      }
      newRendition.on('rendered', renderedListenerRef.current)

      // Setup located listener for progress tracking
      locatedListenerRef.current = (location) => {
        const percent = (book.locations as { percentageFromCfi?: (cfi: string) => number }).percentageFromCfi?.(location.start.cfi) || 0
        const progress = Math.floor(percent * 100)
        return { cfi: location.start.cfi, progress }
      }
      newRendition.on('relocated', locatedListenerRef.current)

      // Generate locations for progress calculation
      try {
        await book.locations.generate(1024)
      } catch (locError) {
        console.warn('[WARN] Location generation failed (non-critical):', locError)
      }

      // Load TOC
      try {
        const nav = await book.loaded.navigation
        setToc(nav.toc)
      } catch (e) {
        console.log('No TOC available', e)
        setToc([])
      }

      setLoadingStep('Completato!')
      // Notifica rimossa - il caricamento è già visibile tramite loading overlay

      return { book, rendition: newRendition, metadata: meta as unknown as Record<string, unknown> }

    } catch (error) {
      console.error('[ERROR] Load book error:', error)

      const errorDetails: Record<string, boolean> = {
        'Libro corrotto o non valido': error instanceof Error && (error.message.toLowerCase().includes('xml') || error.message.toLowerCase().includes('parse')),
        'Timeout caricamento': error instanceof Error && error.message.toLowerCase().includes('timeout'),
        'Errore visualizzazione': error instanceof Error && (error.message.toLowerCase().includes('render') || error.message.toLowerCase().includes('display')),
        'Errore server': error instanceof Error && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('server')),
        'Errore sconosciuto': error instanceof Error && !error.message
      }

      const errorMessage = Object.entries(errorDetails).find(([, reason]) => reason)?.[0] || 'Errore durante il caricamento'
      addToast(errorMessage, 'error', 'Errore Caricamento')
      throw error

    } finally {
      loadingRef.current = false
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
    }
  }, [viewerRef, cleanupPreviousBook, addToast, currentTheme, fontSize, readingFont])

  const resetReader = useCallback(() => {
    loadingRef.current = false
    cleanupPreviousBook()
    setBookEngine(null)
    setRendition(null)
    setMetadata(null)
    setToc([])
    setViewerReady(false)
    setPendingBookLoad(null)
    setIsLoading(false)
    setLoadingStep(null)
  }, [cleanupPreviousBook])

  return {
    rendition,
    bookEngine,
    metadata,
    toc,
    isLoading,
    loadingStep,
    pendingBookLoad,
    viewerReady,
    setViewerReady,
    setPendingBookLoad,
    setIsLoading,
    loadBookIntoViewer,
    resetReader,
    relocatedListenerRef: locatedListenerRef
  }
}
