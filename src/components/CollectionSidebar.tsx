import { useEffect, useState, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library, BookOpen, CheckCircle, Bookmark, Heart,
  Folder, Plus, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { useCollectionStore } from '../store/useCollectionStore'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type UniqueIdentifier
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import type { Collection, Book } from '../types'

const iconMap = {
  Library,
  BookOpen,
  CheckCircle,
  Bookmark,
  Heart,
  Folder,
}

interface SortableCollectionItemProps {
  collection: Collection
  isActive: boolean
  onSelect: (id: string) => void
  onMenuToggle: (id: string | null) => void
  onEdit: (collection: Collection) => void
  onDelete: (id: string) => void
  isMenuOpen: boolean
  isCollapsed: boolean
  bookCount: number
}

const SortableCollectionItem = memo(function SortableCollectionItem({
  collection,
  isActive,
  onSelect,
  onMenuToggle,
  onEdit,
  onDelete,
  isMenuOpen,
  isCollapsed,
  bookCount
}: SortableCollectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: collection.id })

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = iconMap[collection.icon as keyof typeof iconMap] || Folder
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen, onMenuToggle])

  const handleMenuClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    onMenuToggle(isMenuOpen ? null : collection.id)
  }, [isMenuOpen, collection.id, onMenuToggle])

  const handleSelect = useCallback(() => {
    onSelect(collection.id)
  }, [collection.id, onSelect])

  return (
    <div ref={setNodeRef} style={style} className="collection-item-wrapper">
      <motion.div
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSelect}
        className={`collection-item ${isActive ? 'collection-item--active' : ''} ${isCollapsed ? 'collection-item--collapsed' : ''}`}
        title={isCollapsed ? collection.name : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect()
          }
        }}
      >
        {!isCollapsed && !collection.isDefault && (
          <div
            {...attributes}
            {...listeners}
            className="collection-item__drag-handle"
            style={{ cursor: 'grab', opacity: 0.4, display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5"/>
              <circle cx="15" cy="6" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/>
              <circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="18" r="1.5"/>
              <circle cx="15" cy="18" r="1.5"/>
            </svg>
          </div>
        )}

        <Icon size={isCollapsed ? 20 : 18} className="collection-item__icon" />
        {!isCollapsed && <span className="collection-item__name">{collection.name}</span>}

        {!isCollapsed && bookCount > 0 && (
          <span className="collection-item__badge">{bookCount}</span>
        )}

        {!isCollapsed && !collection.isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenuToggle(isMenuOpen ? null : collection.id)
            }}
            className="collection-item__menu-btn"
            aria-label="Menu opzioni"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </motion.div>

      {!isCollapsed && (
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="collection-context-menu"
            >
              <button
                onClick={() => onEdit(collection)}
                className="collection-context-menu__item"
              >
                <Edit2 size={14} /> <span>Rinomina</span>
              </button>
              <button
                onClick={() => onDelete(collection.id)}
                className="collection-context-menu__item collection-context-menu__item--danger"
              >
                <Trash2 size={14} /> <span>Elimina</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
})


interface CollectionItemProps {
  collection: Collection
  isActive: boolean
  onSelect: (id: string) => void
  isCollapsed: boolean
  bookCount: number
}

const CollectionItem = memo(function CollectionItem({
  collection,
  isActive,
  onSelect,
  isCollapsed,
  bookCount
}: CollectionItemProps) {
  const Icon = iconMap[collection.icon as keyof typeof iconMap] || Folder

  const handleSelect = useCallback(() => {
    onSelect(collection.id)
  }, [collection.id, onSelect])

  return (
    <div className="collection-item-wrapper">
      <motion.div
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSelect}
        className={`collection-item ${isActive ? 'collection-item--active' : ''} ${isCollapsed ? 'collection-item--collapsed' : ''}`}
        title={isCollapsed ? collection.name : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect()
          }
        }}
      >
        <Icon size={isCollapsed ? 20 : 18} className="collection-item__icon" />
        {!isCollapsed && <span className="collection-item__name">{collection.name}</span>}

        {!isCollapsed && bookCount > 0 && (
          <span className="collection-item__badge">{bookCount}</span>
        )}
      </motion.div>
    </div>
  )
})

interface CollectionSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  library: Book[]
}

export default function CollectionSidebar({ isCollapsed, onToggle, library }: CollectionSidebarProps) {
  const {
    activeCollectionId,
    loadCollections,
    setActiveCollection,
    createNewCollection,
    deleteCollectionById,
    getCustomCollections,
    getSmartCollections,
    reorderCollections,
    getBookCount
  } = useCollectionStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [, setEditingCollection] = useState<Collection | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  useEffect(() => {
    if (!library || library.length === 0) return

    const loadCounts = async () => {
      const smartCollections = getSmartCollections()
      const customCollections = getCustomCollections()
      const allCollections = [...smartCollections, ...customCollections]

      const counts: Record<string, number> = {}
      for (const collection of allCollections) {
        counts[collection.id] = await getBookCount(collection.id, library)
      }
      setBookCounts(counts)
    }

    loadCounts()
  }, [library, getSmartCollections, getCustomCollections, getBookCount])

  const smartCollections = getSmartCollections()
  const customCollections = getCustomCollections()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        const allCollections = [...smartCollections, ...customCollections]
        if (index < allCollections.length) {
          setActiveCollection(allCollections[index].id)
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        setActiveCollection('all')
      }

      if (e.key === 'Escape' && isCreating) {
        setIsCreating(false)
        setNewCollectionName('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [smartCollections, customCollections, setActiveCollection, isCreating])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = customCollections.findIndex((c: Collection) => c.id === active.id)
      const newIndex = customCollections.findIndex((c: Collection) => c.id === over.id)

      const newOrder = arrayMove(customCollections, oldIndex, newIndex)
      const newOrderIds = newOrder.map((c: Collection) => c.id)

      await reorderCollections(newOrderIds)
    }

    setActiveId(null)
  }, [customCollections, reorderCollections])

  const handleCreateCollection = useCallback(async () => {
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
  }, [newCollectionName, createNewCollection])

  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    try {
      await deleteCollectionById(collectionId)
      setMenuOpen(null)
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }, [deleteCollectionById])

  const handleSelectCollection = useCallback((collectionId: string) => {
    setActiveCollection(collectionId)
  }, [setActiveCollection])

  const handleEditCollection = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setMenuOpen(null)
  }, [])

  return (
    <div className={`collection-sidebar-fixed ${isCollapsed ? 'collection-sidebar-fixed--collapsed' : ''}`}>
      <button
        onClick={onToggle}
        className="collection-sidebar-toggle"
        title={isCollapsed ? 'Espandi' : 'Collassa'}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="collection-sidebar-header">
        {!isCollapsed && (
          <div>
            <div className="collection-sidebar-title-wrapper" title="Collezioni">
              <svg
                className="collections-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 11h18M3 21h18" />
                <rect x="5" y="3" width="3" height="8" rx="0.5" />
                <path d="M10 11l1.2-5.2a0.6 0.6 0 0 1 0.6-0.8h1.4a0.6 0.6 0 0 1 0.6 0.8l-1.2 5.2" />
                <rect x="16" y="5" width="3" height="6" rx="0.5" />
                <path d="M7.5 21l-1.8-6.3a0.6 0.6 0 0 0-0.6-0.7H3.7a0.6 0.6 0 0 0-0.6 0.7L4.9 21" />
                <rect x="9.5" y="13" width="3" height="8" rx="0.5" />
                <rect x="14.5" y="18" width="6.5" height="3" rx="0.5" />
              </svg>
              <span className="collection-sidebar-label">Collezioni</span>
            </div>
            <p className="collection-sidebar-shortcuts">
              <kbd>⌘</kbd><kbd>1-9</kbd> per navigare
            </p>
          </div>
        )}
      </div>

      <div className="collection-section">
        {!isCollapsed && (
          <h3 className="collection-section-title">Libreria</h3>
        )}
        <div className="collection-section-content">
          {smartCollections.map((collection: Collection) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              isActive={activeCollectionId === collection.id}
              onSelect={handleSelectCollection}
              isCollapsed={isCollapsed}
              bookCount={bookCounts[collection.id] || 0}
            />
          ))}
        </div>
      </div>

      <div className="collection-custom-scroll">
        {!isCollapsed && (
          <div className="collection-section-header">
            <h3 className="collection-section-title">Mie Collezioni</h3>
            <button
              onClick={() => setIsCreating(true)}
              className="collection-add-btn collection-add-btn--enhanced"
              title="Crea nuova collezione"
              aria-label="Crea nuova collezione"
            >
              <Plus size={16} />
              <span className="collection-add-btn__label">Nuova</span>
            </button>
          </div>
        )}

        {isCollapsed && (
          <div className="collection-section-content" style={{ marginTop: '8px' }}>
            <button
              onClick={() => setIsCreating(true)}
              className="collection-item collection-item--collapsed"
              title="Nuova collezione"
            >
              <Plus size={20} className="collection-item__icon" />
            </button>
          </div>
        )}

        {!isCollapsed && customCollections.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveId(event.active.id)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={customCollections.map((c: Collection) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="collection-section-content">
                {customCollections.map((collection: Collection) => (
                  <SortableCollectionItem
                    key={collection.id}
                    collection={collection}
                    isActive={activeCollectionId === collection.id}
                    onSelect={handleSelectCollection}
                    onMenuToggle={setMenuOpen}
                    onEdit={handleEditCollection}
                    onDelete={handleDeleteCollection}
                    isMenuOpen={menuOpen === collection.id}
                    isCollapsed={isCollapsed}
                    bookCount={bookCounts[collection.id] || 0}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="collection-item collection-item--dragging">
                  {customCollections.find((c: Collection) => c.id === activeId)?.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {!isCollapsed && customCollections.length === 0 && !isCreating && (
          <div className="collection-empty">
            <div className="collection-empty__icon">📚</div>
            <p>Nessuna collezione personalizzata</p>
            <p className="collection-empty__hint">
              Trascina per riordinare
            </p>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="collection-create-wrapper">
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="collection-create-form"
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
                  className="collection-create-input"
                />
                <div className="collection-create-actions">
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className="collection-create-btn"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewCollectionName('')
                    }}
                    className="collection-create-btn collection-create-btn--cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
