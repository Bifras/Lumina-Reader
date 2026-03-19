import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Save, RefreshCw, List, Upload } from 'lucide-react'
import { useFocusTrap } from '../hooks'
import type { Book } from '../types'

interface EditMetadataModalProps {
  isOpen: boolean
  book: Book | null
  onClose: () => void
  onSave: (updatedBook: Partial<Book>) => Promise<void>
}

export default function EditMetadataModal({
  isOpen,
  book,
  onClose,
  onSave
}: EditMetadataModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, isOpen)

  // Local state for form fields
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when book changes or modal opens
  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '')
      setAuthor(book.author || '')
      setTags(book.tags ? book.tags.join(', ') : '')
      setCoverUrl(book.cover || '')
    }
  }, [isOpen, book])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!book) return

    setIsSaving(true)
    try {
      const updatedData: Partial<Book> = {
        title: title.trim(),
        author: author.trim(),
        cover: coverUrl.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      await onSave(updatedData)
      onClose()
    } catch (error) {
      console.error('Error saving metadata:', error)
      // Toast notification should ideally be handled by the parent
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit size to ~5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Immagine troppo grande. Scegli un file più piccolo di 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverUrl(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  if (!book) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-meta-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="edit-metadata-dialog glass-panel"
          >
            <div className="edit-metadata-dialog__header">
              <h3 id="edit-meta-title" className="edit-metadata-dialog__title">Modifica Metadati</h3>
              <button 
                onClick={onClose} 
                className="edit-metadata-dialog__close"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>
            
            <form id="edit-metadata-form" onSubmit={handleSubmit} className="edit-metadata-dialog__content">
              
              <div className="edit-metadata__layout">
                {/* Left Column: Cover */}
                <div className="edit-metadata__cover-col">
                  <div className="edit-metadata__cover-preview">
                    {coverUrl ? (
                      <img src={coverUrl} alt="Copertina" />
                    ) : (
                      <div className="edit-metadata__no-cover">
                        <ImageIcon size={48} opacity={0.3} />
                        <span>Nessuna copertina</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="edit-metadata__cover-actions">
                    <label className="secondary-button" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                      <Upload size={16} />
                      Carica
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleImageUpload}
                        hidden 
                      />
                    </label>
                  </div>
                </div>

                {/* Right Column: Fields */}
                <div className="edit-metadata__fields-col">
                  <div className="form-group">
                    <label htmlFor="meta-title">Titolo</label>
                    <input
                      id="meta-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="meta-author">Autore</label>
                    <input
                      id="meta-author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="meta-tags">Tag / Generi (separati da virgola)</label>
                    <input
                      id="meta-tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="es. Romanzo, Fantascienza, Classico"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Tools Section (Auto-fill & TOC) */}
              <div className="edit-metadata__tools">
                <div className="tools-section-title">Strumenti Avanzati</div>
                <div className="tools-grid">
                  <button type="button" className="tool-button" disabled title="Prossimamente">
                    <RefreshCw size={18} />
                    <span>Auto-compila da Web</span>
                  </button>
                  <button type="button" className="tool-button" disabled title="Prossimamente">
                    <List size={18} />
                    <span>Gestione Indice (TOC)</span>
                  </button>
                </div>
              </div>

            </form>
            
            <div className="edit-metadata-dialog__actions">
              <button 
                type="button"
                onClick={onClose} 
                className="btn btn--secondary"
                disabled={isSaving}
              >
                Annulla
              </button>
              <button 
                type="submit"
                form="edit-metadata-form"
                className="btn btn--primary"
                disabled={isSaving || !title.trim()}
              >
                {isSaving ? 'Salvataggio...' : (
                  <>
                    <Save size={16} />
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}