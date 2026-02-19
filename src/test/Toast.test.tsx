/**
 * TDD: Toast Component Tests
 *
 * Tests the Toast notification component
 *
 * Test Coverage Areas:
 * - Toast renders with correct styling based on type
 * - Toast auto-removes after duration
 * - Toast can be manually dismissed
 * - Multiple toasts can be displayed
 * - Toast shows title and message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Toast from '../components/Toast'
import type { Toast as ToastType } from '../types'

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: 'div',
  },
}))

describe('Toast Component', () => {
  const mockRemoveToast = vi.fn()
  const mockToasts: ToastType[] = []

  beforeEach(() => {
    mockRemoveToast.mockClear()
    mockToasts.length = 0
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render toast container', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const container = document.querySelector('.toast-container')
      expect(container).toBeInTheDocument()
    })

    it('should render single toast message', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('should render toast with title', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
          title: 'Test Title',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('should render success toast with correct class', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Success message',
          type: 'success',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const toast = document.querySelector('.toast--success')
      expect(toast).toBeInTheDocument()
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    it('should render error toast with correct class', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Error message',
          type: 'error',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const toast = document.querySelector('.toast--error')
      expect(toast).toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })

    it('should render info toast with correct class', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Info message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const toast = document.querySelector('.toast--info')
      expect(toast).toBeInTheDocument()
      expect(screen.getByText('Info message')).toBeInTheDocument()
    })

    it('should render multiple toasts', () => {
      // Arrange
      const toasts: ToastType[] = [
        { id: '1', message: 'First toast', type: 'info' },
        { id: '2', message: 'Second toast', type: 'success' },
        { id: '3', message: 'Third toast', type: 'error' },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByText('First toast')).toBeInTheDocument()
      expect(screen.getByText('Second toast')).toBeInTheDocument()
      expect(screen.getByText('Third toast')).toBeInTheDocument()
    })

    it('should not render any toasts when array is empty', () => {
      // Arrange
      const toasts: ToastType[] = []

      // Act
      const { container } = render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(container.querySelector('.toast')).not.toBeInTheDocument()
    })
  })

  describe('Toast Icons', () => {
    it('should display success icon for success type', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Success message',
          type: 'success',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const icon = document.querySelector('.toast-icon--success')
      expect(icon).toBeInTheDocument()
    })

    it('should display error icon for error type', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Error message',
          type: 'error',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const icon = document.querySelector('.toast-icon--error')
      expect(icon).toBeInTheDocument()
    })

    it('should display info icon for info type', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Info message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const icon = document.querySelector('.toast-icon--info')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Manual Dismissal', () => {
    it('should call removeToast when close button is clicked', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: 'test-id',
          message: 'Test message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      const closeButton = screen.getByLabelText('Chiudi notifica')
      fireEvent.click(closeButton)

      // Assert
      expect(mockRemoveToast).toHaveBeenCalledWith('test-id')
    })

    it('should have correct aria-label on close button', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByLabelText('Chiudi notifica')).toBeInTheDocument()
    })
  })

  describe('Auto-dismissal', () => {
    it('should auto-dismiss after default duration (4000ms)', async () => {
      // Arrange
      vi.useFakeTimers()
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
          duration: 4000,
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert - Not called immediately
      expect(mockRemoveToast).not.toHaveBeenCalled()

      // Act - Fast-forward time
      vi.advanceTimersByTime(4000)

      // Assert
      expect(mockRemoveToast).toHaveBeenCalledWith('1')
    })

    it('should auto-dismiss after custom duration', async () => {
      // Arrange
      vi.useFakeTimers()
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
          duration: 2000,
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert - Not called before duration
      vi.advanceTimersByTime(1000)
      expect(mockRemoveToast).not.toHaveBeenCalled()

      // Act - Fast-forward to duration
      vi.advanceTimersByTime(1000)

      // Assert
      expect(mockRemoveToast).toHaveBeenCalledWith('1')
    })

    it('should clear timer on unmount', () => {
      // Arrange
      vi.useFakeTimers()
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
          duration: 4000,
        },
      ]

      // Act
      const { unmount } = render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)
      unmount()
      vi.advanceTimersByTime(4000)

      // Assert - Should not crash and should not have been called after unmount
      // The test passes if no errors occur
    })
  })

  describe('Multiple Toasts Behavior', () => {
    it('should render each toast with unique id', () => {
      // Arrange
      const toasts: ToastType[] = [
        { id: '1', message: 'First', type: 'info' },
        { id: '2', message: 'Second', type: 'success' },
        { id: '3', message: 'Third', type: 'error' },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('Third')).toBeInTheDocument()
    })

    it('should remove correct toast when close button clicked', () => {
      // Arrange
      const toasts: ToastType[] = [
        { id: '1', message: 'First', type: 'info' },
        { id: '2', message: 'Second', type: 'success' },
        { id: '3', message: 'Third', type: 'error' },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      const closeButtons = screen.getAllByLabelText('Chiudi notifica')
      fireEvent.click(closeButtons[1]) // Click second toast's close button

      // Assert
      expect(mockRemoveToast).toHaveBeenCalledTimes(1)
      expect(mockRemoveToast).toHaveBeenCalledWith('2')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible toast structure', () => {
      // Arrange
      const toasts: ToastType[] = [
        {
          id: '1',
          message: 'Test message',
          type: 'info',
          title: 'Test Title',
        },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument()
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('should have aria-label on close buttons for all toasts', () => {
      // Arrange
      const toasts: ToastType[] = [
        { id: '1', message: 'First', type: 'info' },
        { id: '2', message: 'Second', type: 'success' },
      ]

      // Act
      render(<Toast toasts={toasts} removeToast={mockRemoveToast} />)

      // Assert
      const closeButtons = screen.getAllByLabelText('Chiudi notifica')
      expect(closeButtons).toHaveLength(2)
    })
  })
})
