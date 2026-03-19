import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LibrarySectionHeader from '../components/LibrarySectionHeader'
import type { Book } from '../types'

vi.mock('../components/LibrarySettingsMenu', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="library-settings-menu" data-open={isOpen} />
  ),
}))

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id || 'book-1',
    title: overrides.title || 'Libro Test',
    progress: overrides.progress ?? 45,
    cfi: overrides.cfi || 'epubcfi(/6/2[chapter]!/4/1:0)',
    addedAt: overrides.addedAt ?? Date.now(),
    author: overrides.author,
    cover: overrides.cover,
  }
}

describe('LibrarySectionHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  const settingsRef = createRef<HTMLDivElement>()
  const settingsButtonRef = createRef<HTMLButtonElement>()

  const onSearchValueChange = vi.fn()
  const onToggleSettings = vi.fn()
  const onCloseSettings = vi.fn()
  const onRegenerateCovers = vi.fn()
  const onFileInputChange = vi.fn()
  const onResumeRead = vi.fn()

  const baseProps = {
    filteredCount: 3,
    searchValue: '',
    showSettings: false,
    settingsRef,
    settingsButtonRef,
    onSearchValueChange,
    onToggleSettings,
    onCloseSettings,
    showRegenerateButton: false,
    onRegenerateCovers,
    onFileInputChange,
    onResumeRead,
  }

  it('renders count and search input', () => {
    render(<LibrarySectionHeader {...baseProps} />)

    expect(screen.getByText('3 libri')).toBeInTheDocument()
    expect(screen.getByLabelText('Cerca nella libreria')).toBeInTheDocument()
  })

  it('calls search handler when input changes', () => {
    render(<LibrarySectionHeader {...baseProps} />)

    fireEvent.change(screen.getByLabelText('Cerca nella libreria'), {
      target: { value: 'dune' },
    })

    expect(onSearchValueChange).toHaveBeenCalledWith('dune')
  })

  it('shows resume button and triggers callback with book', () => {
    const book = makeBook({ id: 'resume-1', title: 'Resume Book' })
    render(<LibrarySectionHeader {...baseProps} lastReadBook={book} />)

    const resumeButton = screen.getByLabelText(/Continua:/i)
    fireEvent.click(resumeButton)

    expect(onResumeRead).toHaveBeenCalledWith(book)
  })

  it('shows regenerate button when enabled and handles click', () => {
    render(
      <LibrarySectionHeader
        {...baseProps}
        showRegenerateButton={true}
      />,
    )

    const button = screen.getByLabelText('Ripara copertine mancanti')
    fireEvent.click(button)

    expect(onRegenerateCovers).toHaveBeenCalledTimes(1)
  })

  it('renders file input and forwards change event', () => {
    render(<LibrarySectionHeader {...baseProps} />)

    const input = document.getElementById('lib-upload') as HTMLInputElement
    const file = new File(['content'], 'book.epub', { type: 'application/epub+zip' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(onFileInputChange).toHaveBeenCalledTimes(1)
  })

  it('toggles settings menu via button', () => {
    render(<LibrarySectionHeader {...baseProps} />)

    fireEvent.click(screen.getByLabelText('Apri impostazioni libreria'))
    expect(onToggleSettings).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('library-settings-menu')).toBeInTheDocument()
  })
})

