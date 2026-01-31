import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library, BookOpen, CheckCircle, Bookmark, Heart,
  Folder, Plus, MoreVertical, Trash2, Edit2, X
} from 'lucide-react'
import { useCollectionStore } from '../store'

const iconMap = {
  Library,
  BookOpen,
  CheckCircle,
  Bookmark,
  Heart,
  Folder,
  // Add any additional icons here
}

export default function CollectionSidebar({ isOpen, onClose }) {
  const {
    activeCollectionId,
    loadCollections,
    setActiveCollection,
    createNewCollection,
    deleteCollectionById,
    getCustomCollections,
    getSmartCollections
  } = useCollectionStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [, setEditingCollection] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const smartCollections = getSmartCollections()
  const customCollections = getCustomCollections()

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    try {
      await createNewCollection({
        name: newCollectionName.trim(),
        icon: 'Folder',
        color: '#c05d4e'
      })
      setNewCollectionName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  const handleDeleteCollection = async (collectionId) => {
    try {
      await deleteCollectionById(collectionId)
      setMenuOpen(null)
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const CollectionItem = ({ collection, isActive }) => {
    const Icon = iconMap[collection.icon] || Folder
    const isMenuOpen = menuOpen === collection.id

    return (
      <div style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ x: 4 }}
          onClick={() => {
            setActiveCollection(collection.id)
            if (window.innerWidth < 768) onClose()
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: isActive ? 'var(--surface-hover)' : 'transparent',
            color: isActive ? 'var(--accent-warm)' : 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: isActive ? 600 : 400,
            transition: 'all 0.2s',
            textAlign: 'left'
          }}
        >
          <Icon size={18} />
          <span style={{ flex: 1 }}>{collection.name}</span>

          {!collection.isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(isMenuOpen ? null : collection.id)
              }}
              style={{
                padding: '4px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.6}
            >
              <MoreVertical size={16} />
            </button>
          )}
        </motion.button>

        {/* Context Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '4px',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: '140px'
              }}
            >
              <button
                onClick={() => {
                  setEditingCollection(collection)
                  setMenuOpen(null)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <Edit2 size={14} /> Rinomina
              </button>
              <button
                onClick={() => handleDeleteCollection(collection.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: '#ef4444'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <Trash2 size={14} /> Elimina
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 40
            }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '260px',
              background: 'var(--bg-cream)',
              borderRight: '1px solid var(--border-subtle)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                margin: 0
              }}>
                Collezioni
              </h2>
              <button
                onClick={onClose}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-dim)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Smart Collections */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-soft)',
                marginBottom: '12px',
                fontWeight: 600
              }}>
                Libreria
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {smartCollections.map(collection => (
                  <CollectionItem
                    key={collection.id}
                    collection={collection}
                    isActive={activeCollectionId === collection.id}
                  />
                ))}
              </div>
            </div>

            {/* Custom Collections */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-soft)',
                  margin: 0,
                  fontWeight: 600
                }}>
                  Mie Collezioni
                </h3>
                <button
                  onClick={() => setIsCreating(true)}
                  style={{
                    padding: '4px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--accent-warm)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Nuova collezione"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {customCollections.map(collection => (
                  <CollectionItem
                    key={collection.id}
                    collection={collection}
                    isActive={activeCollectionId === collection.id}
                  />
                ))}
              </div>

              {customCollections.length === 0 && !isCreating && (
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-soft)',
                  textAlign: 'center',
                  padding: '20px',
                  fontStyle: 'italic'
                }}>
                  Nessuna collezione personalizzata
                </p>
              )}
            </div>

            {/* Create Collection Input */}
            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--surface-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nome collezione..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCollection()
                      if (e.key === 'Escape') {
                        setIsCreating(false)
                        setNewCollectionName('')
                      }
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-cream)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      marginBottom: '8px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCreateCollection}
                      disabled={!newCollectionName.trim()}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-warm)',
                        color: 'white',
                        cursor: newCollectionName.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: newCollectionName.trim() ? 1 : 0.5
                      }}
                    >
                      Crea
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false)
                        setNewCollectionName('')
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'transparent',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
