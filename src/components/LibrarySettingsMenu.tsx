import React, { memo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutGrid, Grid3X3, List, Sun, Moon, Monitor, Coffee,
  RotateCcw, X, ChevronDown, ChevronUp, Check, SlidersHorizontal
} from 'lucide-react'
import { useLibrarySettingsStore, type GroupByOption, type SortOption } from '../store/useLibrarySettingsStore'
import { useAppStore } from '../store'
import { useFocusTrap } from '../hooks'
import ConfirmDialog from './ConfirmDialog'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  settingsRef: React.RefObject<HTMLDivElement | null>
}

const SettingsMenu = memo(function SettingsMenu({
  isOpen,
  onClose,
  settingsRef
}: SettingsMenuProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const {
    viewMode,
    setViewMode,
    cardSize,
    setCardSize,
    libraryTheme,
    setLibraryTheme,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
    sortDirection,
    toggleSortDirection,
    showProgress,
    setShowProgress,
    showAuthor,
    setShowAuthor,
    showDate,
    setShowDate,
    showCollection,
    setShowCollection,
    showGenre,
    setShowGenre,
    showRating,
    setShowRating,
    resetToDefaults
  } = useLibrarySettingsStore()
  
  const setTheme = useAppStore(state => state.setTheme)

  const handleThemeChange = useCallback((id: 'auto' | 'light' | 'sepia' | 'dark') => {
    setLibraryTheme(id)
    // If not auto, also update global reader theme for unified experience
    if (id !== 'auto') {
      setTheme(id)
    }
  }, [setLibraryTheme, setTheme])

  const handleReset = useCallback(() => {
    setShowConfirmReset(true)
  }, [])

  const executeReset = useCallback(() => {
    resetToDefaults()
    setShowConfirmReset(false)
  }, [resetToDefaults])

  // Custom hook for focus trap
  useFocusTrap(dropdownRef, isOpen && !showConfirmReset)

  // Handle click outside
  React.useEffect(() => {
    if (!isOpen || showConfirmReset) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, settingsRef, showConfirmReset])

  const viewModes = [
    { id: 'grid' as const, icon: LayoutGrid, label: 'Griglia' },
    { id: 'compact' as const, icon: Grid3X3, label: 'Compatta' },
    { id: 'list' as const, icon: List, label: 'Lista' }
  ]

  const themes = [
    { id: 'auto' as const, icon: Monitor, label: 'Auto' },
    { id: 'light' as const, icon: Sun, label: 'Chiaro' },
    { id: 'sepia' as const, icon: Coffee, label: 'Seppia' },
    { id: 'dark' as const, icon: Moon, label: 'Scuro' }
  ]

  const sortOptions = [
    { id: 'recent' as const, label: 'Recenti' },
    { id: 'title' as const, label: 'Titolo' },
    { id: 'author' as const, label: 'Autore' },
    { id: 'progress' as const, label: 'Progresso' },
    { id: 'added' as const, label: 'Data aggiunta' }
  ]

  const groupOptions = [
    { id: 'none' as const, label: 'Nessuno' },
    { id: 'author' as const, label: 'Autore' },
    { id: 'genre' as const, label: 'Genere' },
    { id: 'collection' as const, label: 'Collezione' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
            key="library-settings-dropdown"
            ref={dropdownRef}
          className="library-settings-dropdown"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Opzioni di Visualizzazione"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="library-settings-header">
            <div className="library-settings-header-left">
              <SlidersHorizontal size={16} className="library-settings-icon" />
              <span className="library-settings-title">Vista Libreria</span>
            </div>
            <div className="library-settings-header-actions">
              <button 
                className="library-settings-reset-btn"
                onClick={handleReset}
                title="Ripristina predefiniti"
                aria-label="Ripristina impostazioni predefinite"
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="library-settings-close-btn"
                onClick={onClose}
                title="Chiudi"
                aria-label="Chiudi impostazioni"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* SECTION 1: STRUCTURE */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="view-mode-label">Struttura & Layout</label>
            <div 
              className="library-settings-segmented" 
              role="radiogroup" 
              aria-labelledby="view-mode-label"
              style={{ marginBottom: '12px' }}
            >
              {viewModes.map(({ id, icon: Icon, label }) => (
                <button 
                  key={id}
                  className={`library-settings-chip ${viewMode === id ? 'active' : ''}`}
                  onClick={() => setViewMode(id)}
                  role="radio"
                  aria-checked={viewMode === id}
                  aria-label={`Vista ${label}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="library-settings-chip-text">{label}</span>
                </button>
              ))}
            </div>

            {/* Card Size (Disabled in List view) */}
            <div className={`library-settings-size-control ${viewMode === 'list' ? 'disabled' : ''}`}>
              <span className="library-settings-size-label">A</span>
              <input 
                type="range"
                min="120"
                max="280"
                step="10"
                value={cardSize}
                onChange={(e) => setCardSize(parseInt(e.target.value, 10))}
                className="library-settings-size-slider"
                aria-label="Dimensione Copertine"
                aria-valuemin={120}
                aria-valuemax={280}
                aria-valuenow={cardSize}
                disabled={viewMode === 'list'}
              />
              <span className="library-settings-size-label" style={{ fontSize: '1.2rem' }}>A</span>
            </div>
          </div>

          <div className="library-settings-divider" />

          {/* SECTION 2: ORGANIZATION */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="sort-label">Organizzazione</label>
            <div className="library-settings-sort-grid" style={{ marginBottom: '8px' }}>
              <div className="library-settings-select-wrapper">
                <select 
                  className="library-settings-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Ordina per"
                >
                  {sortOptions.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="library-settings-select-icon" aria-hidden="true" />
              </div>
              
              <div className="library-settings-segmented compact">
                <button 
                  className={`library-settings-chip small ${sortDirection === 'asc' ? 'active' : ''}`}
                  onClick={() => sortDirection !== 'asc' && toggleSortDirection()}
                  title="Crescente"
                  aria-label="Ordine Crescente"
                >
                  <ChevronUp size={16} />
                </button>
                <button 
                  className={`library-settings-chip small ${sortDirection === 'desc' ? 'active' : ''}`}
                  onClick={() => sortDirection !== 'desc' && toggleSortDirection()}
                  title="Decrescente"
                  aria-label="Ordine Decrescente"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            <div className="library-settings-select-wrapper">
              <select 
                className="library-settings-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                aria-label="Raggruppa per"
              >
                {groupOptions.map(({ id, label }) => (
                  <option key={id} value={id}>Raggruppa: {label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="library-settings-select-icon" aria-hidden="true" />
            </div>
          </div>

          <div className="library-settings-divider" />

          {/* SECTION 3: DETAILS (Chips) */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="display-label">Dettagli Visibili</label>
            <div className="library-settings-chips-wrap" role="group" aria-labelledby="display-label">
              {[
                { id: 'progress', label: 'Progresso', checked: showProgress, onChange: setShowProgress },
                { id: 'author', label: 'Autore', checked: showAuthor, onChange: setShowAuthor },
                { id: 'rating', label: 'Voto', checked: showRating, onChange: setShowRating },
                { id: 'collection', label: 'Collezione', checked: showCollection, onChange: setShowCollection },
                { id: 'date', label: 'Data', checked: showDate, onChange: setShowDate },
                { id: 'genre', label: 'Genere', checked: showGenre, onChange: setShowGenre }
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`library-settings-toggle-chip ${opt.checked ? 'active' : ''}`}
                  onClick={() => opt.onChange(!opt.checked)}
                  aria-pressed={opt.checked}
                  role="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="library-settings-divider" />

          {/* SECTION 4: AESTHETICS */}
          <div className="library-settings-section">
            <label className="library-settings-label" id="theme-label">Estetica Generale</label>
            <div 
              className="library-settings-segmented" 
              role="radiogroup" 
              aria-labelledby="theme-label"
            >
              {themes.map(({ id, icon: Icon, label }) => (
                <button 
                  key={id}
                  className={`library-settings-chip ${libraryTheme === id ? 'active' : ''}`}
                  onClick={() => handleThemeChange(id)}
                  role="radio"
                  aria-checked={libraryTheme === id}
                  aria-label={`Tema ${label}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="library-settings-chip-text">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      <ConfirmDialog
        key="library-settings-confirm-dialog"
        isOpen={showConfirmReset}
        title="Ripristina Impostazioni"
        message="Sei sicuro di voler riportare tutte le opzioni di visualizzazione ai valori predefiniti? Questa azione non può essere annullata."
        confirmText="Ripristina"
        isDestructive={true}
        onConfirm={executeReset}
        onCancel={() => setShowConfirmReset(false)}
      />
    </AnimatePresence>
  )
})

export default SettingsMenu




