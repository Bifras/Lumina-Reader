import { useState, useEffect, useCallback, useRef, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Settings,
  X,
  List,
  Bookmark,
  Search,
  ChevronUp,
  Headphones,
  Maximize,
  Quote,
  Minimize
} from 'lucide-react'
import HighlightPopup from '../components/HighlightPopup'
import { FONT_OPTIONS } from '../config/fonts'
import type { Bookmark as BookmarkType, TOCEntry, Theme } from '../types'

const THEMES: Record<string, Theme> = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Sepia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

interface SearchResult {
  cfi: string
  snippet: string
  href: string
}

interface ReaderViewProps {
  viewerRef: RefObject<HTMLDivElement>
  book: import('epubjs').Book | null
  metadata: { creator?: string; title?: string } | null
  rendition: {
    display(location: string): void
    next(): void
    prev(): void
    themes: {
      override(prop: string, value: string, important: boolean): void
      select(name: string): void
      fontSize(value: string): void
    }
  } | null
  toc: TOCEntry[]
  bookmarks: BookmarkType[]
  highlights: Highlight[]
  currentTheme: string
  fontSize: number
  readingFont: string
  readingProgress: number
  showHighlightPopup: boolean
  highlightPosition: { x: number; y: number }
  onAddHighlight: (color: string) => void
  onAddBookmark: () => void
  onRemoveBookmark: (id: string) => void
  onGoToBookmark: (cfi: string) => void
  onGoToTOCItem: (href: string) => void
  onPrevPage: () => void
  onNextPage: () => void
  onReturnToLibrary: () => void
  onThemeChange: (theme: string) => void
  onFontSizeChange: (delta: number) => void
  onReadingFontChange: (fontId: string) => void
  setShowHighlightPopup: (show: boolean) => void
  loadingStep: string | null
  pageInfo: { current: number; total: number } | null
}

const ReaderView = ({
  viewerRef,
  book,
  metadata,
  rendition,
  toc,
  bookmarks,
  currentTheme,
  fontSize,
  readingFont,
  readingProgress,
  showHighlightPopup,
  highlightPosition,
  onAddHighlight,
  onAddBookmark,
  onRemoveBookmark,
  onGoToBookmark,
  onGoToTOCItem,
  onPrevPage,
  onNextPage,
  onReturnToLibrary,
  onThemeChange,
  onFontSizeChange,
  onReadingFontChange,
  loadingStep,
  pageInfo
}: ReaderViewProps) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [menuVisible, setMenuVisible] = useState(true)
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [showQuoteGenerator, setShowQuoteGenerator] = useState(false)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine if any panel is open
  const anyPanelOpen = showTOC || showBookmarks || showSearch || showSettings

  // Close all panels helper
  const closeAllPanels = useCallback(() => {
    setShowTOC(false)
    setShowBookmarks(false)
    setShowSearch(false)
    setShowSettings(false)
  }, [])

  // Toolbar auto-hide: show on mouse move, hide after 3s inactivity
  useEffect(() => {
    if (zenMode) return

    const resetTimer = () => {
      setToolbarVisible(true)
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current)
      if (!anyPanelOpen) {
        toolbarTimerRef.current = setTimeout(() => setToolbarVisible(false), 3000)
      }
    }

    // Show toolbar immediately, start hide timer
    resetTimer()

    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    window.addEventListener('keydown', resetTimer)

    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current)
    }
  }, [zenMode, anyPanelOpen])

  // Note: toolbar stays visible when anyPanelOpen because the timer
  // only starts when !anyPanelOpen (see resetTimer above)

  // Keyboard navigation - use ref to avoid re-attaching listeners when callbacks change
  const onPrevPageRef = useRef(onPrevPage)
  const onNextPageRef = useRef(onNextPage)

  // Update refs when callbacks change
  useEffect(() => {
    onPrevPageRef.current = onPrevPage
    onNextPageRef.current = onNextPage
  }, [onPrevPage, onNextPage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // ESC to exit zen mode
      if (e.key === 'Escape' && zenMode) {
        e.preventDefault()
        setZenMode(false)
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrevPageRef.current()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNextPageRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zenMode]) // Re-attach when zenMode changes

  const performSearch = useCallback(async () => {
    if (!book || !searchQuery.trim()) return

    setSearchResults([])
    const results: SearchResult[] = []
    const searchLower = searchQuery.toLowerCase()

    try {
      // Get all sections from the book's spine
      const sections = (book as any).spine?.items || (book as any).spine?.spineItems || []

      if (!sections || sections.length === 0) {
        console.warn('[WARN] No spine sections found for search')
        return
      }

      const searchPromises = sections.map(async (item: any) => {
        try {
          // Load the section content
          const doc = await item.load(book)
          if (!doc || !doc.body) {
            item.unload?.()
            return
          }

          const text = doc.body.textContent || ''
          if (text.toLowerCase().includes(searchLower)) {
            const index = text.toLowerCase().indexOf(searchLower)
            const snippet = text.substring(
              Math.max(0, index - 50),
              Math.min(text.length, index + searchLower.length + 50)
            )
            results.push({
              cfi: item.cfiBase || `epubcfi(/6/${item.idref})`,
              snippet: '...' + snippet + '...',
              href: item.href || ''
            })
          }
          item.unload?.()
        } catch (e) {
          console.log('[WARN] Search error in item:', (e as Error).message)
        }
      })

      await Promise.all(searchPromises)
      results.sort((a, b) => a.cfi.localeCompare(b.cfi))
      setSearchResults(results)
    } catch (e) {
      console.error('[ERROR] Search failed:', e)
    }
  }, [book, searchQuery])

  const goToSearchResult = (cfi: string) => {
    if (rendition) {
      rendition.display(cfi)
      setShowSearch(false)
    }
  }

  const handleFontSelect = (fontId: string) => {
    onReadingFontChange(fontId)
    // Apply font immediately via rendition
    if (rendition) {
      const font = FONT_OPTIONS.find(f => f.id === fontId)?.family || 'Lora'
      rendition.themes.override('font-family', font, true)
    }
  }

  return (
    <motion.div
      key="reader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="reader-container"
    >
      {/* Book Info Header */}
      <div className="book-info-header">
        <h3 className="book-author">{metadata?.creator}</h3>
        <h2 className="book-title">{metadata?.title}</h2>
      </div>

      {/* EPUB Viewer */}
      <div
        id="viewer"
        ref={viewerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: loadingStep === 'Rendering...' ? 0.5 : 1,
          transition: 'opacity 0.3s'
        }}
      />

      {/* Menu Toggle Button */}
      <AnimatePresence>
        {!menuVisible && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="menu-toggle glass-panel"
            onClick={() => setMenuVisible(true)}
            title="Mostra menu"
          >
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Vertical Toolbar - Right Side - Auto-hide */}
      <AnimatePresence>
        {menuVisible && !zenMode && toolbarVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="vertical-toolbar"
            role="toolbar"
            aria-label="Controlli di lettura"
          >
            {/* TOP: Navigation & Content */}
            <div className="toolbar-group" role="group" aria-label="Navigazione">
              <button
                className="toolbar-btn"
                onClick={onReturnToLibrary}
                title="Torna alla Libreria"
                aria-label="Torna alla libreria"
              >
                <BookOpen size={18} aria-hidden="true" />
              </button>
              <button
                className={`toolbar-btn ${showTOC ? 'active' : ''}`}
                onClick={() => {
                  setShowTOC(!showTOC)
                  setShowBookmarks(false)
                  setShowSearch(false)
                  setShowSettings(false)
                }}
                title="Indice"
                aria-label="Mostra indice"
                aria-pressed={showTOC}
              >
                <List size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* CENTER: Reading Tools */}
            <div className="toolbar-group" role="group" aria-label="Strumenti di lettura">
              <button
                className={`toolbar-btn ${showBookmarks ? 'active' : ''}`}
                onClick={() => {
                  setShowBookmarks(!showBookmarks)
                  setShowTOC(false)
                  setShowSearch(false)
                  setShowSettings(false)
                }}
                title="Segnalibri"
                aria-label="Mostra segnalibri"
                aria-pressed={showBookmarks}
              >
                <Bookmark size={18} aria-hidden="true" />
              </button>

              <button
                className={`toolbar-btn ${showSearch ? 'active' : ''}`}
                onClick={() => {
                  setShowSearch(!showSearch)
                  setShowTOC(false)
                  setShowBookmarks(false)
                  setShowSettings(false)
                }}
                title="Cerca"
                aria-label="Cerca nel libro"
                aria-pressed={showSearch}
              >
                <Search size={18} aria-hidden="true" />
              </button>

              <button
                className={`toolbar-btn ${showQuoteGenerator ? 'active' : ''}`}
                onClick={() => setShowQuoteGenerator(!showQuoteGenerator)}
                title="Crea citazione"
                aria-label="Genera citazione"
                aria-pressed={showQuoteGenerator}
              >
                <Quote size={18} aria-hidden="true" />
              </button>

              <button
                className="toolbar-btn"
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance()
                  utterance.lang = 'it-IT'
                  utterance.rate = 1
                  window.speechSynthesis.speak(utterance)
                }}
                title="Leggi ad alta voce"
                aria-label="Text to speech"
              >
                <Headphones size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* BOTTOM: View & System */}
            <div className="toolbar-group" role="group" aria-label="Visualizzazione">
              <button
                className={`toolbar-btn ${zenMode ? 'active' : ''}`}
                onClick={() => setZenMode(true)}
                title="Modalità Zen"
                aria-label="Attiva modalità Zen"
              >
                <Maximize size={18} aria-hidden="true" />
              </button>

              <button
                className={`toolbar-btn ${showSettings ? 'active' : ''}`}
                onClick={() => {
                  setShowSettings(!showSettings)
                  setShowTOC(false)
                  setShowBookmarks(false)
                  setShowSearch(false)
                }}
                title="Impostazioni"
                aria-label="Impostazioni di lettura"
                aria-pressed={showSettings}
              >
                <Settings size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* Page Navigation */}
            <div className="toolbar-group" role="group" aria-label="Navigazione pagina">
              <button
                className="toolbar-btn"
                onClick={onPrevPage}
                title="Pagina precedente"
                aria-label="Vai alla pagina precedente"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                className="toolbar-btn"
                onClick={onNextPage}
                title="Pagina successiva"
                aria-label="Vai alla pagina successiva"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel Backdrop - click to dismiss */}
      <AnimatePresence>
        {anyPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="panel-backdrop"
            onClick={closeAllPanels}
          />
        )}
      </AnimatePresence>

      {/* TOC Panel - slides from right */}
      <AnimatePresence>
        {showTOC && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Indice</h4>
              <button onClick={() => setShowTOC(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="panel-content" style={{ overflowY: 'auto' }}>
              {toc.length === 0 ? (
                <p className="empty-state-message">
                  Nessun indice disponibile
                </p>
              ) : (
                toc.map((item, i) => (
                  <button
                    key={i}
                    className="toc-item"
                    onClick={() => {
                      onGoToTOCItem(item.href)
                      setShowTOC(false)
                    }}
                    style={{ paddingLeft: `${(item as TOCEntry & { level?: number }).level || 0 * 20 + 16}px` }}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Panel - slides from right */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Segnalibri</h4>
              <button onClick={() => setShowBookmarks(false)}>
                <X size={18} />
              </button>
            </div>
            {/* Progress Bar & Page Info */}
            <div className="toolbar-progress-container">
              <div
                className="toolbar-progress-bar"
                style={{ width: `${readingProgress}%` }}
              />
              {pageInfo && (
                <div className="page-indicator">
                  Pagina {pageInfo.current} di {pageInfo.total}
                </div>
              )}
            </div>
            <div className="panel-content">
              <button
                onClick={onAddBookmark}
                className="bookmark-add-btn"
              >
                <Bookmark size={18} className="btn-icon" />
                Aggiungi segnalibro
              </button>
              {bookmarks.length === 0 ? (
                <p className="empty-state-message">
                  Nessun segnalibro
                </p>
              ) : (
                bookmarks.map((bm) => (
                  <div key={bm.id} className="bookmark-item">
                    <button
                      onClick={() => onGoToBookmark(bm.cfi)}
                      className="bookmark-label"
                    >
                      {bm.label}
                    </button>
                    <button
                      onClick={() => onRemoveBookmark(bm.id)}
                      className="bookmark-delete-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Panel - slides from right */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4 className="panel-title">Ricerca</h4>
              <button onClick={() => setShowSearch(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="panel-content">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Digita una parola per cercare nel testo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  className="search-input"
                />
                <button onClick={performSearch} className="nav-button">
                  <Search size={18} />
                </button>
              </div>
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <p className="empty-state-message">
                    {searchQuery ? 'Nessun risultato trovato' : ''}
                  </p>
                ) : (
                  searchResults.map((result, i) => (
                    <button
                      key={i}
                      className="search-result-item"
                      onClick={() => goToSearchResult(result.cfi)}
                    >
                      <p>{result.snippet}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="settings-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Impostazioni di lettura</h4>
              <button onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Theme Selector */}
            <div className="setting-group">
              <label>Tema</label>
              <div className="theme-selector">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    className={`theme-btn ${currentTheme === key ? 'active' : ''}`}
                    onClick={() => onThemeChange(key)}
                    title={theme.name}
                    style={{
                      background: theme.body.background,
                      border: currentTheme === key ? '2px solid var(--accent-warm)' : '1px solid var(--border-subtle)'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="setting-group">
              <label>Dimensione testo</label>
              <div className="font-controls">
                <button onClick={() => onFontSizeChange(-10)}>-</button>
                <span>{fontSize}%</span>
                <button onClick={() => onFontSizeChange(10)}>+</button>
              </div>
            </div>

            {/* Font Family */}
            <div className="setting-group">
              <label>Carattere</label>
              <div className="font-selector-compact">
                <button
                  className="font-selector-trigger"
                  onClick={() => setShowFontPanel(!showFontPanel)}
                >
                  <span className="font-current-name" style={{ fontFamily: FONT_OPTIONS.find(f => f.id === readingFont)?.family }}>
                    {FONT_OPTIONS.find(f => f.id === readingFont)?.name}
                  </span>
                  <span className="font-selector-arrow">{showFontPanel ? '▲' : '▼'}</span>
                </button>

                {showFontPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="font-panel"
                  >
                    {['serif', 'sans-serif', 'accessibility', 'monospace'].map((category) => (
                      <div key={category} className="font-category">
                        <span className="font-category-title">
                          {category === 'serif' && 'Serif — Narrativa'}
                          {category === 'sans-serif' && 'Sans-Serif — Moderni'}
                          {category === 'accessibility' && 'Accessibilità'}
                          {category === 'monospace' && 'Monospace'}
                        </span>
                        <div className="font-options-row">
                          {FONT_OPTIONS.filter(f => f.category === category).map((font) => (
                            <button
                              key={font.id}
                              className={`font-option-pill ${readingFont === font.id ? 'active' : ''}`}
                              onClick={() => {
                                handleFontSelect(font.id)
                                setShowFontPanel(false)
                              }}
                              style={{ fontFamily: font.family }}
                            >
                              {font.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zen Mode Exit Button */}
      <AnimatePresence>
        {zenMode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="zen-exit-btn"
            onClick={() => setZenMode(false)}
            title="Esci dalla modalità Zen (ESC)"
          >
            <Minimize size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation Zones for Click-to-Turn */}
      <div
        className="nav-zone-left"
        onClick={onPrevPage}
        aria-label="Pagina precedente"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onPrevPage()}
      />
      <div
        className="nav-zone-right"
        onClick={onNextPage}
        aria-label="Pagina successiva"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onNextPage()}
      />

      {/* Reading Progress Bar - Minimal */}
      <div className="reading-progress-container">
        <div className="reading-progress-track">
          <motion.div
            className="reading-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${readingProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <div className="reading-progress-info">
          <span className="reading-progress-percentage">{readingProgress}%</span>
        </div>
      </div>

      {/* Highlight Popup */}
      <HighlightPopup
        isVisible={showHighlightPopup}
        position={highlightPosition}
        onAddHighlight={onAddHighlight}
      />
    </motion.div>
  )
}

export default ReaderView
