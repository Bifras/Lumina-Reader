import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdvancedFiltersMenu from '../components/AdvancedFiltersMenu'
import { useLibraryStore } from '../store/useLibraryStore'

vi.mock('../store/useLibraryStore', () => ({
  useLibraryStore: vi.fn(),
}))

vi.mock('../hooks', () => ({
  useFocusTrap: vi.fn(),
}))

describe('AdvancedFiltersMenu', () => {
  const mockSetAdvancedFilters = vi.fn()
  const mockClearAdvancedFilters = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLibraryStore).mockReturnValue({
      advancedFilters: {},
      setAdvancedFilters: mockSetAdvancedFilters,
      clearAdvancedFilters: mockClearAdvancedFilters,
    } as any)
  })

  it('renders correctly when open', () => {
    render(
      <AdvancedFiltersMenu
        isOpen={true}
        onClose={mockOnClose}
        anchorRef={{ current: document.createElement('div') }}
      />
    )
    expect(screen.getByText('Filtri Avanzati')).toBeInTheDocument()
    expect(screen.getByLabelText('Genere')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Valutazione minima' })).toBeInTheDocument()
    expect(screen.getByText('Solo Preferiti')).toBeInTheDocument()
    expect(screen.getByText('Nessun filtro attivo')).toBeInTheDocument()
  })

  it('calls setAdvancedFilters when a filter is changed', () => {
    render(
      <AdvancedFiltersMenu
        isOpen={true}
        onClose={mockOnClose}
        anchorRef={{ current: document.createElement('div') }}
      />
    )

    const genreInput = screen.getByLabelText('Genere')
    fireEvent.change(genreInput, { target: { value: 'Sci-Fi' } })

    expect(mockSetAdvancedFilters).toHaveBeenCalledWith({ genre: 'Sci-Fi' })
  })

  it('sets minimum rating from star buttons', () => {
    render(
      <AdvancedFiltersMenu
        isOpen={true}
        onClose={mockOnClose}
        anchorRef={{ current: document.createElement('div') }}
      />
    )

    fireEvent.click(screen.getByRole('radio', { name: '4+ stelle' }))

    expect(mockSetAdvancedFilters).toHaveBeenCalledWith({ minRating: 4 })
  })

  it('calls clearAdvancedFilters when reset is clicked', () => {
    vi.mocked(useLibraryStore).mockReturnValue({
      advancedFilters: { genre: 'Sci-Fi', minRating: 4 },
      setAdvancedFilters: mockSetAdvancedFilters,
      clearAdvancedFilters: mockClearAdvancedFilters,
    } as any)

    render(
      <AdvancedFiltersMenu
        isOpen={true}
        onClose={mockOnClose}
        anchorRef={{ current: document.createElement('div') }}
      />
    )

    const resetBtn = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetBtn)

    expect(mockClearAdvancedFilters).toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})
