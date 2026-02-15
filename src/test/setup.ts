/**
 * Vitest setup file
 * Configures the testing environment with React Testing Library and global mocks
 */

import { afterEach, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Extend Vitest's expect with jest-dom matchers manually
import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

const { localforageStore } = vi.hoisted(() => ({
  localforageStore: new Map<string, unknown>()
}))

expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
  localforageStore.clear()
})

// Mock window.matchMedia for responsive queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock IndexedDB (localforage)
vi.mock('localforage', () => {
  const localforageMock = {
    getItem: vi.fn((key: string) => Promise.resolve(localforageStore.has(key) ? localforageStore.get(key) : null)),
    setItem: vi.fn((key: string, value: unknown) => {
      localforageStore.set(key, value)
      return Promise.resolve(value)
    }),
    removeItem: vi.fn((key: string) => {
      localforageStore.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      localforageStore.clear()
      return Promise.resolve()
    }),
    length: vi.fn(() => Promise.resolve(localforageStore.size)),
    key: vi.fn((index: number) => Promise.resolve(Array.from(localforageStore.keys())[index] ?? null)),
    keys: vi.fn(() => Promise.resolve(Array.from(localforageStore.keys()))),
    config: vi.fn(),
  }

  return { default: localforageMock }
})

// Mock Electron API
global.window.electronAPI = {
  getBookServerPort: vi.fn(() => Promise.resolve(8080)),
  saveBookFile: vi.fn(() => Promise.resolve()),
  deleteBookFile: vi.fn(() => Promise.resolve()),
  openBookDialog: vi.fn(() => Promise.resolve(null)),
  getBooksPath: vi.fn(() => Promise.resolve('/mock/path')),
}

// Mock epubjs
vi.mock('epubjs', () => ({
  default: vi.fn(() => ({
    ready: Promise.resolve(),
    loaded: {
      metadata: Promise.resolve({ title: 'Test Book', creator: 'Test Author' }),
      navigation: Promise.resolve({ toc: [] }),
      cover: Promise.resolve(null),
    },
    spine: {
      spineItems: [],
    },
    locations: {
      generate: vi.fn(() => Promise.resolve()),
      cfiFromPercentage: vi.fn(() => 'epubcfi(/6/4)'),
      percentageFromCfi: vi.fn(() => 0.5),
    },
    destroy: vi.fn(),
  })),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
})) as any

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any

// Suppress console errors in tests (optional - remove when debugging)
const originalError = console.error
beforeEach(() => {
  console.error = (...args: any[]) => {
    const msg = args[0]
    if (
      typeof msg === 'string' &&
      (msg.includes('Warning:') || msg.includes('Not implemented:'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})
