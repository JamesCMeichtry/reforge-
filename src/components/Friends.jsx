import { Suspense, lazy, useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from './ui.jsx'
import { ask, toast } from './Feedback.jsx'
import { Label, Sheet } from './LiveParts.jsx'
import SessionLog from '../screens/SessionLog.jsx'
import {
  addFriend,
  answerInvite,
  fetchFriendCard,
  fetchFriendSets,
  fetchFriends,
  fetchInvite,
  fetchInvites,
  fetchPartnerSets,
  friendProfile,
  inviteTime,
  removeFriend,
  sendInvite,
} from '../lib/friends.js'
import { createConnectCode } from '../lib/pro.js'
import { computeStreak } from '../lib/streak.js'
import { daysAgo, fetchActiveProgramme, todayDate } from '../lib/programme.js'
import { shortDate } from '../lib/progress.js'
import { amountText } from '../lib/measure.js'
import { AddToCalendar } from './Plans.jsx'

const LivingMap = lazy(() => import('./LivingMap.jsx'))

const readHash = () => window.location.hash.replace('#', '').split('/')
// The parts of the address (#profile/friends/<id> is ['profile', 'friends', '<id>']), kept up to date
export function useHashParts() {
  const [parts, setParts] = useState(readHash)
  useEffect(() => {
    const onChange = () => setParts(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return parts
}

const setText = (s) =>
  `${s.weight_kg != null ? `${Number(s.weight_kg)}×` : s.band ? `${s.band} × ` : ''}${
    s.reps == null ? '✓' : amountText(s.reps, s.unit)
  }`

/* ---------- Profile: your friends, adding one, and your code ---------- */

export function FriendsPanel() {
  const [friends, setFriends] = useState(null)
  const [code, setCode] = useState('')
  const [myCode, setMyCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchFriends()
      .then(setFriends)
      .catch(() => setFriends([]))
  }, [])

  async function add(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const friend = await addFriend(code)
      setMessage({ ok: true, text: `${friend.display_name ?? 'Your friend'} is now your friend.` })
      setCode('')
      setFriends(await fetchFriends())
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
    setBusy(false)
  }

  async function showCode() {
    setBusy(true)
    try {
      setMyCode(await createConnectCode())
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
    setBusy(false)
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Friends</h2>
      <p className="mt-2 leading-relaxed text-neutral-300">
        Train together and see each other's progress. Friends see your training and strength, never your injuries, pain
        or check-ins.
      </p>

      {friends === null ? (
        <div className="mt-4">
          <LoadingCards count={1} height="h-16" label="Loading your friends" />
        </div>
      ) : (
        friends.length > 0 && (
          <ul className="mt-4 space-y-2">
            {friends.map((friend) => (
              <li key={friend.id}>
                <a
                  href={`#profile/friends/${friend.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:border-gold"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">{friend.display_name ?? 'Friend'}</span>
                    <span className="block text-sm text-muted">
                      {friend.last_trained ? `Trained ${daysAgo(friend.last_trained).toLowerCase()}` : 'No sets yet'}
                      {friend.sessions_this_week > 0
                        ? ` · ${friend.sessions_this_week} ${friend.sessions_this_week === 1 ? 'session' : 'sessions'} this week`
                        : ''}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )
      )}

      <form onSubmit={add} className="mt-4">
        <label className="text-sm font-medium text-neutral-300" htmlFor="friend-code">
          Add a friend with their code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="friend-code"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            className={`${inputBase} font-display text-2xl tracking-[0.25em]`}
          />
          <button type="submit" disabled={code.length !== 6 || busy} className={buttonPrimary}>
            Add
          </button>
        </div>
      </form>

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-gold' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      {myCode ? (
        <div className="mt-4 rounded-xl border border-gold/60 bg-gold/10 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Your code</p>
          <p className="mt-2 font-display text-5xl font-bold tracking-[0.25em] text-white">{myCode}</p>
          <p className="mt-2 text-sm text-neutral-300">
            Send it to a friend to enter here. It works once, for a friend or for your physio or PT.
          </p>
        </div>
      ) : (
        <button type="button" onClick={showCode} disabled={busy} className={`mt-4 w-full ${buttonSecondary}`}>
          Show my code for a friend
        </button>
      )}
    </section>
  )
}

/* ---------- A friend's page ---------- */

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-3">
      <p className="font-display text-3xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function recentWorkouts(sets, count = 4) {
  const byDate = new Map()
  for (const s of sets) {
    const day = byDate.get(s.session_date) ?? { date: s.session_date, withName: null, exercises: new Map() }
    day.withName ||= s.with_name
    const list = day.exercises.get(s.exercise) ?? []
    list.push(s)
    day.exercises.set(s.exercise, list)
    byDate.set(s.session_date, day)
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, count)
}

function personalBests(sets, count = 6) {
  const best = new Map()
  for (const s of sets) {
    if (s.weight_kg == null) continue
    const current = best.get(s.exercise)
    const weight = Number(s.weight_kg)
    if (!current || weight > current.weight || (weight === current.weight && (s.reps ?? 0) > current.reps)) {
      best.set(s.exercise, { exercise: s.exercise, weight, reps: s.reps ?? 0, unit: s.unit, date: s.session_date })
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight).slice(0, count)
}

export function FriendPage({ friendId }) {
  const [state, setState] = useState({ status: 'loading' })
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchFriendCard(friendId), fetchFriendSets(friendId)])
      .then(([card, sets]) => !cancelled && setState({ status: 'ready', card, sets }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status, friendId])

  if (state.status === 'loading') return <LoadingCards count={3} label="Loading your friend" />
  if (state.status === 'error') {
    return (
      <div>
        <a href="#profile" className="text-sm font-semibold text-muted hover:text-white">
          ‹ Profile
        </a>
        <p className="mt-4 text-neutral-300">Couldn't load this friend. You may not be friends any more.</p>
        <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </div>
    )
  }

  const { card, sets } = state
  const name = card.display_name ?? 'Your friend'
  const streak = computeStreak(new Set(card.active_days ?? []))
  const fourWeeks = new Date()
  fourWeeks.setDate(fourWeeks.getDate() - 27)
  const recentDates = new Set(
    sets.filter((s) => s.session_date >= fourWeeks.toLocaleDateString('en-CA')).map((s) => s.session_date),
  )
  const workouts = recentWorkouts(sets)
  const bests = personalBests(sets)
  const loadMap = () =>
    Promise.resolve({ rows: [], checkIns: [], history: sets, programme: null, profile: friendProfile(card) })

  async function remove() {
    const sure = await ask({
      title: `Remove ${name} as a friend?`,
      body: "You'll stop seeing each other's training. You can add each other again with a new code.",
      confirm: 'Remove friend',
      danger: true,
    })
    if (!sure) return
    try {
      await removeFriend(friendId)
      toast(`${name} removed`)
      window.location.hash = 'profile'
    } catch {
      toast("Couldn't remove them. Check your connection.", { tone: 'error' })
    }
  }

  return (
    <>
      <a href="#profile" className="text-sm font-semibold text-muted hover:text-white">
        ‹ Profile
      </a>
      <div className="mt-3">
        <ScreenHeader title={name} intro="Their training and strength. Injuries and check-ins always stay private." />
      </div>

      <button
        type="button"
        onClick={() => setInviting(true)}
        className="mb-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-display text-xl font-bold uppercase tracking-wide text-ink"
      >
        Invite to workout
      </button>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat value={streak.current} label="Day streak" />
          <Stat value={recentDates.size} label="Sessions, 4 wks" />
          <Stat value={bests.length} label="Lifts tracked" />
        </div>

        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl font-semibold">Recent workouts</h2>
          {workouts.length === 0 ? (
            <p className="mt-2 text-neutral-300">No workouts logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {workouts.map((day) => (
                <li key={day.date} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                    {shortDate(day.date)} · {daysAgo(day.date)}
                    {day.withName ? ` · with ${day.withName}` : ''}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {[...day.exercises.entries()].map(([exercise, list]) => (
                      <li key={exercise} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{exercise}</span>
                        <span className="shrink-0 text-right text-muted">
                          {list
                            .sort((a, b) => a.set_number - b.set_number)
                            .map(setText)
                            .join(', ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        {bests.length > 0 && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">Personal bests</h2>
            <ul className="mt-3 space-y-2">
              {bests.map((pb) => (
                <li key={pb.exercise} className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-white">{pb.exercise}</span>
                  <span className="shrink-0 text-sm font-semibold text-gold">
                    {pb.weight} kg × {amountText(pb.reps, pb.unit)}
                    <span className="font-normal text-muted"> · {shortDate(pb.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">Strength map</h2>
          <p className="mb-4 text-sm text-muted">Muscles they've built up. Injuries are never shown.</p>
          <Suspense fallback={<LoadingCards count={1} height="h-[480px]" label="Loading their body map" />}>
            <LivingMap key={friendId} userId={friendId} load={loadMap} />
          </Suspense>
        </section>
      </div>

      <button type="button" onClick={remove} className="mt-10 text-sm font-semibold text-muted hover:text-red-400">
        Remove friend
      </button>

      {inviting && <InviteSheet friendId={friendId} name={name} onClose={() => setInviting(false)} />}
    </>
  )
}

/* ---------- Inviting a friend to train ---------- */

const nextHour = () => `${String(Math.min(23, new Date().getHours() + 1)).padStart(2, '0')}:00`
const tomorrowDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toLocaleDateString('en-CA')
}

function InviteSheet({ friendId, name, onClose }) {
  const [programme, setProgramme] = useState(undefined)
  const [date, setDate] = useState(todayDate)
  const [time, setTime] = useState(nextHour)
  const [dayId, setDayId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveProgramme()
      .then(setProgramme)
      .catch(() => setProgramme(null))
  }, [])

  const day = programme?.days.find((d) => d.id === dayId)

  async function send() {
    const startsAt = new Date(`${date}T${time}`)
    if (Number.isNaN(startsAt.getTime()) || startsAt < new Date(Date.now() - 15 * 60 * 1000)) {
      setError('Pick a day and time that hasn’t passed yet.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendInvite(friendId, startsAt, day)
      toast(`Invite sent to ${name}`)
      onClose()
    } catch {
      setError("Couldn't send the invite. Check your connection.")
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Train with ${name}`} onClose={onClose}>
      <Label>When</Label>
      <div className="flex gap-2">
        {[
          [todayDate(), 'Today'],
          [tomorrowDate(), 'Tomorrow'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={date === value}
            onClick={() => setDate(value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              date === value ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-muted">
          Date
          <input
            type="date"
            value={date}
            min={todayDate()}
            onChange={(event) => setDate(event.target.value)}
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Time
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={`mt-1 ${inputBase}`}
          />
        </label>
      </div>

      <Label>Session</Label>
      {programme === undefined ? (
        <LoadingCards count={2} height="h-14" label="Loading your programme" />
      ) : !programme?.days.length ? (
        <p className="text-sm text-neutral-300">
          You need a programme to pick a session from. Load one on the Programme tab first.
        </p>
      ) : (
        <div className="space-y-2" role="group" aria-label="Session">
          {programme.days.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={dayId === d.id}
              onClick={() => setDayId(d.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left ${
                dayId === d.id ? 'border-gold bg-gold/10' : 'border-line'
              }`}
            >
              <span className="block font-semibold text-white">{d.name}</span>
              <span className="block text-sm text-muted">
                {[d.focus, `${d.exercises.length} ${d.exercises.length === 1 ? 'exercise' : 'exercises'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={!day || busy}
        className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
      >
        {busy ? 'Sending…' : `Send invite to ${name}`}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        {name} does the same session. You'll both see each other's sets as you go.
      </p>
    </Sheet>
  )
}

/* ---------- Today: invites to answer and workouts coming up ---------- */

export function WorkoutInvites() {
  const [invites, setInvites] = useState([])

  useEffect(() => {
    fetchInvites()
      .then(setInvites)
      .catch(() => {})
  }, [])

  async function answer(invite, reply) {
    try {
      await answerInvite(invite.id, reply)
      setInvites((current) =>
        reply === 'accepted'
          ? current.map((i) => (i.id === invite.id ? { ...i, status: 'accepted' } : i))
          : current.filter((i) => i.id !== invite.id),
      )
      toast(
        reply === 'accepted'
          ? `You're training with ${invite.partnerName}`
          : reply === 'declined'
            ? 'Invite declined'
            : 'Workout cancelled',
      )
    } catch {
      toast("Couldn't update the invite. Check your connection.", { tone: 'error' })
    }
  }

  if (!invites.length) return null
  return (
    <div className="space-y-4">
      {invites.map((invite) => {
        const day = invite.day ?? {}
        const accepted = invite.status === 'accepted'
        const waiting = !accepted && !invite.incoming
        return (
          <section
            key={invite.id}
            className={`rounded-2xl border bg-panel p-5 ${waiting ? 'border-line' : 'border-gold/60'}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              {accepted ? 'Training together' : invite.incoming ? 'Workout invite' : 'Invite sent'} ·{' '}
              {inviteTime(invite.starts_at)}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              {day.name} with {invite.partnerName}
            </h2>
            <p className="mt-1 text-sm text-neutral-300">
              {accepted
                ? `${(day.exercises ?? []).length} exercises. You'll see each other's sets as you go.`
                : invite.incoming
                  ? `${invite.partnerName} wants to train together.`
                  : `Waiting for ${invite.partnerName} to accept.`}
            </p>
            {accepted ? (
              <div className="mt-4 flex gap-2">
                <a href={`#today/train/${invite.id}`} className={`flex-1 text-center ${buttonPrimary}`}>
                  Start together
                </a>
                <button type="button" onClick={() => answer(invite, 'cancelled')} className={buttonSecondary}>
                  Can't make it
                </button>
              </div>
            ) : null}
            {accepted ? (
              <AddToCalendar
                event={{
                  id: invite.id,
                  title: `${day.name} with ${invite.partnerName}`,
                  start: new Date(invite.starts_at),
                  minutes: 60,
                  details: 'Training together in Reforge',
                }}
              />
            ) : invite.incoming ? (
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => answer(invite, 'accepted')} className={`flex-1 ${buttonPrimary}`}>
                  Accept
                </button>
                <button type="button" onClick={() => answer(invite, 'declined')} className={buttonSecondary}>
                  Decline
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => answer(invite, 'cancelled')} className={`mt-4 ${buttonSecondary}`}>
                Cancel invite
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ---------- Training together: your log, with your partner's sets appearing live ---------- */

export function TrainTogether({ inviteId }) {
  const [invite, setInvite] = useState(undefined)
  const [partnerSets, setPartnerSets] = useState([])

  useEffect(() => {
    fetchInvite(inviteId)
      .then(setInvite)
      .catch(() => setInvite(null))
  }, [inviteId])

  const live = invite?.status === 'accepted'
  useEffect(() => {
    if (!live) return
    const refresh = () =>
      document.visibilityState === 'visible' &&
      fetchPartnerSets(inviteId)
        .then(setPartnerSets)
        .catch(() => {})
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [live, inviteId])

  if (invite === undefined) return <LoadingCards count={3} height="h-36" label="Loading your workout" />
  if (!live) {
    return (
      <div>
        <a href="#today" className="text-sm font-semibold text-muted hover:text-white">
          ‹ Today
        </a>
        <p className="mt-4 text-neutral-300">This workout isn't on any more.</p>
      </div>
    )
  }

  return (
    <>
      <a href="#today" className="text-sm font-semibold text-muted hover:text-white">
        ‹ Today
      </a>
      <div className="mt-3">
        <ScreenHeader
          title={invite.day.name}
          intro={`With ${invite.partnerName}. Their sets appear under each exercise as they log them.`}
        />
      </div>
      <SessionLog
        programme={{ id: null }}
        day={{ ...invite.day, id: invite.id }}
        backHash="today"
        extra={{ invite_id: invite.id, with_name: invite.partnerName }}
        partner={{ name: invite.partnerName, sets: partnerSets }}
      />
    </>
  )
}
