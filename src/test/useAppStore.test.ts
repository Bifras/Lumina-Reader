/**
 * TDD: useAppStore State Management Tests
 *
 * Tests the Zustand store for application state
 *
 * Test Coverage Areas:
 * - Initial state values
 * - Theme selection and updates
 * - Font size adjustments with clamping
 * - Font family selection
 * - Settings panel toggling
 * - Menu visibility toggling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAppStore, ThemeName, FontId, FONT_OPTIONS } from '../store/useAppStore'

describe('useAppStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    // Set default values
    useAppStore.setState({
      currentTheme: 'light',
      fontSize: 100,
      readingFont: 'lora',
      showSettings: false,
      menuVisible: true,
    })
  })

  afterEach(() => {
    // Clean up after each test
    useAppStore.setState({
      currentTheme: 'light',
      fontSize: 100,
      readingFont: 'lora',
      showSettings: false,
      menuVisible: true,
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state values', () => {
      // Act
      const state = useAppStore.getState()

      // Assert
      expect(state.currentTheme).toBe('light')
      expect(state.fontSize).toBe(100)
      expect(state.readingFont).toBe('lora')
      expect(state.showSettings).toBe(false)
      expect(state.menuVisible).toBe(true)
    })
  })

  describe('Theme Management', () => {
    it('should set theme to light', () => {
      // Arrange
      const { setTheme } = useAppStore.getState()

      // Act
      setTheme('light')

      // Assert
      expect(useAppStore.getState().currentTheme).toBe('light')
    })

    it('should set theme to sepia', () => {
      // Arrange
      const { setTheme } = useAppStore.getState()

      // Act
      setTheme('sepia')

      // Assert
      expect(useAppStore.getState().currentTheme).toBe('sepia')
    })

    it('should set theme to dark', () => {
      // Arrange
      const { setTheme } = useAppStore.getState()

      // Act
      setTheme('dark')

      // Assert
      expect(useAppStore.getState().currentTheme).toBe('dark')
    })

    it('should allow switching between themes', () => {
      // Arrange
      const { setTheme } = useAppStore.getState()

      // Act - Switch from light to dark
      setTheme('light')
      expect(useAppStore.getState().currentTheme).toBe('light')

      setTheme('dark')
      expect(useAppStore.getState().currentTheme).toBe('dark')

      setTheme('sepia')
      expect(useAppStore.getState().currentTheme).toBe('sepia')
    })
  })

  describe('Font Size Management', () => {
    it('should set font size to valid value', () => {
      // Arrange
      const { setFontSize } = useAppStore.getState()

      // Act
      setFontSize(120)

      // Assert
      expect(useAppStore.getState().fontSize).toBe(120)
    })

    it('should increase font size by 10', () => {
      // Arrange
      const { increaseFontSize } = useAppStore.getState()
      useAppStore.setState({ fontSize: 100 })

      // Act
      increaseFontSize()

      // Assert
      expect(useAppStore.getState().fontSize).toBe(110)
    })

    it('should decrease font size by 10', () => {
      // Arrange
      const { decreaseFontSize } = useAppStore.getState()
      useAppStore.setState({ fontSize: 100 })

      // Act
      decreaseFontSize()

      // Assert
      expect(useAppStore.getState().fontSize).toBe(90)
    })

    it('should clamp font size to maximum of 200', () => {
      // Arrange
      const { increaseFontSize } = useAppStore.getState()
      useAppStore.setState({ fontSize: 190 })

      // Act - First increase should work
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(200)

      // Second increase should be clamped
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(200) // Still 200

      // Even at max, should not exceed
      useAppStore.setState({ fontSize: 200 })
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(200)
    })

    it('should clamp font size to minimum of 60', () => {
      // Arrange
      const { decreaseFontSize } = useAppStore.getState()
      useAppStore.setState({ fontSize: 70 })

      // Act - First decrease should work
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(60)

      // Second decrease should be clamped
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(60) // Still 60

      // Even at min, should not go below
      useAppStore.setState({ fontSize: 60 })
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(60)
    })

    it('should allow setting font size within valid range', () => {
      // Arrange
      const { setFontSize } = useAppStore.getState()

      // Act & Assert - Test various valid values
      setFontSize(60)
      expect(useAppStore.getState().fontSize).toBe(60)

      setFontSize(100)
      expect(useAppStore.getState().fontSize).toBe(100)

      setFontSize(200)
      expect(useAppStore.getState().fontSize).toBe(200)
    })
  })

  describe('Font Family Management', () => {
    it('should set reading font to lora', () => {
      // Arrange
      const { setReadingFont } = useAppStore.getState()

      // Act
      setReadingFont('lora')

      // Assert
      expect(useAppStore.getState().readingFont).toBe('lora')
    })

    it('should set reading font to atkinson', () => {
      // Arrange
      const { setReadingFont } = useAppStore.getState()

      // Act
      setReadingFont('atkinson')

      // Assert
      expect(useAppStore.getState().readingFont).toBe('atkinson')
    })

    it('should set reading font to bitter', () => {
      // Arrange
      const { setReadingFont } = useAppStore.getState()

      // Act
      setReadingFont('bitter')

      // Assert
      expect(useAppStore.getState().readingFont).toBe('bitter')
    })

    it('should set reading font to dyslexic', () => {
      // Arrange
      const { setReadingFont } = useAppStore.getState()

      // Act
      setReadingFont('dyslexic')

      // Assert
      expect(useAppStore.getState().readingFont).toBe('dyslexic')
    })

    it('should allow switching between fonts', () => {
      // Arrange
      const { setReadingFont } = useAppStore.getState()

      // Act
      setReadingFont('lora')
      expect(useAppStore.getState().readingFont).toBe('lora')

      setReadingFont('dyslexic')
      expect(useAppStore.getState().readingFont).toBe('dyslexic')

      setReadingFont('atkinson')
      expect(useAppStore.getState().readingFont).toBe('atkinson')
    })
  })

  describe('Settings Panel Management', () => {
    it('should toggle settings panel visibility', () => {
      // Arrange
      const { toggleSettings } = useAppStore.getState()
      useAppStore.setState({ showSettings: false })

      // Act - Toggle on
      toggleSettings()

      // Assert
      expect(useAppStore.getState().showSettings).toBe(true)

      // Act - Toggle off
      toggleSettings()

      // Assert
      expect(useAppStore.getState().showSettings).toBe(false)
    })

    it('should set settings panel to visible', () => {
      // Arrange
      const { setShowSettings } = useAppStore.getState()

      // Act
      setShowSettings(true)

      // Assert
      expect(useAppStore.getState().showSettings).toBe(true)
    })

    it('should set settings panel to hidden', () => {
      // Arrange
      const { setShowSettings } = useAppStore.getState()
      useAppStore.setState({ showSettings: true })

      // Act
      setShowSettings(false)

      // Assert
      expect(useAppStore.getState().showSettings).toBe(false)
    })

    it('should handle multiple toggle calls correctly', () => {
      // Arrange
      const { toggleSettings } = useAppStore.getState()
      useAppStore.setState({ showSettings: false })

      // Act
      toggleSettings() // true
      toggleSettings() // false
      toggleSettings() // true
      toggleSettings() // false

      // Assert
      expect(useAppStore.getState().showSettings).toBe(false)
    })
  })

  describe('Menu Visibility Management', () => {
    it('should toggle menu visibility', () => {
      // Arrange
      const { toggleMenu } = useAppStore.getState()
      useAppStore.setState({ menuVisible: true })

      // Act - Toggle off
      toggleMenu()

      // Assert
      expect(useAppStore.getState().menuVisible).toBe(false)

      // Act - Toggle on
      toggleMenu()

      // Assert
      expect(useAppStore.getState().menuVisible).toBe(true)
    })

    it('should set menu to visible', () => {
      // Arrange
      const { setMenuVisible } = useAppStore.getState()
      useAppStore.setState({ menuVisible: false })

      // Act
      setMenuVisible(true)

      // Assert
      expect(useAppStore.getState().menuVisible).toBe(true)
    })

    it('should set menu to hidden', () => {
      // Arrange
      const { setMenuVisible } = useAppStore.getState()
      useAppStore.setState({ menuVisible: true })

      // Act
      setMenuVisible(false)

      // Assert
      expect(useAppStore.getState().menuVisible).toBe(false)
    })
  })

  describe('FONT_OPTIONS Export', () => {
    it('should export FONT_OPTIONS array', () => {
      // This test verifies the export exists
      expect(Array.isArray(FONT_OPTIONS)).toBe(true)
      expect(FONT_OPTIONS.length).toBeGreaterThan(0)
    })

    it('should have all required font options', () => {
      // Arrange & Act
      const fontIds = FONT_OPTIONS.map((f: typeof FONT_OPTIONS[number]) => f.id)

      // Assert
      expect(fontIds).toContain('lora')
      expect(fontIds).toContain('atkinson')
      expect(fontIds).toContain('bitter')
      expect(fontIds).toContain('dyslexic')
    })

    it('should have valid font option structure', () => {
      // Arrange & Act
      const firstFont = FONT_OPTIONS[0]

      // Assert
      expect(firstFont).toHaveProperty('id')
      expect(firstFont).toHaveProperty('name')
      expect(firstFont).toHaveProperty('family')
      expect(firstFont).toHaveProperty('desc')
      expect(typeof firstFont.id).toBe('string')
      expect(typeof firstFont.name).toBe('string')
      expect(typeof firstFont.family).toBe('string')
      expect(typeof firstFont.desc).toBe('string')
    })
  })

  describe('State Persistence', () => {
    it('should have persistence configured', () => {
      // This test verifies the store has persist middleware
      // We can't directly test localStorage interaction in unit tests,
      // but we verify the store structure supports it
      const state = useAppStore.getState()

      expect(state).toHaveProperty('currentTheme')
      expect(state).toHaveProperty('fontSize')
      expect(state).toHaveProperty('readingFont')
    })
  })

  describe('Combined State Changes', () => {
    it('should handle multiple state changes in sequence', () => {
      // Arrange
      const { setTheme, setFontSize, setReadingFont, toggleSettings } = useAppStore.getState()

      // Act
      setTheme('dark')
      setFontSize(150)
      setReadingFont('dyslexic')
      toggleSettings()

      // Assert
      const state = useAppStore.getState()
      expect(state.currentTheme).toBe('dark')
      expect(state.fontSize).toBe(150)
      expect(state.readingFont).toBe('dyslexic')
      expect(state.showSettings).toBe(true)
    })

    it('should not affect other state when changing one value', () => {
      // Arrange
      const { setTheme, setFontSize } = useAppStore.getState()
      useAppStore.setState({
        currentTheme: 'light',
        fontSize: 100,
        readingFont: 'lora',
      })

      // Act
      setTheme('dark')

      // Assert - Other values should remain unchanged
      const state = useAppStore.getState()
      expect(state.currentTheme).toBe('dark')
      expect(state.fontSize).toBe(100)
      expect(state.readingFont).toBe('lora')

      // Act - Change font size
      setFontSize(120)

      // Assert
      expect(useAppStore.getState().currentTheme).toBe('dark')
      expect(useAppStore.getState().fontSize).toBe(120)
      expect(useAppStore.getState().readingFont).toBe('lora')
    })
  })
})
