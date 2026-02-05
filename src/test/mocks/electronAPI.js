// Mock for window.electronAPI
import { vi } from 'vitest'

// Track calls and data for testing
const mockData = {
  savedBooks: new Map(),
  deletedBooks: [],
  port: 12345,
  appPath: '/mock/user/data/path'
}

export const mockElectronAPI = () => {
  const mockAPI = {
    getAppPath: vi.fn(() => mockData.appPath),
    saveBookFile: vi.fn((id, arrayBuffer) => {
      mockData.savedBooks.set(id, arrayBuffer)
      return Promise.resolve(true)
    }),
    deleteBookFile: vi.fn((id) => {
      mockData.deletedBooks.push(id)
      mockData.savedBooks.delete(id)
      return Promise.resolve(true)
    }),
    getBookServerPort: vi.fn(() => mockData.port),
    minimize: vi.fn(() => Promise.resolve()),
    maximize: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve())
  }

  // Store on window for test access
  global.window = Object.create(global.window)
  global.window.electronAPI = mockAPI
  global.mockElectronData = mockData

  return mockAPI
}

// Helper to reset mock data between tests
export const resetMockData = () => {
  mockData.savedBooks.clear()
  mockData.deletedBooks = []
}

// Helper to get mock data for assertions
export const getMockData = () => mockData
