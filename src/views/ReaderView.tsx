import { useState, useEffect, useCallback, useRef, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  List,
  Bookmark,
  Search,
  Menu,
  Headphones,
  Maximize,
  Quote,
  Minimize,
  PanelRightClose
} from 'lucide-react'
import HighlightPopup from '../components/HighlightPopup'
import QuoteGenerator from '../components/QuoteGenerator'
import { THEMES } from '../config/themes'
import { FONT_OPTIONS } from '../config/fonts'
import { useAppStore } from '../store/useAppStore'
import type { Bookmark as BookmarkType, TOCEntry, Theme, SearchResult, Highlight } from '../types'

type ActivePanel = 'toc' | 'bookmarks' | 'search' | 'settings' | null

interface ReaderViewProps {
  viewerRef: RefObject<HTMLDivElement>
  book: import('epubjs').Book | null
  metadata: { creator?: string; title?: string } | null
  rendition: {
    display(location: string): void
    next(): void
    prev(): void
    getContents(): any[]
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
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [showQuoteGenerator, setShowQuoteGenerator] = useState(false)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false)
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Global state for menu visibility
  const menuVisible = useAppStore(state => state.menuVisible)
  const setMenuVisible = useAppStore(state => state.setMenuVisible)

  // Determine if any panel is open
  const anyPanelOpen = activePanel !== null

  // Close all panels helper
  const closeAllPanels = useCallback(() => {
    setActivePanel(null)
  }, [])

  // Toggle panel helper
  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel(prev => prev === panel ? null : panel)
  }, [])

  // Toolbar auto-hide: show on mouse move, hide after 3s inactivity
  useEffect(() => {
    if (zenMode || !menuVisible) return

    const resetTimer = () => {
      setToolbarVisible(true)
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current)
      
      // Prevent hiding if a panel is open OR if mouse is hovering over the toolbar
      if (!anyPanelOpen && !isHoveringToolbar) {
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
  }, [zenMode, anyPanelOpen, isHoveringToolbar, menuVisible])

  // Keyboard navigation
  const onPrevPageRef = useRef(onPrevPage)
  const onNextPageRef = useRef(onNextPage)

  useEffect(() => {
    onPrevPageRef.current = onPrevPage
    onNextPageRef.current = onNextPage
  }, [onPrevPage, onNextPage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        if (showQuoteGenerator) {
          e.preventDefault()
          setShowQuoteGenerator(false)
          return
        }
        if (anyPanelOpen) {
          e.preventDefault()
          closeAllPanels()
          return
        }
        if (zenMode) {
          e.preventDefault()
          setZenMode(false)
          return
        }
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
  }, [zenMode, anyPanelOpen, closeAllPanels, showQuoteGenerator])

  const performSearch = useCallback(async () => {
    if (!book || !searchQuery.trim()) return

    setSearchResults([])
    const results: SearchResult[] = []
    const searchLower = searchQuery.toLowerCase()

    try {
      const sections = (book as any).spine?.items || (book as any).spine?.spineItems || []

      if (!sections || sections.length === 0) {
        console.warn('[WARN] No spine sections found for search')
        return
      }

      const searchPromises = sections.map(async (item: any) => {
        try {
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
      closeAllPanels()
    }
  }

  const handleFontSelect = (fontId: string) => {
    onReadingFontChange(fontId)
    if (rendition) {
      const font = FONT_OPTIONS.find(f => f.id === fontId)?.family || 'Lora'
      rendition.themes.override('font-family', font, true)
    }
  }

  const handleTTS = useCallback(() => {
    if (!rendition) return
    window.speechSynthesis.cancel() 
    
    try {
      const contents = rendition.getContents()
      let textToRead = ''
      
      if (Array.isArray(contents) && contents.length > 0) {
        contents.forEach(content => {
          if (content && content.document && content.document.body) {
            textToRead += content.document.body.innerText + ' '
          }
        })
      }
      
      if (textToRead.trim()) {
        const utterance = new SpeechSynthesisUtterance(textToRead)
        utterance.lang = 'it-IT'
        utterance.rate = 1
        window.speechSynthesis.speak(utterance)
      } else {
        console.warn('[TTS] No text found to read on the current page.')
      }
    } catch (e) {
      console.error('[TTS] Error extracting text for speech:', e)
    }
  }, [rendition])

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

      {/* Menu Toggle Button (when hidden) */}
      <AnimatePresence>
        {!menuVisible && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="menu-toggle glass-panel"
            onClick={() => setMenuVisible(true)}
            title="Mostra barra strumenti"
            style={{ position: 'fixed', right: '1rem', top: 'calc(var(--title-bar-height) + 68px)', zIndex: 90 }}
          >
            <Menu size={20} />
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
            className="vertical-toolbar glass-panel"
            role="toolbar"
            aria-label="Controlli di lettura"
            onMouseEnter={() => setIsHoveringToolbar(true)}
            onMouseLeave={() => setIsHoveringToolbar(false)}
          >
            {/* TOP: Navigation & Content */}
            <div className="toolbar-group" role="group" aria-label="Navigazione">
              <button
                className="toolbar-btn"
                onClick={onReturnToLibrary}
                title="Torna alla Libreria"
                aria-label="Torna alla libreria"
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
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
              <button
                className={`toolbar-btn ${activePanel === 'toc' ? 'active' : ''}`}
                onClick={() => togglePanel('toc')}
                title="Indice"
                aria-label="Mostra indice"
                aria-pressed={activePanel === 'toc'}
              >
                <List size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* CENTER: Reading Tools */}
            <div className="toolbar-group" role="group" aria-label="Strumenti di lettura">
              <button
                className={`toolbar-btn ${activePanel === 'bookmarks' ? 'active' : ''}`}
                onClick={() => togglePanel('bookmarks')}
                title="Segnalibri"
                aria-label="Mostra segnalibri"
                aria-pressed={activePanel === 'bookmarks'}
              >
                <Bookmark size={18} aria-hidden="true" />
              </button>

              <button
                className={`toolbar-btn ${activePanel === 'search' ? 'active' : ''}`}
                onClick={() => togglePanel('search')}
                title="Cerca"
                aria-label="Cerca nel libro"
                aria-pressed={activePanel === 'search'}
              >
                <Search size={18} aria-hidden="true" />
              </button>

              <button
                className={`toolbar-btn ${showQuoteGenerator ? 'active' : ''}`}
                onClick={() => setShowQuoteGenerator(true)}
                title="Crea citazione"
                aria-label="Genera citazione"
                aria-pressed={showQuoteGenerator}
              >
                <Quote size={18} aria-hidden="true" />
              </button>

              <button
                className="toolbar-btn"
                onClick={handleTTS}
                title="Leggi ad alta voce la pagina corrente"
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
                className={`toolbar-btn ${activePanel === 'settings' ? 'active' : ''}`}
                onClick={() => togglePanel('settings')}
                title="Impostazioni"
                aria-label="Impostazioni di lettura"
                aria-pressed={activePanel === 'settings'}
              >
                <Settings size={18} aria-hidden="true" />
              </button>
              
              <button
                className="toolbar-btn"
                onClick={() => {
                  setMenuVisible(false)
                  closeAllPanels()
                }}
                title="Nascondi barra strumenti"
                aria-label="Nascondi barra strumenti"
              >
                <PanelRightClose size={18} aria-hidden="true" />
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
        {activePanel === 'toc' && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Indice</h4>
              <button onClick={closeAllPanels}>
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
                      closeAllPanels()
                    }}
                    style={{ paddingLeft: `${(((item as TOCEntry & { level?: number }).level || 0) * 20) + 16}px` }}
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
        {activePanel === 'bookmarks' && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Segnalibri</h4>
              <button onClick={closeAllPanels}>
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
        {activePanel === 'search' && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4 className="panel-title">Ricerca</h4>
              <button onClick={closeAllPanels}>
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
        {activePanel === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="settings-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Impostazioni di lettura</h4>
              <button onClick={closeAllPanels}>
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
      
      {/* Quote Generator Modal */}
      <QuoteGenerator
        isVisible={showQuoteGenerator}
        onClose={() => setShowQuoteGenerator(false)}
        initialText=""
        bookTitle={metadata?.title || 'Libro Sconosciuto'}
        author={metadata?.creator || 'Autore Sconosciuto'}
      />

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
