'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getHabits,
  saveHabits,
  getTodayDateString,
  formatDateString,
  calculateStreak,
  calculateHabitStats,
  isDateCompleted,
  toggleDate,
  exportData,
  importData,
  getWeekDates,
  getMonthDates,
  getAvailableMonths,
  getMonthLabel,
  getFirstCompletedDate,
  getTotalDaysSinceStart,
  getCompletionPercentage,
  getLast30DaysStats,
  getLast12WeeksStats,
  getLast12MonthsStats,
  getCompletionByWeekday,
  calculateHabitInsights,
  calculateHabitCorrelations,
  calculateMissProbability,
  getLeaderboard,
  getGlobalHeatmap,
  getHabitHeatmap,
  getMonthName,
  calculateAutomaticity,
  checkMissedHabits,
  getSmartRecommendations,
  getReflections,
  saveReflection,
  type Habit,
  type HeatmapDay,
} from './lib/storage'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from 'recharts'

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString()
}

function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDateString()
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabitName, setNewHabitName] = useState('')
  const [mounted, setMounted] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [showExportModal, setShowExportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null)
  const [statsHabitId, setStatsHabitId] = useState<string | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [missedHabits, setMissedHabits] = useState<string[]>([])
  const [showReflection, setShowReflection] = useState<string | null>(null)
  const [reflectionNote, setReflectionNote] = useState('')
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'heatmap'>('week')
  const [heatmapHabitId, setHeatmapHabitId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const availableMonths = getAvailableMonths()
  const weekDates = getWeekDates()
  const monthDates = getMonthDates(selectedYear, selectedMonth)

  useEffect(() => {
    const initializeApp = async () => {
      setMounted(true)
      const loadedHabits = await getHabits()
      setHabits(loadedHabits)

      const missed = checkMissedHabits(loadedHabits)
      if (missed.length > 0) {
        setMissedHabits(missed.map(h => h.id))
        setShowNudge(true)
      }
    }
    initializeApp()
  }, [])

  useEffect(() => {
    if (mounted) {
      const save = async () => {
        await saveHabits(habits)
      }
      save()
    }
  }, [habits, mounted])

  useEffect(() => {
    if (editingHabitId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingHabitId])

  const addHabit = useCallback(() => {
    const name = newHabitName.trim()
    if (!name) return

    const newHabit: Habit = {
      id: generateId(),
      name,
      completedDates: [],
      createdAt: getTodayDateString(),
    }

    setHabits(prev => [...prev, newHabit])
    setNewHabitName('')
  }, [newHabitName])

  const toggleHabitForDate = useCallback((id: string, date: string) => {
    if (isFutureDate(date)) return

    setHabits(prev =>
      prev.map(habit => {
        if (habit.id !== id) return habit
        return toggleDate(habit, date)
      })
    )
  }, [])

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  const startEditing = useCallback((habit: Habit) => {
    setEditingHabitId(habit.id)
    setEditingName(habit.name)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingHabitId) return
    
    const name = editingName.trim()
    if (!name) {
      deleteHabit(editingHabitId)
    } else {
      setHabits(prev =>
        prev.map(h => h.id === editingHabitId ? { ...h, name } : h)
      )
    }
    
    setEditingHabitId(null)
    setEditingName('')
  }, [editingHabitId, editingName, deleteHabit])

  const cancelEdit = useCallback(() => {
    setEditingHabitId(null)
    setEditingName('')
  }, [])

  const handleExport = useCallback(async () => {
    const data = await exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitflow-backup-${getTodayDateString()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }, [])

  const handleImport = useCallback(async () => {
    const result = await importData(importText)
    if (result.success) {
      const loadedHabits = await getHabits()
      setHabits(loadedHabits)
      setImportText('')
      setImportError('')
    } else {
      setImportError(result.error || 'Import failed')
    }
  }, [importText])

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const result = await importData(text)
      if (result.success) {
        const loadedHabits = await getHabits()
        setHabits(loadedHabits)
        setImportText('')
        setImportError('')
      } else {
        setImportError(result.error || 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addHabit()
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const getCompletionRate = (habit: Habit, dates: string[]): number => {
    const completed = dates.filter(d => isDateCompleted(habit, d)).length
    return Math.round((completed / dates.length) * 100)
  }

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence>
          {showNudge && missedHabits.length > 0 && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-lg"
            >
              <div className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 border border-amber-500/50 rounded-xl p-4 shadow-lg backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-amber-200">Never Miss Twice</h3>
                      <button 
                        onClick={() => setShowNudge(false)}
                        className="text-muted hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-amber-100/80 mb-3">
                      You missed {missedHabits.length} habit{missedHabits.length > 1 ? 's' : ''} yesterday. Let's fix that today.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { label: 'Move earlier', icon: '🌅' },
                        { label: 'Just 2 min', icon: '⏱️' },
                        { label: 'Stack it', icon: '🔗' },
                        { label: 'Tomorrow', icon: '✓' },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.label === 'Tomorrow') {
                              setShowNudge(false)
                            } else {
                              setShowReflection(missedHabits[0])
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 
                                     rounded-lg text-xs text-amber-100 transition-colors"
                        >
                          {item.icon} {item.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reflectionNote}
                      onChange={e => setReflectionNote(e.target.value)}
                      placeholder="Quick reflection (optional)..."
                      className="w-full h-16 bg-black/30 border border-amber-500/30 rounded-lg px-2 py-1 
                                 text-white text-xs placeholder:text-amber-100/50 resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNudge(false)}
                        className="flex-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-100 py-2 
                                   rounded-lg text-sm font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                       <button
                         onClick={async () => {
                           if (showReflection && reflectionNote) {
                             await saveReflection(showReflection, reflectionNote)
                           }
                           setShowNudge(false)
                           setShowReflection(null)
                           setReflectionNote('')
                         }}
                         className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-2
                                    rounded-lg text-sm font-medium transition-colors"
                       >
                         Save Note
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              HabitFlow
            </h1>
            <p className="text-muted text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportModal(true)}
            className="text-muted hover:text-white text-sm px-3 py-2 rounded-lg border border-border hover:border-primary transition-colors"
          >
            ⚡ Backup
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLeaderboard(true)}
            className="text-muted hover:text-white text-sm px-3 py-2 rounded-lg border border-border hover:border-primary transition-colors"
          >
            🏆 Leaderboard
          </motion.button>
        </header>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a new habit..."
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-3
                         text-white placeholder:text-muted text-base
                         focus:border-primary transition-colors duration-200"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addHabit}
              disabled={!newHabitName.trim()}
              className="bg-primary text-background px-5 py-3 rounded-lg font-medium
                         disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Add
            </motion.button>
          </div>
        </div>

        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewMode === 'week'
                ? 'bg-primary text-background'
                : 'text-muted hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewMode === 'month'
                ? 'bg-primary text-background'
                : 'text-muted hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => { setViewMode('heatmap'); setHeatmapHabitId(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-primary text-background'
                : 'text-muted hover:text-white'
            }`}
          >
            Heatmap
          </button>
          <div className="flex-1" />
          {viewMode === 'week' && (
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5
                         text-white text-sm focus:border-primary"
            >
              {weekDates.map(d => (
                <option key={d} value={d}>
                  {isToday(d) ? 'Today' : formatDisplayDate(d)}
                </option>
              ))}
            </select>
          )}
          {viewMode === 'month' && (
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={e => {
                const [year, month] = e.target.value.split('-').map(Number)
                setSelectedYear(year)
                setSelectedMonth(month)
              }}
              className="bg-surface border border-border rounded-lg px-3 py-1.5
                         text-white text-sm focus:border-primary min-w-[160px]"
            >
              {availableMonths.map(m => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {getMonthLabel(m.year, m.month)}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5
                       text-white text-sm focus:border-primary"
          >
            {(viewMode === 'week' ? weekDates : monthDates).map(d => (
              <option key={d} value={d}>
                {isToday(d) ? 'Today' : new Date(d + 'T00:00:00').getDate()}
              </option>
            ))}
          </select>
        </div>

        {viewMode === 'heatmap' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/30 border border-border rounded-xl p-4 mb-4"
          >
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-sm text-muted">View:</span>
              <button
                onClick={() => setHeatmapHabitId(null)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  !heatmapHabitId
                    ? 'bg-accent text-background'
                    : 'bg-surface border border-border text-muted hover:text-white'
                }`}
              >
                Global
              </button>
              {habits.map(h => (
                <button
                  key={h.id}
                  onClick={() => setHeatmapHabitId(h.id)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    heatmapHabitId === h.id
                      ? 'bg-accent text-background'
                      : 'bg-surface border border-border text-muted hover:text-white'
                  }`}
                >
                  {h.name.length > 15 ? h.name.slice(0, 15) + '...' : h.name}
                </button>
              ))}
            </div>
            
            {(() => {
              const heatmapData = heatmapHabitId 
                ? getHabitHeatmap(habits.find(h => h.id === heatmapHabitId)!, 52)
                : getGlobalHeatmap(habits, 52)
              
              const months: { name: string; startWeek: number }[] = []
              let lastMonth = -1
              heatmapData.forEach((day, i) => {
                const month = new Date(day.date + 'T00:00:00').getMonth()
                if (month !== lastMonth) {
                  months.push({ name: getMonthName(month), startWeek: Math.floor(i / 7) })
                  lastMonth = month
                }
              })
              
              return (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="flex gap-1 mb-2 ml-8">
                      {months.map((m, i) => (
                        <div key={i} className="text-xs text-muted" style={{ marginLeft: i === 0 ? 0 : `${(m.startWeek - (months[i-1]?.startWeek || 0)) * 14 - 28}px` }}>
                          {m.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex">
                      <div className="flex flex-col gap-1 mr-1 text-xs text-muted">
                        <div className="h-3"></div>
                        <div className="h-3">Mon</div>
                        <div className="h-3"></div>
                        <div className="h-3">Wed</div>
                        <div className="h-3"></div>
                        <div className="h-3">Fri</div>
                        <div className="h-3"></div>
                      </div>
                      <div className="grid grid-flow-col gap-[3px]">
                        {Array.from({ length: 53 }).map((_, weekIndex) => (
                          <div key={weekIndex} className="grid grid-rows-7 gap-[3px]">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                              const dataIndex = weekIndex * 7 + dayIndex
                              const day = heatmapData[dataIndex]
                              if (!day) return <div key={dayIndex} className="w-3 h-3" />
                              
                              const intensity = day.intensity
                              const colors = [
                                'bg-surface/30',
                                'bg-accent/25',
                                'bg-accent/50', 
                                'bg-accent/70',
                                'bg-accent'
                              ]
                              const tooltipDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              const streakInfo = dataIndex > 0 ? (() => {
                                let streak = 0
                                for (let i = dataIndex; i >= 0; i--) {
                                  if (heatmapData[i]?.count > 0) streak++
                                  else break
                                }
                                return streak
                              })() : 0
                              
                              return (
                                <div
                                  key={dayIndex}
                                  title={`${tooltipDate}: ${day.count} habit${day.count !== 1 ? 's' : ''} done${streakInfo > 1 ? ` • ${streakInfo} day streak` : ''}`}
                                  className={`w-3 h-3 rounded-sm ${colors[intensity]} hover:ring-1 hover:ring-white/50 transition-all cursor-default`}
                                />
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted">
                      <span>Less</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-surface/30" />
                        <div className="w-3 h-3 rounded-sm bg-accent/25" />
                        <div className="w-3 h-3 rounded-sm bg-accent/50" />
                        <div className="w-3 h-3 rounded-sm bg-accent/70" />
                        <div className="w-3 h-3 rounded-sm bg-accent" />
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}

        {viewMode !== 'heatmap' && (
          <section className="mb-4">
            <div className="text-sm text-muted mb-2">
              Checking: <span className="text-white font-medium">{formatDisplayDate(selectedDate)}</span>
            </div>
          </section>
        )}

        <section>
          {habits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-lg p-8 text-center"
            >
              <p className="text-muted mb-2">No habits yet</p>
              <p className="text-muted text-sm">
                Add your first habit above to get started
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {habits.map(habit => {
                  const isCompleted = isDateCompleted(habit, selectedDate)
                  const streak = calculateStreak(habit)
                  const isExpanded = expandedHabitId === habit.id
                  const datesToShow = viewMode === 'week' ? weekDates : monthDates

                  return (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      layout
                      className="bg-surface border border-border rounded-lg overflow-hidden"
                    >
                      <div className="p-4 flex items-center gap-3 group">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleHabitForDate(habit.id, selectedDate)}
                          disabled={isFutureDate(selectedDate)}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0
                                     flex items-center justify-center transition-colors duration-200
                                     ${isCompleted
                                       ? 'bg-accent border-accent'
                                       : 'border-muted hover:border-primary'
                                     }
                                     ${isFutureDate(selectedDate) ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          {isCompleted && (
                            <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#0D0D0D"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </motion.svg>
                          )}
                        </motion.button>

                        {editingHabitId === habit.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveEdit}
                            className="flex-1 bg-background border border-border rounded px-2 py-1
                                       text-white text-base focus:border-primary"
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(habit)}
                            className={`flex-1 truncate cursor-pointer transition-colors duration-200
                                       ${isCompleted ? 'text-muted line-through' : 'text-white'}
                                       hover:text-primary`}
                          >
                            {habit.name}
                          </span>
                        )}

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setStatsHabitId(habit.id)}
                            className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
                          >
                            <span>📊</span>
                            <span className="font-mono font-bold">
                              {getCompletionPercentage(habit)}%
                            </span>
                          </button>

                          <motion.div
                            key={streak}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1 text-sm hidden md:flex"
                          >
                            <span className="text-accent">🔥</span>
                            <span className="font-mono font-bold text-accent">
                              {streak}
                            </span>
                          </motion.div>

                          <button
                            onClick={() => setExpandedHabitId(isExpanded ? null : habit.id)}
                            className="text-muted hover:text-white transition-colors"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deleteHabit(habit.id)}
                            className="opacity-0 group-hover:opacity-100 text-danger
                                       text-sm px-2 py-1 transition-opacity duration-200"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border overflow-hidden"
                          >
                            <div className="p-3 bg-background/50">
                              <div className="flex flex-wrap gap-1.5">
                                {datesToShow.map(date => {
                                  const done = isDateCompleted(habit, date)
                                  const future = isFutureDate(date)
                                  
                                  return (
                                    <button
                                      key={date}
                                      onClick={() => !future && toggleHabitForDate(habit.id, date)}
                                      disabled={future}
                                      title={formatDisplayDate(date)}
                                      className={`w-8 h-8 rounded text-xs font-medium transition-all
                                                 ${future ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110'}
                                                 ${done
                                                   ? 'bg-accent text-background'
                                                   : 'bg-surface text-muted hover:text-white'
                                                 }`}
                                    >
                                      {new Date(date + 'T00:00:00').getDate()}
                                    </button>
                                  )
                                })}
                              </div>
                              <div className="mt-3 flex gap-4 text-xs text-muted">
                                <span>
                                  Current streak: <span className="text-accent font-mono">{streak}</span>
                                </span>
                                <span>
                                  This {viewMode}:{' '}
                                  <span className="text-white font-mono">
                                    {getCompletionRate(habit, datesToShow)}%
                                  </span>
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        <AnimatePresence>
          {statsHabitId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background z-50 overflow-y-auto"
              style={{ background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 50%, #0D0D0D 100%)' }}
            >
              {(() => {
                const habit = habits.find(h => h.id === statsHabitId)
                if (!habit) return null
                const stats = calculateHabitStats(habit)
                const insights = calculateHabitInsights(habit)
                const correlations = calculateHabitCorrelations(habit, habits)
                const missProb = calculateMissProbability(habit)
                const automaticity = calculateAutomaticity(habit)
                const firstDate = getFirstCompletedDate(habit)
                const totalDays = getTotalDaysSinceStart(habit)
                const allDates = [...habit.completedDates].sort()
                const dailyData = getLast30DaysStats(habit).map(d => ({
                  ...d,
                  date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }))
                const weeklyData = getLast12WeeksStats(habit)
                const monthlyData = getLast12MonthsStats(habit)
                const weekdayData = getCompletionByWeekday(habit)
                
                const CustomTooltip = ({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface border border-border px-3 py-2 rounded-lg">
                        <p className="text-white text-sm">{payload[0].payload.date || payload[0].payload.week || payload[0].payload.month}</p>
                        <p className="text-accent text-sm font-mono">{payload[0].value}</p>
                      </div>
                    )
                  }
                  return null
                }
                
                return (
                  <div className="max-w-4xl mx-auto p-4 md:p-8">
                    <button
                      onClick={() => setStatsHabitId(null)}
                      className="mb-6 text-muted hover:text-white flex items-center gap-2 transition-colors"
                    >
                      ← Back to habits
                    </button>
                    
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="mb-8"
                    >
                      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{habit.name}</h1>
                      <p className="text-muted">
                        Tracking since{' '}
                        <span className="text-accent">
                          {firstDate ? new Date(firstDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Never'}
                        </span>
                      </p>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-2xl p-5 md:p-6 text-center"
                      >
                        <div className="text-3xl md:text-5xl font-mono font-bold text-accent">{stats.currentStreak}</div>
                        <div className="text-xs md:text-sm text-accent/70 mt-2">Current Streak</div>
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-5 md:p-6 text-center"
                      >
                        <div className="text-3xl md:text-5xl font-mono font-bold text-primary">{stats.longestStreak}</div>
                        <div className="text-xs md:text-sm text-primary/70 mt-2">Best Streak</div>
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-surface border border-border rounded-2xl p-5 md:p-6 text-center"
                      >
                        <div className="text-3xl md:text-5xl font-mono font-bold text-white">{stats.totalCompleted}</div>
                        <div className="text-xs md:text-sm text-muted mt-2">Days Done</div>
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="bg-surface border border-border rounded-2xl p-5 md:p-6 text-center"
                      >
                        <div className="text-3xl md:text-5xl font-mono font-bold text-white">{totalDays}</div>
                        <div className="text-xs md:text-sm text-muted mt-2">Total Days</div>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-surface/50 border border-border rounded-2xl p-6 mb-6"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-medium text-white">Overall Completion</h2>
                        <span className="text-4xl font-mono font-bold text-accent">{stats.completionRate}%</span>
                      </div>
                      <div className="h-4 bg-background/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.completionRate}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full"
                          style={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.32 }}
                      className="bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30 rounded-2xl p-5 mb-6"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-md font-medium text-white">Habit Formation</h3>
                        <span className="text-xs text-muted">(Lally 2010 model)</span>
                      </div>
                      
                      <div className="flex items-center gap-6 mb-4">
                        <div className="relative w-24 h-24">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="#1A1A1A"
                              strokeWidth="8"
                              fill="none"
                            />
                            <motion.circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke={automaticity.currentAutomaticity > 60 ? '#4ADE80' : automaticity.currentAutomaticity > 40 ? '#FBBF24' : '#EF4444'}
                              strokeWidth="8"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${automaticity.currentAutomaticity * 2.51} 251`}
                              initial={{ strokeDasharray: '0 251' }}
                              animate={{ strokeDasharray: `${automaticity.currentAutomaticity * 2.51} 251` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-mono font-bold text-white">{automaticity.currentAutomaticity}%</span>
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted">Estimated days to 95%</span>
                              <span className="text-accent font-mono font-bold">{automaticity.estimatedDaysTo95 > 0 ? automaticity.estimatedDaysTo95 : 'Done!'}</span>
                            </div>
                            <div className="text-xs text-muted">
                              {automaticity.estimatedDaysTo95 > 0 
                                ? `${automaticity.estimatedDaysTo95} more days to automaticity`
                                : 'You\'ve reached automaticity!'}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted">Your consistency</span>
                              <span className="text-white font-mono">{automaticity.consistencyRate}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">Trend:</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              automaticity.trend === 'fast' ? 'bg-accent/20 text-accent' :
                              automaticity.trend === 'average' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {automaticity.trend === 'fast' ? '↑ Faster than average' : 
                               automaticity.trend === 'average' ? '→ Average speed' :
                               '↓ Slower than average'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {(() => {
                      const recs = getSmartRecommendations(habits).filter(r => r.habitId === habit.id)
                      if (recs.length > 0) {
                        const rec = recs[0]
                      return (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.34 }}
                          className="bg-gradient-to-r from-amber-900/20 to-orange-900/10 border border-amber-500/30 rounded-2xl p-4 mb-6"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">⚡</span>
                            <h3 className="text-md font-medium text-amber-200">Make it easier</h3>
                          </div>
                          <p className="text-sm text-muted mb-3">{rec.problemPattern}</p>
                          <div className="space-y-2">
                            {rec.recommendations.map((r, i) => (
                              <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                                <span className="text-sm text-white">{r.text}</span>
                                <span className="text-xs text-accent">+{r.potential}%</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )
                      }
                      return null
                    })()}

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.33 }}
                      className="bg-surface/50 border border-border rounded-2xl p-4 mb-6"
                    >
                      <h3 className="text-sm font-medium text-white mb-3">Your Automaticity Curve</h3>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={automaticity.curveData}>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-surface border border-border px-2 py-1 rounded text-xs">
                                      Day {payload[0].payload.day}: {payload[0].payload.actual}%
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="actual" 
                              stroke="#4ADE80" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="projected" 
                              stroke="#4ADE80" 
                              strokeWidth={2} 
                              strokeDasharray="5 5"
                              dot={false}
                              strokeOpacity={0.4}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-accent"></div>
                          <span>Your curve</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-accent/40 border-dash"></div>
                          <span>Projected</span>
                        </div>
                      </div>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="bg-surface/50 border border-border rounded-2xl p-5"
                      >
                        <h3 className="text-md font-medium text-white mb-4">Last 30 Days</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                              <defs>
                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Tooltip content={<CustomTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="completed"
                                stroke="#4ADE80"
                                strokeWidth={2}
                                fill="url(#colorCompleted)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-surface/50 border border-border rounded-2xl p-5"
                      >
                        <h3 className="text-md font-medium text-white mb-4">Last 12 Weeks</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                              <Tooltip content={<CustomTooltip />} />
                              <Bar
                                dataKey="completed"
                                fill="#4ADE80"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="bg-surface/50 border border-border rounded-2xl p-5"
                      >
                        <h3 className="text-md font-medium text-white mb-4">Last 12 Months</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                              <Tooltip content={<CustomTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="completed"
                                stroke="#4ADE80"
                                strokeWidth={2}
                                dot={{ fill: '#4ADE80', strokeWidth: 0 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-surface/50 border border-border rounded-2xl p-5"
                      >
                        <h3 className="text-md font-medium text-white mb-4">Completion by Day</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekdayData} layout="vertical">
                              <Tooltip content={<CustomTooltip />} />
                              <Bar
                                dataKey="count"
                                fill="#E8F5E9"
                                radius={[0, 4, 4, 0]}
                              />
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="day" width={30} tick={{ fill: '#737373', fontSize: 10 }} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    </div>

                    {stats.longestStreakDates[0] && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-2xl p-5 mb-6"
                      >
                        <h3 className="text-md font-medium text-white mb-2">Best Streak Ever</h3>
                        <p className="text-muted">
                          <span className="text-accent font-mono text-lg">{stats.longestStreak} consecutive days</span>
                          <span className="mx-2">•</span>
                          <span className="text-white">
                            {new Date(stats.longestStreakDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="text-white">
                            {new Date(stats.longestStreakDates[1] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                        </p>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.55 }}
                      className="bg-gradient-to-br from-purple-900/30 to-accent/10 border border-purple-500/30 rounded-2xl p-5 mb-6"
                    >
                      <h3 className="text-md font-medium text-white mb-4 flex items-center gap-2">
                        <span>💪</span> Habit Strength
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart data={[{ name: 'strength', value: insights.habitStrength }]} innerRadius="70%" outerRadius="100%">
                              <RadialBar
                                background={{ fill: '#1A1A1A' }}
                                dataKey="value"
                                fill="#4ADE80"
                                cornerRadius={10}
                              />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-mono font-bold text-white">{insights.habitStrength}</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted">Current Streak</span>
                            <span className="text-accent font-mono">{stats.currentStreak} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted">Avg Streak</span>
                            <span className="text-white font-mono">{insights.averageStreak} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted">Consistency</span>
                            <span className="text-white font-mono">{insights.consistencyScore}%</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.57 }}
                      className="grid grid-cols-2 gap-4 mb-6"
                    >
                      <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="text-lg mb-1">🎯</div>
                        <div className="text-xs text-muted mb-1">Most Completed</div>
                        <div className="text-accent font-mono font-bold">{insights.dayMostLikelyToComplete}</div>
                      </div>
                      <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="text-lg mb-1">⚠️</div>
                        <div className="text-xs text-muted mb-1">Most Missed</div>
                        <div className="text-danger font-mono font-bold">{insights.dayMostLikelyToMiss}</div>
                      </div>
                      <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="text-lg mb-1">📅</div>
                        <div className="text-xs text-muted mb-1">This Week</div>
                        <div className="text-white font-mono font-bold">{insights.currentWeekCompletion}/7</div>
                      </div>
                      <div className="bg-surface/50 border border-border rounded-xl p-4">
                        <div className="text-lg mb-1">📆</div>
                        <div className="text-xs text-muted mb-1">This Month</div>
                        <div className="text-white font-mono font-bold">{insights.currentMonthCompletion}</div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.58 }}
                      className="bg-surface/50 border border-border rounded-xl p-4 mb-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Week vs Weekend</span>
                        <span className={`font-mono font-bold ${
                          insights.weekendVsWeekday === 'weekday' ? 'text-primary' :
                          insights.weekendVsWeekday === 'weekend' ? 'text-accent' : 'text-white'
                        }`}>
                          {insights.weekendVsWeekday === 'weekday' ? '📅 Weekdays better' :
                           insights.weekendVsWeekday === 'weekend' ? '🎉 Weekends better' : '⚖️ Equal'}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.59 }}
                      className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-4 mb-6"
                    >
                      <h3 className="text-sm font-medium text-white mb-3">Chance of Missing</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-xl font-mono font-bold text-red-400">{missProb.daily}%</div>
                          <div className="text-xs text-muted">Today</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-mono font-bold text-orange-400">{missProb.weekly}%</div>
                          <div className="text-xs text-muted">This Week</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-mono font-bold text-yellow-400">{missProb.monthly}%</div>
                          <div className="text-xs text-muted">This Month</div>
                        </div>
                      </div>
                    </motion.div>

                    {correlations.length > 0 && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4 mb-6"
                      >
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <span>🔗</span> Likely paired with
                        </h3>
                        <div className="space-y-2">
                          {correlations.map(corr => (
                            <div key={corr.habitId} className="flex items-center justify-between">
                              <span className="text-white text-sm truncate">{corr.habitName}</span>
                              <span className="text-blue-400 font-mono text-sm">{corr.correlation}%</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="bg-surface/50 border border-border rounded-2xl p-5"
                    >
                      <h3 className="text-md font-medium text-white mb-4">All Completed Days ({allDates.length})</h3>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {allDates.map(date => (
                          <motion.span
                            key={date}
                            whileHover={{ scale: 1.1 }}
                            className="bg-accent/20 text-accent px-3 py-1.5 rounded-lg text-sm cursor-default"
                          >
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
              onClick={() => setShowLeaderboard(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏆 Leaderboard
                  </h2>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-muted hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-3">
                  {getLeaderboard(habits).map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => {
                        setShowLeaderboard(false)
                        setStatsHabitId(entry.id)
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                        index === 0 
                          ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50' :
                        index === 1
                          ? 'bg-gradient-to-r from-gray-400/20 to-slate-400/20 border border-gray-400/50' :
                        index === 2
                          ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-600/50' :
                        'bg-surface/50 border border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-surface text-muted'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{entry.name}</div>
                          <div className="text-xs text-muted">
                            {entry.totalDays} days • {entry.completionRate}% rate
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-mono font-bold ${
                            entry.strength >= 80 ? 'text-accent' :
                            entry.strength >= 50 ? 'text-primary' : 'text-muted'
                          }`}>
                            {entry.strength}
                          </div>
                          <div className="text-xs text-muted">strength</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {habits.length === 0 && (
                  <p className="text-center text-muted py-8">No habits yet</p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showExportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
              onClick={() => setShowExportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-white mb-4">Backup & Restore</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-muted mb-2">Export Data</h3>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExport}
                      className="w-full bg-primary text-background py-3 rounded-lg font-medium"
                    >
                      📥 Download Backup
                    </motion.button>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm text-muted mb-2">Import Data</h3>
                    <textarea
                      value={importText}
                      onChange={e => {
                        setImportText(e.target.value)
                        setImportError('')
                      }}
                      placeholder='Paste your backup JSON here...'
                      className="w-full h-24 bg-background border border-border rounded-lg px-3 py-2
                                 text-white text-sm placeholder:text-muted resize-none"
                    />
                    {importError && (
                      <p className="text-danger text-sm mt-1">{importError}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleImport}
                        disabled={!importText.trim()}
                        className="flex-1 bg-accent text-background py-2 rounded-lg font-medium
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Import Text
                      </motion.button>
                      <label className="flex-1 bg-surface border border-border py-2 rounded-lg
                                        font-medium text-center cursor-pointer hover:border-primary transition-colors">
                        📂 Import File
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowExportModal(false)}
                  className="mt-4 w-full text-muted hover:text-white py-2 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}