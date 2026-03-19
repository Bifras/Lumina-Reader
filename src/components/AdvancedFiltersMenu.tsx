import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X } from 'lucide-react'
import { useLibraryStore } from '../store/useLibraryStore'
import { useFocusTrap } from '../hooks'
import type { AdvancedFilters } from '../store/useLibraryStore'

interface AdvancedFiltersMenuProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}

const AdvancedFiltersMenu = memo(function AdvancedFiltersMenu({
  isOpen,
  onClose,
  anchorRef
}: AdvancedFiltersMenuProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const { advancedFilters, setAdvancedFilters, clearAdvancedFilters } = useLibraryStore()

  useFocusTrap(dropdownRef, isOpen)

  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
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
  }, [isOpen, onClose, anchorRef])

  const handleFilterChange = (key: keyof AdvancedFilters, value: string | number | boolean | undefined) => {
    const newFilters = { ...advancedFilters, [key]: value }
    if (value === '' || value === undefined) {
      delete newFilters[key]
    }
    setAdvancedFilters(newFilters)
  }

  const handleReset = () => {
    clearAdvancedFilters()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          className="library-settings-dropdown library-filters-dropdown"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-label="Filtri Avanzati"
        >
          <div className="library-settings-header">
            <div className="advanced-filters-menu__heading">
              <Filter size={16} aria-hidden="true" />
              <span className="library-settings-title">Filtri Avanzati</span>
            </div>
            <button onClick={onClose} className="library-settings-close-btn" aria-label="Chiudi menu" title="Chiudi (Esc)">
              <X size={18} />
            </button>
          </div>

          <div className="advanced-filters-menu__content">
            <div className="library-settings-section">
              <label htmlFor="genre-filter" className="library-settings-label">Genere</label>
              <input
                id="genre-filter"
                type="text"
                placeholder="Es. Sci-Fi, Fantasy"
                value={advancedFilters.genre || ''}
                onChange={(e) => handleFilterChange('genre', e.target.value)}
                className="library-search-input advanced-filters-menu__search"
              />
            </div>

            <div className="library-settings-section">
              <label htmlFor="min-rating-filter" className="library-settings-label">Valutazione minima</label>
              <div className="library-settings-select-wrapper">
                <select
                  id="min-rating-filter"
                  value={advancedFilters.minRating || ''}
                  onChange={(e) => handleFilterChange('minRating', e.target.value ? Number(e.target.value) : undefined)}
                  className="library-settings-select"
                >
                  <option value="">Qualsiasi</option>
                  <option value="1">1+ Stella</option>
                  <option value="2">2+ Stelle</option>
                  <option value="3">3+ Stelle</option>
                  <option value="4">4+ Stelle</option>
                  <option value="5">5 Stelle</option>
                </select>
              </div>
            </div>

            <div className="library-settings-section">
              <div className="library-settings-display-options">
                <label className={`library-settings-display-option ${advancedFilters.isFavorite ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={advancedFilters.isFavorite || false}
                    onChange={(e) => handleFilterChange('isFavorite', e.target.checked ? true : undefined)}
                  />
                  <div className="library-settings-check-icon">✓</div>
                  <span className="library-settings-option-label">Solo Preferiti</span>
                </label>
              </div>
            </div>

            <div className="library-settings-section advanced-filters-menu__actions">
              <button
                className="primary-button-small prominent-action advanced-filters-menu__reset"
                onClick={handleReset}
                aria-label="Reset filtri"
              >
                <span>Reset filtri</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default AdvancedFiltersMenu
