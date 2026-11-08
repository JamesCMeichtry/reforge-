import { supabase } from './supabase.js'
import { fetchPackage } from './packages.js'
import { fetchBookings } from './plans.js'
import { fetchRequests } from './coaching.js'
import { inviteTime } from './friends.js'
import { daysAgo } from './programme.js'

// A client at a glance, for the top of their page: when they last trained, how often lately,
// their sorest area, anything waiting on the coach, and their package and next booking.
// Every part is optional: if one lookup fails, the rest still show.

const dateDaysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString('en-CA')
}
const areaLabel = (id) => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')
const settle = (promise) => promise.then((value) => value).catch(() => null)

async function recentTraining(clientId) {
  const { data, error } = await supabase
    .from('set_logs')
    .select('session_date')
    .eq('user_id', clientId)
    .gte('session_date', dateDaysAgo(28))
    .order('session_date', { ascending: false })
    .limit(2000)
  if (error) throw error
  const dates = [...new Set(data.map((row) => row.session_date))]
  const weekAgo = dateDaysAgo(7)
  return { last: dates[0] ?? null, week: dates.filter((d) => d >= weekAgo).length, month: dates.length }
}

async function sorestArea(clientId) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('area_id, session_date, pain_during, pain_after, next_morning, red_flag')
    .eq('user_id', clientId)
    .gte('session_date', dateDaysAgo(14))
    .order('session_date', { ascending: false })
  if (error) throw error
  const latest = new Map()
  for (const row of data) if (!latest.has(row.area_id)) latest.set(row.area_id, row)
  const worst = [...latest.values()]
    .map((row) => ({
      area: areaLabel(row.area_id),
      pain: Math.max(row.pain_during ?? 0, row.pain_after ?? 0, row.next_morning ?? 0),
      flag: row.red_flag,
    }))
    .sort((a, b) => Number(b.flag) - Number(a.flag) || b.pain - a.pain)[0]
  return worst ?? null
}

export async function fetchGlance(clientId) {
  const [training, pain, requests, pkg, bookings] = await Promise.all([
    settle(recentTraining(clientId)),
    settle(sorestArea(clientId)),
    settle(fetchRequests(clientId, true)),
    settle(fetchPackage(clientId)),
    settle(fetchBookings(clientId)),
  ])
  return {
    training,
    pain,
    requests: requests?.length ?? 0,
    pkg,
    nextBooking: bookings?.[0] ?? null,
  }
}

// The short chips under the client's name
export function glanceChips(glance) {
  if (!glance) return []
  const chips = []
  const { training, pain, requests } = glance
  if (training) {
    chips.push({
      key: 'last',
      text: training.last ? `Trained ${daysAgo(training.last).toLowerCase()}` : 'No training in 4 weeks',
      tone: training.last ? null : 'var(--pain-moderate)',
    })
    chips.push({ key: 'week', text: `${training.week} this week · ${training.month} in 4 weeks` })
  }
  if (pain) {
    chips.push({
      key: 'pain',
      text: `${pain.area} ${pain.pain}/10${pain.flag ? ' · red flag' : ''}`,
      tone:
        pain.flag || pain.pain >= 7
          ? 'var(--pain-severe)'
          : pain.pain >= 4
            ? 'var(--pain-moderate)'
            : 'var(--pain-mild)',
    })
  }
  if (requests) {
    chips.push({
      key: 'requests',
      text: `${requests} change ${requests === 1 ? 'request' : 'requests'}`,
      tone: 'var(--color-gold)',
    })
  }
  return chips
}

// One line for the closed "Sessions and bookings" card
export function bookingSummary(glance) {
  if (!glance) return ''
  const parts = []
  if (glance.pkg) parts.push(`${Math.max(0, glance.pkg.left)} of ${glance.pkg.sessions} left`)
  if (glance.nextBooking) parts.push(`Next ${inviteTime(glance.nextBooking.starts_at)}`)
  return parts.join(' · ') || 'None booked'
}
