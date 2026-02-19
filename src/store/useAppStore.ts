import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEMES } from '../config/themes'
import { FONT_OPTIONS } from '../config/fonts'

// Re-export theme type for convenience
export type ThemeName = keyof typeof THEMES

// Legacy export for backward compatibility
export { THEMES } from '../config/themes'

// Font options now imported from config/fonts.ts (single source of truth)
export { FONT_OPTIONS } from '../config/fonts'
export type FontId = typeof FONT_OPTIONS[number]['id']

interface AppStoreState {
  // Reading preferences
  currentTheme: ThemeName
  fontSize: number
  readingFont: FontId
  isTwoPageView: boolean

  // UI State
  showSettings: boolean
  menuVisible: boolean
}

interface AppStoreActions {
  // Actions
  setTheme: (theme: ThemeName) => void
  setFontSize: (size: number) => void
  setReadingFont: (font: FontId) => void
  setTwoPageView: (isTwoPage: boolean) => void
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
      isTwoPageView: false,

      // UI State
      showSettings: false,
      menuVisible: true,

      // Actions
      setTheme: (theme) => set({ currentTheme: theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setReadingFont: (font) => set({ readingFont: font }),
      setTwoPageView: (isTwoPage) => set({ isTwoPageView: isTwoPage }),
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
        isTwoPageView: state.isTwoPageView,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme immediately when store is rehydrated from localStorage
        // This prevents flash of un-themed content
        if (state?.currentTheme) {
          document.documentElement.setAttribute('data-theme', state.currentTheme)
        }
      },
    }
  )
)
