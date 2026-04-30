import { supabase, getCurrentUser, signInAnonymously } from './supabase'

export interface Habit {
  id: string
  name: string
  completed_dates: string[]
  created_at: string
}

export interface AppData {
  version: number
  exportedAt: string
  habits: Habit[]
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export async function getHabits(): Promise<Habit[]> {
  try {
    let user = await getCurrentUser()
    if (!user) {
      user = await signInAnonymously()
    }
    if (!user) return []

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching habits:', error)
      return []
    }

    return data.map(habit => ({
      id: habit.id,
      name: habit.name,
      completedDates: habit.completed_dates,
      createdAt: habit.created_at,
    }))
  } catch (error) {
    console.error('Failed to get habits:', error)
    return []
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user) return

    // First, delete existing habits for this user
    await supabase.from('habits').delete().eq('user_id', user.id)

    // Then insert the new ones
    const habitsToInsert = habits.map(habit => ({
      id: habit.id,
      user_id: user.id,
      name: habit.name,
      completed_dates: habit.completedDates,
      created_at: habit.createdAt,
    }))

    const { error } = await supabase.from('habits').insert(habitsToInsert)

    if (error) {
      console.error('Error saving habits:', error)
    }
  } catch (error) {
    console.error('Failed to save habits:', error)
  }
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDateString(yesterday) === dateStr
}

export function calculateStreak(habit: Habit): number {
  if (habit.completedDates.length === 0) return 0

  const sortedDates = [...habit.completedDates].sort().reverse()
  const today = getTodayDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateString(yesterday)

  const lastCompleted = sortedDates[0]
  
  if (lastCompleted !== today && lastCompleted !== yesterdayStr) {
    return 0
  }

  let streak = 0
  let startFrom = lastCompleted === today ? today : yesterdayStr
  
  const startDate = new Date(startFrom + 'T00:00:00')

  for (let i = 0; i < 365; i++) {
    const expectedDate = new Date(startDate)
    expectedDate.setDate(expectedDate.getDate() - i)
    const expectedStr = formatDateString(expectedDate)

    if (sortedDates.includes(expectedStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function getFirstCompletedDate(habit: Habit): string | null {
  if (habit.completedDates.length === 0) return null
  return [...habit.completedDates].sort()[0]
}

export function getTotalDaysSinceStart(habit: Habit): number {
  const firstDate = getFirstCompletedDate(habit)
  if (!firstDate) return 0
  
  const start = new Date(firstDate + 'T00:00:00')
  const today = new Date()
  const diffTime = today.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

export function getCompletionPercentage(habit: Habit): number {
  const totalDays = getTotalDaysSinceStart(habit)
  if (totalDays === 0) return 0
  return Math.round((habit.completedDates.length / totalDays) * 100)
}

export interface HabitStats {
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  totalDays: number
  completionRate: number
  firstDate: string | null
  longestStreakDates: [string, string]
}

export function calculateHabitStats(habit: Habit): HabitStats {
  const sortedDates = [...habit.completedDates].sort()
  
  let longestStreak = 0
  let currentStreak = 0
  let tempStreak = 0
  let longestStreakDates: [string, string] = ['', '']
  let currentStreakStart = ''
  
  const today = getTodayDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateString(yesterday)

  for (let i = 0; i < sortedDates.length; i++) {
    const current = sortedDates[i]
    const prev = i > 0 ? sortedDates[i - 1] : null
    
    if (prev) {
      const prevDate = new Date(prev + 'T00:00:00')
      const currDate = new Date(current + 'T00:00:00')
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        tempStreak++
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
          longestStreakDates = [sortedDates[i - tempStreak], sortedDates[i - 1]]
        }
        tempStreak = 1
      }
    } else {
      tempStreak = 1
    }
    
    if (current === today || current === yesterdayStr) {
      currentStreakStart = current
    }
  }
  
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak
    longestStreakDates = [sortedDates[sortedDates.length - tempStreak], sortedDates[sortedDates.length - 1]]
  }
  
  currentStreak = calculateStreak(habit)
  
  const firstDate = getFirstCompletedDate(habit)
  const totalDays = getTotalDaysSinceStart(habit)
  const completionRate = totalDays > 0 ? Math.round((sortedDates.length / totalDays) * 100) : 0
  
  return {
    currentStreak,
    longestStreak,
    totalCompleted: sortedDates.length,
    totalDays,
    completionRate,
    firstDate,
    longestStreakDates,
  }
}

export function isDateCompleted(habit: Habit, date: string): boolean {
  return habit.completedDates.includes(date)
}

export function toggleDate(habit: Habit, date: string): Habit {
  const isCompleted = habit.completedDates.includes(date)
  
  if (isCompleted) {
    return {
      ...habit,
      completedDates: habit.completedDates.filter(d => d !== date),
    }
  } else {
    return {
      ...habit,
      completedDates: [...habit.completedDates, date].sort(),
    }
  }
}

export async function exportData(): Promise<string> {
  const habits = await getHabits()
  const data: AppData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
  }
  return JSON.stringify(data, null, 2)
}

export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonString) as AppData

    if (!data.habits || !Array.isArray(data.habits)) {
      return { success: false, error: 'Invalid data format' }
    }

    for (const habit of data.habits) {
      if (!habit.id || !habit.name || !Array.isArray(habit.completedDates)) {
        return { success: false, error: 'Invalid habit format' }
      }
    }

    await saveHabits(data.habits)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to parse JSON' }
  }
}

export function getWeekDates(): string[] {
  const dates: string[] = []
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(formatDateString(date))
  }
  
  return dates
}

export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    dates.push(formatDateString(date))
  }
  
  return dates
}

export function getAvailableMonths(): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = []
  const today = new Date()
  const startYear = 2020

  for (let year = today.getFullYear(); year >= startYear; year--) {
    for (let month = 11; month >= 0; month--) {
      if (year === today.getFullYear() && month > today.getMonth()) continue
      months.push({ year, month })
    }
  }

  return months
}

export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export interface DailyCompletion {
  date: string
  completed: number
  total: number
}

export interface WeeklyStats {
  week: string
  completed: number
  rate: number
}

export function getLast30DaysStats(habit: Habit): DailyCompletion[] {
  const result: DailyCompletion[] = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = formatDateString(date)
    const completed = habit.completedDates.includes(dateStr) ? 1 : 0
    result.push({ date: dateStr, completed, total: 1 })
  }
  
  return result
}

export function getLast12WeeksStats(habit: Habit): WeeklyStats[] {
  const result: WeeklyStats[] = []
  const today = new Date()
  
  for (let week = 11; week >= 0; week--) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - (week * 7) - 6)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    let completed = 0
    const current = new Date(weekStart)
    while (current <= weekEnd) {
      if (habit.completedDates.includes(formatDateString(current))) {
        completed++
      }
      current.setDate(current.getDate() + 1)
    }
    
    result.push({
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      completed,
      rate: Math.round((completed / 7) * 100)
    })
  }
  
  return result
}

export function getLast12MonthsStats(habit: Habit): { month: string; completed: number; rate: number }[] {
  const result: { month: string; completed: number; rate: number }[] = []
  const today = new Date()
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    let completed = 0
    const daysInMonth = monthEnd.getDate()
    const current = new Date(monthStart)
    
    while (current <= monthEnd) {
      if (habit.completedDates.includes(formatDateString(current))) {
        completed++
      }
      current.setDate(current.getDate() + 1)
    }
    
    result.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      completed,
      rate: Math.round((completed / daysInMonth) * 100)
    })
  }
  
  return result
}

export function getCompletionByWeekday(habit: Habit): { day: string; count: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  
  for (const dateStr of habit.completedDates) {
    const date = new Date(dateStr + 'T00:00:00')
    counts[date.getDay()]++
  }
  
  return days.map((day, i) => ({ day, count: counts[i] }))
}

export interface HabitInsights {
  dayMostLikelyToComplete: string
  dayMostLikelyToMiss: string
  averageStreak: number
  habitStrength: number
  consistencyScore: number
  weekendVsWeekday: 'weekend' | 'weekday' | 'equal'
  currentWeekCompletion: number
  currentMonthCompletion: number
  totalCompletions: number
  missedDays: number
}

export function calculateHabitInsights(habit: Habit): HabitInsights {
  const today = getTodayDateString()
  const sortedDates = [...habit.completedDates].sort()
  
  if (sortedDates.length === 0) {
    return {
      dayMostLikelyToComplete: 'N/A',
      dayMostLikelyToMiss: 'N/A',
      averageStreak: 0,
      habitStrength: 0,
      consistencyScore: 0,
      weekendVsWeekday: 'equal',
      currentWeekCompletion: 0,
      currentMonthCompletion: 0,
      totalCompletions: 0,
      missedDays: 0,
    }
  }
  
  const weekdayCounts = getCompletionByWeekday(habit)
  const maxCount = Math.max(...weekdayCounts.map(d => d.count))
  const minCount = Math.min(...weekdayCounts.filter(d => d.count > 0).map(d => d.count))
  
  const dayMostLikelyToComplete = weekdayCounts.find(d => d.count === maxCount)?.day || 'Sun'
  const dayMostLikelyToMissObj = weekdayCounts.filter(d => d.count === minCount || d.count === 0)
  const dayMostLikelyToMiss = dayMostLikelyToMissObj.length > 0 ? dayMostLikelyToMissObj[0].day : 'Sat'
  
  let totalStreak = 0
  let streakCount = 0
  let currentTempStreak = 0
  let streaks: number[] = []
  
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      currentTempStreak = 1
    } else {
      const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00')
      const currDate = new Date(sortedDates[i] + 'T00:00:00')
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        currentTempStreak++
      } else {
        streaks.push(currentTempStreak)
        currentTempStreak = 1
      }
    }
  }
  streaks.push(currentTempStreak)
  
  const averageStreak = Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
  
  const firstDate = sortedDates[0]
  const startDate = new Date(firstDate + 'T00:00:00')
  const todayDate = new Date()
  const totalDays = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const missedDays = totalDays - sortedDates.length
  
  const weekdayDays = weekdayCounts.slice(1, 6).reduce((a, b) => a + b.count, 0)
  const weekendDays = weekdayCounts[0].count + weekdayCounts[6].count
  const weekendVsWeekday: 'weekend' | 'weekday' | 'equal' = 
    weekdayDays > weekendDays ? 'weekday' : 
    weekendDays > weekdayDays ? 'weekend' : 'equal'
  
  const weekStart = new Date(todayDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  let currentWeekCompletion = 0
  const currentDateRef = new Date(weekStart)
  while (currentDateRef <= todayDate) {
    if (habit.completedDates.includes(formatDateString(currentDateRef))) {
      currentWeekCompletion++
    }
    currentDateRef.setDate(currentDateRef.getDate() + 1)
  }
  
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  let currentMonthCompletion = 0
  const monthDateRef = new Date(monthStart)
  while (monthDateRef <= todayDate) {
    if (habit.completedDates.includes(formatDateString(monthDateRef))) {
      currentMonthCompletion++
    }
    monthDateRef.setDate(monthDateRef.getDate() + 1)
  }
  
  const currentStreak = calculateStreak(habit)
  const completionRate = totalDays > 0 ? Math.round((sortedDates.length / totalDays) * 100) : 0
  
  const completenessScore = Math.min(completionRate, 100)
  const streakScore = Math.min(currentStreak * 10, 30)
  const consistencyScore = averageStreak > 0 ? Math.min(averageStreak * 5, 30) : 0
  const recencyScore = currentStreak > 0 ? Math.min(currentStreak * 8, 40) : 0
  
  const habitStrength = Math.round(Math.min(
    completenessScore * 0.4 + streakScore * 0.3 + consistencyScore * 0.15 + recencyScore * 0.15,
    100
  ))
  
  const consistencyScoreFinal = Math.round(completionRate)
  
  return {
    dayMostLikelyToComplete,
    dayMostLikelyToMiss,
    averageStreak,
    habitStrength,
    consistencyScore: consistencyScoreFinal,
    weekendVsWeekday,
    currentWeekCompletion,
    currentMonthCompletion,
    totalCompletions: sortedDates.length,
    missedDays,
  }
}

export interface HabitCorrelation {
  habitId: string
  habitName: string
  correlation: number
  coCompletionDays: number
}

export interface LeaderboardEntry {
  id: string
  name: string
  strength: number
  streak: number
  completionRate: number
  totalDays: number
}

export function calculateHabitCorrelations(habit: Habit, allHabits: Habit[]): HabitCorrelation[] {
  if (allHabits.length <= 1) return []
  if (habit.completedDates.length === 0) return []
  
  const habitDatesSet = new Set(habit.completedDates)
  const correlations: HabitCorrelation[] = []
  
  for (const otherHabit of allHabits) {
    if (otherHabit.id === habit.id) continue
    
    let coCompletion = 0
    for (const date of habit.completedDates) {
      if (otherHabit.completedDates.includes(date)) {
        coCompletion++
      }
    }
    
    const probability = habit.completedDates.length > 0 
      ? (coCompletion / habit.completedDates.length) * 100 
      : 0
    
    if (probability >= 30) {
      correlations.push({
        habitId: otherHabit.id,
        habitName: otherHabit.name,
        correlation: Math.round(probability),
        coCompletionDays: coCompletion,
      })
    }
  }
  
  return correlations.sort((a, b) => b.correlation - a.correlation).slice(0, 5)
}

export function calculateMissProbability(habit: Habit): { daily: number; weekly: number; monthly: number } {
  const sortedDates = [...habit.completedDates].sort()
  if (sortedDates.length === 0) return { daily: 100, weekly: 100, monthly: 100 }
  
  const today = getTodayDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateString(yesterday)
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const last30Days = sortedDates.filter(d => d >= formatDateString(thirtyDaysAgo))
  const last7Days = sortedDates.filter(d => d >= formatDateString(sevenDaysAgo))
  const last90Days = sortedDates.filter(d => d >= formatDateString(ninetyDaysAgo))
  
  const recentCompletionRate30 = last30Days.length / 30
  const recentCompletionRate7 = last7Days.length / 7
  const recentCompletionRate90 = last90Days.length / 90
  
  let baseDaily = Math.round((1 - recentCompletionRate30) * 100)
  if (recentCompletionRate30 >= 0.9) baseDaily = 10
  else if (recentCompletionRate30 >= 0.7) baseDaily = 25
  else if (recentCompletionRate30 >= 0.5) baseDaily = 45
  else baseDaily = 65
  
  if (sortedDates.includes(yesterdayStr)) {
    baseDaily = Math.max(5, baseDaily - 15)
  } else {
    baseDaily = Math.min(95, baseDaily + 20)
  }
  
  return {
    daily: baseDaily,
    weekly: Math.round((1 - recentCompletionRate7) * 100),
    monthly: Math.round((1 - recentCompletionRate90) * 100),
  }
}

export function getHabitStrengthScore(habit: Habit): number {
  return calculateHabitInsights(habit).habitStrength
}

export function getLeaderboard(habits: Habit[]): LeaderboardEntry[] {
  return habits
    .map(habit => {
      const insights = calculateHabitInsights(habit)
      const firstDate = getFirstCompletedDate(habit)
      const totalDays = firstDate 
        ? Math.floor((new Date().getTime() - new Date(firstDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1
      const completionRate = totalDays > 0 ? Math.round((insights.totalCompletions / totalDays) * 100) : 0
      
      return {
        id: habit.id,
        name: habit.name,
        strength: insights.habitStrength,
        streak: insights.averageStreak,
        completionRate,
        totalDays: insights.totalCompletions,
      }
    })
    .sort((a, b) => b.strength - a.strength)
}

export interface HeatmapDay {
  date: string
  count: number
  intensity: number
  habits: string[]
}

export function getGlobalHeatmap(habits: Habit[], weeksBack: number = 52): HeatmapDay[] {
  const result: HeatmapDay[] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeksBack * 7))
  
  const dayMap = new Map<string, string[]>()
  for (const habit of habits) {
    for (const date of habit.completedDates) {
      const existing = dayMap.get(date) || []
      existing.push(habit.name)
      dayMap.set(date, existing)
    }
  }
  
  const current = new Date(startDate)
  while (current <= today) {
    const dateStr = formatDateString(current)
    const habitsDone = dayMap.get(dateStr) || []
    const count = habitsDone.length
    const maxHabits = habits.length
    
    result.push({
      date: dateStr,
      count,
      intensity: maxHabits > 0 ? Math.round((count / maxHabits) * 4) : 0,
      habits: habitsDone,
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return result
}

export function getHabitHeatmap(habit: Habit, weeksBack: number = 52): HeatmapDay[] {
  const result: HeatmapDay[] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeksBack * 7))
  
  const completedSet = new Set(habit.completedDates)
  
  const current = new Date(startDate)
  while (current <= today) {
    const dateStr = formatDateString(current)
    const completed = completedSet.has(dateStr)
    
    result.push({
      date: dateStr,
      count: completed ? 1 : 0,
      intensity: completed ? 4 : 0,
      habits: completed ? [habit.name] : [],
    })
    
    current.setDate(current.getDate() + 1)
  }
  
  return result
}

export function getMonthName(month: number): string {
  const date = new Date(2024, month, 1)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export interface AutomaticityData {
  currentAutomaticity: number
  daysToPlateau: number
  consistencyRate: number
  estimatedDaysTo95: number
  trend: 'fast' | 'average' | 'slow'
  curveData: { day: number; actual: number; projected: number }[]
  easeCurveData: { day: number; actual: number; projected: number }[]
}

export function calculateAutomaticity(habit: Habit): AutomaticityData {
  const sortedDates = [...habit.completedDates].sort()
  if (sortedDates.length === 0) {
    return {
      currentAutomaticity: 0,
      daysToPlateau: 0,
      consistencyRate: 0,
      estimatedDaysTo95: 0,
      trend: 'average',
      curveData: [],
      easeCurveData: [],
    }
  }
  
  const firstDate = sortedDates[0]
  const startDate = new Date(firstDate + 'T00:00:00')
  const today = new Date()
  const daysSinceStart = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  
  const recent30Days = sortedDates.filter(d => {
    const date = new Date(d + 'T00:00:00')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return date >= thirtyDaysAgo
  })
  const consistencyRate = Math.round((recent30Days.length / 30) * 100)
  
  const b = 100
  const c = consistencyRate > 80 ? 0.055 : consistencyRate > 60 ? 0.04 : consistencyRate > 40 ? 0.025 : 0.015
  const currentAutomaticity = Math.round(b * (1 - Math.exp(-c * daysSinceStart)))
  
  const daysTo95 = Math.ceil(-Math.log(0.05) / c)
  const estimatedDaysTo95 = Math.max(0, daysTo95 - daysSinceStart)
  
  const trend: 'fast' | 'average' | 'slow' = 
    consistencyRate > 70 ? 'fast' : consistencyRate > 40 ? 'average' : 'slow'
  
  const curveData: { day: number; actual: number; projected: number }[] = []
  const easeCurveData: { day: number; actual: number; projected: number }[] = []
  
  for (let day = 0; day <= 120; day += 7) {
    const actual = day <= daysSinceStart 
      ? Math.round(b * (1 - Math.exp(-c * day)))
      : null
    const projected = Math.round(b * (1 - Math.exp(-c * day)))
    
    curveData.push({ day, actual: actual || 0, projected })
    easeCurveData.push({ day, actual: actual !== null ? 100 - (actual || 0) : 0, projected: 100 - projected })
  }
  
  return {
    currentAutomaticity,
    daysToPlateau: Math.round(daysTo95 * 0.66),
    consistencyRate,
    estimatedDaysTo95,
    trend,
    curveData,
    easeCurveData,
  }
}

export interface HabitReflection {
  id: string
  date: string
  note: string
  tweak?: string
}

export async function getReflections(habit: Habit): Promise<HabitReflection[]> {
  try {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('habit_id', habit.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching reflections:', error)
      return []
    }

    return data.map(reflection => ({
      id: reflection.id,
      date: reflection.date,
      note: reflection.note,
      tweak: reflection.tweak,
    }))
  } catch {
    return []
  }
}

export async function saveReflection(habitId: string, note: string, tweak?: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user) return

    const reflection = {
      id: generateId(),
      habit_id: habitId,
      date: getTodayDateString(),
      note,
      tweak,
    }

    const { error } = await supabase.from('reflections').insert(reflection)

    if (error) {
      console.error('Error saving reflection:', error)
    }
  } catch {
    console.error('Failed to save reflection')
  }
}

export function checkMissedHabits(habits: Habit[]): Habit[] {
  const today = getTodayDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateString(yesterday)
  
  return habits.filter(h => {
    const hasYesterday = h.completedDates.includes(yesterdayStr)
    const hasToday = h.completedDates.includes(today)
    return hasYesterday && !hasToday
  })
}

export interface SmartRecommendation {
  habitId: string
  habitName: string
  missRate: number
  problemPattern: string
  recommendations: { text: string; type: string; potential: number }[]
}

export function getSmartRecommendations(habits: Habit[]): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = formatDateString(thirtyDaysAgo)
  
  const today = getTodayDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateString(yesterday)
  
  for (const habit of habits) {
    const recentCompletions = habit.completedDates.filter(d => d >= thirtyDaysAgoStr && d !== today)
    const missRate = Math.round(((30 - recentCompletions.length) / 30) * 100)
    
    if (missRate >= 40) {
      const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
      for (const date of habit.completedDates) {
        const day = new Date(date + 'T00:00:00').getDay()
        weekdayCounts[day]++
      }
      const avgPerDay = habit.completedDates.length / 7
      const eveningLow = weekdayCounts[5] + weekdayCounts[6] < avgPerDay
      const suggestions: { text: string; type: string; potential: number }[] = []
      
      suggestions.push({ text: 'Try a 2-minute version', type: 'shrink', potential: 34 })
      
      if (weekdayCounts[1] + weekdayCounts[2] > weekdayCounts[5] + weekdayCounts[6]) {
        suggestions.push({ text: 'Move to morning', type: 'time', potential: 42 })
      }
      
      suggestions.push({ text: 'Stack it to an existing habit', type: 'stack', potential: 28 })
      suggestions.push({ text: 'Change your environment', type: 'env', potential: 22 })
      
      let problemPattern = `You missed ${missRate}% of the last 30 days`
      if (eveningLow) {
        problemPattern += '. Most misses on evenings'
      }
      
      recommendations.push({
        habitId: habit.id,
        habitName: habit.name,
        missRate,
        problemPattern,
        recommendations: suggestions.slice(0, 4),
      })
    }
  }
  
  return recommendations
}