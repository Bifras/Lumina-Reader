import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdvancedFiltersMenu from '../components/AdvancedFiltersMenu'
import { useLibraryStore } from '../store'

vi.mock('../store', () => ({
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
    expect(screen.getByLabelText('Valutazione minima')).toBeInTheDocument()
    expect(screen.getByText('Solo Preferiti')).toBeInTheDocument()
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

  it('calls clearAdvancedFilters when reset is clicked', () => {
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
    expect(mockOnClose).toHaveBeenCalled()
  })
})
