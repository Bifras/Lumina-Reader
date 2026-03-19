import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library, BookOpen, CheckCircle, Bookmark, Heart,
  Folder, Plus, MoreVertical, Trash2, Edit2, ChevronLeft, ChevronRight
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
import ConfirmDialog from './ConfirmDialog'

const iconMap = {
  Library,
  BookOpen,
  CheckCircle,
  Bookmark,
  Heart,
  Folder,
}

type ToastFn = (message: string, type?: 'info' | 'success' | 'warning' | 'error', title?: string, duration?: number) => void

type CollectionWithParent = Collection & { parentId?: string }

interface SortableCollectionItemProps {
  collection: CollectionWithParent
  isActive: boolean
  onSelect: (id: string) => void
  onMenuToggle: (id: string | null) => void
  onStartEdit: (collection: CollectionWithParent) => void
  onRequestDelete: (collection: CollectionWithParent) => void
  isMenuOpen: boolean
  isCollapsed: boolean
  bookCount: number
  isNested?: boolean
  isEditing: boolean
  editingName: string
  onEditingNameChange: (value: string) => void
  onCommitEdit: () => Promise<void>
  onCancelEdit: () => void
}

const SortableCollectionItem = memo(function SortableCollectionItem({
  collection,
  isActive,
  onSelect,
  onMenuToggle,
  onStartEdit,
  onRequestDelete,
  isMenuOpen,
  isCollapsed,
  bookCount,
  isNested,
  isEditing,
  editingName,
  onEditingNameChange,
  onCommitEdit,
  onCancelEdit,
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
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom')

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

  useEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition('bottom')
      return
    }

    const updatePosition = () => {
      if (!menuRef.current) return

      const rect = menuRef.current.getBoundingClientRect()
      const shouldFlip = rect.bottom > window.innerHeight - 16 && rect.top >= rect.height + 24
      setMenuPosition(shouldFlip ? 'top' : 'bottom')
    }

    const frameId = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isMenuOpen])

  const handleSelect = useCallback(() => {
    onSelect(collection.id)
  }, [collection.id, onSelect])

  if (isEditing && !isCollapsed) {
    return (
      <div ref={setNodeRef} style={style} className="collection-item-wrapper">
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`collection-item collection-item--editing ${isNested ? 'collection-item--nested' : ''}`}
        >
          <Folder size={18} className="collection-item__icon collection-item__icon--muted" aria-hidden="true" />
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                onCancelEdit()
              }
            }}
            onBlur={() => {
              void onCommitEdit()
            }}
            autoFocus
            className="collection-inline-input"
            aria-label={`Rinomina collezione ${collection.name}`}
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="collection-item-wrapper">
      <motion.div
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSelect}
        className={`collection-item ${isActive ? 'collection-item--active' : ''} ${isCollapsed ? 'collection-item--collapsed' : ''} ${isNested ? 'collection-item--nested' : ''}`}
        title={isCollapsed ? collection.name : undefined}
        aria-label={isCollapsed ? collection.name : undefined}
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
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '4px' }}
            aria-hidden="true"
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
        {!isCollapsed && <span className="collection-item__name sidebar-anim-fade">{collection.name}</span>}

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
            aria-label={`Menu opzioni per ${collection.name}`}
            aria-expanded={isMenuOpen}
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
              data-position={menuPosition}
            >
              <button
                onClick={() => onStartEdit(collection)}
                className="collection-context-menu__item"
              >
                <Edit2 size={14} /> <span>Rinomina</span>
              </button>
              <button
                onClick={() => onRequestDelete(collection)}
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
        aria-label={isCollapsed ? collection.name : undefined}
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
        {!isCollapsed && <span className="collection-item__name sidebar-anim-fade">{collection.name}</span>}

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
  addToast?: ToastFn
}

export default function CollectionSidebar({ isCollapsed, onToggle, library, addToast }: CollectionSidebarProps) {
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
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editingCollectionName, setEditingCollectionName] = useState('')
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithParent | null>(null)
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
    () => collections.filter(c => c.type === 'smart') as CollectionWithParent[],
    [collections]
  )
  const customCollections = useMemo(
    () => collections.filter(c => c.type === 'custom') as CollectionWithParent[],
    [collections]
  )

  const closeCreateCollection = useCallback(() => {
    setIsCreating(false)
    setNewCollectionName('')
  }, [])

  const closeEditingCollection = useCallback(() => {
    setEditingCollectionId(null)
    setEditingCollectionName('')
  }, [])

  const notify = useCallback<ToastFn>((message, type = 'info', title = '', duration = 4000) => {
    addToast?.(message, type, title, duration)
  }, [addToast])

  const hasDuplicateCollectionName = useCallback((name: string, excludedId?: string) => {
    const normalizedName = name.trim().toLowerCase()
    return [...smartCollections, ...customCollections].some(
      collection => collection.id !== excludedId && collection.name.trim().toLowerCase() === normalizedName
    )
  }, [smartCollections, customCollections])

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

  useEffect(() => {
    if (!isCollapsed) return
    setMenuOpen(null)
    closeEditingCollection()
  }, [isCollapsed, closeEditingCollection])

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
          closeCreateCollection()
        }
        if (editingCollectionId) {
          closeEditingCollection()
        }
        if (menuOpen) {
          setMenuOpen(null)
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
        closeCreateCollection()
      }
      return
    }

    if (hasDuplicateCollectionName(name)) {
      notify('Esiste già una collezione con questo nome.', 'warning', 'Nome già usato')
      return
    }

    isCreatingRef.current = true
    try {
      await createNewCollection({
        name,
        icon: 'Folder',
        color: '#b8642a'
      })
      notify(`"${name}" creata`, 'success', 'Nuova collezione')
      closeCreateCollection()
    } catch (error) {
      console.error('Error creating collection:', error)
      notify('Impossibile creare la collezione.', 'error', 'Errore')
    } finally {
      isCreatingRef.current = false
    }
  }, [newCollectionName, createNewCollection, hasDuplicateCollectionName, notify, closeCreateCollection])

  const handleConfirmDeleteCollection = useCallback(async () => {
    if (!collectionToDelete) return

    try {
      await deleteCollectionById(collectionToDelete.id)
      if (activeCollectionId === collectionToDelete.id) {
        setActiveCollection('all')
      }
      notify(`"${collectionToDelete.name}" eliminata`, 'info', 'Collezione rimossa')
      setCollectionToDelete(null)
      setMenuOpen(null)
    } catch (error) {
      console.error('Error deleting collection:', error)
      notify('Impossibile eliminare la collezione.', 'error', 'Errore')
    }
  }, [collectionToDelete, deleteCollectionById, activeCollectionId, setActiveCollection, notify])

  const handleRequestDeleteCollection = useCallback((collection: CollectionWithParent) => {
    setMenuOpen(null)
    closeEditingCollection()
    setCollectionToDelete(collection)
  }, [closeEditingCollection])

  const handleSelectCollection = useCallback((collectionId: string) => {
    setActiveCollection(collectionId)
  }, [setActiveCollection])

  const handleStartEditCollection = useCallback((collection: CollectionWithParent) => {
    setMenuOpen(null)
    closeCreateCollection()
    setEditingCollectionId(collection.id)
    setEditingCollectionName(collection.name)
  }, [closeCreateCollection])

  const handleCommitEditCollection = useCallback(async () => {
    if (!editingCollectionId) return

    const originalCollection = customCollections.find(collection => collection.id === editingCollectionId)
    if (!originalCollection) {
      closeEditingCollection()
      return
    }

    const nextName = editingCollectionName.trim()
    if (!nextName || nextName === originalCollection.name) {
      closeEditingCollection()
      return
    }

    if (hasDuplicateCollectionName(nextName, originalCollection.id)) {
      notify('Esiste già una collezione con questo nome.', 'warning', 'Nome già usato')
      return
    }

    try {
      await updateCollectionData(originalCollection.id, { name: nextName })
      notify('Collezione rinominata', 'success')
      closeEditingCollection()
    } catch (error) {
      console.error('Error renaming collection:', error)
      notify('Impossibile rinominare la collezione.', 'error', 'Errore')
    }
  }, [editingCollectionId, editingCollectionName, customCollections, hasDuplicateCollectionName, updateCollectionData, notify, closeEditingCollection])

  return (
    <>
      <motion.div className={`collection-sidebar-fixed ${isCollapsed ? 'collection-sidebar-fixed--collapsed' : ''}`}>
        <button
          onClick={onToggle}
          className="collection-sidebar-toggle"
          title={isCollapsed ? 'Espandi barra laterale' : 'Collassa barra laterale'}
          aria-expanded={!isCollapsed}
          aria-label="Menu laterale collezioni"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="collection-section">
          {!isCollapsed && (
            <h3 className="collection-section-title">Libreria</h3>
          )}
          <div className="collection-section-content" role="group" aria-label="Raccolte di sistema">
            {smartCollections.map((collection: CollectionWithParent) => (
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
                  {customCollections.map((collection: CollectionWithParent) => (
                    <SortableCollectionItem
                      key={collection.id}
                      collection={collection}
                      isActive={activeCollectionId === collection.id}
                      onSelect={handleSelectCollection}
                      onMenuToggle={setMenuOpen}
                      onStartEdit={handleStartEditCollection}
                      onRequestDelete={handleRequestDeleteCollection}
                      isMenuOpen={menuOpen === collection.id}
                      isCollapsed={isCollapsed}
                      bookCount={bookCounts[collection.id] || 0}
                      isNested={!!collection.parentId}
                      isEditing={editingCollectionId === collection.id}
                      editingName={editingCollectionName}
                      onEditingNameChange={setEditingCollectionName}
                      onCommitEdit={handleCommitEditCollection}
                      onCancelEdit={closeEditingCollection}
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

          {!isCollapsed ? (
            <div className="collection-section-content collection-section-content--composer">
              <AnimatePresence mode="wait">
                {isCreating ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="collection-item-wrapper"
                  >
                    <div className="collection-item collection-item--creating">
                      <Folder size={18} className="collection-item__icon collection-item__icon--muted" aria-hidden="true" />
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
                            closeCreateCollection()
                          }
                        }}
                        onBlur={() => {
                          if (newCollectionName.trim()) {
                            void handleCreateCollection()
                          } else {
                            closeCreateCollection()
                          }
                        }}
                        autoFocus
                        className="collection-inline-input"
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
                      onClick={() => {
                        closeEditingCollection()
                        setIsCreating(true)
                      }}
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
            <div className="collection-section-content collection-section-content--composer-collapsed">
              <button
                onClick={() => {
                  onToggle()
                  window.setTimeout(() => {
                    closeEditingCollection()
                    setIsCreating(true)
                  }, 280)
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

      <ConfirmDialog
        isOpen={collectionToDelete !== null}
        title="Elimina Collezione"
        message={collectionToDelete ? `Vuoi eliminare \"${collectionToDelete.name}\"? I libri resteranno in libreria, ma la collezione verrà rimossa.` : ''}
        confirmText="Elimina"
        isDestructive={true}
        onConfirm={handleConfirmDeleteCollection}
        onCancel={() => setCollectionToDelete(null)}
      />
    </>
  )
}
