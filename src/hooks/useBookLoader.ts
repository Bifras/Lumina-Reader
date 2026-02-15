import { useState, useRef, useCallback, RefObject, useEffect } from 'react'
import type { Rendition, TOCEntry } from '../types'
import { getBookFile } from '../db'
import { FONT_CONFIG } from '../config/fonts'
import { ReaderSettingsService } from '../services/ReaderSettingsService'
import { THEMES, type ThemeOption } from '../config/themes'

// Lazy-loaded epubjs instance
let ePub: typeof import('epubjs').default | null = null
const getEpub = async () => {
  if (!ePub) {
    const module = await import('epubjs')
    ePub = module.default
  }
  return ePub
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
  goToNextPage: () => void
  goToPrevPage: () => void
  pageInfo: { current: number; total: number } | null
  relocatedListenerRef: React.MutableRefObject<((location: { start: { cfi: string } }) => { cfi: string; progress: number }) | null>
}

interface AddToastFn {
  (message: string, type: 'info' | 'success' | 'warning' | 'error', title?: string): void
}


interface ContentsWithDocument {
  document?: Document
}

interface RenditionWithHooks {
  hooks?: {
    content?: {
      register?: (callback: (contents: ContentsWithDocument) => void) => void
    }
  }
}

interface RgbColor {
  r: number
  g: number
  b: number
}

const hexToRgb = (hex: string): RgbColor | null => {
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

const parseRgbString = (value: string): RgbColor | null => {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return null
  return {
    r: Math.min(255, Math.max(0, parseInt(match[1], 10))),
    g: Math.min(255, Math.max(0, parseInt(match[2], 10))),
    b: Math.min(255, Math.max(0, parseInt(match[3], 10)))
  }
}

const luminance = (color: RgbColor): number => {
  const srgb = [color.r, color.g, color.b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

const contrastRatio = (a: RgbColor, b: RgbColor): number => {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const enforceTextContrast = (doc: Document, themeBgColor: string, themeTextColor: string): void => {
  const bgRgb = hexToRgb(themeBgColor) || { r: 255, g: 255, b: 255 }
  const view = doc.defaultView || window
  const root = doc.body || doc.documentElement
  const nodes = root.querySelectorAll('*')
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName
    if (tag === 'A' || tag === 'IMG' || tag === 'SVG' || tag === 'PATH' || tag === 'CANVAS' || tag === 'VIDEO' || tag === 'AUDIO' || tag === 'IFRAME') {
      return
    }
    if (!node.textContent || node.textContent.trim().length === 0) return
    const computed = view.getComputedStyle(node)
    const colorRgb = parseRgbString(computed.color)
    if (!colorRgb) return
    if (contrastRatio(colorRgb, bgRgb) < 4.5) {
      node.style.setProperty('color', themeTextColor, 'important')
    }
  })
}

export const useBookLoader = (
  viewerRef: RefObject<HTMLDivElement>,
  addToast: AddToastFn,
  currentTheme: ThemeOption = 'light',
  fontSize: number = 100,
  readingFont: string = 'georgia',
  onProgressChange?: (progress: number, cfi: string) => void
): UseBookLoaderReturn => {
  const [rendition, setRendition] = useState<Rendition | null>(null)
  const [bookEngine, setBookEngine] = useState<import('epubjs').Book | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)
  const [toc, setToc] = useState<TOCEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<string | null>(null)
  const [pendingBookLoad, setPendingBookLoad] = useState<LoadBookParams | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number } | null>(null)
  const themeRef = useRef<{ background: string; text: string }>({
    background: THEMES[currentTheme]?.body?.background || '#f9f7f2',
    text: THEMES[currentTheme]?.body?.color || '#1a1a1a'
  })

  useEffect(() => {
    const themeBgColor = THEMES[currentTheme]?.body?.background || '#f9f7f2'
    const themeTextColor = THEMES[currentTheme]?.body?.color || '#1a1a1a'
    themeRef.current = { background: themeBgColor, text: themeTextColor }
  }, [currentTheme])

  // Save settings when they change
  useEffect(() => {
    ReaderSettingsService.saveSettings({
      theme: currentTheme,
      fontSize,
      fontFamily: readingFont
    })
  }, [currentTheme, fontSize, readingFont])

  // Apply theme changes to existing rendition
  useEffect(() => {
    if (!rendition) return

    // Select the theme in epub.js
    rendition.themes.select(currentTheme)

    // Override color and background
    rendition.themes.override('color', themeRef.current.text, true)
    rendition.themes.override('background', themeRef.current.background, true)

    // Ensure theme class propagates to iframe when theme changes
    const iframe = viewerRef.current?.querySelector('iframe')
    if (iframe) {
      iframe.setAttribute('data-theme', currentTheme)
      // Also force inline styles for immediate effect
      iframe.style.setProperty('background-color', themeRef.current.background, 'important')
      iframe.style.setProperty('background', themeRef.current.background, 'important')
    }

    // Force apply to iframe contents
    const applyThemeToContents = () => {
      try {
        const contents = rendition.getContents()
        if (!contents || contents.length === 0) return

        contents.forEach((content: any) => {
          if (content?.document) {
            const doc = content.document

            // Update or create the style override
            const styleId = 'lumina-theme-override'
            let style = doc.getElementById(styleId) as HTMLStyleElement

            if (!style) {
              style = doc.createElement('style')
              style.id = styleId
              if (doc.head) {
                doc.head.appendChild(style)
              }
            }

            style.textContent = `
              html { background-color: ${themeRef.current.background} !important; }
              body {
                background-color: ${themeRef.current.background} !important;
                color: ${themeRef.current.text} !important;
              }
              /* Force text color on ALL elements */
              *, *::before, *::after {
                color: ${themeRef.current.text} !important;
                background-color: transparent !important;
              }
              /* But restore root backgrounds */
              html {
                background-color: ${themeRef.current.background} !important;
              }
              body {
                background-color: ${themeRef.current.background} !important;
              }
              /* Specific targeting for common EPUB title/paragraph elements */
              p, h1, h2, h3, h4, h5, h6,
              .block_22, .block_23, .block_24, .block_25,
              [class*="block"], [class*="title"], [class*="chapter"],
              [id*="Toc"] {
                background-color: transparent !important;
                color: ${themeRef.current.text} !important;
              }
              /* Ensure links are visible with appropriate contrast */
              a, a:link, a:visited {
                color: ${currentTheme === 'dark' ? '#64b5f6' : '#c05d4e'} !important;
                text-decoration: underline !important;
              }
              a:hover {
                color: ${currentTheme === 'dark' ? '#90caf9' : '#d46a5c'} !important;
              }
              /* Override any inline color styles */
              [style*="color:"] {
                color: ${themeRef.current.text} !important;
              }
              /* Ensure strong and em are visible */
              strong, b {
                color: ${themeRef.current.text} !important;
                font-weight: bold !important;
              }
              em, i {
                color: ${themeRef.current.text} !important;
                font-style: italic !important;
              }
              /* Code and preformatted text */
              code, pre {
                background-color: ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
                color: ${themeRef.current.text} !important;
              }
            `

            // Force inline styles on root elements
            doc.documentElement.style.setProperty('background-color', themeRef.current.background, 'important')
            if (doc.body) {
              doc.body.style.setProperty('background-color', themeRef.current.background, 'important')
              doc.body.style.setProperty('color', themeRef.current.text, 'important')
            }

            // Also remove inline white backgrounds from all elements
            doc.querySelectorAll('*').forEach((el: any) => {
              if (el instanceof HTMLElement) {
                const computedBg = (doc.defaultView || window).getComputedStyle(el).backgroundColor
                // Check for white or cream backgrounds
                if (
                  computedBg === 'rgb(255, 255, 255)' ||
                  computedBg === 'rgb(249, 247, 242)' ||
                  computedBg === 'rgb(250, 249, 246)' ||
                  computedBg === 'white' ||
                  computedBg === '#fff' ||
                  computedBg === '#ffffff' ||
                  computedBg === '#f9f7f2' ||
                  computedBg === '#faf9f6'
                ) {
                  el.style.setProperty('background-color', 'transparent', 'important')
                }
              }
            })

            enforceTextContrast(doc, themeRef.current.background, themeRef.current.text)
          }
        })
      } catch (e) {
        console.warn('[WARN] Failed to apply theme to contents:', e)
      }
    }

    // Apply immediately and again after a short delay to ensure it takes effect
    applyThemeToContents()
    const timeout = setTimeout(applyThemeToContents, 50)

    return () => clearTimeout(timeout)
  }, [currentTheme, rendition])

  // Apply font changes to existing rendition immediately
  useEffect(() => {
    if (!rendition) return

    const fontFamily = FONT_CONFIG[readingFont]?.family || 'Georgia'
    const themeBgColor = THEMES[currentTheme]?.body?.background || '#f9f7f2'
    const themeTextColor = THEMES[currentTheme]?.body?.color || '#1a1a1a'

    // Apply font via epub.js themes API
    rendition.themes.override('font-family', fontFamily, true)

    // Force apply font to iframe contents immediately
    const applyFontToContents = () => {
      try {
        const contents = rendition.getContents()
        if (!contents || contents.length === 0) return

        contents.forEach((content: any) => {
          if (content?.document) {
            const doc = content.document
            const styleId = 'lumina-font-override'

            // Remove existing style if present
            const existingStyle = doc.getElementById(styleId)
            if (existingStyle) {
              existingStyle.remove()
            }

            // Create and inject aggressive style override
            const style = doc.createElement('style')
            style.id = styleId
            style.textContent = `
              html {
                background-color: ${themeBgColor} !important;
                color: ${themeTextColor} !important;
              }
              body {
                background-color: ${themeBgColor} !important;
                color: ${themeTextColor} !important;
                font-family: ${fontFamily} !important;
              }
              * {
                font-family: ${fontFamily} !important;
                color: ${themeTextColor} !important;
                background-color: transparent !important;
              }
              *::before, *::after {
                color: ${themeTextColor} !important;
              }
              /* Special handling for elements that might have white backgrounds */
              div, p, span, section, article, aside, header, footer, nav, main {
                background-color: transparent !important;
              }
              a { color: #c05d4e !important; }
              /* Override any inline white backgrounds */
              [style*="background: white"], [style*="background: #fff"], [style*="background-color: white"], [style*="background-color: #fff"] {
                background-color: ${themeBgColor} !important;
              }
            `

            if (doc.head) {
              doc.head.appendChild(style)
            }

            // Force inline styles on root elements
            doc.documentElement.style.setProperty('background-color', themeBgColor, 'important')
            if (doc.body) {
              doc.body.style.setProperty('background-color', themeBgColor, 'important')
              doc.body.style.setProperty('color', themeTextColor, 'important')
              doc.body.style.setProperty('font-family', fontFamily, 'important')
            }
          }
        })
      } catch (e) {
        console.warn('[WARN] Failed to apply font to contents:', e)
      }
    }

    // Apply immediately and again after a short delay
    applyFontToContents()
    const timeout = setTimeout(applyFontToContents, 50)

    return () => clearTimeout(timeout)
  }, [readingFont, rendition, currentTheme])

  const loadingRef = useRef(false)
  const locatedListenerRef = useRef<((location: { start: { cfi: string } }) => { cfi: string; progress: number }) | null>(null)
  const renderedListenerRef = useRef<((section: { idref?: string }) => void) | null>(null)
  const renderingListenerRef = useRef<((section: { idref?: string }) => void) | null>(null)
  const fontRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  const applyPrepaintStyles = useCallback((doc: Document): void => {
    const { background, text } = themeRef.current
    const styleId = 'lumina-prepaint-styles'
    let style = doc.getElementById(styleId) as HTMLStyleElement | null

    if (!style) {
      style = doc.createElement('style')
      style.id = styleId
      if (doc.head) {
        doc.head.appendChild(style)
      }
    }

    style.textContent = `
      html, body {
        background: ${background} !important;
        background-color: ${background} !important;
        color: ${text} !important;
      }
      /* Force text color on body */
      body, body::before, body::after {
        color: ${text} !important;
      }
      /* Prevent white title bars on chapter headings during page turns */
      h1, h2, h3, h4, h5, h6,
      [class*="title"], [class*="chapter"], [id*="title"], [id*="chapter"] {
        background: transparent !important;
        background-color: transparent !important;
        color: ${text} !important;
      }
      /* Force iframe background immediately */
      iframe, html, body {
        background-color: ${background} !important;
        background: ${background} !important;
        background-image: none !important;
      }
    `

    // CRITICAL FIX: Force iframe background to prevent white flash
    if (doc.defaultView?.frameElement) {
      const frameElement = doc.defaultView.frameElement as HTMLElement
      frameElement.style.setProperty('background-color', background, 'important')
      frameElement.style.setProperty('background', background, 'important')
    }

    const root = doc.documentElement
    if (root) {
      root.style.setProperty('background', background, 'important')
      root.style.setProperty('background-color', background, 'important')
    }
    if (doc.body) {
      doc.body.style.setProperty('background', background, 'important')
      doc.body.style.setProperty('background-color', background, 'important')
      doc.body.style.setProperty('color', text, 'important')
    }

    // Force inline override for headings before first paint (beats inline !important)
    const headingNodes = doc.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="chapter"], [id*="title"], [id*="chapter"]'
    )
    headingNodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        node.style.setProperty('background', 'transparent', 'important')
        node.style.setProperty('background-color', 'transparent', 'important')
      }
    })
  }, [])

  const registerPrepaintHook = useCallback((renditionInstance: Rendition): void => {
    const withHooks = renditionInstance as unknown as RenditionWithHooks
    const contentHooks = withHooks.hooks?.content
    if (!contentHooks?.register) return

    try {
      contentHooks.register.call(contentHooks, (contents: ContentsWithDocument) => {
        if (!contents?.document) return
        try {
          applyPrepaintStyles(contents.document)
        } catch (e) {
          console.warn('[WARN] Failed to apply prepaint styles:', e)
        }
      })
    } catch (e) {
      console.warn('[WARN] Failed to register prepaint hook:', e)
    }
  }, [applyPrepaintStyles])

  const cleanupPreviousBook = useCallback(() => {
    if (fontRetryTimeoutRef.current) {
      clearTimeout(fontRetryTimeoutRef.current)
      fontRetryTimeoutRef.current = null
    }
    if (pageTransitionTimeoutRef.current) {
      clearTimeout(pageTransitionTimeoutRef.current)
      pageTransitionTimeoutRef.current = null
    }

    if (observerRef.current) {
      try { observerRef.current.disconnect() } catch (e) { }
      observerRef.current = null
    }

    if (rendition) {
      if (locatedListenerRef.current) {
        try { rendition.off('relocated', locatedListenerRef.current) } catch (e) { }
        locatedListenerRef.current = null
      }
      if (renderedListenerRef.current) {
        try { rendition.off('rendered', renderedListenerRef.current) } catch (e) { }
        renderedListenerRef.current = null
      }
      if (renderingListenerRef.current) {
        try { rendition.off('rendering', renderingListenerRef.current) } catch (e) { }
        renderingListenerRef.current = null
      }
    }

    if ((rendition as any)?.annotations) {
      try { (rendition as any).annotations.clear() } catch (e) { }
    }

    if (bookEngine) {
      try { bookEngine.destroy() } catch (e) { }
    }
  }, [rendition, bookEngine])

  const loadBookIntoViewer = useCallback(async ({ file, savedCfi, bookId }: LoadBookParams): Promise<LoadBookResult | void> => {
    if (loadingRef.current) return
    if (!viewerRef.current) {
      addToast('Errore: Viewer non pronto.', 'error')
      return
    }

    loadingRef.current = true
    setLoadingStep('Pulizia precedente...')
    cleanupPreviousBook()

    try {
      setLoadingStep('Preparazione dati...')
      let bookData: ArrayBuffer
      let book: import('epubjs').Book

      if (file) {
        bookData = await file.arrayBuffer()
        const ePubModule = await getEpub()
        book = ePubModule(bookData)
        setBookEngine(book)
      } else if (bookId) {
        const fileData = await getBookFile(bookId)
        if (!fileData) throw new Error('File non trovato')
        bookData = fileData
        const ePubModule = await getEpub()
        book = ePubModule(bookData)
        setBookEngine(book)
      } else {
        throw new Error('Nessun file o ID')
      }

      setLoadingStep('Rendering...')


      const width = viewerRef.current.clientWidth || undefined
      const height = viewerRef.current.clientHeight || undefined

      const newRendition = book.renderTo(viewerRef.current, {
        width: width || '100%',
        height: height || '100%',
        flow: 'paginated',
        manager: 'default',
        allowScriptedContent: false // SECURITY: Disabled to prevent XSS/RCE from malicious EPUBs
      })



      // DISABLE HOOKS FOR DEBUGGING
      // registerPrepaintHook(newRendition)

      // Force paginated flow after epub.js start()
      // epub.js may overwrite the flow setting using book metadata during start().
      newRendition.on('started', () => {
        ; (newRendition as any).flow('paginated')
      })

      // AGGRESSIVE White Flash Prevention
      // Mutation Observer to catch white elements during rendering
      observerRef.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Handle added nodes
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Force background color immediately
              node.style.setProperty('background-color', themeRef.current.background, 'important')
              // Also check computed style
              const style = window.getComputedStyle(node)
              if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white') {
                node.style.setProperty('background-color', 'transparent', 'important')
              }
              // Apply to all children recursively
              node.querySelectorAll('*').forEach((child) => {
                if (child instanceof HTMLElement) {
                  child.style.setProperty('background-color', 'transparent', 'important')
                }
              })
            }
          })
          // Handle attribute changes
          if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
            const target = mutation.target
            if (target.style.backgroundColor === 'rgb(255, 255, 255)' ||
              target.style.backgroundColor === 'white' ||
              target.style.backgroundColor === '#ffffff') {
              target.style.setProperty('background-color', 'transparent', 'important')
            }
          }
        })
      })

      // Event: rendering - fires BEFORE content is displayed
      // MINIMAL version: only set html/body background, do NOT use wildcard selectors
      renderingListenerRef.current = (section: any, view: any) => {
        if (view?.document) {
          const doc = view.document
          // Set iframe background
          if (doc.defaultView?.frameElement) {
            const frame = doc.defaultView.frameElement as HTMLElement
            frame.style.backgroundColor = themeRef.current.background
          }
          // Set html and body background only
          doc.documentElement.style.setProperty('background-color', themeRef.current.background, 'important')
          if (doc.body) {
            doc.body.style.setProperty('background-color', themeRef.current.background, 'important')
            doc.body.style.setProperty('color', themeRef.current.text, 'important')
          }
        }
      }
      newRendition.on('rendering', renderingListenerRef.current)

      // Event: rendered - fires AFTER content is displayed
      // MINIMAL version: only set body background/color, avoid wildcard iteration
      renderedListenerRef.current = (section: any, view: any) => {
        if (view?.document) {
          const doc = view.document
          doc.documentElement.style.setProperty('background-color', themeRef.current.background, 'important')
          if (doc.body) {
            doc.body.style.setProperty('background-color', themeRef.current.background, 'important')
            doc.body.style.setProperty('color', themeRef.current.text, 'important')
          }
        }
        // Apply fonts with retry
        if (fontRetryTimeoutRef.current) clearTimeout(fontRetryTimeoutRef.current)
        fontRetryTimeoutRef.current = setTimeout(() => applyFontToContents(1, 5), 50)
      }
      newRendition.on('rendered', renderedListenerRef.current)

      setRendition(newRendition)
      const meta = await book.loaded.metadata
      setMetadata(meta as any)

      newRendition.themes.register('light', THEMES.light)
      newRendition.themes.register('sepia', THEMES.sepia)
      newRendition.themes.register('dark', THEMES.dark)

      newRendition.themes.select(currentTheme)
      newRendition.themes.fontSize(`${fontSize}%`)
      newRendition.themes.override('color', themeRef.current.text, true)
      newRendition.themes.override('background', themeRef.current.background, true)

      await newRendition.display(savedCfi || undefined)

      // Ensure theme class propagates to iframe
      const iframe = viewerRef.current?.querySelector('iframe')
      if (iframe) {
        iframe.setAttribute('data-theme', currentTheme)
      }

      const applyFontToContents = async (attempt = 1, maxAttempts = 5) => {
        const fontFamily = FONT_CONFIG[readingFont]?.family || 'Georgia'
        try {
          const contents = newRendition.getContents()
          if (!contents || contents.length === 0) {
            if (attempt < maxAttempts) {
              fontRetryTimeoutRef.current = setTimeout(() => applyFontToContents(attempt + 1, maxAttempts), 100)
            }
            return
          }

          contents.forEach((content: any) => {
            if (content?.document) {
              const doc = content.document
              const styleId = 'lumina-font-override'

              // Remove existing style if present
              const existingStyle = doc.getElementById(styleId)
              if (existingStyle) {
                existingStyle.remove()
              }

              // Create and inject aggressive style override
              const style = doc.createElement('style')
              style.id = styleId
              style.textContent = `
                html {
                  background-color: ${themeRef.current.background} !important;
                  color: ${themeRef.current.text} !important;
                }
                body {
                  background-color: ${themeRef.current.background} !important;
                  color: ${themeRef.current.text} !important;
                  font-family: ${fontFamily} !important;
                }
                * {
                  font-family: ${fontFamily} !important;
                  color: ${themeRef.current.text} !important;
                  background-color: transparent !important;
                }
                *::before, *::after {
                  color: ${themeRef.current.text} !important;
                }
                /* Special handling for elements that might have white backgrounds */
                div, p, span, section, article, aside, header, footer, nav, main {
                  background-color: transparent !important;
                }
                a { color: #c05d4e !important; }
                /* Override any inline white backgrounds */
                [style*="background: white"], [style*="background: #fff"], [style*="background-color: white"], [style*="background-color: #fff"] {
                  background-color: ${themeRef.current.background} !important;
                }
              `

              if (doc.head) {
                doc.head.appendChild(style)
              }

              // Force inline styles on root elements
              doc.documentElement.style.setProperty('background-color', themeRef.current.background, 'important')
              if (doc.body) {
                doc.body.style.setProperty('background-color', themeRef.current.background, 'important')
                doc.body.style.setProperty('color', themeRef.current.text, 'important')
                doc.body.style.setProperty('font-family', fontFamily, 'important')
              }

              // Also force styles on all existing elements
              doc.querySelectorAll('*').forEach((el) => {
                if (el instanceof HTMLElement) {
                  const computedBg = window.getComputedStyle(el).backgroundColor
                  if (computedBg === 'rgb(255, 255, 255)' || computedBg === 'white') {
                    el.style.setProperty('background-color', 'transparent', 'important')
                  }
                }
              })
            }
          })
        } catch (e) { }
      }

      applyFontToContents()

      locatedListenerRef.current = (location) => {
        const percent = (book.locations as any).percentageFromCfi?.(location.start.cfi) || 0
        const progress = Math.floor(percent * 100)

        // Page info for indicator
        const displayed = (location.start as any).displayed
        if (displayed) {
          setPageInfo({ current: displayed.page, total: displayed.total })
        }

        // Call progress callback if provided
        if (onProgressChange) {
          onProgressChange(progress, location.start.cfi)
        }
        return { cfi: location.start.cfi, progress }
      }
      newRendition.on('relocated', locatedListenerRef.current)

      try {
        await book.locations.generate(1000)
      } catch {
        console.warn('[WARN] Failed to generate locations')
      }
      try {
        const nav = await book.loaded.navigation
        setToc(nav.toc)
      } catch (e) { setToc([]) }

      setLoadingStep(null)
      return { book, rendition: newRendition, metadata: meta as any }

    } catch (error) {
      addToast('Errore durante il caricamento', 'error')
      throw error
    } finally {
      loadingRef.current = false
      setIsLoading(false)
      setLoadingStep(null)
      setPendingBookLoad(null)
    }
  }, [viewerRef, cleanupPreviousBook, addToast, currentTheme, fontSize, readingFont, registerPrepaintHook, applyPrepaintStyles, onProgressChange])

  const goToNextPage = useCallback(() => {
    if (!rendition) return
    try {
      rendition.next()
    } catch (e) {
      console.warn('[WARN] Failed to go to next page:', e)
    }
  }, [rendition])

  const goToPrevPage = useCallback(() => {
    if (!rendition) return
    try {
      rendition.prev()
    } catch (e) {
      console.warn('[WARN] Failed to go to previous page:', e)
    }
  }, [rendition])

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
    rendition, bookEngine, metadata, toc, isLoading, loadingStep,
    pendingBookLoad, viewerReady, setViewerReady, setPendingBookLoad,
    setIsLoading, loadBookIntoViewer,
    resetReader,
    goToNextPage,
    goToPrevPage,
    pageInfo
  }
}
