import { todayDate } from './programme.js'

// Training blocks: a programme can run for a set number of weeks, with each exercise climbing week by week.
// The saved programme always holds week 1's numbers plus a rule per exercise (`progress`), and every screen
// that shows or runs a session works out this week's numbers from those. Nothing is copied per week.
//
// block:    { weeks: 6, start: 'YYYY-MM-DD', deload: true }   (deload: the last week is lighter)
// progress: { kind: 'kg' | 'reps' | 'sets', step: 2.5 }        (added once per week after week 1)

export const PROGRESS_KINDS = [
  { id: 'kg', label: '+ kg', step: 2.5, unit: 'kg' },
  { id: 'reps', label: '+ reps', step: 1, unit: 'reps' },
  { id: 'sets', label: '+ sets', step: 1, unit: 'sets' },
]
export const MIN_WEEKS = 2
export const MAX_WEEKS = 16

const toDate = (value) => new Date(`${value}T00:00:00`)
const round = (value) => Math.round(value * 4) / 4

// The Monday on or after a date, as YYYY-MM-DD: blocks usually start at the top of a week
export function nextMonday(from = todayDate()) {
  const date = toDate(from)
  const add = (8 - date.getDay()) % 7
  date.setDate(date.getDate() + add)
  return date.toLocaleDateString('en-CA')
}

// Where a block is up to: which week, whether it's the lighter week, whether it has started or finished
export function blockStatus(block, today = todayDate()) {
  if (!block?.weeks) return null
  const days = Math.floor((toDate(today) - toDate(block.start ?? today)) / 86400000)
  const raw = Math.floor(days / 7) + 1
  const finished = raw > block.weeks
  const notStarted = days < 0
  // Once a block ends, sessions stay at its top week (never stuck repeating the lighter week)
  const top = block.deload && block.weeks > 1 ? block.weeks - 1 : block.weeks
  const week = notStarted ? 1 : finished ? top : raw
  return {
    week,
    weeks: block.weeks,
    deload: isDeload(block, week),
    finished,
    notStarted,
    startsOn: block.start,
    label: notStarted
      ? `Starts ${toDate(block.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
      : finished
        ? 'Block finished'
        : `Week ${week} of ${block.weeks}${isDeload(block, week) ? ' · lighter week' : ''}`,
  }
}

export const isDeload = (block, week) => Boolean(block?.deload && block.weeks > 1 && week === block.weeks)

// Adds `amount` to every number in a reps target: "8" → "9", "8-10" → "9-11", "30s" → "35s"
function addToReps(reps, amount) {
  if (!amount) return reps
  return String(reps).replace(/\d+/g, (n) => String(Math.max(1, Number(n) + amount)))
}

// One exercise as it should be done in a given week of the block
export function exerciseForWeek(exercise, week, block) {
  if (!block?.weeks || week <= 1) return exercise
  const deload = isDeload(block, week)
  // The lighter week keeps week 1's numbers with half the sets
  const steps = deload ? 0 : Math.min(week, block.weeks) - 1
  const rule = exercise.progress
  const next = { ...exercise, load: { ...exercise.load } }
  if (rule?.step && steps > 0) {
    const amount = Number(rule.step) * steps
    if (rule.kind === 'kg' && next.load.kind === 'kg' && Number(next.load.value) > 0) {
      next.load.value = round(Number(next.load.value) + amount)
    }
    if (rule.kind === 'reps') next.reps = addToReps(next.reps, Math.round(amount))
    if (rule.kind === 'sets') next.sets = Math.min(10, Math.max(1, Number(next.sets) + Math.round(amount)))
  }
  if (deload) next.sets = Math.max(1, Math.ceil(Number(next.sets) / 2))
  return next
}

export const dayForWeek = (day, week, block) =>
  !block?.weeks || week <= 1 ? day : { ...day, exercises: day.exercises.map((e) => exerciseForWeek(e, week, block)) }

// The programme as it should be trained this week, with the block status alongside
export function programmeThisWeek(programme, today = todayDate()) {
  if (!programme) return programme
  const status = blockStatus(programme.block, today)
  if (!status) return { ...programme, week: null }
  return { ...programme, days: programme.days.map((d) => dayForWeek(d, status.week, programme.block)), week: status }
}

// The reverse, for a change made to this week's numbers during a live session that should be kept:
// takes the progression back off so the saved week 1 numbers stay right
export function baseFromWeek(base, after, week, block) {
  if (!block?.weeks || week <= 1) return after
  const deload = isDeload(block, week)
  const steps = deload ? 0 : Math.min(week, block.weeks) - 1
  const rule = (after.progress ?? base.progress) || null
  const result = { ...after }
  if (deload && 'sets' in after) result.sets = base.sets
  if (rule?.step && steps > 0) {
    const amount = Number(rule.step) * steps
    if (rule.kind === 'kg' && after.load?.kind === 'kg' && Number(after.load.value) > 0) {
      result.load = { ...after.load, value: Math.max(0, round(Number(after.load.value) - amount)) }
    }
    if (rule.kind === 'reps' && 'reps' in after) result.reps = addToReps(after.reps, -Math.round(amount))
    if (rule.kind === 'sets' && 'sets' in after && !deload) {
      result.sets = Math.max(1, Number(after.sets) - Math.round(amount))
    }
  }
  return result
}

// Short text for a rule: "+2.5 kg a week"
export function progressText(rule) {
  if (!rule?.step) return null
  const kind = PROGRESS_KINDS.find((k) => k.id === rule.kind)
  return kind ? `+${rule.step} ${kind.unit} a week` : null
}

export function blockText(block) {
  if (!block?.weeks) return 'No block'
  const start = block.start
    ? ` from ${toDate(block.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : ''
  return `${block.weeks}-week block${start}${block.deload ? ', lighter final week' : ''}`
}
