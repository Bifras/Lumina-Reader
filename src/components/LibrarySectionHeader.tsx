import { memo, type ChangeEvent, type KeyboardEvent, type RefObject, useState, useRef } from 'react'
import { BookOpen, Plus, Search, SlidersHorizontal, Filter, Sparkles } from 'lucide-react'
import SettingsMenu from './LibrarySettingsMenu'
import AdvancedFiltersMenu from './AdvancedFiltersMenu'
import LibraryToolsMenu from './LibraryToolsMenu'
import { useLibraryStore } from '../store/useLibraryStore'
import type { Book } from '../types'

interface LibrarySectionHeaderProps {
  filteredCount: number
  libraryCount: number
  lastReadBook?: Book
  searchValue: string
  onSearchValueChange: (value: string) => void
  showSettings: boolean
  settingsRef: RefObject<HTMLDivElement | null>
  settingsButtonRef: RefObject<HTMLButtonElement | null>
  onToggleSettings: () => void
  onCloseSettings: () => void
  showRegenerateButton: boolean
  onRegenerateCovers?: () => void
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  onResumeRead: (book: Book) => void
  onAutoFillBatch: () => void
  isBatchProcessing: boolean
  onEnterSelectMode: () => void
}

const LibrarySectionHeader = memo(function LibrarySectionHeader({
  filteredCount,
  libraryCount,
  lastReadBook,
  searchValue,
  onSearchValueChange,
  showSettings,
  settingsRef,
  settingsButtonRef,
  onToggleSettings,
  onCloseSettings,
  showRegenerateButton,
  onRegenerateCovers,
  onFileInputChange,
  onResumeRead,
  onAutoFillBatch,
  isBatchProcessing,
  onEnterSelectMode,
}: LibrarySectionHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)
  const advancedFilters = useLibraryStore(state => state.advancedFilters)
  const hasActiveFilters = advancedFilters.genre !== undefined || advancedFilters.minRating !== undefined || advancedFilters.isFavorite !== undefined

  const activeFilterCount = [
    advancedFilters.genre,
    advancedFilters.minRating,
    advancedFilters.isFavorite
  ].filter(value => value !== undefined && value !== '').length
  
  const isLibraryEmpty = libraryCount === 0

  const handleUploadKeyDown = (e: KeyboardEvent<HTMLLabelElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    document.getElementById('lib-upload')?.click()
  }

  return (
    <div className={`library-section-header ${isLibraryEmpty ? 'library-section-header--empty' : ''}`}>
      <div className="header-left">
        <h2>Libreria</h2>
        <div className="header-meta">
          <span className="book-count" aria-label={`${filteredCount} ${filteredCount === 1 ? 'libro' : 'libri'}`}>
            {isLibraryEmpty ? 'Nessun libro ancora' : `${filteredCount} ${filteredCount === 1 ? 'libro' : 'libri'}`}
          </span>
          {!isLibraryEmpty && lastReadBook && (
            <button
              className="resume-pill resume-pill--compact"
              onClick={() => onResumeRead(lastReadBook)}
              aria-label={`Continua: ${lastReadBook.title} (${lastReadBook.progress || 0}%)`}
              title={`Continua: ${lastReadBook.title}`}
            >
              <BookOpen size={12} aria-hidden="true" />
              <span className="resume-pill__title">{lastReadBook.title}</span>
              {lastReadBook.progress !== undefined && (
                <span className="resume-pill__progress">{Math.round(lastReadBook.progress)}%</span>
              )}
            </button>
          )}
        </div>
      </div>

      {isLibraryEmpty ? (
        <div className="library-controls library-controls--empty" aria-label="Stato libreria vuota">
          <span className="empty-library-hint">Pronto per il primo EPUB</span>
        </div>
      ) : (
        <div className="library-controls">
          <div className="search-wrapper">
            <Search size={20} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cerca libri..."
              className="library-search-input"
              value={searchValue}
              onChange={(e) => onSearchValueChange(e.target.value)}
              aria-label="Cerca nella libreria"
            />
          </div>

          <div className="settings-wrapper" ref={filtersRef}>
            <button
              className={`icon-button settings-toggle settings-toggle--filters ${(showFilters || hasActiveFilters) ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-label={activeFilterCount > 0 ? `Apri filtri avanzati, ${activeFilterCount} attivi` : 'Apri filtri avanzati'}
              aria-expanded={showFilters}
              aria-haspopup="dialog"
              title="Filtri Avanzati"
            >
              <Filter size={20} aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span className="filter-count-badge" aria-hidden="true">{activeFilterCount}</span>
              )}
            </button>
            <AdvancedFiltersMenu
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              anchorRef={filtersRef}
            />
          </div>

          <div className="settings-wrapper" ref={settingsRef}>
            <button
              ref={settingsButtonRef}
              className={`icon-button settings-toggle ${showSettings ? 'active' : ''}`}
              onClick={onToggleSettings}
              aria-label="Apri impostazioni libreria"
              aria-expanded={showSettings}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal size={20} aria-hidden="true" />
            </button>

            <SettingsMenu
              isOpen={showSettings}
              onClose={onCloseSettings}
              settingsRef={settingsRef}
            />
          </div>

          <div className="library-actions">
            <div className="settings-wrapper" ref={toolsRef}>
              <button
                ref={toolsButtonRef}
                className={`icon-button settings-toggle ${showTools || isBatchProcessing ? 'active' : ''}`}
                onClick={() => setShowTools(!showTools)}
                title="Strumenti Libreria"
                aria-label="Apri strumenti libreria"
                aria-expanded={showTools}
                aria-haspopup="dialog"
              >
                <Sparkles size={20} aria-hidden="true" />
              </button>
              <LibraryToolsMenu
                isOpen={showTools}
                onClose={() => setShowTools(false)}
                toolsRef={toolsRef}
                onRegenerateCovers={onRegenerateCovers}
                onAutoFillBatch={onAutoFillBatch}
                showRegenerateButton={showRegenerateButton}
                isBatchProcessing={isBatchProcessing}
                onEnterSelectMode={onEnterSelectMode}
              />
            </div>
            <label
              htmlFor="lib-upload"
              className="primary-button-small prominent-action"
              role="button"
              tabIndex={0}
              onKeyDown={handleUploadKeyDown}
            >
              <Plus size={20} aria-hidden="true" />
              <span>Aggiungi Libro</span>
            </label>
          </div>
        </div>
      )}

      <input
        type="file"
        id="lib-upload"
        accept=".epub"
        hidden
        onChange={onFileInputChange}
        aria-label="Carica file EPUB"
      />
    </div>
  )
})

export default LibrarySectionHeader
