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
  lastOpened?: number // Timestamp of last read
  isFavorite?: boolean
  collectionIds?: string[]
  collection?: string // Primary collection name
  genre?: string // Book genre/category
  rating?: number // User rating 0-5 stars
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
  level?: number
}

/**
 * Search result
 */
export interface SearchResult {
  cfi: string
  snippet: string
  href: string
}

/**
 * Extended rendition type with all methods used
 */
export interface ExtendedRendition {
  display(location: string): void
  next(): void
  prev(): void
  on(eventName: string, handler: (...args: any[]) => void): void
  off(eventName: string, handler?: (...args: any[]) => void): void
  themes: {
    font(value: string): void
    fontSize(value: string): void
    register(name: string, theme: any): void
    select(name: string): void
    override(prop: string, value: string, important: boolean): void
  }
  annotations: {
    add(type: string, cfi: string, options: any, callback: () => void, className: string, styles: { fill: string; 'fill-opacity': string }): void
    clear(): void
  }
  getContents: () => any[]
  getRange: (range: Range) => string
  currentLocation: () => { 
    start: { 
      cfi: string; 
      displayed?: { page?: number } 
    } 
  }
}

/**
 * Simplified rendition type for ReaderView props
 */
export interface ReaderViewRenditionType {
  display(location: string): void
  next(): void
  prev(): void
  themes: {
    override(prop: string, value: string, important: boolean): void
    select(name: string): void
    fontSize(value: string): void
  }
}

/**
 * EPUB book instance (from epub.js)
 */
export interface BookEngine {
  destroyed: boolean
  spine: any
  locations: {
    generate(count?: number): Promise<void>
    cfiFromPercentage(percent: number): string
    percentageFromCfi(cfi: string): number
  }
  ready: Promise<void>
  destroy(): void
  loaded: {
    metadata: Promise<any>
    navigation: Promise<any>
    cover: Promise<any>
  }
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
  category: 'serif' | 'sans-serif' | 'accessibility' | 'monospace'
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