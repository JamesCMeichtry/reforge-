import { describeDayChange } from './coaching.js'

// Helpers for the laptop programme builder: tidy exercises, move them about and describe what changed

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export const blankExercise = (from = {}) => ({
  id: newId(),
  section: from.section ?? 'Main',
  name: from.name ?? '',
  sets: from.sets ?? 3,
  reps: from.reps ?? '10',
  load:
    from.load === 'band'
      ? { kind: 'band', value: 'Medium' }
      : from.load === 'bodyweight'
        ? { kind: 'bodyweight' }
        : { kind: 'kg', value: '' },
})

export const blankDay = (count) => ({ id: newId(), name: `Day ${count + 1}`, focus: '', exercises: [] })

// A deep copy with fresh ids, for duplicating a day
export const copyDay = (day, name = `${day.name} (copy)`) => ({
  ...day,
  id: newId(),
  name,
  exercises: day.exercises.map((e) => ({ ...e, id: newId(), load: { ...e.load } })),
})

// The same tidy-up the day editor does before saving
export function cleanExercise(e) {
  return {
    ...e,
    name: e.name.trim(),
    note: e.note?.trim() || undefined,
    sets: Math.min(10, Math.max(1, parseInt(e.sets, 10) || 1)),
    reps: String(e.reps ?? '').trim() || '10',
    rest: Math.min(600, parseInt(e.rest, 10) || 0) || null,
    effort: e.effort || undefined,
    tempo: e.tempo?.trim().slice(0, 40) || undefined,
    load:
      e.load.kind === 'bodyweight'
        ? { kind: 'bodyweight' }
        : e.load.kind === 'kg'
          ? { kind: 'kg', value: parseFloat(String(e.load.value ?? '').replace(',', '.')) || 0 }
          : { kind: 'band', value: String(e.load.value || '').trim() || 'Light' },
  }
}

export const cleanDays = (days) =>
  days.map((day) => ({
    ...day,
    name: day.name.trim(),
    focus: (day.focus ?? '').trim(),
    exercises: day.exercises.map(cleanExercise),
  }))

// What's stopping a save, if anything
export function problems(days) {
  const list = []
  days.forEach((day, i) => {
    if (!day.name.trim()) list.push(`Day ${i + 1} needs a name.`)
    const unnamed = day.exercises.filter((e) => !e.name.trim()).length
    if (unnamed)
      list.push(`${day.name || `Day ${i + 1}`} has ${unnamed} exercise${unnamed === 1 ? '' : 's'} without a name.`)
  })
  return list
}

// Takes an exercise out of one day and puts it into another (or the same one) at a position
export function moveExercise(days, { fromDay, exId, toDay, index }) {
  const source = days.find((d) => d.id === fromDay)
  const exercise = source?.exercises.find((e) => e.id === exId)
  if (!exercise) return days
  const without = days.map((d) =>
    d.id === fromDay ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d,
  )
  return insertExercise(without, toDay, exercise, fromDay === toDay ? adjust(source, exId, index) : index)
}

// Moving down inside the same day: removing it first shifts everything after it up one
function adjust(day, exId, index) {
  const from = day.exercises.findIndex((e) => e.id === exId)
  return from < index ? index - 1 : index
}

export function insertExercise(days, dayId, exercise, index) {
  return days.map((d) => {
    if (d.id !== dayId) return d
    const list = [...d.exercises]
    list.splice(index == null ? list.length : Math.max(0, Math.min(index, list.length)), 0, exercise)
    return { ...d, exercises: list }
  })
}

// One line for the history, covering every day that changed
export function describeChanges(before, after) {
  const parts = []
  const oldById = new Map(before.map((d) => [d.id, d]))
  const newIds = new Set(after.map((d) => d.id))
  for (const day of after) {
    const line = describeDayChange(oldById.get(day.id), day)
    if (line) parts.push(line)
  }
  for (const day of before) if (!newIds.has(day.id)) parts.push(`Removed ${day.name}`)
  const kept = after.filter((d) => oldById.has(d.id)).map((d) => d.id)
  const oldOrder = before.filter((d) => newIds.has(d.id)).map((d) => d.id)
  if (kept.join() !== oldOrder.join()) parts.push('Reordered the days')
  const focusChanged = after.some((d) => oldById.has(d.id) && (oldById.get(d.id).focus ?? '') !== (d.focus ?? ''))
  if (!parts.length && focusChanged) parts.push('Updated day focus')
  return parts.join(' · ') || null
}

// The best set from the last session, as a short line: "80 kg × 5"
export function lastLine(previous) {
  if (!previous?.sets?.length) return null
  const best = [...previous.sets].sort(
    (a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0),
  )[0]
  const load = best.weight_kg ? `${best.weight_kg} kg` : best.band ? `${best.band} band` : 'Bodyweight'
  const date = new Date(previous.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${load}${best.reps ? ` × ${best.reps}` : ''} · ${date}`
}
