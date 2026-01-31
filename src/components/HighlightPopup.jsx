// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

const HIGHLIGHT_COLORS = [
  { color: 'var(--highlight-yellow, #ffeb3b)', label: 'Giallo' },
  { color: 'var(--highlight-green, #81c784)', label: 'Verde' },
  { color: 'var(--highlight-blue, #64b5f6)', label: 'Blu' },
  { color: 'var(--highlight-orange, #ffb74d)', label: 'Arancione' }
]

const HighlightPopup = ({ isVisible, position, onAddHighlight }) => {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="highlight-popup glass-panel"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 10001
      }}
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
