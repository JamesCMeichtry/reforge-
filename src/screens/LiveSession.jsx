import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoadingCards, buttonPrimary, buttonSecondary } from '../components/ui.jsx'
import { ask } from '../components/Feedback.jsx'
import {
  Centered,
  EXERCISE_NOTES,
  buzz,
  clock,
  fmt,
  isTimed,
  loadText,
  painColour,
  restFor,
  setSummary,
  statusOf,
  targetLine,
  useNow,
  useSync,
} from '../components/LiveParts.jsx'
import { AddSheet, EditSheet, NoteSheet, SetSheet, SkipSheet, SwapSheet } from '../components/LiveSheets.jsx'
import { fetchInjurySites, fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchRequests } from '../lib/coaching.js'
import { me } from '../lib/me.js'
import { useWakeLock } from '../lib/wakeLock.js'
import {
  clearLive,
  fetchLatestSession,
  historyByExercise,
  loadLive,
  newId,
  persistLive,
  queueWrite,
  saveLive,
  setRow,
  startLive,
} from '../lib/live.js'
import {
  daysAgo,
  fetchActiveProgramme,
  fetchLastDayName,
  formatPrevious,
  nextDay,
  todayDate,
} from '../lib/programme.js'
import { fetchSetHistory } from '../lib/progress.js'
import { Done, Review } from './LiveReview.jsx'
import { EntryPanel, PbBurst } from '../components/LiveEntry.jsx'

/* ---------- The screen ---------- */

// A professional runs a client's session live: logs every set, changes the plan on the spot, then reviews it
export default function LiveSession({ clientId, clientName = 'Client', dayId }) {
  const [session, setSession] = useState(() => loadLive(clientId))
  const [stage, setStage] = useState(() => (loadLive(clientId)?.reviewing ? 'review' : 'live'))
  const [programme, setProgramme] = useState(undefined)
  const [upNextId, setUpNextId] = useState(null)
  const [sites, setSites] = useState(null)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(false)
  const [brief, setBrief] = useState(null)

  // Full screen while it's open: the page behind doesn't scroll
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchActiveProgramme(clientId),
      fetchInjurySites(clientId),
      fetchSetHistory(365, clientId),
      fetchRecentCheckIns(28, clientId),
      fetchRequests(clientId, true).catch(() => []),
      fetchLatestSession(clientId).catch(() => null),
    ])
      .then(async ([found, injurySites, rows, checkIns, requests, lastSession]) => {
        const last = found ? await fetchLastDayName(found.id, clientId) : null
        if (cancelled) return
        setProgramme(found)
        // Opened from a day's "Start live session": that day is picked, otherwise whichever is up next
        setUpNextId(found ? nextDay(found.days, last)?.id : null)
        setSites(injurySites)
        setHistory(rows)
        setBrief(buildBrief({ rows, checkIns, requests, lastSession, sites: injurySites }))
      })
      .catch(() => {
        if (cancelled) return
        // No signal: a session already running carries on from what this phone saved
        const saved = loadLive(clientId)
        if (saved?.cache) {
          setProgramme(null)
          setSites(saved.cache.sites)
          setHistory(saved.cache.rows)
        } else setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [clientId, dayId])

  // Every change is kept on the phone straight away (and sent to the database when persist is set),
  // so closing the app mid-session loses nothing
  const latest = useRef(session)
  latest.current = session
  const update = (change, { persist = false } = {}) => {
    const next = change(structuredClone(latest.current))
    latest.current = next
    saveLive(next)
    if (persist) persistLive(next)
    setSession(next)
  }

  // Keep what the session needs on the phone (injury areas, past sets for today's exercises), so it can be
  // reopened and carried on with no signal
  useEffect(() => {
    if (!session || !history || !sites || session.cache) return
    const names = new Set(session.plan.map((e) => e.name))
    update((s) => ({ ...s, cache: { clientName, sites, rows: history.filter((r) => names.has(r.exercise)) } }))
  }, [session, history, sites])

  const exit = () => (window.location.hash = `clients/${clientId}`)

  let body
  if (error) {
    body = (
      <Centered>
        <p className="text-red-400">Couldn't load {clientName}'s training. Check your connection.</p>
        <button type="button" onClick={exit} className={`mt-4 ${buttonSecondary}`}>
          Back
        </button>
      </Centered>
    )
  } else if (programme === undefined || !history || !sites) {
    body = (
      <div className="px-5 pt-6">
        <LoadingCards count={3} height="h-32" label="Getting the session ready" />
      </div>
    )
  } else if (stage === 'done') {
    body = <Done clientName={clientName} onClose={exit} />
  } else if (!session) {
    body = (
      <PickDay
        programme={programme}
        upNextId={upNextId}
        chosenId={dayId}
        brief={brief}
        clientId={clientId}
        clientName={clientName}
        onExit={exit}
        onPick={(day) => setSession(startLive({ clientId, programme, day }))}
      />
    )
  } else if (stage === 'live' && session.date !== todayDate()) {
    // A session left running from an earlier day: finish it properly rather than logging today's sets into it
    const sets = Object.values(session.sets).reduce((sum, list) => sum + list.length, 0)
    body = (
      <Centered>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Unfinished session</p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none">{session.dayName}</h1>
        <p className="mt-3 text-neutral-300">
          Started {daysAgo(session.date).toLowerCase()} with {sets} {sets === 1 ? 'set' : 'sets'} logged. Those sets are
          already saved.
        </p>
        <button
          type="button"
          onClick={() => {
            update((s) => ({ ...s, reviewing: true }))
            setStage('review')
          }}
          className={`mt-6 w-full max-w-xs ${buttonPrimary}`}
        >
          Review and finish it
        </button>
        <button
          type="button"
          onClick={async () => {
            const sure = await ask({
              title: 'Close without a summary?',
              body: 'Every set logged stays in their history. Only the end-of-session summary is skipped.',
              confirm: 'Close session',
            })
            if (!sure) return
            clearLive(clientId)
            setSession(null)
          }}
          className={`mt-3 w-full max-w-xs ${buttonSecondary}`}
        >
          Close it without a summary
        </button>
      </Centered>
    )
  } else if (stage === 'review') {
    body = (
      <Review
        session={session}
        history={history}
        sites={sites}
        clientName={clientName}
        onBack={() => {
          update((s) => ({ ...s, reviewing: false }))
          setStage('live')
        }}
        onFinished={() => {
          clearLive(clientId)
          setStage('done')
        }}
      />
    )
  } else {
    body = (
      <Live
        session={session}
        update={update}
        history={history}
        sites={sites}
        clientName={clientName}
        onMinimise={exit}
        onReview={() => {
          update((s) => ({ ...s, reviewing: true }))
          setStage('review')
        }}
      />
    )
  }

  return createPortal(
    <div
      className="live-root fixed inset-0 z-50 flex flex-col bg-ink text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      role="dialog"
      aria-label={`Live session with ${clientName}`}
    >
      {body}
    </div>,
    document.body,
  )
}

/* ---------- Choosing the day ---------- */

// What's happened since the coach last ran a session: solo training, pain, warning signs, requests
function buildBrief({ rows, checkIns, requests, lastSession, sites }) {
  const fallback = new Date()
  fallback.setDate(fallback.getDate() - 14)
  const since = lastSession?.started_at?.slice(0, 10) ?? fallback.toLocaleDateString('en-CA')
  const after = (date) => (lastSession ? date > since : date >= since)
  const soloDates = [
    ...new Set(rows.filter((r) => after(r.session_date) && r.logged_by !== me()).map((r) => r.session_date)),
  ]
  const pain = new Map()
  for (const c of checkIns.filter((c) => after(c.session_date))) {
    const peak = Math.max(c.pain_during ?? -1, c.pain_after ?? -1, c.next_morning ?? -1)
    const entry = pain.get(c.area_id) ?? { area: c.area_id, peak: -1, flag: false, date: c.session_date }
    if (peak > entry.peak) Object.assign(entry, { peak, date: c.session_date })
    entry.flag ||= c.red_flag
    pain.set(c.area_id, entry)
  }
  return {
    lastSession,
    solo: soloDates.sort().reverse(),
    pain: [...pain.values()]
      .filter((p) => p.peak >= 0 || p.flag)
      .map((p) => ({ ...p, label: sites.find((s) => s.areaId === p.area)?.label ?? p.area }))
      .sort((a, b) => Number(b.flag) - Number(a.flag) || b.peak - a.peak),
    requests,
  }
}

function Brief({ brief, clientName }) {
  if (!brief) return null
  const { lastSession, solo, pain, requests } = brief
  const empty = !solo.length && !pain.length && !requests.length
  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        {lastSession
          ? `Since your last session · ${daysAgo(lastSession.started_at.slice(0, 10)).toLowerCase()}`
          : 'The last 2 weeks'}
      </p>
      {empty && (
        <p className="mt-2 text-sm text-neutral-300">Nothing new. No solo training, pain reports or requests.</p>
      )}
      <ul className="mt-2 space-y-2.5 text-sm">
        {pain.map((p) => (
          <li key={p.area} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  p.flag || p.peak >= 7
                    ? 'var(--pain-severe)'
                    : p.peak >= 4
                      ? 'var(--pain-moderate)'
                      : 'var(--pain-mild)',
              }}
              aria-hidden="true"
            />
            <span className={p.flag ? 'font-semibold text-red-400' : 'text-white'}>
              {p.label}: pain peaked at {Math.max(p.peak, 0)}/10 {daysAgo(p.date).toLowerCase()}
              {p.flag ? ' · warning signs reported' : ''}
            </span>
          </li>
        ))}
        {solo.length > 0 && (
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            <span className="text-white">
              Trained on their own {solo.length === 1 ? 'once' : `${solo.length} times`} (
              {solo.map((d) => daysAgo(d).toLowerCase()).join(', ')})
            </span>
          </li>
        )}
        {requests.map((r) => (
          <li key={r.id} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            <span className="text-white">Asked: “{r.body}”</span>
          </li>
        ))}
      </ul>
      {lastSession?.message && (
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
          You told {clientName} last time: “{lastSession.message}”
        </p>
      )}
    </section>
  )
}

function PickDay({ programme, upNextId, chosenId, brief, clientId, clientName, onPick, onExit }) {
  const highlight = programme?.days.some((d) => d.id === chosenId) ? chosenId : upNextId
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-10">
      <button type="button" onClick={onExit} className="mt-4 text-sm font-semibold text-muted hover:text-white">
        ✕ Close
      </button>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-gold">Live session</p>
      <h1 className="mt-1 font-display text-5xl font-bold uppercase leading-none">{clientName}</h1>
      <Brief brief={brief} clientName={clientName} />
      {!programme ? (
        <div className="mt-8">
          <p className="text-neutral-300">{clientName} doesn't have a programme yet. Build one first.</p>
          <a href={`#clients/${clientId}/programme`} className={`mt-4 inline-block ${buttonPrimary}`}>
            Build their programme
          </a>
        </div>
      ) : (
        <>
          <p className="mt-6 text-muted">Which session are you running?</p>
          <ul className="mt-6 space-y-3">
            {programme.days.map((day) => (
              <li key={day.id}>
                <button
                  type="button"
                  onClick={() => onPick(day)}
                  className={`w-full rounded-2xl border bg-panel p-5 text-left hover:border-gold ${
                    day.id === highlight ? 'border-gold' : 'border-line'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-3xl font-bold uppercase leading-none">{day.name}</span>
                    {day.id === highlight && (
                      <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                        {day.id === chosenId ? 'Start' : 'Up next'}
                      </span>
                    )}
                  </span>
                  {day.focus && <span className="mt-2 block text-neutral-300">{day.focus}</span>}
                  <span className="mt-1 block text-sm text-muted">
                    {day.exercises.length} {day.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ---------- The live screen ---------- */

function Live({ session, update, history, sites, clientName, onMinimise, onReview }) {
  const [sheet, setSheet] = useState(null)
  const [rest, setRest] = useState(null)
  const [pb, setPb] = useState(null)
  // The screen stays on while the session is running, so the phone doesn't lock between sets
  useWakeLock(true)
  const sessionSetIds = useMemo(
    () => new Set(Object.values(session.sets).flatMap((list) => list.map((s) => s.id))),
    [session.sets],
  )
  const past = useMemo(() => historyByExercise(history, sessionSetIds), [history, sessionSetIds])

  const plan = session.plan
  const index = Math.min(session.current ?? 0, plan.length - 1)
  const exercise = plan[index]
  const sets = exercise ? (session.sets[exercise.id] ?? []) : []

  useEffect(() => {
    if (!pb) return
    const timer = setTimeout(() => setPb(null), 2600)
    return () => clearTimeout(timer)
  }, [pb])

  const goTo = (i) => update((s) => ({ ...s, current: i }))
  const nextIndex = () => {
    const open = (i) => ['todo', 'active'].includes(statusOf(plan[i], session.sets[plan[i].id]))
    for (let i = index + 1; i < plan.length; i++) if (open(i)) return i
    for (let i = 0; i < index; i++) if (open(i)) return i
    return -1
  }

  function addChange(change) {
    update(
      (s) => {
        const last = s.changes[s.changes.length - 1]
        // Several quick edits to the same exercise count as one change
        if (change.type === 'edit' && last?.type === 'edit' && last.exerciseId === change.exerciseId) {
          s.changes[s.changes.length - 1] = {
            ...last,
            ...change,
            id: last.id,
            after: { ...last.after, ...change.after },
          }
        } else s.changes.push({ id: newId(), at: new Date().toISOString(), ...change })
        return s
      },
      { persist: true },
    )
  }

  function logSet(values) {
    const set = { id: newId(), set_number: sets.length + 1, ...values }
    const name = exercise.name
    const bestBefore = Math.max(
      past.get(name)?.best?.weight ?? -1,
      ...Object.entries(session.sets)
        .filter(([id]) => plan.find((e) => e.id === id)?.name === name)
        .flatMap(([, list]) => list.map((s) => Number(s.weight_kg ?? -1))),
    )
    const isPb = past.get(name)?.best && set.weight_kg != null && set.weight_kg > bestBefore
    if (isPb) set.pb = true
    update((s) => {
      ;(s.sets[exercise.id] ??= []).push(set)
      return s
    })
    queueWrite({ kind: 'upsert', table: 'set_logs', row: setRow(session, exercise, set) })
    buzz(isPb ? [40, 60, 40, 60, 120] : 35)
    if (isPb) setPb({ name, weight: set.weight_kg, reps: set.reps, previous: past.get(name).best })
    const seconds = restFor(exercise)
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds })
  }

  function saveSet(changed) {
    update((s) => {
      s.sets[exercise.id] = s.sets[exercise.id].map((x) => (x.id === changed.id ? changed : x))
      return s
    })
    queueWrite({ kind: 'upsert', table: 'set_logs', row: setRow(session, exercise, changed) })
  }

  function deleteSet(removed) {
    const kept = sets.filter((x) => x.id !== removed.id)
    const renumbered = kept.map((x, i) => ({ ...x, set_number: i + 1 }))
    update((s) => {
      s.sets[exercise.id] = renumbered
      return s
    })
    queueWrite({ kind: 'delete', table: 'set_logs', id: removed.id })
    renumbered
      .filter((x, i) => x.set_number !== kept[i].set_number)
      .forEach((x) => queueWrite({ kind: 'upsert', table: 'set_logs', row: setRow(session, exercise, x) }))
  }

  function addExerciseNote(text) {
    update(
      (s) => {
        ;(s.notes[exercise.id] ??= []).push({ text, at: new Date().toISOString() })
        return s
      },
      { persist: true },
    )
  }

  function swap(replacement, reason) {
    const fresh = { ...replacement, id: newId(), status: 'todo' }
    update((s) => {
      const i = s.plan.findIndex((e) => e.id === exercise.id)
      if ((s.sets[exercise.id] ?? []).length) {
        s.plan[i] = { ...s.plan[i], status: 'swapped' }
        s.plan.splice(i + 1, 0, fresh)
        s.current = i + 1
      } else s.plan[i] = fresh
      return s
    })
    addChange({
      type: 'swap',
      exerciseId: exercise.id,
      exercise: fresh,
      summary: `Swapped ${exercise.name} for ${fresh.name}`,
      reason,
    })
  }

  function edit(after, reason) {
    update((s) => {
      const i = s.plan.findIndex((e) => e.id === exercise.id)
      s.plan[i] = { ...s.plan[i], ...after }
      return s
    })
    addChange({
      type: 'edit',
      exerciseId: exercise.id,
      after,
      summary: `${exercise.name}: ${after.sets} × ${after.reps} · ${loadText(after.load)}`,
      reason,
    })
  }

  function add(newExercise, reason) {
    const fresh = { ...newExercise, id: newId(), status: 'todo' }
    update((s) => {
      s.plan.push(fresh)
      s.current = s.plan.length - 1
      return s
    })
    addChange({ type: 'add', exerciseId: fresh.id, exercise: fresh, summary: `Added ${fresh.name}`, reason })
  }

  function skip(reason) {
    update((s) => {
      const i = s.plan.findIndex((e) => e.id === exercise.id)
      s.plan[i] = { ...s.plan[i], status: 'skipped' }
      return s
    })
    addChange({ type: 'skip', exerciseId: exercise.id, summary: `Skipped ${exercise.name}`, reason })
    const next = nextIndex()
    if (next !== -1) goTo(next)
  }

  function unskip() {
    update(
      (s) => {
        const i = s.plan.findIndex((e) => e.id === exercise.id)
        s.plan[i] = { ...s.plan[i], status: 'todo' }
        s.changes = s.changes.filter((c) => !(c.type === 'skip' && c.exerciseId === exercise.id))
        return s
      },
      { persist: true },
    )
  }

  if (!exercise) {
    return (
      <>
        <LiveHeader session={session} clientName={clientName} onMinimise={onMinimise} onReview={onReview} />
        <Centered>
          <p className="text-neutral-300">This day has no exercises yet.</p>
          <button type="button" onClick={() => setSheet({ type: 'add' })} className={`mt-4 ${buttonPrimary}`}>
            + Add an exercise
          </button>
        </Centered>
        {sheet?.type === 'add' && <AddSheet onClose={() => setSheet(null)} onAdd={add} />}
      </>
    )
  }

  const status = statusOf(exercise, sets)
  const next = nextIndex()

  return (
    <>
      <LiveHeader session={session} clientName={clientName} onMinimise={onMinimise} onReview={onReview} />
      <ExerciseRail
        plan={plan}
        sets={session.sets}
        current={index}
        onSelect={goTo}
        onAdd={() => setSheet({ type: 'add' })}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          sets={sets}
          status={status}
          past={past.get(exercise.name)}
          notes={session.notes[exercise.id] ?? []}
          onAction={(type) => setSheet({ type })}
          onEditSet={(set) => setSheet({ type: 'set', set })}
          onUnskip={unskip}
        />
      </div>

      {status === 'skipped' || status === 'swapped' ? (
        <div
          className="border-t border-line bg-panel px-4 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <button
            type="button"
            onClick={() => (next === -1 ? onReview() : goTo(next))}
            className={`h-14 w-full text-lg ${buttonPrimary}`}
          >
            {next === -1 ? 'Review session →' : `Next: ${plan[next].name} →`}
          </button>
        </div>
      ) : (
        <EntryPanel
          key={`${exercise.id}-${sets.length}`}
          exercise={exercise}
          sets={sets}
          past={past.get(exercise.name)}
          sites={sites}
          rest={rest}
          onRestChange={setRest}
          onLog={logSet}
          nextName={next === -1 ? null : plan[next].name}
          onNext={() => (next === -1 ? onReview() : goTo(next))}
        />
      )}

      {pb && <PbBurst pb={pb} />}

      {sheet?.type === 'swap' && <SwapSheet exercise={exercise} onClose={() => setSheet(null)} onSwap={swap} />}
      {sheet?.type === 'edit' && <EditSheet exercise={exercise} onClose={() => setSheet(null)} onSave={edit} />}
      {sheet?.type === 'add' && <AddSheet onClose={() => setSheet(null)} onAdd={add} />}
      {sheet?.type === 'skip' && <SkipSheet exercise={exercise} onClose={() => setSheet(null)} onSkip={skip} />}
      {sheet?.type === 'note' && (
        <NoteSheet
          title={`Note on ${exercise.name}`}
          chips={EXERCISE_NOTES}
          onClose={() => setSheet(null)}
          onSave={(text) => text && addExerciseNote(text)}
        />
      )}
      {sheet?.type === 'set' && (
        <SetSheet
          exercise={exercise}
          set={sheet.set}
          sites={sites}
          onClose={() => setSheet(null)}
          onSave={saveSet}
          onDelete={deleteSet}
        />
      )}
    </>
  )
}

function LiveHeader({ session, clientName, onMinimise, onReview }) {
  const now = useNow()
  const sync = useSync()
  const elapsed = Math.floor((now - new Date(session.startedAt).getTime()) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const time = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : clock(elapsed)
  return (
    <header className="flex items-center gap-3 border-b border-line px-4 py-3">
      <button
        type="button"
        onClick={onMinimise}
        aria-label="Minimise. The session keeps running."
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-lg text-muted hover:text-white"
      >
        ⌄
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
          <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
          Live · {time}
          <SyncBadge sync={sync} />
        </p>
        <p className="truncate font-semibold text-white">
          {clientName} · {session.dayName}
        </p>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="shrink-0 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink"
      >
        Finish
      </button>
    </header>
  )
}

// Shows whether every logged set has reached the database, or is waiting on the phone for signal
function SyncBadge({ sync }) {
  const waiting = sync.pending > 0
  const offline = waiting && sync.offline
  const label = !waiting ? 'Saved' : offline ? `No signal · ${sync.pending} queued` : 'Saving'
  return (
    <span
      role="status"
      aria-label={offline ? `No signal. ${sync.pending} waiting to send, safe on this phone.` : label}
      className="truncate normal-case tracking-normal"
      style={{ color: offline ? 'var(--pain-moderate)' : 'var(--color-muted)' }}
    >
      · {label}
    </span>
  )
}

function ExerciseRail({ plan, sets, current, onSelect, onAdd }) {
  return (
    <nav aria-label="Exercises" className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5">
      {plan.map((exercise, i) => {
        const status = statusOf(exercise, sets[exercise.id])
        const isCurrent = i === current
        return (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${exercise.name}, ${status}`}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
              isCurrent
                ? 'border-gold bg-gold/15 text-white'
                : status === 'done'
                  ? 'border-gold/40 text-gold'
                  : status === 'skipped' || status === 'swapped'
                    ? 'border-line text-muted line-through'
                    : 'border-line text-muted'
            }`}
          >
            {status === 'done' ? '✓' : i + 1}
            <span className="max-w-28 truncate">{exercise.name}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add an exercise"
        className="flex h-9 shrink-0 items-center rounded-full border border-dashed border-line px-3 text-sm font-semibold text-muted hover:text-white"
      >
        + Add
      </button>
    </nav>
  )
}

function ExerciseCard({ exercise, sets, status, past, notes, onAction, onEditSet, onUnskip }) {
  const timed = isTimed(exercise.reps)
  const last = past?.last
  const lastLine = last ? `${formatPrevious(last)}${timed ? ' s' : ''} · ${daysAgo(last.date).toLowerCase()}` : null
  return (
    <article className="pt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold">{exercise.section || 'Main'}</p>
      <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-[0.95]">{exercise.name}</h2>
      <p className="mt-2 text-neutral-300">
        Target {targetLine(exercise)} · rest {clock(restFor(exercise))}
      </p>
      {lastLine && <p className="mt-1 text-sm text-gold">Last time: {lastLine}</p>}
      {past?.best && (
        <p className="text-sm text-muted">
          Best: {fmt(past.best.weight)} kg × {past.best.reps}
        </p>
      )}
      {exercise.note && <p className="mt-2 border-l-2 border-gold/60 pl-3 text-sm text-neutral-300">{exercise.note}</p>}

      {status === 'skipped' ? (
        <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
          <p className="font-semibold text-white">Skipped today</p>
          <button type="button" onClick={onUnskip} className={`mt-3 ${buttonSecondary}`}>
            Undo skip
          </button>
        </div>
      ) : status === 'swapped' ? (
        <p className="mt-4 rounded-2xl border border-line bg-panel p-4 text-neutral-300">
          Swapped out partway through. Its logged sets are kept.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            ['swap', 'Swap'],
            ['edit', 'Edit'],
            ['note', 'Note'],
            ['skip', 'Skip'],
          ].map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => onAction(type)}
              className="h-11 rounded-xl border border-line bg-panel text-sm font-semibold text-white hover:border-gold"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {notes.map((note, i) => (
            <li key={i} className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
              {note.text}
            </li>
          ))}
        </ul>
      )}

      {sets.length > 0 && (
        <ol className="mt-5 space-y-1.5">
          {sets.map((set) => (
            <li key={set.id}>
              <button
                type="button"
                onClick={() => onEditSet(set)}
                className="set-in flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5 text-left hover:border-gold"
              >
                <span className="w-6 font-display text-xl font-bold text-gold">{set.set_number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{setSummary(set, timed ? 'timed' : '')}</span>
                  {set.notes && <span className="block truncate text-xs text-gold">{set.notes}</span>}
                </span>
                <SetBadges set={set} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

function SetBadges({ set }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {set.pb && <span className="rounded-md bg-gold px-1.5 py-0.5 text-[11px] font-bold text-ink">PB</span>}
      {set.rpe != null && (
        <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-neutral-300">
          RPE {set.rpe}
        </span>
      )}
      {set.pain != null && (
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
          style={{ background: painColour(set.pain), color: set.pain >= 1 ? '#111' : 'var(--color-white)' }}
        >
          Pain {set.pain}
        </span>
      )}
      {set.form && (
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
            set.form === 'poor' ? 'border-red-400/60 text-red-400' : 'border-line text-neutral-300'
          }`}
        >
          {set.form === 'good' ? 'Form ✓' : set.form === 'ok' ? 'Form OK' : 'Form ✗'}
        </span>
      )}
    </span>
  )
}
