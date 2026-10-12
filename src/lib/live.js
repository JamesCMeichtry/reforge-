import { supabase } from './supabase.js'
import { me } from './me.js'
import { todayDate } from './programme.js'

// Ids are made on the phone, so a set can be saved, edited or deleted before it ever reaches the database
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/* ---------- Saving that survives bad gym signal ----------
   Every write goes into a queue kept on the phone, then is sent in order. If the signal drops, the queue waits
   and tries again when the phone is back online, so nothing logged is ever lost. */

const QUEUE_KEY = 'reforge.syncQueue'
const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) ?? []
  } catch {
    return []
  }
}
let queue = readQueue()
let syncState = { pending: queue.length, offline: false, failed: 0 }
const listeners = new Set()

function storeQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Storage full or blocked: the queue still works for as long as the app stays open
  }
  syncState = { ...syncState, pending: queue.length }
  listeners.forEach((fn) => fn(syncState))
}

export function subscribeSync(fn) {
  listeners.add(fn)
  fn(syncState)
  return () => listeners.delete(fn)
}

let flushing = false

// kind: 'upsert' (save a row by its id), 'insert' (add a row once) or 'delete' (remove a row by its id)
export function queueWrite(op) {
  const waiting = (q, i) => !(flushing && i === 0) && q.table === op.table
  if (op.kind === 'upsert') {
    // A newer save of the same row replaces one that hasn't been sent yet
    const i = queue.findIndex((q, index) => waiting(q, index) && q.kind === 'upsert' && q.row.id === op.row.id)
    if (i !== -1) {
      queue[i] = op
      storeQueue()
      return flush()
    }
  }
  if (op.kind === 'delete') {
    // Deleting a row that never left the phone: just forget it
    const i = queue.findIndex(
      (q, index) => waiting(q, index) && (q.kind === 'upsert' || q.kind === 'insert') && q.row.id === op.id,
    )
    if (i !== -1) {
      queue.splice(i, 1)
      storeQueue()
      return flush()
    }
  }
  queue.push(op)
  storeQueue()
  return flush()
}

async function send(op) {
  try {
    const table = supabase.from(op.table)
    if (op.kind === 'upsert') return await table.upsert(op.row)
    if (op.kind === 'insert') return await table.insert(op.row)
    return await table.delete().eq('id', op.id)
  } catch (err) {
    return { error: { message: String(err), code: '' } }
  }
}

export async function flush() {
  if (flushing || !queue.length) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    syncState = { ...syncState, offline: true }
    return storeQueue()
  }
  flushing = true
  try {
    while (queue.length) {
      const { error } = await send(queue[0])
      // No error code means the request never reached the database (no signal): keep it and try later
      if (error && !error.code) {
        syncState = { ...syncState, offline: true }
        break
      }
      // A database refusal won't succeed on retry, so drop it rather than block everything behind it
      if (error) {
        console.warn('Reforge: a saved change was refused', error)
        syncState = { ...syncState, failed: syncState.failed + 1 }
      }
      queue.shift()
      syncState = { ...syncState, offline: false }
      storeQueue()
    }
  } finally {
    flushing = false
    storeQueue()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && flush())
  setInterval(() => queue.length && flush(), 10000)
  flush()
}

/* ---------- Live sessions ---------- */

const liveKey = (clientId) => `reforge.live.${clientId}`

export function loadLive(clientId) {
  try {
    return JSON.parse(localStorage.getItem(liveKey(clientId)))
  } catch {
    return null
  }
}

export function saveLive(session) {
  try {
    localStorage.setItem(liveKey(session.clientId), JSON.stringify(session))
  } catch {
    // Without storage the session still runs; it just can't be resumed after closing the app
  }
}

export function clearLive(clientId) {
  try {
    localStorage.removeItem(liveKey(clientId))
  } catch {
    // Nothing to clear
  }
}

// Saves the session itself (today's plan, changes and notes) so the client and the history can see it
export function persistLive(session) {
  queueWrite({
    kind: 'upsert',
    table: 'live_sessions',
    row: {
      id: session.id,
      client_id: session.clientId,
      coach_id: me(),
      programme_id: session.programmeId,
      day_id: session.dayId,
      day_name: session.dayName,
      plan: session.plan,
      changes: session.changes,
      notes: session.notes,
      message: session.message ?? null,
      summary: session.summary ?? null,
      started_at: session.startedAt,
      ended_at: session.endedAt ?? null,
      updated_at: new Date().toISOString(),
    },
  })
}

export function startLive({ clientId, programme, day }) {
  const session = {
    id: newId(),
    clientId,
    programmeId: programme.id,
    dayId: day.id,
    dayName: day.name,
    date: todayDate(),
    startedAt: new Date().toISOString(),
    plan: day.exercises.map((e) => ({ ...e, load: { ...(e.load ?? { kind: 'bodyweight' }) }, status: 'todo' })),
    sets: {},
    changes: [],
    notes: {},
    current: 0,
  }
  saveLive(session)
  persistLive(session)
  return session
}

// One logged set as a row in the client's training log
export function setRow(session, exercise, set) {
  return {
    id: set.id,
    user_id: session.clientId,
    logged_by: me(),
    programme_id: session.programmeId,
    day_name: session.dayName,
    exercise: exercise.name,
    set_number: set.set_number,
    weight_kg: set.weight_kg ?? null,
    band: set.band ?? null,
    reps: set.reps ?? null,
    rpe: set.rpe ?? null,
    pain: set.pain ?? null,
    pain_area: set.pain != null ? (set.pain_area ?? null) : null,
    form: set.form ?? null,
    notes: set.notes || null,
    session_id: session.id,
    session_date: session.date,
  }
}

// Per exercise: the best set ever and the most recent session's sets, from the client's history
export function historyByExercise(rows, excludeIds = new Set()) {
  const map = new Map()
  for (const row of rows) {
    if (excludeIds.has(row.id)) continue
    const entry = map.get(row.exercise) ?? { best: null, last: null }
    const weight = row.weight_kg != null ? Number(row.weight_kg) : null
    if (weight != null && (!entry.best || weight > entry.best.weight)) {
      entry.best = { weight, reps: row.reps ?? 0, date: row.session_date }
    }
    if (!entry.last || row.session_date > entry.last.date) entry.last = { date: row.session_date, sets: [row] }
    else if (row.session_date === entry.last.date) entry.last.sets.push(row)
    map.set(row.exercise, entry)
  }
  for (const entry of map.values()) entry.last?.sets.sort((a, b) => a.set_number - b.set_number)
  return map
}

// Applies the changes the coach chose to keep to the programme's days
export function applyChanges(days, dayId, changes) {
  return days.map((day) => {
    if (day.id !== dayId) return day
    let exercises = [...day.exercises]
    for (const change of changes) {
      const index = exercises.findIndex((e) => e.id === change.exerciseId)
      const clean = (e) => {
        const { status: _status, ...rest } = e
        return rest
      }
      if (change.type === 'add' && !exercises.some((e) => e.id === change.exercise.id)) {
        exercises.push(clean(change.exercise))
      } else if (change.type === 'swap' && index !== -1) {
        exercises[index] = clean(change.exercise)
      } else if (change.type === 'edit' && index !== -1) {
        exercises[index] = { ...exercises[index], ...change.after }
      } else if (change.type === 'skip' && index !== -1) {
        exercises = exercises.filter((e) => e.id !== change.exerciseId)
      }
    }
    return { ...day, exercises }
  })
}

// The most recent finished session a professional ran for this client
export async function fetchLatestSession(clientId = me()) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('id, coach_id, day_name, message, summary, started_at, ended_at')
    .eq('client_id', clientId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
