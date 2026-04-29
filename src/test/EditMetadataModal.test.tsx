import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import EditMetadataModal from '../components/EditMetadataModal'
import type { Book, TOCEntry } from '../types'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

vi.mock('../hooks', () => ({
  useFocusTrap: vi.fn()
}))

const baseBook: Book = {
  id: 'book-1',
  title: 'Libro di test',
  author: 'Autore di test',
  progress: 0,
  addedAt: Date.now()
}

describe('EditMetadataModal TOC tools', () => {
  it('shows detected chapters after clicking "Sistema Indice"', async () => {
    const detectedChapters: TOCEntry[] = [
      { id: '1', label: 'Capitolo Uno', href: 'chapter1.xhtml' },
      { id: '2', label: 'Capitolo Due', href: 'chapter2.xhtml' }
    ]
    const onDetectChapters = vi.fn().mockResolvedValue(detectedChapters)

    render(
      <EditMetadataModal
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDetectChapters={onDetectChapters}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /sistema indice/i }))

    await waitFor(() => {
      expect(onDetectChapters).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('2 capitoli rilevati')).toBeInTheDocument()
    expect(screen.getByText('Capitolo Uno')).toBeInTheDocument()
    expect(screen.getByText('Capitolo Due')).toBeInTheDocument()
  })

  it('shows an empty-state message when no chapters are found', async () => {
    const onDetectChapters = vi.fn().mockResolvedValue([])

    render(
      <EditMetadataModal
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDetectChapters={onDetectChapters}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /sistema indice/i }))

    await waitFor(() => {
      expect(onDetectChapters).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('Nessun capitolo rilevato nel file.')).toBeInTheDocument()
  })

  it('applies automatic calibration results to metadata and toc preview', async () => {
    const onAutoCalibrate = vi.fn().mockResolvedValue({
      updates: {
        title: 'Titolo calibrato',
        author: 'Autore calibrato',
        publisher: 'Editore Test',
        publishedDate: '1980',
        metadataSource: 'google',
        tocOverride: [{ id: '1', label: 'Capitolo calibrato', href: 'chapter1.xhtml' }]
      },
      toc: [{ id: '1', label: 'Capitolo calibrato', href: 'chapter1.xhtml' }],
      bestMetadataFound: true
    })

    render(
      <EditMetadataModal
        isOpen={true}
        book={baseBook}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onAutoCalibrate={onAutoCalibrate}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /calibra/i }))

    await waitFor(() => {
      expect(onAutoCalibrate).toHaveBeenCalledWith({
        title: 'Libro di test',
        author: 'Autore di test'
      })
    })

    expect(await screen.findByDisplayValue('Titolo calibrato')).toBeInTheDocument()
    expect(screen.getByText('Fonte metadati: Google Books')).toBeInTheDocument()
    expect(screen.getByText('Editore: Editore Test')).toBeInTheDocument()
    expect(screen.getByText('Capitolo calibrato')).toBeInTheDocument()
  })
})
