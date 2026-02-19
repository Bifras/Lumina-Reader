import localforage from 'localforage'
import { FONT_OPTIONS } from '../config/fonts'

export interface ReaderSettings {
  theme: string
  fontSize: number
  fontFamily: string
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontSize: 100,
  fontFamily: 'georgia'
}

export class ReaderSettingsService {
  static async getSettings(): Promise<ReaderSettings> {
    const [theme, fontSize, fontFamily] = await Promise.all([
      localforage.getItem<string>('reading-theme'),
      localforage.getItem<number>('reading-font-size'),
      localforage.getItem<string>('reading-font')
    ])

    return {
      theme: theme || DEFAULT_SETTINGS.theme,
      fontSize: fontSize || DEFAULT_SETTINGS.fontSize,
      fontFamily: (fontFamily && FONT_OPTIONS.some(f => f.id === fontFamily)) 
        ? fontFamily 
        : DEFAULT_SETTINGS.fontFamily
    }
  }

  static async saveSettings(settings: Partial<ReaderSettings>): Promise<void> {
    const promises: Promise<any>[] = []
    if (settings.theme) promises.push(localforage.setItem('reading-theme', settings.theme))
    if (settings.fontSize) promises.push(localforage.setItem('reading-font-size', settings.fontSize))
    if (settings.fontFamily) promises.push(localforage.setItem('reading-font', settings.fontFamily))
    await Promise.all(promises)
  }
}
