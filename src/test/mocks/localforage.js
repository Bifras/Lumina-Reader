// Mock for localforage
import { vi } from 'vitest'

// In-memory storage for testing
const storage = new Map()

const createMockLocalforage = () => ({
  getItem: vi.fn((key) => {
    return Promise.resolve(storage.get(key))
  }),
  setItem: vi.fn((key, value) => {
    storage.set(key, value)
    return Promise.resolve(value)
  }),
  removeItem: vi.fn((key) => {
    storage.delete(key)
    return Promise.resolve()
  }),
  clear: vi.fn(() => {
    storage.clear()
    return Promise.resolve()
  }),
  keys: vi.fn(() => {
    return Promise.resolve(Array.from(storage.keys()))
  }),
  length: vi.fn(() => {
    return Promise.resolve(storage.size)
  }),
  iterate: vi.fn((iteratorCallback) => {
    return Promise.resolve(
      Array.from(storage.entries()).map(([key, value]) => iteratorCallback(value, key, storage.size))
    )
  }),
  // Localforage configuration
  setDriver: vi.fn(() => Promise.resolve()),
  config: vi.fn((options) => {
    // Store config if needed for tests
    return options
  }),
  ready: vi.fn(() => Promise.resolve()),
  createInstance: vi.fn(() => {
    return createMockLocalforage()
  })
})

export const mockLocalforage = () => {
  const mock = createMockLocalforage()
  global.localforage = mock
  global.mockStorage = storage

  return mock
}

// Helper to reset storage between tests
export const resetStorage = () => {
  storage.clear()
}

// Helper to seed storage for tests
export const seedStorage = (data) => {
  Object.entries(data).forEach(([key, value]) => {
    storage.set(key, value)
  })
}
