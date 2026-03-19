import type { GroupByOption, SortOption } from '../store/useLibrarySettingsStore'
import type { Book } from '../types'

export type SortDirection = 'asc' | 'desc'
export type GroupedBooks = Record<string, Book[]>

const getRecentValue = (book: Book): number => book.lastOpened ?? book.addedAt ?? 0

export function getLastReadBook(library: Book[]): Book | undefined {
  const inProgress = library.filter(book => book.progress > 0 && book.progress < 100)
  if (inProgress.length === 0) {
    return undefined
  }

  return inProgress.sort((a, b) => getRecentValue(b) - getRecentValue(a))[0]
}

export function sortAndGroupBooks(
  books: Book[],
  sortBy: SortOption,
  sortDirection: SortDirection,
  groupBy: GroupByOption,
): GroupedBooks {
  const sorted = [...books]

  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => sortDirection === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title),
      )
      break
    case 'author':
      sorted.sort((a, b) => {
        const authorA = a.author || ''
        const authorB = b.author || ''
        return sortDirection === 'asc'
          ? authorA.localeCompare(authorB)
          : authorB.localeCompare(authorA)
      })
      break
    case 'progress':
      sorted.sort((a, b) => sortDirection === 'asc'
        ? a.progress - b.progress
        : b.progress - a.progress,
      )
      break
    case 'added':
      sorted.sort((a, b) => sortDirection === 'asc'
        ? (a.addedAt || 0) - (b.addedAt || 0)
        : (b.addedAt || 0) - (a.addedAt || 0),
      )
      break
    case 'recent':
    default:
      sorted.sort((a, b) => sortDirection === 'asc'
        ? getRecentValue(a) - getRecentValue(b)
        : getRecentValue(b) - getRecentValue(a),
      )
      break
  }

  if (groupBy === 'none') {
    return { ungrouped: sorted }
  }

  const grouped: GroupedBooks = {}
  sorted.forEach(book => {
    let key = ''
    switch (groupBy) {
      case 'author':
        key = book.author || 'Sconosciuto'
        break
      case 'genre':
        key = book.genre || 'Senza genere'
        break
      case 'collection':
        key = book.collection || 'Nessuna collezione'
        break
      default:
        key = 'Tutti'
        break
    }

    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(book)
  })

  return grouped
}
