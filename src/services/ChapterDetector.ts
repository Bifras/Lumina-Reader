import type { TOCEntry } from '../types'

interface DetectedChapter {
  label: string
  href: string
  level: number
  order: number
}

const HEADING_RE = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi
const ITEM_RE = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi
const ITEM_RE2 = /<item[^>]+href=["']([^"']+)["'][^>]+id=["']([^"']+)["']/gi
const REF_RE = /<itemref[^>]+idref=["']([^"']+)["']/gi

const CLEAN_RE_1 = /<[^>]+>/g
const CLEAN_RE_2 = /&\w+;/g
const CLEAN_RE_3 = /\s+/g
const CLEAN_RE_4 = /^[\s\-–—•·\d.)]+/
const CLEAN_RE_5 = /[\s\-–—•·]+$/

const HTML_ARTIFACTS_RE = /<[^>]+>|&\w+;/

const NOISE_RE = /^(table of contents?|indice|copyright|dedicat.*|acknowledg.*|prefac[ei].*|about the author.*|note dell.*|ringraziament.*|\d+|.{1})$/i

export class ChapterDetector {
  /**
   * Scan an epubjs book instance for chapters from heading elements.
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
        if (!doc?.body) { item.unload?.(); return }

        const headings = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headings.forEach((el: Element) => {
          const text = this.cleanLabel(el.textContent || '')
          if (!text || text.length < 2 || this.isNoise(text)) return
          rawChapters.push({ label: text, href: item.href || '', level: parseInt(el.tagName[1], 10), order: order++ })
        })

        if (headings.length === 0) {
          doc.body.querySelectorAll('[class*="chapter"], [id*="chapter"], [class*="title"], [id*="title"]')
            .forEach((el: Element) => {
              const text = this.cleanLabel(el.textContent || '')
              if (!text || text.length < 2 || this.isNoise(text)) return
              rawChapters.push({ label: text, href: item.href || '', level: 1, order: order++ })
            })
        }

        item.unload?.()
      } catch { item.unload?.() }
    })

    await Promise.all(scanPromises)
    rawChapters.sort((a, b) => a.order - b.order)

    const seen = new Map<string, DetectedChapter>()
    for (const ch of rawChapters) {
      const key = `${ch.href}::${ch.label}`
      if (!seen.has(key)) seen.set(key, ch)
    }
    const unique = Array.from(seen.values())

    if (unique.length < 2 && spineItems.length > 2) {
      for (const item of spineItems) {
        const name = this.labelFromFilename(item.href)
        if (name && !seen.has(`${item.href}::${name}`)) {
          unique.push({ label: name, href: item.href, level: 1, order: unique.length })
        }
      }
    }

    return this.buildHierarchy(unique)
  }

  /**
   * Detect chapters by parsing an EPUB file directly (ArrayBuffer).
   */
  static async detectFromFile(buffer: ArrayBuffer): Promise<TOCEntry[]> {
    try {
      const zip = await this.loadZip(buffer)
      const opfPath = this.findOPF(zip)
      if (!opfPath) return []

      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
      const spineRefs = this.parseSpine(zip, opfPath)

      const rawChapters: DetectedChapter[] = []
      let order = 0

      for (const ref of spineRefs) {
        const href = ref.startsWith('http') ? ref : opfDir + ref
        const html = zip[href]
        if (!html) continue

        for (const { level, label } of this.extractHeadings(html)) {
          rawChapters.push({ label, href: ref, level, order: order++ })
        }
      }

      if (rawChapters.length < 2 && spineRefs.length > 2) {
        for (const ref of spineRefs) {
          const name = this.labelFromFilename(ref)
          if (name) rawChapters.push({ label: name, href: ref, level: 1, order: rawChapters.length })
        }
      }

      return this.buildHierarchy(rawChapters)
    } catch (e) {
      console.warn('[ChapterDetector] error:', e)
      return []
    }
  }

  // --- ZIP parsing ---

  private static async loadZip(buffer: ArrayBuffer): Promise<Record<string, string>> {
    const entries: Record<string, string> = {}
    const view = new DataView(buffer)
    const len = buffer.byteLength

    // Find EOCD (search last 64KB, not the whole file)
    const searchStart = Math.max(0, len - 65557) // max comment size 65535 + 22
    let eocd = -1
    for (let i = len - 22; i >= searchStart; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
    }
    if (eocd < 0) return entries

    const cdSize = view.getUint32(eocd + 12, true)
    const cdOffset = view.getUint32(eocd + 16, true)

    // Parse central directory
    let pos = cdOffset
    const cdEnd = cdOffset + cdSize

    while (pos < cdEnd - 4) {
      if (view.getUint32(pos, true) !== 0x02014b50) break

      const method = view.getUint16(pos + 10, true)
      const compSize = view.getUint32(pos + 20, true)
      const uncompSize = view.getUint32(pos + 24, true)
      const nameLen = view.getUint16(pos + 28, true)
      const extraLen = view.getUint16(pos + 30, true)
      const commentLen = view.getUint16(pos + 32, true)
      const localOff = view.getUint32(pos + 42, true)

      const name = new TextDecoder().decode(new Uint8Array(buffer, pos + 46, nameLen))

      if (/\.(html|xhtml|htm|opf|ncx)$/i.test(name) && localOff + 30 < len) {
        const lNameLen = view.getUint16(localOff + 26, true)
        const lExtraLen = view.getUint16(localOff + 28, true)
        const dataOff = localOff + 30 + lNameLen + lExtraLen

        try {
          if (method === 0) {
            entries[name] = new TextDecoder().decode(new Uint8Array(buffer, dataOff, uncompSize))
          } else if (method === 8) {
            entries[name] = await this.inflate(buffer, dataOff, compSize)
          }
        } catch {
          // Ignore inflation errors
        }
      }

      pos += 46 + nameLen + extraLen + commentLen
    }

    return entries
  }

  private static async inflate(buffer: ArrayBuffer, offset: number, size: number): Promise<string> {
    const src = new Uint8Array(buffer, offset, size)
    const data = new Uint8Array(src) // copy to avoid SharedArrayBuffer issues

    // Try both deflate-raw and deflate with timeout
    for (const format of ['deflate-raw', 'deflate'] as const) {
      try {
        const result = await Promise.race([
          this.doInflate(data, format),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
        if (result !== null) return result
      } catch {
        // Ignore format inflation error, try next
      }
    }

    return ''
  }

  private static async doInflate(data: Uint8Array, format: 'deflate-raw' | 'deflate'): Promise<string> {
    const ds = new DecompressionStream(format)
    const writer = ds.writable.getWriter()
    const ab = new ArrayBuffer(data.byteLength)
    new Uint8Array(ab).set(data)
    await writer.write(ab)
    await writer.close()
    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const total = chunks.reduce((s, c) => s + c.length, 0)
    const result = new Uint8Array(total)
    let off = 0
    for (const c of chunks) { result.set(c, off); off += c.length }
    return new TextDecoder().decode(result)
  }

  // --- OPF / Spine ---

  private static findOPF(zip: Record<string, string>): string | null {
    const container = zip['META-INF/container.xml']
    if (container) {
      const m = container.match(/full-path=["']([^"']+)["']/)
      if (m) return m[1]
    }
    return Object.keys(zip).find(k => k.endsWith('.opf')) || null
  }

  private static parseSpine(zip: Record<string, string>, opfPath: string): string[] {
    const opf = zip[opfPath]
    if (!opf) return []

    const manifest = new Map<string, string>()
    let m
    ITEM_RE.lastIndex = 0
    while ((m = ITEM_RE.exec(opf)) !== null) manifest.set(m[1], m[2])

    // Also match reversed attribute order
    ITEM_RE2.lastIndex = 0
    while ((m = ITEM_RE2.exec(opf)) !== null) manifest.set(m[2], m[1])

    const spine: string[] = []
    REF_RE.lastIndex = 0
    while ((m = REF_RE.exec(opf)) !== null) {
      const href = manifest.get(m[1])
      if (href) spine.push(href)
    }
    return spine
  }

  // --- Heading extraction ---

  private static extractHeadings(html: string): { level: number; label: string }[] {
    const results: { level: number; label: string }[] = []
    HEADING_RE.lastIndex = 0
    let m
    while ((m = HEADING_RE.exec(html)) !== null) {
      const raw = this.cleanLabel(m[2])
      if (raw.length >= 2 && !this.isNoise(raw)) {
        results.push({ level: parseInt(m[1], 10), label: raw })
      }
    }
    return results
  }

  // --- TOC evaluation & cleaning ---

  static evaluateTOC(toc: TOCEntry[]): { score: number; issues: string[] } {
    const issues: string[] = []
    if (toc.length === 0) return { score: 0, issues: ['Indice vuoto'] }

    let score = 1
    const emptyLabels = toc.filter(t => !t.label?.trim())
    if (emptyLabels.length) { score -= 0.3; issues.push(`${emptyLabels.length} voci senza etichetta`) }

    const longLabels = toc.filter(t => t.label?.length > 80)
    if (longLabels.length) { score -= 0.2; issues.push(`${longLabels.length} etichette troppo lunghe`) }

    const htmlArtifacts = toc.filter(t => HTML_ARTIFACTS_RE.test(t.label || ''))
    if (htmlArtifacts.length) { score -= 0.3; issues.push(`${htmlArtifacts.length} etichette con residui HTML`) }

    return { score: Math.max(0, score), issues }
  }

  static cleanTOC(toc: TOCEntry[]): TOCEntry[] {
    return toc.map(e => ({
      ...e,
      label: this.cleanLabel(e.label),
      subitems: e.subitems ? this.cleanTOC(e.subitems) : undefined
    })).filter(e => e.label.length > 0)
  }

  // --- Helpers ---

  private static cleanLabel(raw: string): string {
    return raw
      .replace(CLEAN_RE_1, '')
      .replace(CLEAN_RE_2, ' ')
      .replace(CLEAN_RE_3, ' ')
      .replace(CLEAN_RE_4, '')
      .replace(CLEAN_RE_5, '')
      .trim()
  }

  private static isNoise(text: string): boolean {
    return NOISE_RE.test(text.trim())
  }

  private static labelFromFilename(href: string): string | null {
    if (!href) return null
    const name = (href.split('/').pop()?.split('#')[0] || '').replace(/\.\w+$/, '')
    if (name.length < 2) return null
    return name
      .replace(/[-_]/g, ' ')
      .replace(/^(\d+)\s*/, 'Capitolo $1 — ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  private static buildHierarchy(chapters: DetectedChapter[]): TOCEntry[] {
    if (chapters.length === 0) return []
    return chapters.map((c, i) => ({ id: String(i + 1), label: c.label, href: c.href }))
  }
}
