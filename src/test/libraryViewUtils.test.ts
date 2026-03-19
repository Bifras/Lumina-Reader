import { describe, expect, it } from 'vitest'
import type { Book } from '../types'
import { getLastReadBook, sortAndGroupBooks } from '../views/libraryViewUtils'

function makeBook(overrides: Partial<Book>): Book {
  return {
    id: overrides.id || 'id',
    title: overrides.title || 'Title',
    author: overrides.author,
    progress: overrides.progress ?? 0,
    addedAt: overrides.addedAt ?? 0,
    lastOpened: overrides.lastOpened,
    cfi: overrides.cfi,
    cover: overrides.cover,
    collection: overrides.collection,
    genre: overrides.genre,
    rating: overrides.rating,
  }
}

describe('libraryViewUtils', () => {
  it('getLastReadBook returns undefined when no in-progress books', () => {
    const books = [
      makeBook({ id: 'a', progress: 0 }),
      makeBook({ id: 'b', progress: 100 }),
    ]

    expect(getLastReadBook(books)).toBeUndefined()
  })

  it('getLastReadBook picks most recent in-progress using lastOpened fallback to addedAt', () => {
    const books = [
      makeBook({ id: 'a', progress: 50, addedAt: 100 }),
      makeBook({ id: 'b', progress: 40, addedAt: 90, lastOpened: 200 }),
      makeBook({ id: 'c', progress: 30, addedAt: 300 }),
    ]

    expect(getLastReadBook(books)?.id).toBe('c')
  })

  it('sortAndGroupBooks sorts by recent with addedAt fallback', () => {
    const books = [
      makeBook({ id: 'a', title: 'A', addedAt: 100, lastOpened: 120 }),
      makeBook({ id: 'b', title: 'B', addedAt: 300 }),
      makeBook({ id: 'c', title: 'C', addedAt: 200, lastOpened: 50 }),
    ]

    const grouped = sortAndGroupBooks(books, 'recent', 'desc', 'none')
    expect(grouped.ungrouped.map(book => book.id)).toEqual(['b', 'a', 'c'])
  })

  it('sortAndGroupBooks groups by author with fallback label', () => {
    const books = [
      makeBook({ id: 'a', title: 'A', author: 'Zeta' }),
      makeBook({ id: 'b', title: 'B' }),
      makeBook({ id: 'c', title: 'C', author: 'Zeta' }),
    ]

    const grouped = sortAndGroupBooks(books, 'title', 'asc', 'author')
    expect(Object.keys(grouped)).toContain('Zeta')
    expect(Object.keys(grouped)).toContain('Sconosciuto')
    expect(grouped.Zeta.map(book => book.id)).toEqual(['a', 'c'])
    expect(grouped.Sconosciuto.map(book => book.id)).toEqual(['b'])
  })
})
