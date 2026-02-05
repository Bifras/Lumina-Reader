// Tests for useAppStore
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, THEMES, FONT_OPTIONS } from '../useAppStore.ts'

describe('useAppStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    // Reset to initial state
    useAppStore.setState({
      currentTheme: 'light',
      fontSize: 100,
      readingFont: 'lora',
      showSettings: false,
      menuVisible: true
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAppStore.getState()
      expect(state.currentTheme).toBe('light')
      expect(state.fontSize).toBe(100)
      expect(state.readingFont).toBe('lora')
      expect(state.showSettings).toBe(false)
      expect(state.menuVisible).toBe(true)
    })
  })

  describe('Theme Management', () => {
    it('should set theme correctly', () => {
      const { setTheme } = useAppStore.getState()

      setTheme('dark')
      expect(useAppStore.getState().currentTheme).toBe('dark')

      setTheme('sepia')
      expect(useAppStore.getState().currentTheme).toBe('sepia')
    })

    it('should support all theme options', () => {
      const themes = Object.keys(THEMES)
      expect(themes).toContain('light')
      expect(themes).toContain('sepia')
      expect(themes).toContain('dark')

      themes.forEach(theme => {
        useAppStore.getState().setTheme(theme)
        expect(useAppStore.getState().currentTheme).toBe(theme)
      })
    })
  })

  describe('Font Size Management', () => {
    it('should set font size correctly', () => {
      const { setFontSize } = useAppStore.getState()

      setFontSize(120)
      expect(useAppStore.getState().fontSize).toBe(120)

      setFontSize(80)
      expect(useAppStore.getState().fontSize).toBe(80)
    })

    it('should increase font size with max limit of 200', () => {
      const { increaseFontSize } = useAppStore.getState()

      useAppStore.setState({ fontSize: 100 })
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(110)

      useAppStore.setState({ fontSize: 190 })
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(200)

      // Should not exceed 200
      increaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(200)
    })

    it('should decrease font size with min limit of 60', () => {
      const { decreaseFontSize } = useAppStore.getState()

      useAppStore.setState({ fontSize: 100 })
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(90)

      useAppStore.setState({ fontSize: 70 })
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(60)

      // Should not go below 60
      decreaseFontSize()
      expect(useAppStore.getState().fontSize).toBe(60)
    })
  })

  describe('Reading Font Management', () => {
    it('should set reading font correctly', () => {
      const { setReadingFont } = useAppStore.getState()

      setReadingFont('atkinson')
      expect(useAppStore.getState().readingFont).toBe('atkinson')

      setReadingFont('dyslexic')
      expect(useAppStore.getState().readingFont).toBe('dyslexic')
    })

    it('should support all font options', () => {
      const fontIds = FONT_OPTIONS.map(f => f.id)
      expect(fontIds).toContain('lora')
      expect(fontIds).toContain('atkinson')
      expect(fontIds).toContain('bitter')
      expect(fontIds).toContain('dyslexic')
    })

    it('should have valid font structure', () => {
      FONT_OPTIONS.forEach(font => {
        expect(font).toHaveProperty('id')
        expect(font).toHaveProperty('name')
        expect(font).toHaveProperty('family')
        expect(font).toHaveProperty('desc')
      })
    })
  })

  describe('Settings Panel UI', () => {
    it('should toggle settings panel', () => {
      const { toggleSettings } = useAppStore.getState()

      expect(useAppStore.getState().showSettings).toBe(false)

      toggleSettings()
      expect(useAppStore.getState().showSettings).toBe(true)

      toggleSettings()
      expect(useAppStore.getState().showSettings).toBe(false)
    })

    it('should set settings panel visibility', () => {
      const { setShowSettings } = useAppStore.getState()

      setShowSettings(true)
      expect(useAppStore.getState().showSettings).toBe(true)

      setShowSettings(false)
      expect(useAppStore.getState().showSettings).toBe(false)
    })
  })

  describe('Menu UI', () => {
    it('should toggle menu visibility', () => {
      const { toggleMenu } = useAppStore.getState()

      expect(useAppStore.getState().menuVisible).toBe(true)

      toggleMenu()
      expect(useAppStore.getState().menuVisible).toBe(false)

      toggleMenu()
      expect(useAppStore.getState().menuVisible).toBe(true)
    })

    it('should set menu visibility', () => {
      const { setMenuVisible } = useAppStore.getState()

      setMenuVisible(false)
      expect(useAppStore.getState().menuVisible).toBe(false)

      setMenuVisible(true)
      expect(useAppStore.getState().menuVisible).toBe(true)
    })
  })
})
