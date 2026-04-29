import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Heart, RotateCcw, Star, Tag, X } from 'lucide-react'
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
  }

  const activeFilters = React.useMemo(() => {
    const filters: string[] = []
    if (advancedFilters.genre) filters.push(advancedFilters.genre)
    if (advancedFilters.minRating !== undefined) filters.push(`${advancedFilters.minRating}+ stelle`)
    if (advancedFilters.isFavorite) filters.push('Preferiti')
    return filters
  }, [advancedFilters])

  const hasActiveFilters = activeFilters.length > 0

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

          <div className="advanced-filters-menu__summary" aria-live="polite">
            {hasActiveFilters ? (
              activeFilters.map(filter => (
                <span key={filter} className="advanced-filters-menu__summary-chip">
                  {filter}
                </span>
              ))
            ) : (
              <span className="advanced-filters-menu__summary-empty">Nessun filtro attivo</span>
            )}
          </div>

          <div className="advanced-filters-menu__content">
            <div className="library-settings-section">
              <label htmlFor="genre-filter" className="library-settings-label">
                <span>Genere</span>
              </label>
              <div className="advanced-filters-menu__field">
                <Tag size={16} aria-hidden="true" />
                <input
                  id="genre-filter"
                  type="text"
                  placeholder="Es. Romanzo, Sci-Fi"
                  value={advancedFilters.genre || ''}
                  onChange={(e) => handleFilterChange('genre', e.target.value)}
                  className="advanced-filters-menu__input"
                />
              </div>
            </div>

            <div className="library-settings-section">
              <label className="library-settings-label" id="min-rating-filter-label">Valutazione minima</label>
              <div
                className="advanced-filters-menu__rating"
                role="radiogroup"
                aria-labelledby="min-rating-filter-label"
              >
                <button
                  type="button"
                  className={`advanced-filters-menu__rating-clear ${advancedFilters.minRating === undefined ? 'active' : ''}`}
                  onClick={() => handleFilterChange('minRating', undefined)}
                  role="radio"
                  aria-checked={advancedFilters.minRating === undefined}
                >
                  Qualsiasi
                </button>
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    className={`advanced-filters-menu__rating-star ${advancedFilters.minRating === rating ? 'active' : ''}`}
                    onClick={() => handleFilterChange('minRating', rating)}
                    role="radio"
                    aria-checked={advancedFilters.minRating === rating}
                    aria-label={`${rating}+ stelle`}
                    title={`${rating}+ stelle`}
                  >
                    <Star size={16} aria-hidden="true" />
                    <span>{rating}+</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="library-settings-section advanced-filters-menu__footer">
              <button
                type="button"
                className={`advanced-filters-menu__favorite ${advancedFilters.isFavorite ? 'active' : ''}`}
                onClick={() => handleFilterChange('isFavorite', advancedFilters.isFavorite ? undefined : true)}
                aria-pressed={advancedFilters.isFavorite || false}
              >
                <Heart size={17} aria-hidden="true" />
                <span>Solo Preferiti</span>
              </button>

              <button
                className="advanced-filters-menu__reset"
                onClick={handleReset}
                aria-label="Reset filtri"
                disabled={!hasActiveFilters}
              >
                <RotateCcw size={15} aria-hidden="true" />
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
