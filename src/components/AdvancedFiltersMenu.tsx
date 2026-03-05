import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X } from 'lucide-react'
import { useLibraryStore } from '../store'
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

  // Handle click outside
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

  const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
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
          className="settings-dropdown"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-label="Filtri Avanzati"
        >
          <div className="settings-header">
            <h3><Filter size={16} /> Filtri Avanzati</h3>
            <button onClick={onClose} className="icon-button" aria-label="Chiudi menu" title="Chiudi (Esc)">
              <X size={18} />
            </button>
          </div>

          <div className="settings-content">
            <div className="settings-section">
              <div className="settings-option">
                <label htmlFor="genre-filter">Genere</label>
                <input
                  id="genre-filter"
                  type="text"
                  placeholder="Es. Sci-Fi, Fantasy"
                  value={advancedFilters.genre || ''}
                  onChange={(e) => handleFilterChange('genre', e.target.value)}
                  className="collection-create-input-inline"
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-option">
                <label htmlFor="min-rating-filter">Valutazione minima</label>
                <select
                  id="min-rating-filter"
                  value={advancedFilters.minRating || ''}
                  onChange={(e) => handleFilterChange('minRating', e.target.value ? Number(e.target.value) : undefined)}
                  style={{ marginLeft: 'auto', padding: '4px', borderRadius: '4px', background: 'var(--surface-2)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                >
                  <option value="">Qualsiasi</option>
                  <option value="1">1 Stella</option>
                  <option value="2">2 Stelle</option>
                  <option value="3">3 Stelle</option>
                  <option value="4">4 Stelle</option>
                  <option value="5">5 Stelle</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <label className="settings-option">
                <span>Solo Preferiti</span>
                <input
                  type="checkbox"
                  checked={advancedFilters.isFavorite || false}
                  onChange={(e) => handleFilterChange('isFavorite', e.target.checked ? true : undefined)}
                />
              </label>
            </div>

            <div className="settings-section" style={{ borderBottom: 'none', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn--secondary"
                onClick={handleReset}
                style={{ width: '100%' }}
                aria-label="Reset filtri"
              >
                Reset filtri
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default AdvancedFiltersMenu
