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
  Sun,
  Maximize,
  Minimize2
} from 'lucide-react'
import HighlightPopup from '../components/HighlightPopup'
import { THEMES } from '../config/themes'
import { FONT_OPTIONS } from '../config/fonts'
import type { Bookmark as BookmarkType, TOCEntry, SearchResult, Highlight } from '../types'

type ActivePanel = 'toc' | 'settings' | null
type UnifiedTab = 'toc' | 'bookmarks' | 'search'

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
  pageInfo: _pageInfo
}: ReaderViewProps) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [pillExpanded, setPillExpanded] = useState(false)
  const [unifiedTab, setUnifiedTab] = useState<UnifiedTab>('toc')
  const pillRef = useRef<HTMLDivElement>(null)

  // Close pill when clicking outside
  useEffect(() => {
    if (!pillExpanded) return
    const handleClickOutside = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setPillExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pillExpanded])

  // Fullscreen handling for Zen Mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && zenMode) {
        setZenMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [zenMode])

  // Determine if any panel is open
  const anyPanelOpen = activePanel !== null

  // Close all panels helper
  const closeAllPanels = useCallback(() => {
    setActivePanel(null)
  }, [])

  // Toggle panel helper
  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel(prev => prev === panel ? null : panel)
    setPillExpanded(false)
  }, [])

  // Open unified panel with tab
  const openUnifiedPanel = useCallback((tab: UnifiedTab) => {
    setUnifiedTab(tab)
    setActivePanel('toc')
    setPillExpanded(false)
  }, [])

  // Toggle Zen Mode
  const toggleZenMode = useCallback(() => {
    if (!zenMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
      setZenMode(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setZenMode(false)
    }
  }, [zenMode])

  // Cycle theme
  const cycleTheme = useCallback(() => {
    const themes = Object.keys(THEMES)
    const currentIndex = themes.indexOf(currentTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    onThemeChange(nextTheme)
  }, [currentTheme, onThemeChange])

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
        if (anyPanelOpen) {
          e.preventDefault()
          closeAllPanels()
          return
        }
        if (zenMode) {
          e.preventDefault()
          toggleZenMode()
          return
        }
        if (pillExpanded) {
          e.preventDefault()
          setPillExpanded(false)
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
  }, [zenMode, anyPanelOpen, closeAllPanels, pillExpanded, toggleZenMode])

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

      {/* Floating Pill - Collapsed/Expanded */}
      {!zenMode && (
        <div ref={pillRef} className="floating-pill-container">
          <AnimatePresence mode="wait">
            {!pillExpanded ? (
              <motion.button
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="floating-pill-collapsed glass-panel"
                onClick={() => setPillExpanded(true)}
                title="Apri menu"
                aria-label="Apri menu di lettura"
              >
                <Menu size={20} />
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.9, width: 56 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.9, width: 56 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="floating-pill-expanded glass-panel"
              >
                {/* Navigation Group */}
                <div className="pill-group" role="group" aria-label="Navigazione">
                  <button className="pill-btn" onClick={onReturnToLibrary} title="Libreria" aria-label="Torna alla libreria">
                    <ArrowLeft size={18} />
                  </button>
                  <button className="pill-btn" onClick={onPrevPage} title="Precedente" aria-label="Pagina precedente">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="pill-btn" onClick={onNextPage} title="Successiva" aria-label="Pagina successiva">
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="pill-divider" />

                {/* Tools Group */}
                <div className="pill-group" role="group" aria-label="Strumenti">
                  <button className="pill-btn" onClick={() => openUnifiedPanel('toc')} title="Indice" aria-label="Apri indice">
                    <List size={18} />
                  </button>
                  <button className="pill-btn" onClick={() => openUnifiedPanel('bookmarks')} title="Segnalibri" aria-label="Apri segnalibri">
                    <Bookmark size={18} />
                  </button>
                  <button className="pill-btn" onClick={() => openUnifiedPanel('search')} title="Cerca" aria-label="Cerca nel libro">
                    <Search size={18} />
                  </button>
                </div>

                <div className="pill-divider" />

                {/* Settings Group */}
                <div className="pill-group" role="group" aria-label="Impostazioni">
                  <button className="pill-btn" onClick={cycleTheme} title="Cambia tema" aria-label="Cambia tema">
                    <Sun size={18} />
                  </button>
                  <button className="pill-btn" onClick={() => { togglePanel('settings'); setPillExpanded(false) }} title="Impostazioni" aria-label="Apri impostazioni">
                    <Settings size={18} />
                  </button>
                  <button className="pill-btn" onClick={toggleZenMode} title="Zen Mode" aria-label="Attiva modalità Zen">
                    <Maximize size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Panel Backdrop */}
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

      {/* Unified Panel - TOC / Bookmarks / Search with tabs */}
      <AnimatePresence>
        {activePanel === 'toc' && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="unified-panel glass-panel"
          >
            {/* Tab Bar */}
            <div className="unified-tab-bar">
              <button
                className={`unified-tab ${unifiedTab === 'toc' ? 'active' : ''}`}
                onClick={() => setUnifiedTab('toc')}
              >
                <List size={16} />
                <span>Indice</span>
              </button>
              <button
                className={`unified-tab ${unifiedTab === 'bookmarks' ? 'active' : ''}`}
                onClick={() => setUnifiedTab('bookmarks')}
              >
                <Bookmark size={16} />
                <span>Segnalibri</span>
              </button>
              <button
                className={`unified-tab ${unifiedTab === 'search' ? 'active' : ''}`}
                onClick={() => setUnifiedTab('search')}
              >
                <Search size={16} />
                <span>Cerca</span>
              </button>
              <button className="unified-close-btn" onClick={closeAllPanels} aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            {/* Tab Content */}
            <div className="unified-content">
              {/* TOC Tab */}
              {unifiedTab === 'toc' && (
                <div className="unified-toc-content">
                  {toc.length === 0 ? (
                    <p className="empty-state-message">Nessun indice disponibile</p>
                  ) : (
                    toc.map((item, i) => (
                      <button
                        key={i}
                        className="toc-item"
                        onClick={() => { onGoToTOCItem(item.href); closeAllPanels() }}
                        style={{ paddingLeft: `${(((item as TOCEntry & { level?: number }).level || 0) * 20) + 16}px` }}
                      >
                        {item.label}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Bookmarks Tab */}
              {unifiedTab === 'bookmarks' && (
                <div className="unified-bookmarks-content">
                  <button onClick={onAddBookmark} className="bookmark-add-btn">
                    <Bookmark size={18} />
                    Aggiungi segnalibro
                  </button>
                  {bookmarks.length === 0 ? (
                    <p className="empty-state-message">Nessun segnalibro</p>
                  ) : (
                    bookmarks.map((bm) => (
                      <div key={bm.id} className="bookmark-item">
                        <button onClick={() => { onGoToBookmark(bm.cfi); closeAllPanels() }} className="bookmark-label">
                          {bm.label}
                        </button>
                        <button onClick={() => onRemoveBookmark(bm.id)} className="bookmark-delete-btn" aria-label="Rimuovi">
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Search Tab */}
              {unifiedTab === 'search' && (
                <div className="unified-search-content">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Cerca nel testo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                      className="search-input"
                      autoFocus
                    />
                    <button onClick={performSearch} className="nav-button" aria-label="Cerca">
                      <Search size={18} />
                    </button>
                  </div>
                  <div className="search-results">
                    {searchResults.length === 0 ? (
                      <p className="empty-state-message">{searchQuery ? 'Nessun risultato' : ''}</p>
                    ) : (
                      searchResults.map((result, i) => (
                        <button key={i} className="search-result-item" onClick={() => goToSearchResult(result.cfi)}>
                          <p>{result.snippet}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel - Two Sections */}
      <AnimatePresence>
        {activePanel === 'settings' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="settings-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Impostazioni</h4>
              <button onClick={closeAllPanels} aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>

            {/* Section 1: Testo e Lettura */}
            <div className="settings-section">
              <h5 className="settings-section-title">Testo e lettura</h5>

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

              <div className="setting-group">
                <label>Dimensione testo</label>
                <div className="font-controls">
                  <button onClick={() => onFontSizeChange(-10)} aria-label="Diminuisci">-</button>
                  <span>{fontSize}%</span>
                  <button onClick={() => onFontSizeChange(10)} aria-label="Aumenta">+</button>
                </div>
              </div>

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
                                onClick={() => { handleFontSelect(font.id); setShowFontPanel(false) }}
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
            </div>

            {/* Section 2: App e Visive */}
            <div className="settings-section">
              <h5 className="settings-section-title">App e visive</h5>

              <div className="setting-group">
                <label>Modalità Zen</label>
                <button
                  className={`zen-toggle-btn ${zenMode ? 'active' : ''}`}
                  onClick={toggleZenMode}
                >
                  <Maximize size={18} />
                  <span>{zenMode ? 'Disattiva' : 'Attiva'}</span>
                </button>
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
            onClick={toggleZenMode}
            title="Esci dalla modalità Zen (ESC)"
          >
            <Minimize2 size={20} />
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
