import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ImageIcon, X, ListChecks } from 'lucide-react'
import { useFocusTrap } from '../hooks'

interface LibraryToolsMenuProps {
  isOpen: boolean
  onClose: () => void
  toolsRef: React.RefObject<HTMLDivElement | null>
  onRegenerateCovers?: () => void
  onAutoFillBatch: () => void
  showRegenerateButton: boolean
  isBatchProcessing: boolean
  onEnterSelectMode: () => void
}

const LibraryToolsMenu = memo(function LibraryToolsMenu({
  isOpen,
  onClose,
  toolsRef,
  onRegenerateCovers,
  onAutoFillBatch,
  showRegenerateButton,
  isBatchProcessing,
  onEnterSelectMode
}: LibraryToolsMenuProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // focus trap per accessibilità WCAG
  useFocusTrap(dropdownRef, isOpen)

  // Gestione click outside ed Escape
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
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
  }, [isOpen, onClose, toolsRef])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="library-tools-dropdown"
          ref={dropdownRef}
          className="library-tools-dropdown"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Strumenti Libreria"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="library-tools-header">
            <div className="library-tools-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'transparent' }}>
              <Sparkles size={16} className="library-settings-icon" style={{ color: 'var(--accent-warm)' }} />
              <span className="library-tools-title">Strumenti Libreria</span>
            </div>
            <button
              className="library-tools-close-btn"
              onClick={onClose}
              title="Chiudi"
              aria-label="Chiudi strumenti"
              disabled={isBatchProcessing}
            >
              <X size={14} />
            </button>
          </div>

          {/* Opzioni Strumenti */}
          <div className="library-tools-dropdown-list">
            {/* Opzione 1: Autocompila Metadati Batch */}
            <button
              className="library-tool-item"
              onClick={() => {
                onAutoFillBatch()
                onClose()
              }}
              disabled={isBatchProcessing}
              title="Avvia autocompilazione batch per libri con dati mancanti"
            >
              <div className="tool-icon">
                <Sparkles size={18} />
              </div>
              <div className="tool-details">
                <span className="tool-name">Autocompila Metadati</span>
                <span className="tool-desc">Cerca e arricchisci copertine e generi mancanti</span>
              </div>
              {isBatchProcessing && <div className="tool-spinner" />}
            </button>

            {/* Opzione 2: Ripara Copertine EPUB */}
            {showRegenerateButton && onRegenerateCovers && (
              <button
                className="library-tool-item"
                onClick={() => {
                  onRegenerateCovers()
                  onClose()
                }}
                disabled={isBatchProcessing}
                title="Estrai copertina originale dai file EPUB"
              >
                <div className="tool-icon">
                  <ImageIcon size={18} />
                </div>
                <div className="tool-details">
                  <span className="tool-name">Ripara Copertine</span>
                  <span className="tool-desc">Estrai le copertine originali dai file EPUB locali</span>
                </div>
              </button>
            )}

            {/* Opzione 3: Selezione Multipla */}
            <button
              className="library-tool-item"
              onClick={() => {
                onEnterSelectMode()
                onClose()
              }}
              disabled={isBatchProcessing}
              title="Attiva la selezione multipla per eliminare più libri contemporaneamente"
            >
              <div className="tool-icon">
                <ListChecks size={18} />
              </div>
              <div className="tool-details">
                <span className="tool-name">Seleziona Libri</span>
                <span className="tool-desc">Seleziona ed elimina più libri in blocco</span>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default LibraryToolsMenu
