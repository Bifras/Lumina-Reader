import { getSetting, setSetting } from '../db'

export interface ReadingHistoryEntry {
  date: string // Formato: YYYY-MM-DD
  bookId: string
  duration: number // Durata in secondi
}

export interface ReadingAnalytics {
  readingTime: Record<string, number> // bookId -> secondi totali
  history: ReadingHistoryEntry[]
  dailyGoal: number // Obiettivo giornaliero in minuti (default: 15)
}

const createDefaultAnalytics = (): ReadingAnalytics => ({
  readingTime: {},
  history: [],
  dailyGoal: 15
})

export class AnalyticsService {
  /**
   * Carica i dati delle statistiche dal database.
   */
  static async loadAnalytics(): Promise<ReadingAnalytics> {
    try {
      const data = await getSetting('reading_analytics')
      if (!data) return createDefaultAnalytics()
      
      return {
        readingTime: data.readingTime ? { ...data.readingTime } : {},
        history: Array.isArray(data.history) ? data.history.map((h: any) => ({ ...h })) : [],
        dailyGoal: data.dailyGoal !== undefined ? data.dailyGoal : 15
      }
    } catch (error) {
      console.error('[Analytics] Errore nel caricamento delle statistiche:', error)
      return createDefaultAnalytics()
    }
  }

  /**
   * Salva i dati delle statistiche nel database.
   */
  static async saveAnalytics(data: ReadingAnalytics): Promise<void> {
    try {
      await setSetting('reading_analytics', data)
    } catch (error) {
      console.error('[Analytics] Errore nel salvataggio delle statistiche:', error)
    }
  }

  /**
   * Registra una sessione di lettura per un libro.
   */
  static async recordSession(bookId: string, durationSeconds: number): Promise<ReadingAnalytics> {
    if (durationSeconds <= 0) return this.loadAnalytics()

    const data = await this.loadAnalytics()
    
    // 1. Aggiorna il tempo totale del libro
    data.readingTime[bookId] = (data.readingTime[bookId] || 0) + durationSeconds

    // 2. Aggiorna la cronologia giornaliera
    const todayStr = this.getLocalDateString()
    
    const existingEntryIndex = data.history.findIndex(
      entry => entry.date === todayStr && entry.bookId === bookId
    )

    if (existingEntryIndex !== -1) {
      data.history[existingEntryIndex].duration += durationSeconds
    } else {
      data.history.push({
        date: todayStr,
        bookId,
        duration: durationSeconds
      })
    }

    // Mantieni la cronologia degli ultimi 365 giorni per motivi di efficienza
    if (data.history.length > 2000) {
      data.history = data.history.slice(-2000)
    }

    await this.saveAnalytics(data)
    return data
  }

  /**
   * Aggiorna l'obiettivo giornaliero di lettura (in minuti).
   */
  static async updateDailyGoal(minutes: number): Promise<ReadingAnalytics> {
    const data = await this.loadAnalytics()
    data.dailyGoal = Math.max(1, minutes)
    await this.saveAnalytics(data)
    return data
  }

  /**
   * Calcola la striscia di lettura attiva (streak giornaliero consecutivo).
   */
  static getStreak(history: ReadingHistoryEntry[]): number {
    if (!history || history.length === 0) return 0

    // Raccogli tutte le date uniche in cui l'utente ha letto
    const readDates = new Set<string>()
    history.forEach(entry => {
      if (entry.duration > 0) {
        readDates.add(entry.date)
      }
    })

    if (readDates.size === 0) return 0

    const todayStr = this.getLocalDateString()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = this.getFormattedDateString(yesterday)

    // La streak è attiva se l'utente ha letto oggi o ieri
    let currentStreak = 0
    let checkDate = new Date()

    if (readDates.has(todayStr)) {
      currentStreak = 1
      // Inizia a controllare da ieri a ritroso
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (readDates.has(yesterdayStr)) {
      currentStreak = 1
      // Inizia a controllare dall'altro ieri a ritroso
      checkDate.setDate(checkDate.getDate() - 2)
    } else {
      // La streak è interrotta
      return 0
    }

    // Controlla a ritroso finché trovi date consecutive nel set
    while (true) {
      const dateStr = this.getFormattedDateString(checkDate)
      if (readDates.has(dateStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return currentStreak
  }

  /**
   * Ritorna i minuti letti negli ultimi 7 giorni (inclusa la giornata odierna).
   */
  static getWeeklyActivity(history: ReadingHistoryEntry[]): { dayName: string; date: string; minutes: number }[] {
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const activityList: { dayName: string; date: string; minutes: number }[] = []
    
    // Crea un record per mappare date -> secondi letti
    const dailySeconds: Record<string, number> = {}
    history.forEach(entry => {
      dailySeconds[entry.date] = (dailySeconds[entry.date] || 0) + entry.duration
    })

    // Genera gli ultimi 7 giorni
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const dateStr = this.getFormattedDateString(date)
      const dayName = weekdays[date.getDay()]
      const seconds = dailySeconds[dateStr] || 0
      
      activityList.push({
        dayName,
        date: dateStr,
        // Converti in minuti arrotondati ad una cifra decimale per precisione
        minutes: Math.round((seconds / 60) * 10) / 10
      })
    }

    return activityList
  }

  /**
   * Helper per ottenere la data odierna locale come stringa YYYY-MM-DD
   */
  private static getLocalDateString(): string {
    return this.getFormattedDateString(new Date())
  }

  /**
   * Helper per formattare un oggetto Date come YYYY-MM-DD
   */
  private static getFormattedDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
