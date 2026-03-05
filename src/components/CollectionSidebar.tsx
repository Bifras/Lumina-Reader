import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library, BookOpen, CheckCircle, Bookmark, Heart,
  Folder, Plus, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight, LibraryBig
} from 'lucide-react'
import { useCollectionStore } from '../store/useCollectionStore'
import { resolveRestoredCollectionId } from './collectionSidebarUtils'
import { useLibrarySettingsStore } from '../store/useLibrarySettingsStore'
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
import { useKeyboardShortcuts } from '../hooks'
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
  isNested?: boolean
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
  bookCount,
  isNested
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

  const handleSelect = useCallback(() => {
    onSelect(collection.id)
  }, [collection.id, onSelect])

  return (
    <div ref={setNodeRef} style={style} className="collection-item-wrapper">
      <motion.div
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSelect}
        className={`collection-item ${isActive ? 'collection-item--active' : ''} ${isCollapsed ? 'collection-item--collapsed' : ''} ${isNested ? 'collection-item--nested' : ''}`}
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
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>
        )}

        <Icon size={20} className="collection-item__icon" />
        <span className="collection-item__name sidebar-anim-fade">{collection.name}</span>

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
        <Icon size={20} className="collection-item__icon" />
        <span className="collection-item__name sidebar-anim-fade">{collection.name}</span>

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
    collections,
    loadCollections,
    setActiveCollection,
    createNewCollection,
    updateCollectionData,
    deleteCollectionById,
    reorderCollections,
    getBookCount,
    bookCollections,
    isLoading
  } = useCollectionStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const isCreatingRef = useRef(false)
  const hasRestoredFilterRef = useRef(false)
  const lastFilter = useLibrarySettingsStore(state => state.lastFilter)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const smartCollections = useMemo(
    () => collections.filter(c => c.type === 'smart'),
    [collections]
  )
  const customCollections = useMemo(
    () => collections.filter(c => c.type === 'custom'),
    [collections]
  )

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  useEffect(() => {
    if (isLoading) return
    if (hasRestoredFilterRef.current) return
    if (collections.length === 0) return

    const allCollectionIds = [...smartCollections, ...customCollections].map(c => c.id)
    const restoredCollectionId = resolveRestoredCollectionId(lastFilter, allCollectionIds)

    setActiveCollection(restoredCollectionId)
    hasRestoredFilterRef.current = true
  }, [isLoading, collections, lastFilter, setActiveCollection, smartCollections, customCollections])

  useEffect(() => {
    let isMounted = true
    const loadCounts = async () => {
      const allCollections = [...smartCollections, ...customCollections]

      if (allCollections.length === 0) {
        if (isMounted) {
          setBookCounts(prev => (Object.keys(prev).length === 0 ? prev : {}))
        }
        return
      }

      const entries = await Promise.all(
        allCollections.map(async (collection) => {
          const count = await getBookCount(collection.id, library)
          return [collection.id, count] as const
        })
      )

      if (isMounted) {
        const nextCounts = Object.fromEntries(entries) as Record<string, number>
        setBookCounts(prev => {
          const prevKeys = Object.keys(prev)
          const nextKeys = Object.keys(nextCounts)
          if (prevKeys.length !== nextKeys.length) return nextCounts
          for (const key of nextKeys) {
            if (prev[key] !== nextCounts[key]) return nextCounts
          }
          return prev
        })
      }
    }

    void loadCounts()
    return () => {
      isMounted = false
    }
  }, [library, smartCollections, customCollections, getBookCount, bookCollections])


  // Use the extracted hook for keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '1-9',
      ctrlOrMeta: true,
      preventDefault: true,
      action: (e) => {
        const index = parseInt(e.key) - 1
        const allCollections = [...smartCollections, ...customCollections]
        if (index < allCollections.length) {
          setActiveCollection(allCollections[index].id)
        }
      }
    },
    {
      key: '0',
      ctrlOrMeta: true,
      preventDefault: true,
      action: () => {
        setActiveCollection('all')
      }
    },
    {
      key: 'Escape',
      ctrlOrMeta: false,
      action: () => {
        if (isCreating) {
          setIsCreating(false)
          setNewCollectionName('')
        }
      }
    }
  ])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = customCollections.findIndex((c: Collection) => c.id === active.id)
      const newIndex = customCollections.findIndex((c: Collection) => c.id === over.id)

      const newOrder = arrayMove(customCollections, oldIndex, newIndex)
      const newOrderIds = newOrder.map((c: Collection) => c.id)

      await reorderCollections(newOrderIds)
    }

    setActiveId(null)
  }

  const handleCreateCollection = useCallback(async () => {
    const name = newCollectionName.trim()
    if (!name || isCreatingRef.current) {
      if (!name) {
        setIsCreating(false)
      }
      return
    }

    const alreadyExists = [...smartCollections, ...customCollections]
      .some(c => c.name.trim().toLowerCase() === name.toLowerCase())

    if (alreadyExists) {
      window.alert('Esiste già una collezione con questo nome.')
      return
    }

    isCreatingRef.current = true
    try {
      await createNewCollection({
        name,
        icon: 'Folder',
        color: '#c05d4e'
      })
      setNewCollectionName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating collection:', error)
    } finally {
      isCreatingRef.current = false
    }
  }, [newCollectionName, createNewCollection, smartCollections, customCollections])

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

  const handleEditCollection = useCallback(async (collection: Collection) => {
    setMenuOpen(null)

    const proposedName = window.prompt('Nuovo nome collezione', collection.name)
    if (proposedName === null) return

    const nextName = proposedName.trim()
    if (!nextName || nextName === collection.name) return

    const duplicateName = [...smartCollections, ...customCollections].some(
      c => c.id !== collection.id && c.name.trim().toLowerCase() === nextName.toLowerCase()
    )

    if (duplicateName) {
      window.alert('Esiste già una collezione con questo nome.')
      return
    }

    try {
      await updateCollectionData(collection.id, { name: nextName })
    } catch (error) {
      console.error('Error renaming collection:', error)
    }
  }, [smartCollections, customCollections, updateCollectionData])

  return (
    <motion.div


      className={`collection-sidebar-fixed ${isCollapsed ? 'collection-sidebar-fixed--collapsed' : ''}`}
    >
      <button
        onClick={onToggle}
        className="collection-sidebar-toggle"
        title={isCollapsed ? 'Espandi barra laterale' : 'Collassa barra laterale'}
        aria-expanded={!isCollapsed}
        aria-label="Menu laterale collezioni"
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="collection-sidebar-header">
        {!isCollapsed && (
          <div>
            <div className="collection-sidebar-title-wrapper" title="Lumina">
              <LibraryBig
                className="collections-icon"
                size={32}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="collection-sidebar-label">Lumina</span>
            </div>
          </div>
        )}
      </div>

      <div className="collection-section">
        {!isCollapsed && (
          <h3 className="collection-section-title">Libreria</h3>
        )}
        <div className="collection-section-content" role="group" aria-label="Raccolte di sistema">
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
          </div>
        )}

        {customCollections.length > 0 && (
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
              <div className="collection-section-content" role="group" aria-label="Mie collezioni personalizzate">
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
                    isNested={!!collection.parentId}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId && !isCollapsed ? (
                <div className="collection-item collection-item--dragging">
                  {customCollections.find((c: Collection) => c.id === activeId)?.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* INLINE CREATION OR EMPTY STATE CTA */}
        {!isCollapsed ? (
          <div className="collection-section-content" style={{ marginTop: customCollections.length > 0 ? '4px' : '0' }}>
            <AnimatePresence mode="wait">
              {isCreating ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="collection-item-wrapper"
                >
                  <div className="collection-item collection-item--creating">
                    <Folder size={18} className="collection-item__icon" style={{ opacity: 0.5 }} aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Nome collezione..."
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleCreateCollection()
                        }
                        if (e.key === 'Escape') {
                          setIsCreating(false)
                          setNewCollectionName('')
                        }
                      }}
                      onBlur={() => {
                        if (newCollectionName.trim()) {
                          void handleCreateCollection()
                        } else {
                          setIsCreating(false)
                        }
                      }}
                      autoFocus
                      className="collection-create-input-inline"
                      aria-label="Nome nuova collezione"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="collection-item-wrapper"
                >
                  <button
                    onClick={() => setIsCreating(true)}
                    className="collection-item collection-item--add"
                    aria-label="Crea nuova collezione"
                  >
                    <Plus size={18} className="collection-item__icon" aria-hidden="true" />
                    <span className="collection-item__name">Nuova Collezione...</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="collection-section-content" style={{ marginTop: '8px' }}>
            <button
              onClick={() => {
                onToggle()
                setTimeout(() => setIsCreating(true), 300) // Aspetta l'animazione di apertura
              }}
              className="collection-item collection-item--collapsed"
              title="Crea nuova collezione"
              aria-label="Espandi per creare nuova collezione"
            >
              <Plus size={18} className="collection-item__icon" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}












