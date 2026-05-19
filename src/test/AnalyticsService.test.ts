import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalyticsService, type ReadingHistoryEntry } from '../services/AnalyticsService'
import localforage from 'localforage'

describe('AnalyticsService', () => {
  beforeEach(async () => {
    // Pulisci il mock di localforage prima di ogni test
    await localforage.clear()
    vi.restoreAllMocks()
  })

  describe('loadAnalytics e saveAnalytics', () => {
    it('dovrebbe caricare il default se non ci sono dati persistiti', async () => {
      const data = await AnalyticsService.loadAnalytics()
      expect(data).toEqual({
        readingTime: {},
        history: [],
        dailyGoal: 15
      })
    })

    it('dovrebbe persistere e caricare correttamente le impostazioni', async () => {
      const mockData = {
        readingTime: { 'book-1': 3600 },
        history: [{ date: '2026-05-19', bookId: 'book-1', duration: 3600 }],
        dailyGoal: 30
      }

      await AnalyticsService.saveAnalytics(mockData)
      const data = await AnalyticsService.loadAnalytics()
      expect(data).toEqual(mockData)
    })
  })

  describe('recordSession', () => {
    it('dovrebbe non fare nulla per durate <= 0', async () => {
      const initial = await AnalyticsService.loadAnalytics()
      const data = await AnalyticsService.recordSession('book-1', 0)
      expect(data).toEqual(initial)
    })

    it('dovrebbe registrare correttamente una nuova sessione di lettura per oggi', async () => {
      const bookId = 'book-1'
      const duration = 120 // 2 minuti

      const data = await AnalyticsService.recordSession(bookId, duration)
      
      // Controlla tempo totale del libro
      expect(data.readingTime[bookId]).toBe(duration)

      // Controlla che ci sia una voce nella history per la data odierna
      const todayStr = new Date().toISOString().split('T')[0]
      expect(data.history.length).toBe(1)
      expect(data.history[0]).toEqual({
        date: todayStr,
        bookId,
        duration
      })
    })

    it('dovrebbe accumulare la durata se si legge lo stesso libro più volte nello stesso giorno', async () => {
      const bookId = 'book-1'
      
      await AnalyticsService.recordSession(bookId, 60)
      const finalData = await AnalyticsService.recordSession(bookId, 40)

      expect(finalData.readingTime[bookId]).toBe(100)
      expect(finalData.history.length).toBe(1)
      expect(finalData.history[0].duration).toBe(100)
    })
  })

  describe('updateDailyGoal', () => {
    it('dovrebbe aggiornare l\'obiettivo giornaliero correttamente', async () => {
      const res = await AnalyticsService.updateDailyGoal(45)
      expect(res.dailyGoal).toBe(45)

      const loaded = await AnalyticsService.loadAnalytics()
      expect(loaded.dailyGoal).toBe(45)
    })

    it('non dovrebbe consentire obiettivi inferiori a 1 minuto', async () => {
      const res = await AnalyticsService.updateDailyGoal(-5)
      expect(res.dailyGoal).toBe(1)
    })
  })

  describe('getStreak', () => {
    const todayStr = new Date().toISOString().split('T')[0]
    
    const getPastDateStr = (daysAgo: number): string => {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      return d.toISOString().split('T')[0]
    }

    it('dovrebbe restituire 0 se non c\'è cronologia di lettura', () => {
      expect(AnalyticsService.getStreak([])).toBe(0)
    })

    it('dovrebbe restituire 1 se l\'utente ha letto solo oggi', () => {
      const history: ReadingHistoryEntry[] = [
        { date: todayStr, bookId: 'b1', duration: 60 }
      ]
      expect(AnalyticsService.getStreak(history)).toBe(1)
    })

    it('dovrebbe restituire 1 se l\'utente ha letto solo ieri', () => {
      const yesterdayStr = getPastDateStr(1)
      const history: ReadingHistoryEntry[] = [
        { date: yesterdayStr, bookId: 'b1', duration: 60 }
      ]
      expect(AnalyticsService.getStreak(history)).toBe(1)
    })

    it('dovrebbe restituire 2 se l\'utente ha letto oggi e ieri', () => {
      const yesterdayStr = getPastDateStr(1)
      const history: ReadingHistoryEntry[] = [
        { date: yesterdayStr, bookId: 'b1', duration: 60 },
        { date: todayStr, bookId: 'b1', duration: 60 }
      ]
      expect(AnalyticsService.getStreak(history)).toBe(2)
    })

    it('dovrebbe calcolare strisce lunghe consecutive', () => {
      const history: ReadingHistoryEntry[] = [
        { date: getPastDateStr(3), bookId: 'b1', duration: 60 },
        { date: getPastDateStr(2), bookId: 'b1', duration: 60 },
        { date: getPastDateStr(1), bookId: 'b1', duration: 60 },
        { date: todayStr, bookId: 'b1', duration: 60 }
      ]
      expect(AnalyticsService.getStreak(history)).toBe(4)
    })

    it('dovrebbe interrompere lo streak se c\'è un giorno vuoto in mezzo prima di oggi/ieri', () => {
      const history: ReadingHistoryEntry[] = [
        { date: getPastDateStr(4), bookId: 'b1', duration: 60 },
        { date: getPastDateStr(3), bookId: 'b1', duration: 60 },
        // Giorno 2 mancante
        { date: getPastDateStr(1), bookId: 'b1', duration: 60 },
        { date: todayStr, bookId: 'b1', duration: 60 }
      ]
      expect(AnalyticsService.getStreak(history)).toBe(2)
    })

    it('dovrebbe restituire 0 se l\'ultima lettura è più vecchia di ieri', () => {
      const history: ReadingHistoryEntry[] = [
        { date: getPastDateStr(3), bookId: 'b1', duration: 60 },
        { date: getPastDateStr(2), bookId: 'b1', duration: 60 }
        // Né ieri né oggi hanno registrazioni
      ]
      expect(AnalyticsService.getStreak(history)).toBe(0)
    })
  })

  describe('getWeeklyActivity', () => {
    it('dovrebbe mappare esattamente gli ultimi 7 giorni', () => {
      const history: ReadingHistoryEntry[] = [
        { date: new Date().toISOString().split('T')[0], bookId: 'b1', duration: 60 } // 1 minuto oggi
      ]

      const activity = AnalyticsService.getWeeklyActivity(history)
      expect(activity.length).toBe(7)
      
      // L'ultimo elemento dell'attività è la giornata di oggi
      const todayActivity = activity[6]
      expect(todayActivity.minutes).toBe(1)
      
      // I giorni precedenti dovrebbero essere a 0
      expect(activity[0].minutes).toBe(0)
      expect(activity[3].minutes).toBe(0)
    })
  })
})
