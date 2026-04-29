import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ChapterDetector } from '../services/ChapterDetector'

function toArrayBuffer(buffer: Buffer<ArrayBufferLike>): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

describe('ChapterDetector.detectFromFile', () => {
  it('extracts the sample TOC from the verification EPUB', async () => {
    const epubBuffer = readFileSync(resolve(process.cwd(), 'tests', 'test.epub'))

    const chapters = await ChapterDetector.detectFromFile(toArrayBuffer(epubBuffer))

    expect(chapters).toHaveLength(1)
    expect(chapters[0]).toMatchObject({
      id: '1',
      label: 'Chapter 1: The Beginning',
      href: 'chapter1.xhtml'
    })
  })
})
