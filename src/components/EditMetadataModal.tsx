import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Save, RefreshCw, Upload, Check } from 'lucide-react'
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
  const [selectedResult, setSelectedResult] = useState<WebMetadata | null>(null)
  const [searchWarning, setSearchWarning] = useState<string | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Initialize form when book changes or modal opens
  useEffect(() => {
    if (isOpen && book) {
      setTitle(book.title || '')
      setAuthor(book.author || '')
      setTags(book.tags ? book.tags.join(', ') : '')
      setCoverUrl(book.cover || '')
      setSearchResults([])
      setSearchWarning(null)
      setSelectedResult(null)
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
    setSearchWarning(null)
    setSelectedResult(null)
    try {
      const { results, googleFailed, openLibraryFailed, itunesFailed } = await MetadataService.searchMetadata(title, author)
      setSearchResults(results)

      if (results.length === 0) {
        setSearchWarning('Nessun risultato trovato. Prova a modificare titolo o autore.')
      } else {
        const failed = [
          googleFailed && 'Google Books',
          openLibraryFailed && 'Open Library',
          itunesFailed && 'iTunes'
        ].filter(Boolean)
        if (failed.length > 0 && failed.length < 3) {
          setSearchWarning(`${failed.join(', ')} non disponibile.`)
        }
      }

      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchWarning('Errore durante la ricerca.')
      setShowSearchResults(true)
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
                    <div className="form-group__label-row">
                      <label htmlFor="meta-title">Titolo</label>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '0.7rem', padding: '0.4rem 1rem' }}
                        onClick={handleSearchMetadata}
                        disabled={isSearching || !title.trim()}
                        title="Cerca metadati su Google Books, Open Library e iTunes"
                      >
                        {isSearching ? <RefreshCw size={13} className="spin" /> : <RefreshCw size={13} />}
                        {isSearching ? 'Ricerca...' : 'Cerca online'}
                      </button>
                    </div>
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
                    {searchWarning && searchResults.length === 0 && (
                      <div className="no-results">
                        <p>{searchWarning}</p>
                      </div>
                    )}
                    {searchWarning && searchResults.length > 0 && (
                      <div className="search-warning">{searchWarning}</div>
                    )}
                    {!searchWarning && searchResults.length === 0 && (
                      <div className="no-results">
                        <p>Nessun risultato trovato.</p>
                        <p className="no-results__hint">Prova a modificare il titolo o l'autore nella ricerca.</p>
                      </div>
                    )}
                    {searchResults.map((result, idx) => {
                        const isSelected = selectedResult === result
                        return (
                        <div
                          key={idx}
                          className={`search-result-item ${isSelected ? 'search-result-item--selected' : ''}`}
                          onClick={() => setSelectedResult(isSelected ? null : result)}
                        >
                          <div className="result-cover">
                            {result.cover ? <img src={result.cover} alt="" /> : <ImageIcon size={20} />}
                          </div>
                          <div className="result-info">
                            <div className="result-title">{result.title}</div>
                            <div className="result-author">{result.author}</div>
                            <div className="result-source">{result.source === 'google' ? 'Google Books' : result.source === 'itunes' ? 'iTunes' : 'Open Library'}</div>
                          </div>
                          <div className={`result-check ${isSelected ? 'result-check--active' : ''}`}>
                            {isSelected && <Check size={16} />}
                          </div>
                        </div>
                        )
                    })}
                  </div>
                  <div className="web-search-results__actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setShowSearchResults(false)}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!selectedResult}
                      onClick={() => {
                        if (selectedResult) {
                          applyWebMetadata(selectedResult)
                        }
                      }}
                    >
                      <Check size={16} />
                      Applica
                    </button>
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