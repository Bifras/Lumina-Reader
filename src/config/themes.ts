/**
 * Centralized theme configuration
 * All theme definitions should be imported from this file to ensure consistency
 */

export interface Theme {
  name: string
  body: {
    background: string
    color: string
  }
}

export const THEMES: Record<string, Theme> = {
  light: {
    name: 'Chiaro',
    body: {
      background: '#f9f7f2',
      color: '#1a1a1a'
    }
  },
  sepia: {
    name: 'Seppia',
    body: {
      background: '#f4ecd8',
      color: '#3d2f24' // Darker brown for better contrast
    }
  },
  dark: {
    name: 'Scuro',
    body: {
      background: '#121212',
      color: '#e0e0e0'
    }
  }
}

export type ThemeOption = keyof typeof THEMES

// CSS variable mappings for each theme
export const THEME_CSS_VARS = {
  light: {
    '--bg-cream': '#faf9f6',
    '--bg-paper': '#f0eee6',
    '--bg-ivory': '#ffffff',
    '--bg-warm': '#fcfbf9',
    '--text-main': '#1a1a1a',
    '--text-dim': '#4a4a4a',
    '--text-soft': '#757575',
    '--surface-panel': '#ffffff',
    '--surface-card': '#ffffff',
    '--surface-hover': 'rgba(0, 0, 0, 0.04)',
    '--border-subtle': 'rgba(0, 0, 0, 0.06)',
    '--glass-bg': 'rgba(255, 255, 255, 0.85)',
    '--glass-border': '1px solid rgba(255, 255, 255, 0.6)',
    '--glass-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
    '--accent': '#2c2c2c',
    '--accent-warm': '#c05d4e',
    '--shadow-premium': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  sepia: {
    '--bg-cream': '#f4ecd8',
    '--bg-paper': '#e8dcc5',
    '--bg-ivory': '#fcf6e9',
    '--bg-warm': '#f1e6d2',
    '--text-main': '#3d2f24', // Darker for better contrast
    '--text-dim': '#6b5244',
    '--text-soft': '#5a4a3d',
    '--surface-panel': '#fcf6e9',
    '--surface-card': '#fdfaf4',
    '--surface-hover': 'rgba(91, 70, 54, 0.08)',
    '--border-subtle': 'rgba(91, 70, 54, 0.15)',
    '--glass-bg': 'rgba(244, 236, 216, 0.85)',
    '--glass-border': '1px solid rgba(91, 70, 54, 0.1)',
    '--glass-shadow': '0 8px 32px 0 rgba(91, 70, 54, 0.1)',
    '--accent': '#3d2f24',
    '--accent-warm': '#c05d4e',
    '--shadow-premium': '0 25px 50px -12px rgba(91, 70, 54, 0.2)'
  },
  dark: {
    '--bg-cream': '#121212',
    '--bg-paper': '#1a1a1a',
    '--bg-ivory': '#1e1e1e',
    '--bg-warm': '#161616',
    '--text-main': '#e6e6e6',
    '--text-dim': '#a0a0a0',
    '--text-soft': '#666666',
    '--surface-panel': '#1e1e1e',
    '--surface-card': '#252525',
    '--surface-hover': 'rgba(255, 255, 255, 0.08)',
    '--border-subtle': 'rgba(255, 255, 255, 0.08)',
    '--glass-bg': 'rgba(30, 30, 30, 0.85)',
    '--glass-border': '1px solid rgba(255, 255, 255, 0.08)',
    '--glass-shadow': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
    '--accent': '#e0e0e0',
    '--accent-warm': '#d46a5c',
    '--shadow-premium': '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  }
} as const
