import { memo, type ChangeEvent, type RefObject, useState, useRef } from 'react'
import { BookOpen, ImageIcon, Plus, Search, SlidersHorizontal, Filter } from 'lucide-react'
import SettingsMenu from './LibrarySettingsMenu'
import AdvancedFiltersMenu from './AdvancedFiltersMenu'
import type { Book } from '../types'

interface LibrarySectionHeaderProps {
  filteredCount: number
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
}

const LibrarySectionHeader = memo(function LibrarySectionHeader({
  filteredCount,
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
}: LibrarySectionHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  return (
    <div className="library-section-header">
      <div className="header-left">
        <h2>Libreria</h2>
        <div className="header-meta">
          <span className="book-count" aria-label={`${filteredCount} ${filteredCount === 1 ? 'libro' : 'libri'}`}>
            {filteredCount} {filteredCount === 1 ? 'libro' : 'libri'}
          </span>
          {lastReadBook && (
            <button
              className="resume-pill resume-pill--compact"
              onClick={() => onResumeRead(lastReadBook)}
              aria-label={`Continua: ${lastReadBook.title} (${lastReadBook.progress || 0}%)`}
              title={`Continua: ${lastReadBook.title}`}
            >
              <BookOpen size={12} aria-hidden="true" />
              <span className="resume-pill__title">{lastReadBook.title}</span>
              <span className="resume-pill__progress">{lastReadBook.progress || 0}%</span>
            </button>
          )}
        </div>
      </div>

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
            className={`icon-button settings-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Apri filtri avanzati"
            aria-expanded={showFilters}
            aria-haspopup="dialog"
            title="Filtri Avanzati"
          >
            <Filter size={20} aria-hidden="true" />
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
          {showRegenerateButton && onRegenerateCovers && (
            <button
              onClick={onRegenerateCovers}
              className="icon-button"
              title="Ripara Copertine"
              aria-label="Ripara copertine mancanti"
            >
              <ImageIcon size={20} aria-hidden="true" />
            </button>
          )}
          <label htmlFor="lib-upload" className="primary-button-small prominent-action">
            <Plus size={20} aria-hidden="true" />
            <span>Aggiungi Libro</span>
          </label>
        </div>
      </div>

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
