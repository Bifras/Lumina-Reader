import { describe, expect, it } from 'vitest'
import { resolveRestoredCollectionId } from '../components/collectionSidebarUtils'

describe('resolveRestoredCollectionId', () => {
  it('returns all when lastFilter is empty', () => {
    expect(resolveRestoredCollectionId('', ['all', 'favorites'])).toBe('all')
  })

  it('returns all when lastFilter is invalid', () => {
    expect(resolveRestoredCollectionId('missing-id', ['all', 'favorites'])).toBe('all')
  })

  it('returns saved id when valid', () => {
    expect(resolveRestoredCollectionId('favorites', ['all', 'favorites', 'custom-1'])).toBe('favorites')
  })

  it('keeps all when explicitly saved', () => {
    expect(resolveRestoredCollectionId('all', ['all', 'favorites'])).toBe('all')
  })
})
