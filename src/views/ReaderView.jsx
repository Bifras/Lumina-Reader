import { useState, useEffect, useCallback } from 'react'
// eslint-disable-next-line no-unused-vars
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
  ChevronUp
} from 'lucide-react'
import HighlightPopup from '../components/HighlightPopup'

const THEMES = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Sepia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
}

const FONT_OPTIONS = [
  { id: 'lora', name: 'Lora', family: 'Lora' },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible' },
  { id: 'bitter', name: 'Bitter', family: 'Bitter' },
  { id: 'dyslexic', name: 'OpenDyslexic', family: 'OpenDyslexic' }
]

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
  onFontChange,
  setShowHighlightPopup,
  loadingStep
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [menuVisible, setMenuVisible] = useState(true)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') onPrevPage()
      if (e.key === 'ArrowRight') onNextPage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPrevPage, onNextPage])

  const performSearch = useCallback(async () => {
    if (!book || !searchQuery.trim()) return

    setSearchResults([])
    const results = []
    const searchLower = searchQuery.toLowerCase()

    const searchPromises = book.spine.spineItems.map(async (item) => {
      try {
        const doc = await item.load(book.load.bind(book))
        if (!doc || !doc.body) return

        const text = doc.body.textContent
        if (text && text.toLowerCase().includes(searchLower)) {
          const index = text.toLowerCase().indexOf(searchLower)
          const snippet = text.substring(
            Math.max(0, index - 50),
            Math.min(text.length, index + searchLower.length + 50)
          )
          results.push({
            cfi: item.cfiBase,
            snippet: '...' + snippet + '...',
            href: item.href
          })
        }
        item.unload()
      } catch (e) {
        console.log('[WARN] Search error in item:', e.message)
      }
    })

    await Promise.all(searchPromises)
    results.sort((a, b) => a.cfi.localeCompare(b.cfi))
    setSearchResults(results)
  }, [book, searchQuery])

  const goToSearchResult = (cfi) => {
    if (rendition) {
      rendition.display(cfi)
      setShowSearch(false)
    }
  }

  const handleFontSelect = (fontId) => {
    onFontChange(fontId)
    // Apply font immediately via rendition
    if (rendition) {
      const font = FONT_OPTIONS.find(f => f.id === fontId)?.family || 'Lora'
      rendition.themes.font(`${font}`)
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
      <div
        className="book-info"
        style={{
          textAlign: 'center',
          width: '100%',
          padding: '1.5rem 0 0.5rem 0',
          zIndex: 10
        }}
      >
        <h3 style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.2rem' }}>
          {metadata?.creator}
        </h3>
        <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          {metadata?.title}
        </h2>
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

      {/* Main Controls Dock */}
      <AnimatePresence>
        {menuVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="controls glass-panel"
          >
            <button className="nav-button" onClick={onPrevPage} title="Pagina precedente">
              <ChevronLeft size={20} />
            </button>

            <div className="divider" />

            <button
              className={`nav-button ${showTOC ? 'active' : ''}`}
              onClick={() => {
                setShowTOC(!showTOC)
                setShowBookmarks(false)
                setShowSearch(false)
                setShowSettings(false)
              }}
              title="Indice"
            >
              <List size={20} />
            </button>

            <button
              className={`nav-button ${showBookmarks ? 'active' : ''}`}
              onClick={() => {
                setShowBookmarks(!showBookmarks)
                setShowTOC(false)
                setShowSearch(false)
                setShowSettings(false)
              }}
              title="Segnalibri"
            >
              <Bookmark size={20} />
            </button>

            <button
              className={`nav-button ${showSearch ? 'active' : ''}`}
              onClick={() => {
                setShowSearch(!showSearch)
                setShowTOC(false)
                setShowBookmarks(false)
                setShowSettings(false)
              }}
              title="Cerca"
            >
              <Search size={20} />
            </button>

            <div className="divider" />

            <button className="nav-button" onClick={onReturnToLibrary} title="Torna alla Libreria">
              <BookOpen size={20} />
            </button>

            <button
              className={`nav-button ${showSettings ? 'active' : ''}`}
              onClick={() => {
                setShowSettings(!showSettings)
                setShowTOC(false)
                setShowBookmarks(false)
                setShowSearch(false)
              }}
              title="Impostazioni"
            >
              <Settings size={20} />
            </button>

            <div className="divider" />

            <button className="nav-button" onClick={onNextPage} title="Pagina successiva">
              <ChevronRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOC Panel */}
      <AnimatePresence>
        {showTOC && (
          <motion.div
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
                <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
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
                    style={{ paddingLeft: `${(item.level || 0) * 20 + 16}px` }}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Panel */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Segnalibri</h4>
              <button onClick={() => setShowBookmarks(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="panel-content">
              <button
                onClick={onAddBookmark}
                className="primary-button"
                style={{ marginBottom: '1rem', width: '100%', justifyContent: 'center' }}
              >
                <Bookmark size={18} style={{ marginRight: '8px' }} />
                Aggiungi segnalibro
              </button>
              {bookmarks.length === 0 ? (
                <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
                  Nessun segnalibro
                </p>
              ) : (
                bookmarks.map((bm) => (
                  <div key={bm.id} className="bookmark-item" style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => onGoToBookmark(bm.cfi)}
                      style={{ flex: 1, textAlign: 'left' }}
                    >
                      {bm.label}
                    </button>
                    <button
                      onClick={() => onRemoveBookmark(bm.id)}
                      style={{ color: '#ef4444', padding: '4px' }}
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

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="side-panel glass-panel"
          >
            <div className="settings-header">
              <h4>Cerca nel libro</h4>
              <button onClick={() => setShowSearch(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="panel-content">
              <div className="search-box" style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                />
                <button onClick={performSearch} className="nav-button">
                  <Search size={18} />
                </button>
              </div>
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <p style={{ opacity: 0.6, textAlign: 'center', marginTop: '2rem' }}>
                    {searchQuery ? 'Nessun risultato trovato' : 'Inserisci un termine di ricerca'}
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
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Carattere</span>
                <span className="font-preview-hint">✨ Passa col mouse per l'anteprima</span>
              </label>
              <div className="font-selector">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.id}
                    className={`font-option ${readingFont === font.id ? 'active' : ''}`}
                    onClick={() => handleFontSelect(font.id)}
                    title={font.name}
                    style={{ fontFamily: font.family }}
                  >
                    <span className="font-sample">Aa</span>
                    <span className="font-label">{font.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlight Popup */}
      <HighlightPopup
        isVisible={showHighlightPopup}
        position={highlightPosition}
        onAddHighlight={onAddHighlight}
        onClose={() => setShowHighlightPopup(false)}
      />
    </motion.div>
  )
}

export default ReaderView
