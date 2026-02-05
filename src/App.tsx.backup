import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import localforage from 'localforage'

// Components
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'
import LibraryView from './views/LibraryView'
import ReaderView from './views/ReaderView'

// Hooks
import { useToast, useBookLoader, useHighlights } from './hooks'

// DB
import {
  saveBookMetadata,
  getLibrary,
  updateProgress,
  removeBook,
  clearLibrary,
  saveBookFile,
  deleteBookFile,
  getBooksInCollection
} from './db'

// Store
import { useCollectionStore, THEMES } from './store'

// Config
import { FONT_OPTIONS } from './store/useAppStore'

// Types
import type { Book, Bookmark, Highlight, Rendition, TOCEntry } from './types'

// Styles
import './App.css'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Generate UUID with fallback for non-secure contexts
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface PendingBookLoad {
  file?: File
  savedCfi?: string
  bookId?: string
}

// Extended rendition type with all methods used (matching useHighlights definition)
interface ExtendedRendition {
  display(location: string): void
  next(): void
  prev(): void
  on(eventName: string, handler: (...args: unknown[]) => void): void
  off(eventName: string, handler?: (...args: unknown[]) => void): void
  themes: {
    font(value: string): void
    fontSize(value: string): void
    register(name: string, theme: unknown): void
    select(name: string): void
    override(prop: string, value: string, important: boolean): void
  }
  annotations: {
    add(type: string, cfi: string, options: unknown, callback: () => void, className: string, styles: { fill: string; 'fill-opacity': string }): void
    clear(): void
  }
  getContents: () => unknown
  getRange: (range: Range) => string
  currentLocation: () => { start: { cfi: string; displayed?: { page?: number } } }
}

// ReaderView compatible rendition type
interface ReaderViewRenditionType {
  display(location: string): void
  next(): void
  prev(): void
  themes: {
    override(prop: string, value: string, important: boolean): void
    select(name: string): void
    fontSize(value: string): void
  }
}

function App(): React.ReactElement {
  // Library State
  const [library, setLibrary] = useState<Book[]>([])
  const [activeBook, setActiveBook] = useState<Book | null>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  // Reader Settings
  const [currentTheme, setCurrentTheme] = useState<string>('light')
  const [fontSize, setFontSize] = useState<number>(100)
  const [readingFont, setReadingFont] = useState<string>('georgia')

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // Refs
  const viewerRef = useRef<HTMLDivElement>(null)
  const progressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hooks
  const { toasts, addToast, removeToast } = useToast()
  const activeCollectionId = useCollectionStore(state => state.activeCollectionId)

  const filteredLibrary = useMemo(() => {
    return getBooksInCollection(activeCollectionId, library)
  }, [activeCollectionId, library])

  const {
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
    relocatedListenerRef
  } = useBookLoader(viewerRef as React.RefObject<HTMLDivElement>, addToast, currentTheme as 'light' | 'sepia' | 'dark', fontSize, readingFont)

  const {
    highlights,
    showHighlightPopup,
    highlightPosition,
    addHighlight,
    setShowHighlightPopup
  } = useHighlights(activeBook, rendition as unknown as ExtendedRendition | null)

  // Cast rendition to ExtendedRendition for full API access
  const extendedRendition = rendition as unknown as ExtendedRendition | null

  // Load library and saved preferences on mount
  useEffect(() => {
    getLibrary().then(books => {
      // Clean up invalid covers (expired blob URLs) and log cover status
      const cleanedBooks = books.map(book => {
        if (book.cover) {
          // Check if cover is a blob URL (invalid after restart)
          if (book.cover.startsWith('blob:')) {
            console.log(`[LIBRARY] Book "${book.title}" has expired blob URL, removing cover`)
            return { ...book, cover: undefined }
          }
          // Check if cover is a valid data URL
          if (!book.cover.startsWith('data:')) {
            console.log(`[LIBRARY] Book "${book.title}" has invalid cover format:`, book.cover.substring(0, 50))
            return { ...book, cover: undefined }
          }
          console.log(`[LIBRARY] Book "${book.title}" has valid base64 cover, length:`, book.cover.length)
        }
        return book
      })
      
      // Save cleaned books if any were modified
      const hasChanges = cleanedBooks.some((book, i) => book.cover !== books[i].cover)
      if (hasChanges) {
        localforage.setItem('books', cleanedBooks)
      }
      
      setLibrary(cleanedBooks)
    })
    
    // Load saved theme
    localforage.getItem('reading-theme').then(savedTheme => {
      if (savedTheme && ['light', 'dark', 'sepia'].includes(savedTheme as string)) {
        setCurrentTheme(savedTheme as string)
      }
    })
    
    // Load saved font size
    localforage.getItem('reading-font-size').then(savedSize => {
      if (savedSize && typeof savedSize === 'number') {
        setFontSize(savedSize)
      }
    })
    
    // Load saved font
    localforage.getItem('reading-font').then(savedFont => {
      if (savedFont && FONT_OPTIONS.some(f => f.id === savedFont)) {
        setReadingFont(savedFont as string)
      }
    })

    // Manual reset
    if (window.location.search.includes('reset=true')) {
      if (confirm('RESET MANUALE: Cancellare tutta la libreria?')) {
        localforage.clear().then(() => {
          addToast('Libreria cancellata! Ricarica la pagina.', 'success')
          window.location.search = ''
        })
      }
    }
  }, [addToast])

  // Load bookmarks when book changes
  useEffect(() => {
    if (!activeBook) {
      setBookmarks([])
      return
    }
    localforage.getItem(`bookmarks_${activeBook.id}`).then(data => {
      if (data && Array.isArray(data)) {
        setBookmarks(data as Bookmark[])
      }
    })
  }, [activeBook])

  // Save bookmarks when changed
  useEffect(() => {
    if (!activeBook || bookmarks.length === 0) return
    localforage.setItem(`bookmarks_${activeBook.id}`, bookmarks)
  }, [bookmarks, activeBook])

  // Track viewer element availability
  useEffect(() => {
    if (!activeBook) {
      if (viewerReady) setViewerReady(false)
      return
    }

    let attempts = 0
    const maxAttempts = 50

    const checkViewer = (): boolean => {
      attempts++
      if (viewerRef.current) {
        setViewerReady(true)
        return true
      }
      if (attempts >= maxAttempts) {
        addToast('Errore: Elemento viewer non trovato', 'error')
        return true
      }
      return false
    }

    if (!checkViewer()) {
      const interval = setInterval(() => {
        if (checkViewer()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [activeBook, viewerReady, setViewerReady, addToast])

  // Load book when pendingBookLoad is set and viewer is ready
  useEffect(() => {
    if (pendingBookLoad && viewerReady && viewerRef.current) {
      setIsLoading(true)
      loadBookIntoViewer(pendingBookLoad).then((result) => {
        if (result?.book && activeBook?.id) {
          // Setup progress tracking with debouncing
          const listener = (location: { start: { cfi: string } }) => {
            // Clear pending update
            if (progressUpdateTimeoutRef.current) {
              clearTimeout(progressUpdateTimeoutRef.current)
            }
            
            // Debounce progress update (500ms)
            progressUpdateTimeoutRef.current = setTimeout(() => {
              const percent = result.book.locations.percentageFromCfi(location.start.cfi)
              const progress = Math.floor(percent * 100)
              updateProgress(activeBook.id, location.start.cfi, progress)
              setLibrary(prev => prev.map(b => 
                b.id === activeBook.id ? { ...b, progress, cfi: location.start.cfi } : b
              ))
            }, 500)
            
            return { cfi: location.start.cfi, progress: Math.floor((result.book.locations.percentageFromCfi(location.start.cfi)) * 100) }
          }
          if (relocatedListenerRef) {
            relocatedListenerRef.current = listener
          }
        }
      })
    }
    
    // Cleanup debounce timeout
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
        progressUpdateTimeoutRef.current = null
      }
    }
  }, [pendingBookLoad, viewerReady, loadBookIntoViewer, setIsLoading, activeBook, relocatedListenerRef])

  // Apply theme
  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  // Apply font settings to rendition and save preferences
  useEffect(() => {
    if (!extendedRendition || !activeBook) return

    let isCancelled = false
    let styleTimeoutId: ReturnType<typeof setTimeout> | null = null
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null
    const appliedStyles = new Map<string, { content: { document: Document }, styleId: string }>()

    const fontOption = FONT_OPTIONS.find(f => f.id === readingFont)
    const fontStack = fontOption?.family || 'Georgia, "Times New Roman", serif'
    
    // Get theme colors
    const themeTextColor = THEMES[currentTheme as keyof typeof THEMES]?.body?.color || '#1a1a1a'
    const themeBgColor = THEMES[currentTheme as keyof typeof THEMES]?.body?.background || '#f9f7f2'

    const cleanupStyles = (): void => {
      appliedStyles.forEach(({ content, styleId }) => {
        try {
          if (content && content.document) {
            const existingStyle = content.document.getElementById(styleId)
            if (existingStyle) {
              existingStyle.remove()
            }
          }
        } catch {
          // Content document might be inaccessible
        }
      })
      appliedStyles.clear()
    }

    // Force reflow/re-render to apply fonts correctly
    const forceReflow = (doc: Document): void => {
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

    const applyFontStyles = async (): Promise<void> => {
      if (isCancelled) return

      try {
        // Method 1: Use epub.js themes API (applies theme including text color)
        extendedRendition.themes.select(currentTheme)
        extendedRendition.themes.fontSize(`${fontSize}%`)
        
        // Method 2: Use themes.override for font, color and background
        extendedRendition.themes.override('font-family', fontStack, true)
        extendedRendition.themes.override('color', themeTextColor, true)
        extendedRendition.themes.override('background', themeBgColor, true)
        extendedRendition.themes.override('background-color', themeBgColor, true)
        
        // Method 3: Direct CSS injection for font only (no color override here)
        const contents = extendedRendition.getContents()
        const contentsArray = Array.isArray(contents) ? contents : (contents ? [contents] : [])
        const docsToReflow: Document[] = []
        
        if (contentsArray.length > 0) {
          contentsArray.forEach((content, index) => {
            if (!content || !content.document || !content.document.head) {
              return
            }

            const doc = content.document
            const contentId = (content as { id?: string }).id || `content-${index}`
            const styleId = `lumina-font-override-${contentId}`
            
            // Remove previous style for this specific content document
            const existingStyle = doc.getElementById(styleId)
            if (existingStyle) {
              existingStyle.remove()
            }
            
            // Create new style with font and theme colors (aggressive override)
            const style = doc.createElement('style')
            style.id = styleId
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
                font-family: ${fontStack} !important; 
                color: ${themeTextColor} !important;
              }
              /* Links */
              a, a:link, a:visited {
                color: #c05d4e !important;
              }
            `
            doc.head.appendChild(style)
            
            // Force inline styles on body element only
            doc.body.style.setProperty('background-color', themeBgColor, 'important')
            doc.body.style.setProperty('color', themeTextColor, 'important')
            
            // Track for cleanup and reflow
            appliedStyles.set(contentId, { content, styleId })
            docsToReflow.push(doc)
          })

          // Wait for fonts to load, then force reflow to ensure they're applied
          try {
            await Promise.race([
              Promise.all(docsToReflow.map(d => d.fonts?.ready || Promise.resolve())),
              new Promise(resolve => setTimeout(resolve, 500)) // Max 500ms wait
            ])
            
            // Force reflow for each content document to ensure font application
            docsToReflow.forEach(d => forceReflow(d))
          } catch (fontError) {
            console.warn('[FONT] Font loading issue:', fontError)
          }
        }
      } catch (error) {
        console.error('[FONT] Failed to apply styles:', error)
      }
    }

    // Apply styles when a section is rendered (page change)
    const handleRendered = (): void => {
      if (styleTimeoutId) clearTimeout(styleTimeoutId)
      styleTimeoutId = setTimeout(() => {
        if (!isCancelled) {
          cleanupStyles()
          applyFontStyles()
        }
      }, 50)
    }

    extendedRendition.on('rendered', handleRendered)
    
    // Initial application with retry logic
    let attempts = 0
    const maxAttempts = 10
    
    const tryApplyStyles = (): void => {
      if (isCancelled) return
      
      const contents = extendedRendition.getContents()
      const contentsArray = Array.isArray(contents) ? contents : (contents ? [contents] : [])
      
      if (contentsArray.length > 0) {
        cleanupStyles()
        applyFontStyles()
      } else if (attempts < maxAttempts) {
        attempts++
        retryTimeoutId = setTimeout(tryApplyStyles, 100)
      }
    }
    
    tryApplyStyles()

    // Save preferences
    localforage.setItem('reading-theme', currentTheme)
    localforage.setItem('reading-font', readingFont)
    localforage.setItem('reading-font-size', fontSize)

    // Cleanup function
    return () => {
      isCancelled = true
      if (styleTimeoutId) clearTimeout(styleTimeoutId)
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      extendedRendition.off('rendered', handleRendered)
      cleanupStyles()
    }
  }, [currentTheme, readingFont, fontSize, extendedRendition, activeBook])

  // Handlers
  const handleFileUpload = useCallback(async (file: File | null): Promise<void> => {
    if (!file) {
      addToast('Nessun file selezionato', 'error', 'Errore')
      return
    }

    if (!file.name.toLowerCase().endsWith('.epub')) {
      addToast('Il file deve avere estensione .epub', 'error', 'Formato non valido')
      return
    }

    if (file.size === 0) {
      addToast('Il file è vuoto (0 bytes)', 'error', 'File non valido')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      addToast(`File troppo grande (${sizeMB}MB). Max: 100MB`, 'error', 'Dimensione eccessiva')
      return
    }

    setIsLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('FILE_EMPTY')
      }
      
      const header = new Uint8Array(arrayBuffer.slice(0, 4))
      const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04
      if (!isZip) {
        throw new Error('NOT_ZIP')
      }

      const { default: ePub } = await import('epubjs')
      const book = ePub(arrayBuffer)
      
      let metadata: { title?: string; creator?: string }
      try {
        metadata = await Promise.race([
          book.loaded.metadata,
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
        ]) as { title?: string; creator?: string }
      } catch {
        throw new Error('METADATA_ERROR')
      }

      if (!metadata || (!metadata.title && !file.name)) {
        throw new Error('NO_METADATA')
      }

      let coverUrl: string | undefined
      try {
        const tempCoverUrl = await book.coverUrl()
        console.log('[UPLOAD] Raw coverUrl from epubjs:', tempCoverUrl?.substring(0, 100))
        
        if (tempCoverUrl) {
          // Convert blob URL to base64 for persistent storage
          try {
            const response = await fetch(tempCoverUrl)
            const blob = await response.blob()
            console.log('[UPLOAD] Cover blob size:', blob.size, 'bytes, type:', blob.type)
            
            // Limit cover size to 1MB to avoid IndexedDB issues
            if (blob.size > 1024 * 1024) {
              console.warn('[UPLOAD] Cover too large (>1MB), skipping')
              coverUrl = undefined
            } else {
              coverUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              console.log('[UPLOAD] Cover converted to base64, length:', coverUrl.length)
            }
          } catch (conversionError) {
            console.warn('[UPLOAD] Failed to convert cover to base64:', conversionError)
            // Fallback to original URL if conversion fails
            coverUrl = tempCoverUrl
          }
        } else {
          console.log('[UPLOAD] No cover URL returned by epubjs')
        }
      } catch (coverError) {
        console.log('[UPLOAD] Error getting cover:', coverError)
      }

      const bookId = generateId()
      
      try {
        await saveBookFile(bookId, arrayBuffer)
      } catch {
        throw new Error('SAVE_ERROR')
      }

      const newLibrary = await saveBookMetadata({
        id: bookId,
        title: metadata.title || file.name.replace('.epub', ''),
        author: metadata.creator || 'Autore sconosciuto',
        cover: coverUrl,
        addedAt: Date.now(),
        progress: 0,
        cfi: undefined
      })

      setLibrary(newLibrary)
      addToast(`"${metadata.title || file.name}" aggiunto`, 'success', 'Libro aggiunto')
    } catch (error) {
      console.error('[UPLOAD] Error:', error)
      
      const errorMessages: Record<string, [string, string]> = {
        'FILE_EMPTY': ['Il file è vuoto', 'Errore lettura'],
        'NOT_ZIP': ['Il file non è un EPUB valido', 'Formato non valido'],
        'METADATA_TIMEOUT': ["L'EPUB impiega troppo tempo", 'Timeout'],
        'METADATA_ERROR': ['Impossibile leggere i metadati', 'EPUB corrotto'],
        'NO_METADATA': ["L'EPUB non contiene informazioni valide", 'Metadati mancanti'],
        'SAVE_ERROR': ['Errore durante il salvataggio', 'Errore salvataggio']
      }
      
      const errorMsg = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      const [msg, title] = errorMessages[errorMsg] || ['Errore durante il caricamento', 'Errore']
      addToast(msg, 'error', title)
    } finally {
      setIsLoading(false)
    }
  }, [addToast, setIsLoading])

  // Function to regenerate missing covers from EPUB files
  const handleRegenerateCovers = useCallback(async (): Promise<void> => {
    const booksWithoutCover = library.filter(book => !book.cover)
    if (booksWithoutCover.length === 0) {
      addToast('Tutti i libri hanno già una copertina', 'info', 'Nessuna azione necessaria')
      return
    }

    addToast(`Rigenerazione copertine per ${booksWithoutCover.length} libro/i...`, 'info', 'Riparazione')
    setIsLoading(true)

    let successCount = 0
    let failCount = 0

    for (const book of booksWithoutCover) {
      try {
        // Load EPUB file
        const { getBookFile } = await import('./db')
        const fileData = await getBookFile(book.id)
        if (!fileData) {
          console.warn(`[REGEN] No file found for book: ${book.title}`)
          failCount++
          continue
        }

        // Parse EPUB and extract cover
        const { default: ePub } = await import('epubjs')
        const epubBook = ePub(fileData)
        
        let coverUrl: string | undefined
        try {
          const tempCoverUrl = await epubBook.coverUrl()
          if (tempCoverUrl) {
            const response = await fetch(tempCoverUrl)
            const blob = await response.blob()
            
            // Limit to 1MB
            if (blob.size <= 1024 * 1024) {
              coverUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            }
          }
        } catch (coverError) {
          console.warn(`[REGEN] Failed to extract cover for "${book.title}":`, coverError)
        }

        epubBook.destroy()

        if (coverUrl) {
          // Update book metadata
          const updatedBook = { ...book, cover: coverUrl }
          await saveBookMetadata(updatedBook)
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`[REGEN] Error processing book "${book.title}":`, error)
        failCount++
      }
    }

    // Reload library
    const updatedLibrary = await getLibrary()
    setLibrary(updatedLibrary)
    setIsLoading(false)

    if (successCount > 0) {
      addToast(`${successCount} copertine rigenerate${failCount > 0 ? `, ${failCount} fallite` : ''}`, 'success', 'Completato')
    } else {
      addToast('Nessuna copertina trovata nei file EPUB', 'warning', 'Nessun risultato')
    }
  }, [library, addToast, setIsLoading])

  const handleLoadBook = useCallback((file: File | null, savedCfi?: string, bookId?: string): void => {
    if (bookId) {
      const book = library.find(b => b.id === bookId)
      if (!book) {
        addToast('Libro non trovato nella libreria', 'error')
        return
      }
      setActiveBook(book)
    } else if (file) {
      setActiveBook({ id: 'temp', title: 'Caricamento...', progress: 0, addedAt: Date.now() } as Book)
    }

    setTimeout(() => {
      setPendingBookLoad({ file: file || undefined, savedCfi, bookId })
    }, 0)
  }, [library, addToast, setPendingBookLoad])

  const handleReturnToLibrary = useCallback((): void => {
    resetReader()
    setActiveBook(null)
    setBookmarks([])
  }, [resetReader])

  const handleDeleteBook = useCallback(async (id: string): Promise<void> => {
    if (confirm('Sei sicuro di voler eliminare questo libro?')) {
      try {
        await deleteBookFile(id)
        const newLibrary = await removeBook(id)
        setLibrary(newLibrary)
        addToast('Libro eliminato dalla libreria', 'info', 'Eliminazione')
      } catch (error) {
        console.error('Delete error:', error)
        addToast('Impossibile eliminare il libro', 'error', 'Errore')
      }
    }
  }, [addToast])

  const handleClearLibrary = useCallback(async (): Promise<void> => {
    if (confirm('Vuoi davvero svuotare tutta la libreria?')) {
      const newLib = await clearLibrary()
      setLibrary(newLib)
      addToast('Libreria svuotata', 'info')
    }
  }, [addToast])

  const handleAddBookmark = useCallback((): void => {
    if (!extendedRendition || !activeBook) return

    const location = extendedRendition.currentLocation()
    
    if (!location?.start?.cfi) {
      addToast('Impossibile aggiungere segnalibro: posizione non disponibile', 'error')
      return
    }
    
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      cfi: location.start.cfi,
      label: `Pagina ${location.start.displayed?.page || '?'}`,
      createdAt: Date.now()
    }

    setBookmarks(prev => [newBookmark, ...prev])
    addToast('Segnalibro aggiunto', 'success')
  }, [extendedRendition, activeBook, addToast])

  const handleRemoveBookmark = useCallback((id: string): void => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
    addToast('Segnalibro rimosso', 'info')
  }, [addToast])

  const handleGoToBookmark = useCallback((cfi: string): void => {
    if (rendition) {
      rendition.display(cfi)
    }
  }, [rendition])

  const handleGoToTOCItem = useCallback((href: string): void => {
    if (rendition) {
      rendition.display(href)
    }
  }, [rendition])

  const handlePrevPage = useCallback((): void => {
    rendition?.prev()
  }, [rendition])

  const handleNextPage = useCallback((): void => {
    rendition?.next()
  }, [rendition])

  const handleFontSizeChange = useCallback((delta: number): void => {
    setFontSize(prev => Math.max(50, Math.min(200, prev + delta)))
  }, [])

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <AnimatePresence mode="wait">
        {!activeBook ? (
          <LibraryView
            library={library}
            filteredLibrary={filteredLibrary}
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
            onFileUpload={handleFileUpload}
            onLoadBook={handleLoadBook}
            onDeleteBook={handleDeleteBook}
            onClearLibrary={handleClearLibrary}
            onRegenerateCovers={handleRegenerateCovers}
          />
        ) : (
          <ReaderView
            viewerRef={viewerRef as React.RefObject<HTMLDivElement>}
            book={bookEngine}
            metadata={metadata}
            rendition={rendition as unknown as ReaderViewRenditionType | null}
            toc={toc}
            bookmarks={bookmarks}
            highlights={highlights}
            currentTheme={currentTheme}
            fontSize={fontSize}
            readingFont={readingFont}
            showHighlightPopup={showHighlightPopup}
            highlightPosition={highlightPosition}
            onAddHighlight={addHighlight}
            onAddBookmark={handleAddBookmark}
            onRemoveBookmark={handleRemoveBookmark}
            onGoToBookmark={handleGoToBookmark}
            onGoToTOCItem={handleGoToTOCItem}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onReturnToLibrary={handleReturnToLibrary}
            onThemeChange={setCurrentTheme}
            onFontSizeChange={handleFontSizeChange}
            onFontChange={setReadingFont}
            setShowHighlightPopup={setShowHighlightPopup}
            loadingStep={loadingStep as string | null}
          />
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isLoading} loadingStep={loadingStep as string | null} />
    </div>
  )
}

export default App
