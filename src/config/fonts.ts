/**
 * Shared font configuration for Lumina Reader
 * System fonts only (no CORS issues in sandboxed iframes)
 * All fonts are native to Windows/Mac/Linux and work offline
 */

export interface FontOption {
  id: string
  name: string
  family: string
  category: 'serif' | 'sans-serif' | 'accessibility' | 'monospace'
  description: string
}

export const FONT_OPTIONS: FontOption[] = [
  // === SERIF - Per narrativa, romanzi, classici ===
  {
    id: 'georgia',
    name: 'Georgia',
    family: 'Georgia, "Times New Roman", serif',
    category: 'serif',
    description: 'Elegante e leggibile, ideale per narrativa'
  },
  {
    id: 'palatino',
    name: 'Palatino',
    family: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    category: 'serif',
    description: 'Classico editoriale, usato da molti editori'
  },
  {
    id: 'times',
    name: 'Times New Roman',
    family: '"Times New Roman", Times, serif',
    category: 'serif',
    description: 'Il classico per eccellenza, formale'
  },
  {
    id: 'cambria',
    name: 'Cambria',
    family: 'Cambria, Georgia, serif',
    category: 'serif',
    description: 'Moderno, progettato per lo schermo'
  },
  {
    id: 'garamond',
    name: 'Garamond',
    family: '"EB Garamond", Garamond, "Cormorant Garamond", serif',
    category: 'serif',
    description: 'Storico, elegante, usato in molti libri'
  },
  {
    id: 'baskerville',
    name: 'Baskerville',
    family: 'Baskerville, "Baskerville Old Face", serif',
    category: 'serif',
    description: 'Raffinato, alto contrasto, stile inglese'
  },
  {
    id: 'bookerly',
    name: 'Bookerly',
    family: 'Bookerly, Georgia, serif',
    category: 'serif',
    description: 'Font di Kindle, ottimo per e-book'
  },

  // === SANS-SERIF - Per saggistica, tecnici, moderni ===
  {
    id: 'verdana',
    name: 'Verdana',
    family: 'Verdana, Geneva, sans-serif',
    category: 'sans-serif',
    description: 'Altamente leggibile, grande x-height'
  },
  {
    id: 'helvetica',
    name: 'Helvetica / Arial',
    family: 'Helvetica, Arial, sans-serif',
    category: 'sans-serif',
    description: 'Pulito, moderno, universale'
  },
  {
    id: 'tahoma',
    name: 'Tahoma',
    family: 'Tahoma, Verdana, sans-serif',
    category: 'sans-serif',
    description: 'Compatto, leggibile, spaziatura stretta'
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS',
    family: '"Trebuchet MS", Helvetica, sans-serif',
    category: 'sans-serif',
    description: 'Moderno, dinamico, buono per titoli e testo'
  },
  {
    id: 'system',
    name: 'System UI',
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'sans-serif',
    description: 'Font nativo del sistema operativo'
  },
  {
    id: 'gill',
    name: 'Gill Sans',
    family: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif',
    category: 'sans-serif',
    description: 'Elegante, tipico dei libri di design'
  },
  {
    id: 'futura',
    name: 'Futura',
    family: 'Futura, "Century Gothic", sans-serif',
    category: 'sans-serif',
    description: 'Geometrico, moderno, anni 20'
  },
  {
    id: 'optima',
    name: 'Optima',
    family: 'Optima, Segoe, sans-serif',
    category: 'sans-serif',
    description: 'Ibrido serif/sans, elegante e leggibile'
  },

  // === ACCESSIBILITÀ - Per dislessia, problemi di vista ===
  {
    id: 'comic',
    name: 'Comic Sans MS',
    family: '"Comic Sans MS", "Comic Sans", cursive',
    category: 'accessibility',
    description: 'Ottimo per dislessia (forme uniche delle lettere)'
  },
  {
    id: 'opendyslexic',
    name: 'Verdana (Accessible)',
    family: 'Verdana, sans-serif', // Using system font instead of OpenDyslexic
    category: 'accessibility',
    description: 'Font di sistema ottimizzato per leggibilità'
  },

  // === MONOSPACE - Per codice, testi tecnici ===
  {
    id: 'consolas',
    name: 'Consolas',
    family: 'Consolas, "Lucida Console", monospace',
    category: 'monospace',
    description: 'Moderno, leggibile, per codice e dati'
  },
  {
    id: 'courier',
    name: 'Courier New',
    family: '"Courier New", Courier, monospace',
    category: 'monospace',
    description: 'Classico stile macchina da scrivere'
  }
]

// Compact font config for useBookLoader (family only)
export const FONT_CONFIG: Record<string, { family: string }> = Object.fromEntries(
  FONT_OPTIONS.map(f => [f.id, { family: f.family }])
)

// Helper to get font by ID
export const getFontById = (id: string): FontOption | undefined =>
  FONT_OPTIONS.find(f => f.id === id)

// Helper to get font family by ID
export const getFontFamily = (id: string): string =>
  FONT_CONFIG[id]?.family || FONT_CONFIG.georgia.family
