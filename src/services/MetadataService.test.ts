import { describe, expect, it } from 'vitest'

import { MetadataService, type WebMetadata } from './MetadataService'

describe('MetadataService.pickBestMatch', () => {
  it('prefers the closest title and author match', () => {
    const results: WebMetadata[] = [
      {
        title: 'Completely Different Book',
        author: 'Other Author',
        source: 'google'
      },
      {
        title: 'Il Nome della Rosa',
        author: 'Umberto Eco',
        source: 'openlibrary'
      },
      {
        title: 'Il Nome della Rosa (Illustrated Edition)',
        author: 'Someone Else',
        source: 'itunes'
      }
    ]

    const best = MetadataService.pickBestMatch('Il Nome della Rosa', 'Umberto Eco', results)

    expect(best).toMatchObject({
      title: 'Il Nome della Rosa',
      author: 'Umberto Eco',
      source: 'openlibrary'
    })
  })
})
