import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2, Palette } from 'lucide-react'
import { QuoteService, type QuoteData } from '../services/QuoteService'

interface QuoteGeneratorProps {
  isVisible: boolean
  onClose: () => void
  initialText: string
  bookTitle: string
  author: string
}

const QuoteGenerator = ({ isVisible, onClose, initialText, bookTitle, author }: QuoteGeneratorProps) => {
  const [text, setText] = useState(initialText)
  const [theme, setTheme] = useState<QuoteData['theme']>('minimal')
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const generatePreview = async () => {
    try {
      const url = await QuoteService.generateQuoteImage({
        text,
        author,
        bookTitle,
        theme
      })
      setPreviewUrl(url)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (isVisible) {
      setText(initialText)
      generatePreview()
    }
  }, [isVisible, initialText, theme, generatePreview])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.download = `quote-${bookTitle.substring(0, 10)}.png`
    link.href = previewUrl
    link.click()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="quote-modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="quote-modal-content glass-panel"
          >
            <div className="quote-modal-header">
              <h3>Condividi Citazione</h3>
              <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>

            <div className="quote-modal-body">
              <div className="quote-preview-container">
                {previewUrl && <img src={previewUrl} alt="Anteprima Citazione" className="quote-preview-img" />}
              </div>

              <div className="quote-controls-panel">
                <div className="control-group">
                  <label>Testo Citazione</label>
                  <textarea 
                    value={text} 
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="control-group">
                  <label>Stile</label>
                  <div className="theme-pills">
                    {(['minimal', 'classic', 'modern', 'dark'] as const).map((t) => (
                      <button 
                        key={t}
                        className={`theme-pill ${theme === t ? 'active' : ''}`}
                        onClick={() => setTheme(t)}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="quote-actions">
                  <button onClick={handleDownload} className="primary-button">
                    <Download size={18} /> Scarica Immagine
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default QuoteGenerator
