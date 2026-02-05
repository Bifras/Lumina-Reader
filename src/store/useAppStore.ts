import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Theme and font constants
export const THEMES = {
  light: { name: 'Chiaro', body: { background: '#f9f7f2', color: '#1a1a1a' } },
  sepia: { name: 'Seppia', body: { background: '#f4ecd8', color: '#5b4636' } },
  dark: { name: 'Scuro', body: { background: '#121212', color: '#e0e0e0' } }
} as const

export type ThemeName = keyof typeof THEMES

export const FONT_OPTIONS = [
  {
    id: 'lora', name: 'Lora', family: 'Lora',
    desc: 'Raffinato editoriale. Progettato per offrire un feeling classico ma moderno, perfetto per lunghe sessioni di lettura.'
  },
  {
    id: 'atkinson', name: 'Atkinson Hyperlegible', family: 'Atkinson Hyperlegible',
    desc: 'Progettato dal Braille Institute. Massima leggibilità e distinzione delle lettere, ideale per chi ha affaticamento visivo.'
  },
  {
    id: 'bitter', name: 'Bitter', family: 'Bitter',
    desc: 'Slab Serif contemporaneo. Progettato specificamente per la lettura confortevole su schermi digitali con ottimo bilanciamento visivo.'
  },
  {
    id: 'dyslexic', name: 'OpenDyslexic', family: 'OpenDyslexic',
    desc: 'Con base pesante. Aiuta a prevenire la rotazione o il salto delle lettere, specifico per lettori con dislessia.'
  }
] as const

export type FontId = typeof FONT_OPTIONS[number]['id']

interface AppStoreState {
  // Reading preferences
  currentTheme: ThemeName
  fontSize: number
  readingFont: FontId

  // UI State
  showSettings: boolean
  menuVisible: boolean
}

interface AppStoreActions {
  // Actions
  setTheme: (theme: ThemeName) => void
  setFontSize: (size: number) => void
  setReadingFont: (font: FontId) => void
  toggleSettings: () => void
  setShowSettings: (show: boolean) => void
  toggleMenu: () => void
  setMenuVisible: (visible: boolean) => void

  // Font size adjustments
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

type AppStore = AppStoreState & AppStoreActions

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Reading preferences
      currentTheme: 'light',
      fontSize: 100,
      readingFont: 'lora',

      // UI State
      showSettings: false,
      menuVisible: true,

      // Actions
      setTheme: (theme) => set({ currentTheme: theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setReadingFont: (font) => set({ readingFont: font }),
      toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
      setShowSettings: (show) => set({ showSettings: show }),
      toggleMenu: () => set((state) => ({ menuVisible: !state.menuVisible })),
      setMenuVisible: (visible) => set({ menuVisible: visible }),

      // Font size adjustments
      increaseFontSize: () => set((state) => ({
        fontSize: Math.min(state.fontSize + 10, 200)
      })),
      decreaseFontSize: () => set((state) => ({
        fontSize: Math.max(state.fontSize - 10, 60)
      })),
    }),
    {
      name: 'lumina-reader-preferences',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        fontSize: state.fontSize,
        readingFont: state.readingFont,
      }),
    }
  )
)
