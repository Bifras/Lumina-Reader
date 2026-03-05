import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import BookCard from '../components/BookCard'
import type { Book } from '../types'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, initial, animate, exit, transition, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}))

describe('BookCard keyboard interaction', () => {
  const baseBook: Book = {
    id: 'book-1',
    title: 'Book One',
    progress: 10,
    addedAt: Date.now(),
  }

  it('activates the card on Enter when the card itself has focus', () => {
    const onClick = vi.fn()

    render(
      <BookCard
        book={baseBook}
        onClick={onClick}
        onDelete={vi.fn()}
      />
    )

    const card = document.querySelector('.book-card') as HTMLDivElement
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not activate the card when Enter comes from nested controls', () => {
    const onClick = vi.fn()

    render(
      <BookCard
        book={baseBook}
        onClick={onClick}
        onDelete={vi.fn()}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /elimina/i })
    fireEvent.keyDown(deleteButton, { key: 'Enter' })

    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('BookCard visual elements', () => {
  it('renders tags and genre if they exist', () => {
    const bookWithTags: Book & { tags?: { id: string; name: string }[] } = {
      id: 'book-1',
      title: 'Book One',
      progress: 10,
      addedAt: Date.now(),
      genre: 'Sci-Fi',
      tags: [{ id: 't1', name: 'Must Read' }]
    }

    render(
      <BookCard
        book={bookWithTags as Book}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
    expect(screen.getByText('Must Read')).toBeInTheDocument()
  })
})
