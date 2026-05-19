import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, Flame, Award, BarChart3, Trophy, Calendar, CheckCircle2, ChevronRight,
  TrendingUp, PieChart, BookOpen, AlertCircle
} from 'lucide-react'
import { AnalyticsService, type ReadingAnalytics, type ReadingHistoryEntry } from '../services/AnalyticsService'
import type { Book } from '../types'

interface StatsViewProps {
  library: Book[]
}

const GENRE_COLORS = [
  'var(--color-primary, #6366f1)', // Indigo / Primary
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#94a3b8'  // Muted Gray
]

export default function StatsView({ library }: StatsViewProps): React.ReactElement {
  const [analytics, setAnalytics] = useState<ReadingAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Carica i dati delle statistiche all'avvio
  useEffect(() => {
    let active = true
    async function fetchStats() {
      try {
        const data = await AnalyticsService.loadAnalytics()
        if (active) {
          setAnalytics(data)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('[StatsView] Errore nel caricamento delle statistiche:', error)
        if (active) {
          setIsLoading(false)
        }
      }
    }
    fetchStats()
    return () => {
      active = false
    }
  }, [])

  // Calcola le metriche generali
  const metrics = useMemo(() => {
    if (!analytics) return {
      totalReadingTimeSec: 0,
      streak: 0,
      completedBooksCount: 0,
      averageMinutesPerDay: 0,
      todayMinutes: 0,
      goalPercentage: 0
    }

    // 1. Tempo totale di lettura (in secondi)
    const totalReadingTimeSec = Object.values(analytics.readingTime).reduce((acc, curr) => acc + curr, 0)

    // 2. Streak
    const streak = AnalyticsService.getStreak(analytics.history)

    // 3. Libri completati (progress >= 100)
    const completedBooksCount = library.filter(b => b.progress >= 100).length

    // 4. Minuti letti oggi
    const todayStr = new Date().toISOString().split('T')[0]
    const todaySeconds = analytics.history
      .filter(entry => entry.date === todayStr)
      .reduce((acc, curr) => acc + curr.duration, 0)
    const todayMinutes = Math.round((todaySeconds / 60) * 10) / 10

    // 5. Percentuale obiettivo giornaliero
    const goalPercentage = Math.min(100, Math.round((todayMinutes / analytics.dailyGoal) * 100))

    // 6. Media dei minuti negli ultimi 7 giorni
    const weeklyActivity = AnalyticsService.getWeeklyActivity(analytics.history)
    const totalWeeklyMinutes = weeklyActivity.reduce((acc, curr) => acc + curr.minutes, 0)
    const averageMinutesPerDay = Math.round((totalWeeklyMinutes / 7) * 10) / 10

    return {
      totalReadingTimeSec,
      streak,
      completedBooksCount,
      averageMinutesPerDay,
      todayMinutes,
      goalPercentage
    }
  }, [analytics, library])

  // Formatta la stringa del tempo totale di lettura
  const formattedTotalTime = useMemo(() => {
    const hours = Math.floor(metrics.totalReadingTimeSec / 3600)
    const minutes = Math.floor((metrics.totalReadingTimeSec % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes} min`
  }, [metrics.totalReadingTimeSec])

  // Genera l'attività settimanale per il grafico
  const weeklyData = useMemo(() => {
    if (!analytics) return []
    return AnalyticsService.getWeeklyActivity(analytics.history)
  }, [analytics])

  // Trova il valore massimo di lettura settimanale per calcolare l'altezza relativa delle barre
  const maxWeeklyMinutes = useMemo(() => {
    if (weeklyData.length === 0) return 10
    const maxVal = Math.max(...weeklyData.map(d => d.minutes))
    return maxVal === 0 ? 10 : maxVal
  }, [weeklyData])

  // Elabora i generi per il grafico a ciambella
  const genreData = useMemo(() => {
    const genreCounts: Record<string, number> = {}
    
    // Tally dei generi presenti nei libri in libreria
    library.forEach(book => {
      const genre = (book.genre || 'Non Specificato').trim()
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })

    const totalBooks = library.length
    if (totalBooks === 0) return []

    // Converte in array, ordina per frequenza decrescente e assegna i colori
    return Object.entries(genreCounts)
      .map(([genre, count], index) => {
        const percentage = Math.round((count / totalBooks) * 100)
        return {
          genre,
          count,
          percentage,
          color: GENRE_COLORS[index % GENRE_COLORS.length]
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [library])

  // Calcola i tracciati SVG per il grafico a ciambella (doughnut) usando stacked stroke-dasharray
  const doughnutSlices = useMemo(() => {
    let accumulatedPercentage = 0
    const radius = 50
    const circumference = 2 * Math.PI * radius // ~314.16

    return genreData.map(data => {
      const strokeLength = (data.percentage / 100) * circumference
      const strokeOffset = circumference - strokeLength + (accumulatedPercentage / 100) * circumference
      accumulatedPercentage += data.percentage

      return {
        ...data,
        strokeDasharray: `${strokeLength} ${circumference}`,
        // L'offset ruota in senso antiorario, quindi lo sottraiamo per muoverci in senso orario
        strokeDashoffset: -((accumulatedPercentage - data.percentage) / 100) * circumference
      }
    })
  }, [genreData])

  // Cronologia dei libri letti di recente (ultimi 4 aperti)
  const recentBooks = useMemo(() => {
    return [...library]
      .filter(b => b.lastOpened)
      .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
      .slice(0, 4)
  }, [library])

  // Gestore per la modifica dell'obiettivo giornaliero
  const handleGoalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!analytics) return
    const nextGoal = parseInt(e.target.value, 10)
    if (isNaN(nextGoal) || nextGoal < 1) return

    // Aggiorna lo stato locale per renderlo reattivo e fluido
    setAnalytics(prev => prev ? { ...prev, dailyGoal: nextGoal } : null)
    
    // Persisti nel DB tramite il servizio
    try {
      await AnalyticsService.updateDailyGoal(nextGoal)
    } catch (err) {
      console.error('[StatsView] Errore nel salvataggio del nuovo obiettivo:', err)
    }
  }

  if (isLoading || !analytics) {
    return (
      <div className="stats-loading">
        <div className="stats-spinner" aria-hidden="true" />
        <p>Caricamento statistiche in corso...</p>
      </div>
    )
  }  return (
    <div className="stats-container">
      {/* Intestazione */}
      <div className="stats-header">
        <div>
          <h1 className="stats-title">Statistiche di Lettura</h1>
          <p className="stats-subtitle">Analizza le tue abitudini e mantieni vivo il tuo ritmo quotidiano.</p>
        </div>
      </div>

      {/* RIGA 1: La Tavola delle Metriche (Monolithic Ribbon) */}
      <div className="stats-metric-ribbon">
        {/* KPI 1: Tempo Totale */}
        <div className="metric-ribbon-col">
          <span className="metric-ribbon-label">Tempo di Lettura</span>
          <span className="metric-ribbon-num">
            {formattedTotalTime.split(' ').map((part, i) => {
              const num = part.replace(/\D/g, '')
              const unit = part.replace(/\d/g, '')
              return (
                <React.Fragment key={i}>
                  {num}
                  <span className="metric-unit">{unit} </span>
                </React.Fragment>
              )
            })}
          </span>
          <span className="metric-ribbon-sub">Dedicato ai tuoi libri</span>
        </div>

        {/* KPI 2: Ritmo Attivo (Streak) */}
        <div className="metric-ribbon-col">
          <div className="flame-label-wrapper">
            <span className="metric-ribbon-label">Ritmo Attivo</span>
            {metrics.streak > 0 && <Flame size={13} className="flame-icon-mini" />}
          </div>
          <span className="metric-ribbon-num">
            {metrics.streak}
            <span className="metric-unit"> {metrics.streak === 1 ? 'giorno' : 'giorni'}</span>
          </span>
          <span className="metric-ribbon-sub">
            {metrics.streak > 0 ? 'Costanza eccellente!' : 'Apri un libro oggi'}
          </span>
        </div>

        {/* KPI 3: Completamenti */}
        <div className="metric-ribbon-col">
          <span className="metric-ribbon-label">Completamenti</span>
          <span className="metric-ribbon-num">
            {metrics.completedBooksCount}
            <span className="metric-unit"> / {library.length}</span>
          </span>
          <span className="metric-ribbon-sub">
            {library.length > 0
              ? `${Math.round((metrics.completedBooksCount / library.length) * 100)}% dei volumi`
              : 'Nessun volume caricato'}
          </span>
        </div>

        {/* KPI 4: Media Giornaliera */}
        <div className="metric-ribbon-col">
          <span className="metric-ribbon-label">Media Giornaliera</span>
          <span className="metric-ribbon-num">
            {metrics.averageMinutesPerDay}
            <span className="metric-unit"> min</span>
          </span>
          <span className="metric-ribbon-sub">Negli ultimi 7 giorni</span>
        </div>
      </div>

      {/* RIGA 2: Griglia Editoriale Asimmetrica */}
      <div className="stats-editorial-grid">
        {/* Colonna Sinistra (Larghezza 60%) */}
        <div className="stats-editorial-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', background: 'transparent' }}>
          
          {/* Attività Settimanale (Technical Chart) */}
          <div className="editorial-panel">
            <div className="editorial-panel__header">
              <div>
                <h3 className="editorial-panel__title">Attività Settimanale</h3>
                <span className="editorial-panel__subtitle">Punti e tracciati di lettura negli ultimi 7 giorni</span>
              </div>
              <span className="editorial-badge">Disegno Tecnico</span>
            </div>

            <div className="weekly-chart-canvas">
              {weeklyData.map((data, index) => {
                const heightPercent = Math.max(4, Math.min(100, (data.minutes / maxWeeklyMinutes) * 100))
                const isToday = index === 6
                const isGoalReached = data.minutes >= analytics.dailyGoal

                return (
                  <div key={data.date} className="weekly-chart-plot-wrapper">
                    <div 
                      className={`weekly-chart-line-stem ${isToday ? 'today-stem' : ''} ${isGoalReached ? 'goal-reached' : ''}`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="bar-tooltip">{data.minutes} min</span>
                      <div className="weekly-chart-plot-node" />
                    </div>
                    <span className={`weekly-chart-plot-label ${isToday ? 'is-today' : ''}`}>
                      {data.dayName}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Attività Recente (Index Catalog) */}
          <div className="editorial-panel">
            <div className="editorial-panel__header">
              <div>
                <h3 className="editorial-panel__title">Catalogo Letture Recenti</h3>
                <span className="editorial-panel__subtitle">Ultimi volumi aperti e relativi tempi di fruizione</span>
              </div>
              <BookOpen size={16} className="panel-header-icon" />
            </div>

            <div className="catalog-list">
              {recentBooks.length === 0 ? (
                <div className="empty-stats-placeholder">
                  <AlertCircle size={28} />
                  <p>Nessuna attività recente registrata. Apri un libro per iniziare a tracciare!</p>
                </div>
              ) : (
                recentBooks.map((book) => {
                  const minutesSpent = analytics.readingTime[book.id]
                    ? Math.round(analytics.readingTime[book.id] / 60)
                    : 0

                  return (
                    <div key={book.id} className="catalog-item">
                      <div className="catalog-cover-box">
                        {book.cover ? (
                          <img src={book.cover} alt="" className="catalog-cover-img" />
                        ) : (
                          <div className="catalog-cover-fallback">
                            <span>{book.title.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="catalog-details">
                        <h4 className="catalog-title" title={book.title}>{book.title}</h4>
                        <span className="catalog-author">{book.author || 'Autore Sconosciuto'}</span>
                        
                        <div className="catalog-progress-grp">
                          <div className="catalog-progress-bar-bg">
                            <div 
                              className="catalog-progress-bar-fill" 
                              style={{ width: `${book.progress || 0}%` }}
                            />
                          </div>
                          <span className="catalog-progress-text">{Math.round(book.progress || 0)}% letto</span>
                        </div>
                      </div>

                      <div className="catalog-stats">
                        <span className="catalog-time-val">{minutesSpent}m</span>
                        <span className="catalog-time-lbl">Letti</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Colonna Destra (Larghezza 40%) */}
        <div className="stats-editorial-right" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', background: 'transparent' }}>
          
          {/* L'Astrolabio dell'Obiettivo */}
          <div className="editorial-panel">
            <div className="editorial-panel__header">
              <div>
                <h3 className="editorial-panel__title">Obiettivo del Giorno</h3>
                <span className="editorial-panel__subtitle">Frazione di tempo programmato letta oggi</span>
              </div>
              <span className="editorial-badge">
                {metrics.goalPercentage >= 100 ? 'Raggiunto' : `${metrics.goalPercentage}%`}
              </span>
            </div>

            <div className="goal-astrolabe-content">
              <div className="astrolabe-container">
                <svg className="astrolabe-svg" width="120" height="120" viewBox="0 0 120 120">
                  {/* Quadranti concentrici ornamentali */}
                  <circle className="astrolabe-outer-ring" cx="60" cy="60" r="54" />
                  <circle className="astrolabe-ticks-ring" cx="60" cy="60" r="48" />
                  
                  {/* Anello di progresso filiforme */}
                  <motion.circle 
                    className={`astrolabe-progress-ring ${metrics.goalPercentage >= 100 ? 'completed' : ''}`}
                    cx="60" 
                    cy="60" 
                    r="48" 
                    strokeWidth="3"
                    strokeDasharray="301.6" /* circumference of radius 48 = 2 * PI * 48 = 301.59 */
                    initial={{ strokeDashoffset: 301.6 }}
                    animate={{ strokeDashoffset: 301.6 - (301.6 * metrics.goalPercentage) / 100 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    transform="rotate(-90 60 60)"
                  />
                  
                  {/* Lancetta dell'Astrolabio */}
                  {(() => {
                    const angle = (metrics.goalPercentage / 100) * 360 - 90
                    return (
                      <line 
                        className={`astrolabe-needle ${metrics.goalPercentage >= 100 ? 'completed' : ''}`}
                        x1="60" 
                        y1="60" 
                        x2="60" 
                        y2="24" /* length of 36px */
                        transform={`rotate(${angle} 60 60)`}
                      />
                    )
                  })()}
                  <circle className="astrolabe-center-pivot" cx="60" cy="60" r="3" />
                </svg>

                <div className="astrolabe-label">
                  <span className="astrolabe-num">{metrics.todayMinutes}</span>
                  <span className="astrolabe-sub">di {analytics.dailyGoal} m</span>
                </div>
              </div>

              {/* Slider d'Ottone per Regolazione */}
              <div className="brass-slider-wrapper">
                <div className="brass-slider-labels">
                  <label htmlFor="daily-goal-range" className="brass-slider-title">Ritmo Giornaliero</label>
                  <span className="brass-slider-value">{analytics.dailyGoal} min</span>
                </div>
                <input
                  id="daily-goal-range"
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={analytics.dailyGoal}
                  onChange={handleGoalChange}
                  className="brass-slider-input"
                />
                <div className="brass-slider-hints">
                  <span>5m</span>
                  <span>120m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generi Letterari (Hairline Circle & Table) */}
          <div className="editorial-panel">
            <div className="editorial-panel__header">
              <div>
                <h3 className="editorial-panel__title">Generi Letterari</h3>
                <span className="editorial-panel__subtitle">Composizione tematica dei tuoi volumi</span>
              </div>
              <PieChart size={16} className="panel-header-icon" />
            </div>

            <div className="genres-panel-content">
              {library.length === 0 ? (
                <div className="empty-stats-placeholder">
                  <AlertCircle size={28} />
                  <p>Nessun libro caricato nella libreria per calcolare i generi.</p>
                </div>
              ) : (
                <>
                  <div className="genres-doughnut-container">
                    <svg className="genres-doughnut-svg" width="120" height="120" viewBox="0 0 120 120">
                      {/* Cerchi concentrici ornamentali di sfondo */}
                      <circle className="genres-doughnut-bg-ring" cx="60" cy="60" r="48" />
                      <circle className="genres-doughnut-decorative-outer" cx="60" cy="60" r="54" />
                      
                      {/* Slices sottilissime (hairline) */}
                      {(() => {
                        let accumulatedPercentage = 0
                        const radius = 48
                        const circumference = 2 * Math.PI * radius // ~301.6

                        return genreData.map((data, idx) => {
                          const strokeLength = (data.percentage / 100) * circumference
                          const strokeOffset = circumference - strokeLength
                          const rotation = -90 + (accumulatedPercentage / 100) * 360
                          accumulatedPercentage += data.percentage

                          return (
                            <circle
                              key={idx}
                              cx="60"
                              cy="60"
                              r={radius}
                              stroke={data.color}
                              strokeDasharray={`${strokeLength} ${circumference}`}
                              strokeDashoffset={strokeOffset}
                              transform={`rotate(${rotation} 60 60)`}
                              className="genres-doughnut-slice-thin"
                              style={{ strokeDasharray: `${strokeLength - (genreData.length > 1 ? 2 : 0)} ${circumference}` }} /* small gap */
                            />
                          )
                        })
                      })()}
                    </svg>
                    
                    <div className="genres-doughnut-center-info">
                      <span className="genres-doughnut-count">{library.length}</span>
                      <span className="genres-doughnut-label">Libri</span>
                    </div>
                  </div>

                  <div className="genres-table">
                    {genreData.slice(0, 4).map((data, idx) => (
                      <div key={idx} className="genres-table-row">
                        <div className="genres-table-label-grp">
                          <span className="genres-table-dot" style={{ backgroundColor: data.color }} />
                          <span className="genres-table-name" title={data.genre}>{data.genre}</span>
                        </div>
                        <span className="genres-table-percentage">{data.percentage}%</span>
                      </div>
                    ))}
                    {genreData.length > 4 && (
                      <div className="genres-table-more">
                        <span>+ altri {genreData.length - 4} generi nel catalogo</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
