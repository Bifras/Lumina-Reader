import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Save, RefreshCw, List, Upload, ExternalLink, Check } from 'lucide-react'
import { useFocusTrap } from '../hooks'
import { MetadataService, type WebMetadata } from '../services/MetadataService'
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

  // Web Metadata state
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<WebMetadata[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Initialize form when book changes or modal opens
  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '')
      setAuthor(book.author || '')
      setTags(book.tags ? book.tags.join(', ') : '')
      setCoverUrl(book.cover || '')
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [isOpen, book])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearchResults) {
          setShowSearchResults(false)
        } else {
          e.stopPropagation()
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, showSearchResults])

  const handleSearchMetadata = async () => {
    if (!title.trim()) return

    setIsSearching(true)
    try {
      const results = await MetadataService.searchMetadata(title, author)
      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const applyWebMetadata = (metadata: WebMetadata) => {
    setTitle(metadata.title)
    setAuthor(metadata.author)
    if (metadata.cover) setCoverUrl(metadata.cover)
    if (metadata.genre && !tags.includes(metadata.genre)) {
      const currentTags = tags.split(',').map(t => t.trim()).filter(Boolean)
      if (!currentTags.includes(metadata.genre)) {
        setTags(prev => prev ? `${prev}, ${metadata.genre}` : metadata.genre!)
      }
    }
    setShowSearchResults(false)
  }

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
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
                    <label className="secondary-button" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <Upload size={14} />
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

              {/* Tools Section */}
              <div className="edit-metadata__tools">
                <div className="tools-section-title">Strumenti Avanzati</div>
                <div className="tools-grid">
                  <button 
                    type="button" 
                    className={`tool-button ${isSearching ? 'searching' : ''}`} 
                    onClick={handleSearchMetadata}
                    disabled={isSearching || !title.trim()}
                  >
                    {isSearching ? <RefreshCw size={18} className="spin" /> : <RefreshCw size={18} />}
                    <span>{isSearching ? 'Ricerca...' : 'Auto-compila da Web'}</span>
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

            {/* Web Search Results Overlay */}
            <AnimatePresence>
              {showSearchResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="web-search-results"
                >
                  <div className="web-search-results__header">
                    <h4>Risultati dal Web</h4>
                    <button onClick={() => setShowSearchResults(false)} className="close-results">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="web-search-results__list">
                    {searchResults.length === 0 ? (
                      <div className="no-results">Nessun risultato trovato. Prova a modificare titolo o autore.</div>
                    ) : (
                      searchResults.map((result, idx) => (
                        <div key={idx} className="search-result-item" onClick={() => applyWebMetadata(result)}>
                          <div className="result-cover">
                            {result.cover ? <img src={result.cover} alt="" /> : <ImageIcon size={20} />}
                          </div>
                          <div className="result-info">
                            <div className="result-title">{result.title}</div>
                            <div className="result-author">{result.author}</div>
                            <div className="result-source">Fonte: {result.source === 'google' ? 'Google Books' : 'Open Library'}</div>
                          </div>
                          <button className="apply-result-btn" title="Applica questi metadati">
                            <Check size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}