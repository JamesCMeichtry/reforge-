import { supabase } from './supabase.js'
import { me } from './me.js'

// Messages between a client and their physio or PT. Each conversation is one client and one professional.

const FIELDS = 'id, client_id, pro_id, sender_id, body, created_at, read_at'

// The latest messages in a conversation, oldest first
export async function fetchMessages(clientId, proId, limit = 200) {
  const { data, error } = await supabase
    .from('messages')
    .select(FIELDS)
    .eq('client_id', clientId)
    .eq('pro_id', proId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return [...data].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

export async function sendMessage(clientId, proId, body) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ client_id: clientId, pro_id: proId, body: body.trim() })
    .select(FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function markRead(clientId, proId) {
  const { error } = await supabase.rpc('read_messages', { client: clientId, pro: proId })
  if (error) throw error
}

// Unread messages sent to me, newest first: [{ otherId, count, last }]
export async function fetchUnread() {
  const { data, error } = await supabase
    .from('messages')
    .select(FIELDS)
    .is('read_at', null)
    .neq('sender_id', me())
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const byPerson = new Map()
  for (const m of data) {
    const entry = byPerson.get(m.sender_id) ?? { otherId: m.sender_id, count: 0, last: m }
    entry.count += 1
    byPerson.set(m.sender_id, entry)
  }
  return [...byPerson.values()]
}

// "14:05", "Yesterday 14:05", "Mon 14:05", "3 Oct 14:05"
export function messageTime(value) {
  const date = new Date(value)
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const day = (d) => d.toLocaleDateString('en-CA')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (day(date) === day(today)) return time
  if (day(date) === day(yesterday)) return `Yesterday ${time}`
  if (today - date < 6 * 86400000) return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`
}

// The heading between days in a conversation: "Today", "Yesterday", "Monday 19 October"
export function dayLabel(value) {
  const date = new Date(value)
  const day = (d) => d.toLocaleDateString('en-CA')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (day(date) === day(new Date())) return 'Today'
  if (day(date) === day(yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
