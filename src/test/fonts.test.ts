/**
 * TDD: Font Configuration Tests
 *
 * Tests the font configuration utilities
 *
 * Test Coverage Areas:
 * - FONT_OPTIONS array structure and content
 * - Font category organization
 * - Helper functions (getFontById, getFontFamily)
 * - Font family strings validity
 */

import { describe, it, expect } from 'vitest'
import {
  FONT_OPTIONS,
  FONT_CONFIG,
  getFontById,
  getFontFamily,
  type FontOption,
} from '../config/fonts'

describe('Font Configuration', () => {
  describe('FONT_OPTIONS', () => {
    it('should be a non-empty array', () => {
      // Assert
      expect(Array.isArray(FONT_OPTIONS)).toBe(true)
      expect(FONT_OPTIONS.length).toBeGreaterThan(0)
    })

    it('should have fonts in all required categories', () => {
      // Arrange & Act
      const categories = new Set(FONT_OPTIONS.map((f) => f.category))

      // Assert
      expect(categories).toContain('serif')
      expect(categories).toContain('sans-serif')
      expect(categories).toContain('accessibility')
      expect(categories).toContain('monospace')
    })

    it('should have valid font option structure for each font', () => {
      // Assert - All fonts should have required properties
      FONT_OPTIONS.forEach((font: FontOption) => {
        expect(font).toHaveProperty('id')
        expect(font).toHaveProperty('name')
        expect(font).toHaveProperty('family')
        expect(font).toHaveProperty('category')
        expect(font).toHaveProperty('description')

        expect(typeof font.id).toBe('string')
        expect(typeof font.name).toBe('string')
        expect(typeof font.family).toBe('string')
        expect(typeof font.description).toBe('string')
        expect(['serif', 'sans-serif', 'accessibility', 'monospace']).toContain(font.category)
      })
    })

    it('should have unique font IDs', () => {
      // Arrange & Act
      const ids = FONT_OPTIONS.map((f) => f.id)
      const uniqueIds = new Set(ids)

      // Assert
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have serif fonts with appropriate font families', () => {
      // Arrange
      const serifFonts = FONT_OPTIONS.filter((f) => f.category === 'serif')

      // Assert
      expect(serifFonts.length).toBeGreaterThan(0)
      serifFonts.forEach((font) => {
        expect(font.family).toMatch(/serif/i)
      })
    })

    it('should have sans-serif fonts with appropriate font families', () => {
      // Arrange
      const sansSerifFonts = FONT_OPTIONS.filter((f) => f.category === 'sans-serif')

      // Assert
      expect(sansSerifFonts.length).toBeGreaterThan(0)
      sansSerifFonts.forEach((font) => {
        expect(font.family.toLowerCase()).toMatch(/sans|arial|helvetica|verdana|tahoma|trebuchet|system|gill|futura|optima|segoe/i)
      })
    })

    it('should have accessibility fonts for dyslexia support', () => {
      // Arrange
      const accessibilityFonts = FONT_OPTIONS.filter((f) => f.category === 'accessibility')

      // Assert
      expect(accessibilityFonts.length).toBeGreaterThan(0)
    })

    it('should have monospace fonts', () => {
      // Arrange
      const monospaceFonts = FONT_OPTIONS.filter((f) => f.category === 'monospace')

      // Assert
      expect(monospaceFonts.length).toBeGreaterThan(0)
      monospaceFonts.forEach((font) => {
        expect(font.family.toLowerCase()).toMatch(/monospace|console|courier/i)
      })
    })
  })

  describe('Specific Font Options', () => {
    it('should include Georgia serif font', () => {
      // Act
      const georgia = getFontById('georgia')

      // Assert
      expect(georgia).toBeDefined()
      expect(georgia?.name).toBe('Georgia')
      expect(georgia?.category).toBe('serif')
    })

    it('should include Palatino serif font', () => {
      // Act
      const palatino = getFontById('palatino')

      // Assert
      expect(palatino).toBeDefined()
      expect(palatino?.name).toBe('Palatino')
      expect(palatino?.category).toBe('serif')
    })

    it('should include Verdana sans-serif font', () => {
      // Act
      const verdana = getFontById('verdana')

      // Assert
      expect(verdana).toBeDefined()
      expect(verdana?.name).toBe('Verdana')
      expect(verdana?.category).toBe('sans-serif')
    })

    it('should include System UI font', () => {
      // Act
      const system = getFontById('system')

      // Assert
      expect(system).toBeDefined()
      expect(system?.name).toBe('System UI')
      expect(system?.category).toBe('sans-serif')
    })

    it('should include accessibility Comic Sans font', () => {
      // Act
      const comic = getFontById('comic')

      // Assert
      expect(comic).toBeDefined()
      expect(comic?.name).toBe('Comic Sans MS')
      expect(comic?.category).toBe('accessibility')
    })

    it('should include Consolas monospace font', () => {
      // Act
      const consolas = getFontById('consolas')

      // Assert
      expect(consolas).toBeDefined()
      expect(consolas?.name).toBe('Consolas')
      expect(consolas?.category).toBe('monospace')
    })
  })

  describe('FONT_CONFIG', () => {
    it('should be an object with font IDs as keys', () => {
      // Assert
      expect(typeof FONT_CONFIG).toBe('object')
      expect(FONT_CONFIG).not.toBeNull()
    })

    it('should have entries for all font options', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        expect(FONT_CONFIG).toHaveProperty(font.id)
      })
    })

    it('should have family property for each font config', () => {
      // Act & Assert
      Object.entries(FONT_CONFIG).forEach(([id, config]) => {
        expect(config).toHaveProperty('family')
        expect(typeof config.family).toBe('string')
      })
    })

    it('should match family values with FONT_OPTIONS', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        expect(FONT_CONFIG[font.id]?.family).toBe(font.family)
      })
    })
  })

  describe('getFontById Helper', () => {
    it('should return correct font for valid ID', () => {
      // Act
      const result = getFontById('georgia')

      // Assert
      expect(result).toBeDefined()
      expect(result?.id).toBe('georgia')
    })

    it('should return undefined for invalid ID', () => {
      // Act
      const result = getFontById('nonexistent-font')

      // Assert
      expect(result).toBeUndefined()
    })

    it('should return font with all properties', () => {
      // Act
      const result = getFontById('georgia')

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          family: expect.any(String),
          category: expect.any(String),
          description: expect.any(String),
        })
      )
    })

    it('should work for all font IDs', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        const result = getFontById(font.id)
        expect(result).toBeDefined()
        expect(result?.id).toBe(font.id)
      })
    })
  })

  describe('getFontFamily Helper', () => {
    it('should return font family string for valid ID', () => {
      // Act
      const result = getFontFamily('georgia')

      // Assert
      expect(result).toBe('Georgia, "Times New Roman", serif')
    })

    it('should return Georgia family as fallback for invalid ID', () => {
      // Act
      const result = getFontFamily('nonexistent-font')

      // Assert
      expect(result).toBeDefined()
      expect(result).toContain('Georgia')
    })

    it('should return valid CSS font family string', () => {
      // Act
      const georgiaFamily = getFontFamily('georgia')
      const verdanaFamily = getFontFamily('verdana')

      // Assert - Should be valid CSS font-family values
      expect(georgiaFamily).toMatch(/^[\w\s,"'-]+$/)
      expect(verdanaFamily).toMatch(/^[\w\s,"'-]+$/)
    })

    it('should work for all font IDs', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        const family = getFontFamily(font.id)
        expect(family).toBeDefined()
        expect(typeof family).toBe('string')
        expect(family.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Font Family Fallback Chains', () => {
    it('should include fallback fonts in family strings', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        const family = font.family
        // Should have fallbacks (comma-separated)
        if (font.category === 'serif' || font.category === 'sans-serif') {
          expect(family).toContain(',')
        }
      })
    })

    it('should include generic family name in font stacks', () => {
      // Act & Assert
      const serifFonts = FONT_OPTIONS.filter((f) => f.category === 'serif')
      serifFonts.forEach((font) => {
        expect(font.family.toLowerCase()).toMatch(/serif/)
      })

      const sansSerifFonts = FONT_OPTIONS.filter((f) => f.category === 'sans-serif')
      sansSerifFonts.forEach((font) => {
        expect(font.family.toLowerCase()).toMatch(/sans-serif|sans/)
      })

      const monospaceFonts = FONT_OPTIONS.filter((f) => f.category === 'monospace')
      monospaceFonts.forEach((font) => {
        expect(font.family.toLowerCase()).toMatch(/monospace/)
      })
    })
  })

  describe('Font Descriptions', () => {
    it('should have non-empty descriptions for all fonts', () => {
      // Act & Assert
      FONT_OPTIONS.forEach((font) => {
        expect(font.description).toBeDefined()
        expect(font.description.length).toBeGreaterThan(0)
      })
    })

    it('should have meaningful descriptions', () => {
      // Act & Assert
      const serifFonts = FONT_OPTIONS.filter((f) => f.category === 'serif')
      serifFonts.forEach((font) => {
        expect(font.description.toLowerCase()).toMatch(
          /(elegante|leggi|narrativa|classico|editoriale|moderno|schermo|raffinato|contrasto|stile|kindle|e-book|ottimo)/i
        )
      })

      const accessibilityFonts = FONT_OPTIONS.filter((f) => f.category === 'accessibility')
      accessibilityFonts.forEach((font) => {
        expect(font.description.toLowerCase()).toMatch(
          /(disless|accessibilità|leggib)/i
        )
      })
    })
  })
})
