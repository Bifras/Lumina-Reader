import { motion } from 'framer-motion'

interface HighlightColor {
  color: string
  label: string
}

const HIGHLIGHT_COLORS: HighlightColor[] = [
  { color: 'var(--highlight-yellow, #ffeb3b)', label: 'Giallo' },
  { color: 'var(--highlight-green, #81c784)', label: 'Verde' },
  { color: 'var(--highlight-blue, #64b5f6)', label: 'Blu' },
  { color: 'var(--highlight-orange, #ffb74d)', label: 'Arancione' }
]

interface HighlightPopupProps {
  isVisible: boolean
  position: { x: number; y: number }
  onAddHighlight: (color: string) => void
}

const HighlightPopup = ({ isVisible, position, onAddHighlight }: HighlightPopupProps) => {
  if (!isVisible) return null

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    transform: 'translate(-50%, -100%)',
    zIndex: 'var(--z-popup)'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="highlight-popup glass-panel"
      style={popupStyle}
    >
      <div className="highlight-colors">
        {HIGHLIGHT_COLORS.map(({ color, label }) => (
          <button
            key={color}
            onClick={() => onAddHighlight(color)}
            style={{ background: color }}
            title={label}
            aria-label={`Evidenzia in ${label}`}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default HighlightPopup
