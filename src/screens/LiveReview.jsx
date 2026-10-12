import { useMemo, useState } from 'react'
import { buttonPrimary, inputBase } from '../components/ui.jsx'
import {
  Centered,
  Label,
  buzz,
  fmt,
  isTimed,
  painColour,
  setSummary,
  statusOf,
  useSync,
} from '../components/LiveParts.jsx'
import { recordChange } from '../lib/coaching.js'
import { applyChanges, flush, historyByExercise, newId, persistLive, queueWrite } from '../lib/live.js'
import { fetchActiveProgramme, saveProgrammeDays } from '../lib/programme.js'

// The end of a live session: what happened, which changes to keep, and a message for the client
/* ---------- Review and finish ---------- */

function summarise(session, history, sites) {
  const exercises = session.plan.map((exercise) => {
    const sets = session.sets[exercise.id] ?? []
    return { exercise, sets, status: statusOf(exercise, sets), notes: session.notes[exercise.id] ?? [] }
  })
  const allSets = exercises.flatMap((e) => e.sets.map((s) => ({ ...s, exercise: e.exercise.name })))
  const volume = Math.round(allSets.reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0))
  const ids = new Set(allSets.map((s) => s.id))
  const past = historyByExercise(history, ids)
  const pbs = []
  for (const e of exercises) {
    const best = past.get(e.exercise.name)?.best
    const top = e.sets.filter((s) => s.weight_kg != null).sort((a, b) => b.weight_kg - a.weight_kg)[0]
    if (best && top && top.weight_kg > best.weight) {
      pbs.push({ exercise: e.exercise.name, weight: top.weight_kg, reps: top.reps, previous: best.weight })
    }
  }
  const painByArea = new Map()
  for (const s of allSets) {
    if (s.pain == null || !s.pain_area) continue
    const current = painByArea.get(s.pain_area)
    if (!current || s.pain > current.max) {
      painByArea.set(s.pain_area, {
        area: s.pain_area,
        label: sites.find((site) => site.areaId === s.pain_area)?.label ?? s.pain_area,
        max: s.pain,
        exercise: s.exercise,
      })
    }
  }
  const minutes = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
  return { exercises, sets: allSets.length, volume, pbs, pain: [...painByArea.values()], minutes }
}

export function Review({ session, history, sites, clientName, onBack, onFinished }) {
  const summary = useMemo(() => summarise(session, history, sites), [session, history, sites])
  const [keep, setKeep] = useState(() => Object.fromEntries(session.changes.map((c) => [c.id, c.type !== 'skip'])))
  const [message, setMessage] = useState(session.message ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sync = useSync()

  async function finish() {
    setBusy(true)
    setError('')
    try {
      const kept = session.changes.filter((c) => keep[c.id])
      if (kept.length) {
        const current = await fetchActiveProgramme(session.clientId)
        if (current?.id === session.programmeId) {
          await saveProgrammeDays(current.id, applyChanges(current.days, session.dayId, kept))
          for (const change of kept) {
            await recordChange(
              session.clientId,
              current.id,
              change.summary,
              change.reason ? `${change.reason} (live session)` : 'Live session',
            )
          }
        }
      }
      for (const pain of summary.pain) {
        queueWrite({
          kind: 'insert',
          table: 'check_ins',
          row: {
            id: newId(),
            user_id: session.clientId,
            area_id: pain.area,
            session_date: session.date,
            pain_during: pain.max,
            red_flag: false,
            notes: `Recorded by your coach during ${session.dayName} (peak on ${pain.exercise})`,
          },
        })
      }
      const ended = {
        ...session,
        endedAt: new Date().toISOString(),
        message: message.trim() || null,
        summary: {
          minutes: summary.minutes,
          sets: summary.sets,
          volume: summary.volume,
          pbs: summary.pbs,
          pain: summary.pain,
          exercises: summary.exercises.map((e) => ({
            name: e.exercise.name,
            status: e.status,
            sets: e.sets.map((s) => setSummary(s, isTimed(e.exercise.reps) ? 'timed' : '')),
            notes: e.notes.map((n) => n.text),
          })),
          kept: kept.map((c) => c.summary),
          todayOnly: session.changes.filter((c) => !keep[c.id]).map((c) => c.summary),
        },
      }
      persistLive(ended)
      await flush()
      buzz([60, 40, 60])
      onFinished()
    } catch {
      setError("Couldn't update the programme. Check your signal and try again. Every set is already saved.")
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-10">
      <button type="button" onClick={onBack} className="mt-4 text-sm font-semibold text-muted hover:text-white">
        ‹ Back to session
      </button>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-gold">Session review</p>
      <h1 className="mt-1 font-display text-5xl font-bold uppercase leading-none">{session.dayName}</h1>
      <p className="mt-2 text-muted">{clientName}</p>

      <dl className="mt-6 grid grid-cols-4 gap-2">
        {[
          ['Time', `${summary.minutes}m`],
          ['Sets', summary.sets],
          ['Kg moved', summary.volume ? summary.volume.toLocaleString('en-GB') : '–'],
          ['PBs', summary.pbs.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-panel px-3 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      {summary.pbs.length > 0 && (
        <section className="mt-6">
          <Label>Personal bests</Label>
          <ul className="space-y-1.5">
            {summary.pbs.map((pb) => (
              <li
                key={pb.exercise}
                className="flex items-center justify-between rounded-xl border border-gold/50 bg-gold/10 px-4 py-3"
              >
                <span className="font-semibold text-white">{pb.exercise}</span>
                <span className="text-sm font-bold text-gold">
                  {fmt(pb.weight)} kg × {pb.reps}{' '}
                  <span className="font-normal text-muted">(was {fmt(pb.previous)})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.pain.length > 0 && (
        <section className="mt-6">
          <Label>Pain during the session</Label>
          <ul className="space-y-1.5">
            {summary.pain.map((p) => (
              <li key={p.area} className="rounded-xl border border-line bg-panel px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{p.label}</span>
                  <span className="text-sm font-bold" style={{ color: painColour(Math.max(p.max, 1)) }}>
                    Peak {p.max}/10
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.max * 10}%`, background: painColour(p.max) }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Highest on {p.exercise}. Saved to {clientName}'s check-ins and body map.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <Label>Exercises</Label>
        <ul className="space-y-1.5">
          {summary.exercises.map(({ exercise, sets, status, notes }) => (
            <li key={exercise.id} className="rounded-xl border border-line bg-panel px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`font-semibold ${status === 'skipped' ? 'text-muted line-through' : 'text-white'}`}>
                  {exercise.name}
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">
                  {status === 'done'
                    ? '✓ Done'
                    : status === 'skipped'
                      ? 'Skipped'
                      : status === 'swapped'
                        ? 'Swapped'
                        : status === 'active'
                          ? 'Partial'
                          : 'Not done'}
                </span>
              </div>
              {sets.length > 0 && (
                <p className="mt-1 text-sm text-neutral-300">
                  {sets.map((s) => setSummary(s, isTimed(exercise.reps) ? 'timed' : '')).join(' · ')}
                </p>
              )}
              {notes.length > 0 && <p className="mt-1 text-sm text-gold">{notes.map((n) => n.text).join(' · ')}</p>}
            </li>
          ))}
        </ul>
      </section>

      {session.changes.length > 0 && (
        <section className="mt-6">
          <Label>Changes you made</Label>
          <p className="-mt-1 mb-2 text-sm text-muted">Keep a change to update {clientName}'s programme from now on.</p>
          <ul className="space-y-1.5">
            {session.changes.map((change) => (
              <li key={change.id} className="rounded-xl border border-line bg-panel px-4 py-3">
                <p className="font-semibold text-white">{change.summary}</p>
                {change.reason && <p className="text-sm text-muted">Why: {change.reason}</p>}
                <div
                  className="mt-2 grid grid-cols-2 rounded-lg border border-line p-0.5"
                  role="group"
                  aria-label={change.summary}
                >
                  {[
                    [false, 'Today only'],
                    [true, change.type === 'skip' ? 'Remove from plan' : 'Keep in plan'],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={Boolean(keep[change.id]) === value}
                      onClick={() => setKeep((k) => ({ ...k, [change.id]: value }))}
                      className={`rounded-md py-1.5 text-sm font-semibold ${
                        Boolean(keep[change.id]) === value ? 'bg-gold text-ink' : 'text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <Label>Message to {clientName}</Label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. Great session. Knee felt better on split squats, so we're keeping them."
          className={inputBase}
        />
      </section>

      {sync.pending > 0 && (
        <p className="mt-4 text-sm text-[var(--pain-moderate)]">
          {sync.pending} {sync.pending === 1 ? 'change is' : 'changes are'} still waiting for signal. They're safe on
          this phone and send automatically.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="button" onClick={finish} disabled={busy} className={`mt-6 h-14 w-full text-lg ${buttonPrimary}`}>
        {busy ? 'Saving…' : `Finish and send to ${clientName}`}
      </button>
    </div>
  )
}

export function Done({ clientName, onClose }) {
  return (
    <Centered>
      <div className="celebrate flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold text-5xl text-gold">
        ✓
      </div>
      <h1 className="mt-6 font-display text-5xl font-bold uppercase leading-none">Session sent</h1>
      <p className="mt-3 text-muted">{clientName} can see the summary on their Programme.</p>
      <button type="button" onClick={onClose} className={`mt-8 w-full max-w-xs ${buttonPrimary}`}>
        Back to {clientName}
      </button>
    </Centered>
  )
}
