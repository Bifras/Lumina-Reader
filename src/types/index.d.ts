/**
 * Core type definitions for Lumina Reader
 */

/**
 * Book metadata stored in IndexedDB
 */
export interface Book {
  id: string
  title: string
  author?: string
  cover?: string
  cfi?: string // EPUB CFI (Canonical Fragment Identifier) for current position
  progress: number // Reading progress 0-100
  addedAt: number
  isFavorite?: boolean
}

/**
 * Collection types
 */
export type CollectionType = 'smart' | 'custom'

/**
 * Smart collection IDs
 */
export type SmartCollectionId = 'all' | 'reading' | 'finished' | 'unread' | 'favorites'

/**
 * Collection structure
 */
export interface Collection {
  id: string
  name: string
  type: CollectionType
  icon: string
  isDefault?: boolean
  color?: string
  createdAt?: number
}

/**
 * Bookmark structure
 */
export interface Bookmark {
  id: string
  cfi: string
  label: string
  createdAt?: number
}

/**
 * Highlight structure
 */
export interface Highlight {
  id: string
  cfi: string
  text: string
  color?: string
  note?: string
  createdAt?: number
}

/**
 * Table of Contents entry
 */
export interface TOCEntry {
  id: string
  label: string
  href: string
  subitems?: TOCEntry[]
}

/**
 * Search result
 */
export interface SearchResult {
  cfi: string
  text: string
  chapter?: string
}

/**
 * EPUB rendition instance (from epub.js)
 */
export interface Rendition {
  display(location: string): void
  next(): void
  prev(): void
  on(eventName: string, handler: (...args: any[]) => void): void
  off(eventName: string, handler?: (...args: any[]) => void): void
  themes: {
    font(value: string): void
    fontSize(value: string): void
  }
}

/**
 * EPUB book instance (from epub.js)
 */
export interface BookEngine {
  destroyed: boolean
  locations: {
    generate(count?: number): Promise<void>
    cfiFromPercentage(percent: number): string
  }
  ready: Promise<void>
  destroy(): void
}

/**
 * Reading theme
 */
export interface Theme {
  name: string
  body: {
    background: string
    color: string
  }
}

/**
 * Font option
 */
export interface FontOption {
  id: string
  name: string
  family: string
  desc: string
}

/**
 * Toast notification
 */
export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  duration?: number
}
