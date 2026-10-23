import { supabase } from './supabase.js'
import { me } from './me.js'

// Friends and training together. Friends connect with the same code as physios and PTs, and only ever see
// training (sets, PBs, training days, strength): the database functions behind these pick out those fields.

// Messages from the database functions are already written for people, so show them as they are
async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message || 'Something went wrong. Try again.')
  return data
}

export const addFriend = (code) => call('add_friend_with_code', { code })
export const removeFriend = (friend) => call('remove_friend', { friend })
export const fetchFriends = () => call('my_friends')
export const fetchFriendCard = (friend) => call('friend_card', { friend })
export const fetchFriendSets = (friend, days = 365) => call('friend_sets', { friend, days })
export const fetchPartnerSets = (invite) => call('partner_sets', { invite })
export const answerInvite = (invite, answer) => call('answer_invite', { invite, answer })

// A friend's profile as the body map needs it. Their starting lifts arrive as multiples of bodyweight,
// so bodyweight counts as 1 and their real bodyweight never leaves the database.
export const friendProfile = (card) => ({
  role: card.role,
  body: card.body,
  experience: card.experience,
  onboarded_at: card.onboarded_at,
  bodyweight_kg: 1,
  lifts: card.lift_ratios ?? {},
})

// The session to do together is copied into the invite, so it stays the same even if the programme changes
export async function sendInvite(toId, startsAt, day) {
  const { error } = await supabase.from('workout_invites').insert({
    to_id: toId,
    starts_at: startsAt.toISOString(),
    day: { name: day.name, focus: day.focus ?? '', exercises: day.exercises },
  })
  if (error) throw error
}

const withNames = (invites, names) =>
  invites.map((invite) => {
    const incoming = invite.to_id === me()
    const partnerId = incoming ? invite.from_id : invite.to_id
    return {
      ...invite,
      incoming,
      partnerId,
      partnerName: names.find((n) => n.id === partnerId)?.display_name ?? 'Your friend',
    }
  })

// Invites still to answer or still to do (anything from the last 12 hours on, so today's stays put after its time)
export async function fetchInvites() {
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  const [{ data, error }, names] = await Promise.all([
    supabase
      .from('workout_invites')
      .select('id, from_id, to_id, starts_at, day, status')
      .in('status', ['pending', 'accepted'])
      .gte('starts_at', since)
      .order('starts_at'),
    call('invite_names'),
  ])
  if (error) throw error
  return withNames(data, names)
}

export async function fetchInvite(id) {
  const [{ data, error }, names] = await Promise.all([
    supabase.from('workout_invites').select('id, from_id, to_id, starts_at, day, status').eq('id', id).maybeSingle(),
    call('invite_names'),
  ])
  if (error) throw error
  return data ? withNames([data], names)[0] : null
}

// "Today, 18:30", "Tomorrow, 07:00" or "Sat 24 Oct, 10:00"
export function inviteTime(iso) {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-CA')
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (day === today.toLocaleDateString('en-CA')) return `Today, ${time}`
  if (day === tomorrow.toLocaleDateString('en-CA')) return `Tomorrow, ${time}`
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}
