import { supabase } from './supabase.js'
import { me } from './me.js'
import { PROFESSIONS } from './profile.js'

const PROFILE_FIELDS = 'id, display_name, profession, business_name, body'

export const professionLabel = (id) => PROFESSIONS.find((p) => p.id === id)?.label ?? 'Professional'

// Messages from the database functions are already written for people, so show them as they are
const friendly = (error) => error?.message || 'Something went wrong. Try again.'

async function profilesFor(ids) {
  if (!ids.length) return []
  const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', ids)
  if (error) throw error
  return data
}

// Client side: the professionals looking after me
export async function fetchMyPros() {
  const { data, error } = await supabase.from('connections').select('pro_id, created_at').eq('client_id', me())
  if (error) throw error
  const profiles = await profilesFor(data.map((row) => row.pro_id))
  return data.map((row) => ({ ...profiles.find((p) => p.id === row.pro_id), since: row.created_at }))
}

export async function createConnectCode() {
  const { data, error } = await supabase.rpc('new_connect_code')
  if (error) throw new Error(friendly(error))
  return data
}

export async function disconnect(clientId, proId) {
  const { error } = await supabase.from('connections').delete().eq('client_id', clientId).eq('pro_id', proId)
  if (error) throw error
}

const dateDaysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString('en-CA')
}

// Professional side: my clients, with what needs the coach's attention for each one
export async function fetchMyClients() {
  const { data, error } = await supabase.from('connections').select('client_id, created_at').eq('pro_id', me())
  if (error) throw error
  const ids = data.map((row) => row.client_id)
  const profiles = await profilesFor(ids)
  const none = { data: [] }
  const [recent, requests, sets, reviews] = ids.length
    ? await Promise.all([
        supabase
          .from('check_ins')
          .select('user_id, session_date, pain_after, next_morning, pain_during, red_flag')
          .in('user_id', ids)
          .gte('session_date', dateDaysAgo(14))
          .order('session_date', { ascending: false }),
        supabase.from('change_requests').select('client_id').in('client_id', ids).is('resolved_at', null),
        supabase
          .from('set_logs')
          .select('user_id, session_date, logged_by')
          .in('user_id', ids)
          .gte('session_date', dateDaysAgo(14))
          .limit(5000),
        supabase
          .from('session_reviews')
          .select('client_id, session_date')
          .in('client_id', ids)
          .gte('session_date', dateDaysAgo(14)),
      ])
    : [none, none, none, none]
  for (const result of [recent, requests, sets, reviews]) if (result.error) throw result.error
  const weekAgo = dateDaysAgo(7)

  return data
    .map((row) => {
      const id = row.client_id
      const checkIns = recent.data.filter((c) => c.user_id === id)
      const thisWeek = checkIns.filter((c) => c.session_date >= weekAgo)
      const worst = Math.max(-1, ...checkIns.map((c) => c.next_morning ?? c.pain_after ?? -1))
      const worstWeek = Math.max(
        -1,
        ...thisWeek.map((c) => Math.max(c.next_morning ?? -1, c.pain_after ?? -1, c.pain_during ?? -1)),
      )
      const theirSets = sets.data.filter((s) => s.user_id === id)
      const reviewed = new Set(reviews.data.filter((r) => r.client_id === id).map((r) => r.session_date))
      // Solo sessions this week: days the client logged sets themselves, not yet looked at by the coach
      const soloDates = [
        ...new Set(
          theirSets.filter((s) => s.logged_by !== me() && s.session_date >= weekAgo).map((s) => s.session_date),
        ),
      ]
      const trainedDates = [...new Set(theirSets.map((s) => s.session_date))].sort().reverse()
      const lastActive = [trainedDates[0], checkIns[0]?.session_date].filter(Boolean).sort().reverse()[0] ?? null
      return {
        ...profiles.find((p) => p.id === id),
        id,
        since: row.created_at,
        lastCheckIn: checkIns[0]?.session_date ?? null,
        lastTrained: trainedDates[0] ?? null,
        lastActive,
        flagged: checkIns.some((c) => c.red_flag) || worst >= 7,
        redFlag: thisWeek.some((c) => c.red_flag),
        worstPain: worst >= 0 ? worst : null,
        highPain: worstWeek >= 7 ? worstWeek : null,
        openRequests: requests.data.filter((r) => r.client_id === id).length,
        toReview: soloDates
          .filter((d) => !reviewed.has(d))
          .sort()
          .reverse(),
        quiet: !lastActive || lastActive < weekAgo,
      }
    })
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || (a.display_name ?? '').localeCompare(b.display_name ?? ''))
}

// One client, for their page: who they are and whether they're flaring up
export async function fetchClient(clientId) {
  const { data, error } = await supabase
    .from('connections')
    .select('client_id, created_at')
    .eq('pro_id', me())
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const [profiles, recent] = await Promise.all([
    profilesFor([clientId]),
    supabase
      .from('check_ins')
      .select('session_date, pain_after, next_morning, red_flag')
      .eq('user_id', clientId)
      .gte('session_date', dateDaysAgo(14)),
  ])
  if (recent.error) throw recent.error
  const worst = Math.max(-1, ...recent.data.map((c) => c.next_morning ?? c.pain_after ?? -1))
  return {
    ...profiles[0],
    id: clientId,
    since: data.created_at,
    flagged: recent.data.some((c) => c.red_flag) || worst >= 7,
  }
}

// Everything that needs the coach, most urgent first
export function attentionItems(clients) {
  const items = []
  for (const c of clients) {
    const name = c.display_name ?? 'Client'
    if (c.redFlag) {
      items.push({
        client: c,
        level: 0,
        title: `${name} reported warning signs`,
        detail: 'Check in with them before their next session.',
        href: `#clients/${c.id}/checkins`,
      })
    } else if (c.highPain != null) {
      items.push({
        client: c,
        level: 0,
        title: `${name}'s pain hit ${c.highPain}/10`,
        detail: 'In the last 7 days.',
        href: `#clients/${c.id}/rehab`,
      })
    }
    if (c.openRequests) {
      items.push({
        client: c,
        level: 1,
        title: `${name} asked for ${c.openRequests === 1 ? 'a change' : `${c.openRequests} changes`}`,
        detail: 'Waiting on you in their Programme.',
        href: `#clients/${c.id}/programme`,
      })
    }
    if (c.toReview.length) {
      items.push({
        client: c,
        level: 2,
        title: `${name} trained on their own`,
        detail: `${c.toReview.length} ${c.toReview.length === 1 ? 'session' : 'sessions'} to review.`,
        href: `#clients/${c.id}/sessions`,
      })
    }
    if (c.quiet) {
      items.push({
        client: c,
        level: 3,
        title: `${name} has gone quiet`,
        detail: c.lastActive ? 'No training or check-ins for over a week.' : 'Nothing logged yet.',
        href: `#clients/${c.id}`,
      })
    }
  }
  return items.sort((a, b) => a.level - b.level)
}

// The coach's stage, guidance and restrictions for each injured area
export async function fetchRehabPlans(clientId = me()) {
  const { data, error } = await supabase
    .from('rehab_plans')
    .select('area_id, stage, guidance, restrictions, set_by, updated_at')
    .eq('client_id', clientId)
  if (error) throw error
  return data
}

export async function saveRehabPlan(clientId, areaId, { stage, guidance, restrictions }) {
  const { error } = await supabase.from('rehab_plans').upsert(
    {
      client_id: clientId,
      area_id: areaId,
      stage,
      guidance: guidance?.trim() || null,
      restrictions: restrictions?.trim() || null,
      set_by: me(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,area_id' },
  )
  if (error) throw error
}

// Solo sessions the coach has looked at
export async function fetchReviews(clientId) {
  const { data, error } = await supabase
    .from('session_reviews')
    .select('session_date, comment, created_at')
    .eq('client_id', clientId)
    .gte('session_date', dateDaysAgo(60))
  if (error) throw error
  return data
}

export async function reviewSession(clientId, sessionDate, comment) {
  const { error } = await supabase
    .from('session_reviews')
    .upsert(
      { client_id: clientId, session_date: sessionDate, comment: comment?.trim() || null, reviewed_by: me() },
      { onConflict: 'client_id,session_date' },
    )
  if (error) throw error
  // A comment also goes to the client as a note, so they see it on their Profile
  if (comment?.trim()) {
    const day = new Date(`${sessionDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })
    await addNote(clientId, `On your ${day} session: ${comment.trim()}`)
  }
}

export async function connectWithCode(code) {
  const { data, error } = await supabase.rpc('connect_with_code', { code })
  if (error) throw new Error(friendly(error))
  return data
}

// Notes a professional leaves for a client; both of them can read them
export async function fetchNotes(clientId) {
  const { data, error } = await supabase
    .from('pro_notes')
    .select('id, body, created_at, pro_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function addNote(clientId, body) {
  const { data, error } = await supabase
    .from('pro_notes')
    .insert({ client_id: clientId, body })
    .select('id, body, created_at, pro_id')
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase.from('pro_notes').delete().eq('id', id)
  if (error) throw error
}
