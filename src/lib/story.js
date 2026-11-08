import { topSets } from './progress.js'

// The one-line stories at the top of busy screens: what's the most important thing to know right now?

const daysAgoDate = (days, from = new Date()) => {
  const date = new Date(from)
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString('en-CA')
}
const round = (value) => Math.round(value * 10) / 10

// Monday of the week a date falls in, as YYYY-MM-DD
function weekOf(value) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date.toLocaleDateString('en-CA')
}

// Sessions per week for the last few weeks, oldest first, this week last
export function weeklySessions(history, weeks = 8, today = new Date()) {
  const thisWeek = weekOf(today.toLocaleDateString('en-CA'))
  const starts = Array.from({ length: weeks }, (_, i) => {
    const date = new Date(`${thisWeek}T12:00:00`)
    date.setDate(date.getDate() - (weeks - 1 - i) * 7)
    return date.toLocaleDateString('en-CA')
  })
  const dates = new Set(history.map((row) => row.session_date))
  const counts = Object.fromEntries(starts.map((start) => [start, 0]))
  for (const date of dates) {
    const week = weekOf(date)
    if (week in counts) counts[week] += 1
  }
  return starts.map((start) => ({ start, count: counts[start] }))
}

// How much a lift has gone up in the window: its heaviest set in the window against its best before it
export function liftGain(history, name, cutoff) {
  const tops = topSets(history, name)
  const within = tops.filter((t) => t.date >= cutoff)
  if (!within.length) return null
  const before = tops.filter((t) => t.date < cutoff)
  const peak = Math.max(...within.map((t) => t.weight))
  const base = before.length ? Math.max(...before.map((t) => t.weight)) : within[0].weight
  return { name, gain: round(peak - base), peak }
}

// Exercises whose heaviest set in the window beat everything before it
export function newBests(history, cutoff) {
  const before = new Map()
  const within = new Map()
  for (const row of history) {
    if (row.weight_kg == null) continue
    const target = row.session_date >= cutoff ? within : before
    target.set(row.exercise, Math.max(target.get(row.exercise) ?? 0, Number(row.weight_kg)))
  }
  return [...within.entries()].filter(([name, weight]) => before.has(name) && weight > before.get(name)).length
}

// The headline for Progress: a strength gain if there is one, otherwise how often you've trained
export function progressStory({ history, lifts, streak, today = new Date() }) {
  const cutoff = daysAgoDate(28, today)
  const weekStart = weekOf(today.toLocaleDateString('en-CA'))
  const recentDates = new Set(history.filter((r) => r.session_date >= cutoff).map((r) => r.session_date))
  const thisWeek = new Set(history.filter((r) => r.session_date >= weekStart).map((r) => r.session_date)).size
  const gains = lifts
    .map((name) => liftGain(history, name, cutoff))
    .filter((g) => g && g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
  const bests = newBests(history, cutoff)

  let headline
  if (gains.length) {
    headline = {
      prefix: '+',
      value: String(gains[0].gain),
      unit: 'kg',
      line: `on your ${gains[0].name.toLowerCase()} in the last 4 weeks`,
      achievement: true,
    }
  } else if (recentDates.size) {
    headline = {
      prefix: '',
      value: String(recentDates.size),
      unit: recentDates.size === 1 ? 'session' : 'sessions',
      line: 'in the last 4 weeks',
      achievement: false,
    }
  } else {
    headline = {
      prefix: '',
      value: '0',
      unit: 'sessions',
      line: 'Log your first session and your story starts here.',
      achievement: false,
    }
  }

  const chips = [`${thisWeek} this week`]
  if (bests) chips.push(`${bests} new ${bests === 1 ? 'best' : 'bests'}`)
  if (streak?.current) chips.push(`${streak.current}-day streak`)
  return { headline, chips, weeks: weeklySessions(history, 8, today) }
}
