import { supabase } from './supabase.js'
import { me } from './me.js'
import { fetchInjurySites } from './checkins.js'
import { fetchTargets } from './plans.js'
import { countsReps } from './measure.js'

// The monthly progress report: one month of training, pain and targets, worked out from what's already logged

/* ---------- Months ---------- */

const pad = (n) => String(n).padStart(2, '0')
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

export const thisMonth = () => monthKey(new Date())

export function shiftMonth(month, by) {
  const [y, m] = month.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + by, 1))
}

// The report people see by default: last month's, since this month isn't finished yet
export const lastMonth = () => shiftMonth(thisMonth(), -1)

export function monthName(month, withYear = false) {
  const [y, m] = month.split('-').map(Number)
  const options = withYear ? { month: 'long', year: 'numeric' } : { month: 'long' }
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', options)
}

// Every date in the month, e.g. 2026-10-01 … 2026-10-31
export function monthDates(month) {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  return Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`)
}

const firstDay = (month) => `${month}-01`
const inMonth = (date, month) => typeof date === 'string' && date.slice(0, 7) === month

/* ---------- Fetching ---------- */

// Sets from a year before the month (so new bests can be spotted) up to the month's end
async function fetchSets(userId, from, until) {
  const pageSize = 1000
  const rows = []
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('set_logs')
      .select('id, exercise, session_date, weight_kg, reps, unit, logged_by, with_name')
      .eq('user_id', userId)
      .gte('session_date', from)
      .lt('session_date', until)
      .order('session_date', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}

async function fetchCheckIns(userId, from, until) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('area_id, session_date, pain_during, pain_after, next_morning, red_flag')
    .eq('user_id', userId)
    .gte('session_date', from)
    .lt('session_date', until)
    .order('session_date', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchMonthReport(month, userId = me()) {
  const until = firstDay(shiftMonth(month, 1))
  const [sets, checkIns, sites, targets] = await Promise.all([
    fetchSets(userId, firstDay(shiftMonth(month, -12)), until),
    fetchCheckIns(userId, firstDay(shiftMonth(month, -1)), until),
    fetchInjurySites(userId).catch(() => []),
    fetchTargets(userId).catch(() => []),
  ])
  return buildReport({ month, userId, sets, checkIns, sites, targets })
}

/* ---------- Working it out ---------- */

const areaLabel = (areaId) => {
  const text = areaId.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
const painOf = (c) => c.next_morning ?? c.pain_after ?? c.pain_during
const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null)
const oneDecimal = (n) => Math.round(n * 10) / 10

function trainingStats(sets, month, userId) {
  const rows = sets.filter((s) => inMonth(s.session_date, month))
  const dates = new Set(rows.map((s) => s.session_date))
  const volume = Math.round(
    rows.filter(countsReps).reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0),
  )
  const coached = new Set(rows.filter((s) => s.logged_by && s.logged_by !== userId).map((s) => s.session_date))
  const withFriends = new Set(rows.filter((s) => s.with_name).map((s) => s.session_date))
  // Weeks (Monday start) with at least one session
  const weeks = new Set(
    [...dates].map((d) => {
      const day = new Date(`${d}T12:00:00`)
      day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
      return day.toLocaleDateString('en-CA')
    }),
  )
  return {
    dates,
    sessions: dates.size,
    sets: rows.length,
    volume,
    coached: coached.size,
    withFriends: withFriends.size,
    weeks: weeks.size,
  }
}

// A new best is the heaviest rep set of an exercise in the month beating everything in the year before it
function personalBests(sets, month) {
  const before = new Map()
  const during = new Map()
  for (const s of sets) {
    if (s.weight_kg == null || !countsReps(s)) continue
    const weight = Number(s.weight_kg)
    if (weight <= 0) continue
    if (s.session_date < firstDay(month)) {
      before.set(s.exercise, Math.max(before.get(s.exercise) ?? 0, weight))
    } else if (inMonth(s.session_date, month)) {
      const top = during.get(s.exercise)
      if (!top || weight > top.weight || (weight === top.weight && (s.reps ?? 0) > top.reps)) {
        during.set(s.exercise, { exercise: s.exercise, weight, reps: s.reps ?? 0, date: s.session_date })
      }
    }
  }
  return [...during.values()]
    .filter((top) => before.has(top.exercise) && top.weight > before.get(top.exercise))
    .map((top) => ({
      ...top,
      previous: before.get(top.exercise),
      gain: oneDecimal(top.weight - before.get(top.exercise)),
    }))
    .sort((a, b) => b.gain - a.gain)
}

// Each injured area: average pain this month against last month, its worst day and any warning signs
function painByArea(checkIns, month, sites) {
  const previous = shiftMonth(month, -1)
  const areas = new Map()
  for (const c of checkIns) {
    const pain = painOf(c)
    const entry = areas.get(c.area_id) ?? { areaId: c.area_id, now: [], before: [], flags: 0, peak: null }
    if (inMonth(c.session_date, month)) {
      if (pain != null) {
        entry.now.push(pain)
        if (!entry.peak || pain > entry.peak.pain) entry.peak = { pain, date: c.session_date }
      }
      if (c.red_flag) entry.flags++
    } else if (inMonth(c.session_date, previous) && pain != null) entry.before.push(pain)
    areas.set(c.area_id, entry)
  }
  return [...areas.values()]
    .filter((a) => a.now.length || a.flags)
    .map((a) => {
      const now = average(a.now)
      const before = average(a.before)
      const change = now != null && before != null ? oneDecimal(now - before) : null
      return {
        areaId: a.areaId,
        label: sites.find((s) => s.areaId === a.areaId)?.label ?? areaLabel(a.areaId),
        average: now == null ? null : oneDecimal(now),
        previous: before == null ? null : oneDecimal(before),
        change,
        trend: change == null ? 'new' : change <= -0.5 ? 'down' : change >= 0.5 ? 'up' : 'steady',
        checkIns: a.now.length,
        peak: a.peak,
        flags: a.flags,
      }
    })
    .sort((a, b) => b.flags - a.flags || (b.average ?? 0) - (a.average ?? 0))
}

export function buildReport({ month, userId, sets, checkIns, sites, targets }) {
  const training = trainingStats(sets, month, userId)
  const before = trainingStats(sets, shiftMonth(month, -1), userId)
  const checkInDates = new Set(checkIns.filter((c) => inMonth(c.session_date, month)).map((c) => c.session_date))
  const doneTargets = targets.filter((t) => t.done_at && inMonth(t.done_at.slice(0, 10), month))
  const lastDay = monthDates(month).at(-1)
  const openTargets = targets.filter((t) => !t.done_at && t.created_at?.slice(0, 10) <= lastDay)
  const report = {
    month,
    training,
    previousSessions: before.sessions,
    pbs: personalBests(sets, month),
    pain: painByArea(checkIns, month, sites),
    checkInDays: checkInDates,
    targets: { done: doneTargets, open: openTargets },
  }
  report.empty = !training.sessions && !checkInDates.size && !doneTargets.length
  report.headline = headline(report)
  return report
}

/* ---------- Words ---------- */

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

// One line that sums the month up, e.g. "12 sessions, 3 new bests and left knee pain easing"
export function headline(report, { pain = true } = {}) {
  if (report.empty) return `Nothing logged in ${monthName(report.month)}.`
  const parts = []
  if (report.training.sessions) parts.push(plural(report.training.sessions, 'session'))
  if (report.pbs.length) parts.push(plural(report.pbs.length, 'new best'))
  if (report.targets.done.length) parts.push(plural(report.targets.done.length, 'target') + ' hit')
  const easing = pain ? report.pain.filter((p) => p.trend === 'down') : []
  if (easing.length === 1) parts.push(`${easing[0].label.toLowerCase()} pain easing`)
  else if (easing.length > 1) parts.push('pain easing')
  if (parts.length === 0) return `${plural(report.checkInDays.size, 'check-in')} in ${monthName(report.month)}.`
  const last = parts.pop()
  return `${parts.length ? `${parts.join(', ')} and ` : ''}${last}.`.replace(/^./, (c) => c.toUpperCase())
}

export function painLine(area) {
  if (area.average == null) return `${plural(area.flags, 'warning sign')} reported`
  const base = `Average ${area.average}/10`
  if (area.trend === 'new') return `${base} · first month checked in`
  if (area.trend === 'steady') return `${base} · about the same as last month`
  return `${base} · ${area.trend === 'down' ? 'down' : 'up'} from ${area.previous}`
}

// The report as plain text. Pain is left out unless asked for, so a shared copy only shows training.
export function reportText(report, name, { includePain = false, forYou = false } = {}) {
  const t = report.training
  const owner = forYou ? 'Your ' : name ? `${name}'s ` : ''
  const lines = [`${owner}${monthName(report.month, true)} on Reforge`, headline(report, { pain: includePain }), '']
  if (t.sessions) {
    lines.push(
      `Training: ${plural(t.sessions, 'session')} across ${plural(t.weeks, 'week')}, ${plural(t.sets, 'set')}` +
        (t.volume ? `, ${t.volume.toLocaleString('en-GB')} kg moved` : ''),
    )
  }
  for (const pb of report.pbs.slice(0, 5))
    lines.push(`New best: ${pb.exercise} ${pb.weight} kg × ${pb.reps} (+${pb.gain} kg)`)
  if (includePain) for (const area of report.pain) lines.push(`${area.label}: ${painLine(area).toLowerCase()}`)
  for (const target of report.targets.done) lines.push(`Target hit: ${target.title}`)
  return lines.join('\n').trim()
}
