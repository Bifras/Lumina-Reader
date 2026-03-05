import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CollectionSidebar from '../components/CollectionSidebar'
import { useCollectionStore } from '../store/useCollectionStore'

vi.mock('../store/useCollectionStore')
vi.mock('../store/useLibrarySettingsStore', () => ({
  useLibrarySettingsStore: vi.fn(() => 'all') // Mock lastFilter
}))
vi.mock('../hooks', () => ({
  useKeyboardShortcuts: vi.fn()
}))

describe('CollectionSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nested collections with proper styling or hierarchy', () => {
    // Mock the store to return hierarchical collections
    vi.mocked(useCollectionStore).mockReturnValue({
      collections: [
        { id: 'parent-1', name: 'Parent', type: 'custom', createdAt: 0 },
        { id: 'child-1', name: 'Child', type: 'custom', parentId: 'parent-1', createdAt: 0 }
      ],
      activeCollectionId: 'all',
      bookCollections: {},
      isLoading: false,
      loadCollections: vi.fn(),
      setActiveCollection: vi.fn(),
      createNewCollection: vi.fn(),
      updateCollectionData: vi.fn(),
      deleteCollectionById: vi.fn(),
      reorderCollections: vi.fn(),
      getBookCount: vi.fn().mockResolvedValue(0),
    } as any)

    render(
      <CollectionSidebar 
        isCollapsed={false}
        onToggle={vi.fn()}
        library={[]}
      />
    )

    // The child collection should be rendered
    const childElement = screen.getByText('Child')
    expect(childElement).toBeInTheDocument()

    // It should have a visual indication of being nested, e.g. a specific class or margin
    // We'll look for a wrapper that indicates nesting. Since we haven't implemented it yet,
    // we assume we will add a 'nested' or 'child' class to the item wrapper or apply a style.
    const childWrapper = childElement.closest('.collection-item')
    expect(childWrapper).toHaveClass('collection-item--nested')
  })
})
