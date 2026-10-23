import { supabase } from './supabase.js'
import { me } from './me.js'

// Targets a physio or PT sets for a client, and 1-1 sessions they book, plus adding events to a calendar

/* ---------- Targets ---------- */

export async function fetchTargets(clientId = me()) {
  const { data, error } = await supabase
    .from('targets')
    .select('id, pro_id, title, detail, due_on, done_at, created_at')
    .eq('client_id', clientId)
    .order('due_on', { ascending: true })
  if (error) throw error
  return data
}

export async function addTarget(clientId, { title, detail, dueOn }) {
  const { data, error } = await supabase
    .from('targets')
    .insert({ client_id: clientId, title: title.trim(), detail: detail.trim() || null, due_on: dueOn })
    .select('id, pro_id, title, detail, due_on, done_at, created_at')
    .single()
  if (error) throw error
  return data
}

export async function setTargetDone(id, done) {
  const done_at = done ? new Date().toISOString() : null
  const { error } = await supabase.from('targets').update({ done_at }).eq('id', id)
  if (error) throw error
  return done_at
}

export async function deleteTarget(id) {
  const { error } = await supabase.from('targets').delete().eq('id', id)
  if (error) throw error
}

const toDate = (value) => new Date(`${value}T12:00:00`)
const today = () => toDate(new Date().toLocaleDateString('en-CA'))

// "by 1 Dec · 39 days left", "due today", "3 days overdue"
export function dueText(target) {
  const label = toDate(target.due_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (target.done_at) {
    const done = new Date(target.done_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `Done ${done}`
  }
  const days = Math.round((toDate(target.due_on) - today()) / 86400000)
  if (days > 1) return `by ${label} · ${days} days left`
  if (days === 1) return `by ${label} · 1 day left`
  if (days === 0) return 'Due today'
  return `${-days} ${days === -1 ? 'day' : 'days'} overdue`
}

// How much of the time between setting a target and its deadline has passed, from 0 to 1
export function timeUsed(target) {
  const start = new Date(target.created_at).getTime()
  const end = toDate(target.due_on).getTime()
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)))
}

export const isOverdue = (target) => !target.done_at && toDate(target.due_on) < today()

/* ---------- Booked 1-1 sessions ---------- */

// Sessions still to come (and any that started in the last two hours), soonest first
export async function fetchBookings(clientId = me()) {
  const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('booked_sessions')
    .select('id, pro_id, starts_at, minutes, place')
    .eq('client_id', clientId)
    .is('cancelled_at', null)
    .gte('starts_at', since)
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data
}

export async function bookSession(clientId, { startsAt, minutes, place }) {
  const { data, error } = await supabase
    .from('booked_sessions')
    .insert({ client_id: clientId, starts_at: startsAt.toISOString(), minutes, place: place.trim() || null })
    .select('id, pro_id, starts_at, minutes, place')
    .single()
  if (error) throw error
  return data
}

export async function cancelBooking(id) {
  const { error } = await supabase
    .from('booked_sessions')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/* ---------- Calendar ---------- */

const stamp = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
const escape = (text) =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1')

// event: { id, title, start (Date), minutes, place, details }
export function icsText(event) {
  const end = new Date(event.start.getTime() + (event.minutes ?? 60) * 60000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reforge//Training//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@reforge`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.place ? `LOCATION:${escape(event.place)}` : null,
    event.details ? `DESCRIPTION:${escape(event.details)}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

// iPhone and iPad open calendar files in the Calendar app; other devices download the file to open
export function addToDeviceCalendar(event) {
  const text = icsText(event)
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document
  if (apple) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(text)}`
    return
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.title.replace(/[^\w ]+/g, '').trim() || 'reforge'}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function googleCalendarLink(event) {
  const end = new Date(event.start.getTime() + (event.minutes ?? 60) * 60000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(end)}`,
    details: event.details ?? '',
    location: event.place ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
