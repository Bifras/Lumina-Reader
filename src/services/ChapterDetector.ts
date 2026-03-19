import type { TOCEntry } from '../types'

interface DetectedChapter {
  label: string
  href: string
  level: number
  order: number
}

export class ChapterDetector {
  /**
   * Scan an EPUB's spine sections and detect chapters from heading elements.
   * Returns a cleaned, hierarchical TOCEntry array.
   */
  static async detectChapters(book: any): Promise<TOCEntry[]> {
    await book.ready
    const spineItems = book?.spine?.items || book?.spine?.spineItems || []
    if (!spineItems || spineItems.length === 0) return []

    const rawChapters: DetectedChapter[] = []
    let order = 0

    const scanPromises = spineItems.map(async (item: any) => {
      try {
        const doc = await item.load(book)
        if (!doc?.body) {
          item.unload?.()
          return
        }

        const headings = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headings.forEach((el: Element) => {
          const text = this.cleanLabel(el.textContent || '')
          if (!text || text.length < 2) return
          if (this.isNoise(text)) return

          const level = parseInt(el.tagName[1], 10)
          rawChapters.push({
            label: text,
            href: item.href || '',
            level,
            order: order++
          })
        })

        // Fallback: if no headings, check for chapter-like divs
        if (headings.length === 0) {
          const chapterEls = doc.body.querySelectorAll(
            '[class*="chapter"], [id*="chapter"], [class*="title"], [id*="title"]'
          )
          chapterEls.forEach((el: Element) => {
            const text = this.cleanLabel(el.textContent || '')
            if (!text || text.length < 2 || this.isNoise(text)) return
            rawChapters.push({
              label: text,
              href: item.href || '',
              level: 1,
              order: order++
            })
          })
        }

        item.unload?.()
      } catch {
        item.unload?.()
      }
    })

    await Promise.all(scanPromises)

    // Sort by spine order
    rawChapters.sort((a, b) => a.order - b.order)

    // Deduplicate: keep first occurrence per href, merge same-title entries
    const seen = new Map<string, DetectedChapter>()
    for (const ch of rawChapters) {
      const key = `${ch.href}::${ch.label}`
      if (!seen.has(key)) {
        seen.set(key, ch)
      }
    }

    const unique = Array.from(seen.values())

    // If we found very few chapters from headings, try spine filenames as fallback
    if (unique.length < 2 && spineItems.length > 2) {
      for (const item of spineItems) {
        const name = this.labelFromFilename(item.href)
        if (name && !seen.has(`${item.href}::${name}`)) {
          unique.push({ label: name, href: item.href, level: 1, order: unique.length })
        }
      }
    }

    // Build hierarchical TOC
    return this.buildHierarchy(unique)
  }

  /**
   * Detect chapters from an ArrayBuffer (EPUB file) by parsing the zip
   * and scanning HTML content for headings. No epubjs needed.
   */
  static async detectFromFile(buffer: ArrayBuffer): Promise<TOCEntry[]> {
    try {
      const zip = await this.loadZip(buffer)

      const opfPath = await this.findOPF(zip)
      if (!opfPath) return []

      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
      const spineRefs = await this.parseSpine(zip, opfPath)

      const rawChapters: DetectedChapter[] = []
      let order = 0

      for (const ref of spineRefs) {
        const href = ref.startsWith('http') ? ref : opfDir + ref
        const html = zip[href]
        if (!html) continue

        const headings = this.extractHeadings(html)
        for (const { level, label } of headings) {
          rawChapters.push({ label, href: ref, level, order: order++ })
        }
      }

      // Fallback: use spine filenames if no headings found
      if (rawChapters.length < 2 && spineRefs.length > 2) {
        for (const ref of spineRefs) {
          const name = this.labelFromFilename(ref)
          if (name) {
            rawChapters.push({ label: name, href: ref, level: 1, order: rawChapters.length })
          }
        }
      }

      return this.buildHierarchy(rawChapters)
    } catch (e) {
      console.warn('[ChapterDetector] detectFromFile error:', e)
      return []
    }
  }

  /**
   * Parse an EPUB ArrayBuffer into a filename→content map using the browser's Blob/Response APIs.
   */
  private static async loadZip(buffer: ArrayBuffer): Promise<Record<string, string>> {
    const entries: Record<string, string> = {}
    const view = new DataView(buffer)

    // Find end of central directory signature (0x06054b50)
    let eocdOffset = -1
    for (let i = buffer.byteLength - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i
        break
      }
    }
    if (eocdOffset < 0) {
      console.warn('[ChapterDetector] EOCD signature not found, buffer size:', buffer.byteLength)
      return entries
    }

    const centralDirSize = view.getUint32(eocdOffset + 12, true)
    const centralDirOffset = view.getUint32(eocdOffset + 16, true)

    let pos = centralDirOffset
    const dirEnd = centralDirOffset + centralDirSize
    let entryCount = 0

    while (pos < dirEnd) {
      if (view.getUint32(pos, true) !== 0x02014b50) break
      entryCount++

      const compMethod = view.getUint16(pos + 10, true)
      const compSize = view.getUint32(pos + 20, true)
      const uncompSize = view.getUint32(pos + 24, true)
      const nameLen = view.getUint16(pos + 28, true)
      const extraLen = view.getUint16(pos + 30, true)
      const commentLen = view.getUint16(pos + 32, true)
      const localHeaderOffset = view.getUint32(pos + 42, true)

      const nameBytes = new Uint8Array(buffer, pos + 46, nameLen)
      const name = new TextDecoder().decode(nameBytes)

      if (/\.(html|xhtml|htm|opf|ncx|xml)$/i.test(name)) {
        // Read local file header to get data offset
        if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
          pos += 46 + nameLen + extraLen + commentLen
          continue
        }

        const localNameLen = view.getUint16(localHeaderOffset + 26, true)
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
        const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen

        if (compMethod === 0) {
          // Stored (no compression)
          const data = new Uint8Array(buffer, dataOffset, uncompSize)
          entries[name] = new TextDecoder().decode(data)
        } else if (compMethod === 8) {
          // Deflate
          try {
            const compData = new Uint8Array(buffer, dataOffset, compSize)
            const ds = new DecompressionStream('deflate-raw')
            const writer = ds.writable.getWriter()
            await writer.write(compData)
            await writer.close()
            const reader = ds.readable.getReader()
            const chunks: Uint8Array[] = []
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              chunks.push(value)
            }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0)
            const result = new Uint8Array(totalLen)
            let off = 0
            for (const chunk of chunks) { result.set(chunk, off); off += chunk.length }
            entries[name] = new TextDecoder().decode(result)
          } catch (e) {
            console.warn(`[ChapterDetector] Deflate failed for ${name}:`, e)
          }
        }
      }

      pos += 46 + nameLen + extraLen + commentLen
    }

    return entries
  }

  private static async findOPF(zip: Record<string, string>): Promise<string | null> {
    // Look for container.xml to find OPF path
    const container = zip['META-INF/container.xml']
    if (container) {
      const match = container.match(/full-path=["']([^"']+)["']/)
      if (match) return match[1]
    }
    // Fallback: find any .opf file
    const keys = Object.keys(zip)
    return keys.find(k => k.endsWith('.opf')) || null
  }

  private static async parseSpine(zip: Record<string, string>, opfPath: string): Promise<string[]> {
    const opf = zip[opfPath]
    if (!opf) return []

    // Extract manifest items
    const manifestMap = new Map<string, string>()
    const manifestRe = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi
    let m
    while ((m = manifestRe.exec(opf)) !== null) {
      manifestMap.set(m[1], m[2])
    }

    // Extract spine itemrefs
    const spine: string[] = []
    const spineRe = /<itemref[^>]+idref=["']([^"']+)["'][^>]*>/gi
    while ((m = spineRe.exec(opf)) !== null) {
      const href = manifestMap.get(m[1])
      if (href) spine.push(href)
    }

    return spine
  }

  private static extractHeadings(html: string): { level: number; label: string }[] {
    const results: { level: number; label: string }[] = []
    const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const level = parseInt(m[1], 10)
      const raw = m[2].replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim()
      if (raw.length >= 2 && !this.isNoise(raw)) {
        results.push({ level, label: raw })
      }
    }
    return results
  }

  /**
   * Evaluate the quality of an existing TOC.
   * Returns a score from 0 (garbage) to 1 (perfect).
   */
  static evaluateTOC(toc: TOCEntry[]): { score: number; issues: string[] } {
    const issues: string[] = []

    if (toc.length === 0) return { score: 0, issues: ['Indice vuoto'] }

    let score = 1

    // Check for empty labels
    const emptyLabels = toc.filter(t => !t.label || t.label.trim().length === 0)
    if (emptyLabels.length > 0) {
      score -= 0.3
      issues.push(`${emptyLabels.length} voci senza etichetta`)
    }

    // Check for very long labels (likely full paragraphs, not titles)
    const longLabels = toc.filter(t => t.label && t.label.length > 80)
    if (longLabels.length > 0) {
      score -= 0.2
      issues.push(`${longLabels.length} etichette troppo lunghe`)
    }

    // Check for HTML artifacts in labels
    const htmlArtifacts = toc.filter(t => /<[^>]+>|&\w+;/.test(t.label || ''))
    if (htmlArtifacts.length > 0) {
      score -= 0.3
      issues.push(`${htmlArtifacts.length} etichette con residui HTML`)
    }

    // Check for inconsistent numbering
    const numbered = toc.filter(t => /^\d+[\.\)]\s/.test(t.label || ''))
    const roman = toc.filter(t => /^[IVXLC]+[\.\)]\s/i.test(t.label || ''))
    const both = numbered.length > 0 && roman.length > 0
    if (both && numbered.length + roman.length > toc.length * 0.5) {
      score -= 0.1
      issues.push('Numerazione mista (arabo/romano)')
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * Clean up an existing TOC by normalizing labels.
   */
  static cleanTOC(toc: TOCEntry[]): TOCEntry[] {
    return toc.map(entry => ({
      ...entry,
      label: this.cleanLabel(entry.label),
      subitems: entry.subitems ? this.cleanTOC(entry.subitems) : undefined
    })).filter(entry => entry.label.length > 0)
  }

  // --- Private helpers ---

  private static cleanLabel(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, '')         // strip HTML tags
      .replace(/&\w+;/g, '')           // strip HTML entities
      .replace(/\s+/g, ' ')            // normalize whitespace
      .replace(/^[\s\-–—•·\d\.\)]+/g, '') // strip leading numbers/dashes/dots
      .replace(/[\s\-–—•·]+$/g, '')    // strip trailing dashes/dots
      .trim()
  }

  private static isNoise(text: string): boolean {
    const lower = text.toLowerCase().trim()
    // Filter out common non-chapter headings
    const noisePatterns = [
      /^table of contents?$/i,
      /^indice$/i,
      /^copyright$/i,
      /^dedicat/i,
      /^acknowledg/i,
      /^prefac[ei]/i,
      /^about the author/i,
      /^note dell/i,
      /^ringraziament/i,
      /^\d+$/,           // just a number
      /^.{1}$/,           // single char
    ]
    return noisePatterns.some(p => p.test(lower))
  }

  private static labelFromFilename(href: string): string | null {
    if (!href) return null
    const filename = href.split('/').pop()?.split('#')[0]?.split('?')[0] || ''
    const name = filename.replace(/\.\w+$/, '') // remove extension
    if (!name || name.length < 2) return null

    // Try to extract a meaningful name
    // e.g., "chapter01", "Chapter_1", "03-the-beginning"
    const cleaned = name
      .replace(/[-_]/g, ' ')
      .replace(/^(\d+)\s*/, 'Capitolo $1 — ')
      .replace(/\b\w/g, c => c.toUpperCase())

    return cleaned
  }

  private static buildHierarchy(chapters: DetectedChapter[]): TOCEntry[] {
    if (chapters.length === 0) return []

    // If all same level, return flat
    const allSameLevel = chapters.every(c => c.level === chapters[0].level)
    if (allSameLevel) {
      return chapters.map((c, i) => ({
        id: String(i + 1),
        label: c.label,
        href: c.href
      }))
    }

    // Build hierarchy: h1 = top level, h2/h3 = subitems
    const result: TOCEntry[] = []
    const stack: { entry: TOCEntry; level: number }[] = []

    for (const ch of chapters) {
      const entry: TOCEntry = {
        id: String(ch.order + 1),
        label: ch.label,
        href: ch.href
      }

      // Pop stack until we find a parent with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= ch.level) {
        stack.pop()
      }

      if (stack.length === 0) {
        result.push(entry)
      } else {
        const parent = stack[stack.length - 1].entry
        if (!parent.subitems) parent.subitems = []
        parent.subitems.push(entry)
      }

      stack.push({ entry, level: ch.level })
    }

    return result
  }
}
