import { useEffect, useState } from 'react'
import { adjustPackage, fetchPackage, startPackage } from '../lib/packages.js'
import { me } from '../lib/me.js'
import { ask, toast } from './Feedback.jsx'
import { buttonSecondary } from './ui.jsx'

function Bar({ used, sessions }) {
  const share = Math.min(1, used / sessions)
  const over = used > sessions
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${Math.max(3, Math.round(share * 100))}%`,
          background: over ? 'var(--pain-severe)' : 'var(--color-gold)',
        }}
      />
    </div>
  )
}

const leftText = (pkg) => (pkg.left > 0 ? `${pkg.left} left` : pkg.left === 0 ? 'All used' : `${-pkg.left} over`)

// Professional, on a client's page: track a block of 1-1 sessions
export function PackageCard({ clientId, clientName }) {
  const [pkg, setPkg] = useState(undefined)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () =>
    fetchPackage(clientId)
      .then(setPkg)
      .catch(() => setPkg('offline'))

  useEffect(() => {
    fetchPackage(clientId)
      .then(setPkg)
      .catch(() => setPkg('offline'))
  }, [clientId])

  async function newPackage() {
    const typed = await ask({
      title: pkg ? 'Start a new package?' : 'Track 1-1 sessions',
      body: `How many 1-1 sessions has ${clientName ?? 'this client'} got? Every live session you finish from now on counts towards it.${pkg ? ' The current package is replaced.' : ''}`,
      confirm: 'Start package',
      input: { label: 'Number of sessions', placeholder: 'e.g. 10', maxLength: 3 },
    })
    if (typed == null) return
    const sessions = parseInt(typed, 10)
    if (!(sessions >= 1 && sessions <= 200)) {
      toast('Enter a number of sessions between 1 and 200.', { tone: 'error' })
      return
    }
    setBusy(true)
    try {
      await startPackage(clientId, sessions)
      await load()
      toast(`Package of ${sessions} started`)
      setOpen(false)
    } catch {
      toast("Couldn't start the package. Check your connection.", { tone: 'error' })
    }
    setBusy(false)
  }

  async function correct(change) {
    const adjust = pkg.adjust + change
    const before = pkg
    setPkg({ ...pkg, adjust, used: Math.max(0, pkg.used + change), left: pkg.left - change })
    try {
      await adjustPackage(pkg.id, adjust)
    } catch {
      setPkg(before)
      toast("Couldn't change the count. Check your connection.", { tone: 'error' })
    }
  }

  if (pkg === undefined || pkg === 'offline') return null

  if (!pkg) {
    return (
      <button
        type="button"
        onClick={newPackage}
        disabled={busy}
        className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left hover:border-gold"
      >
        <span>
          <span className="block text-sm font-semibold text-white">Track 1-1 sessions</span>
          <span className="block text-xs text-muted">Count live sessions against a package, like 10 paid upfront</span>
        </span>
        <span aria-hidden="true" className="text-xl font-bold text-gold">
          +
        </span>
      </button>
    )
  }

  return (
    <section className="mb-5 rounded-2xl border border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">1-1 sessions</p>
          <p className="mt-0.5 font-semibold text-white">
            <span className="font-display text-2xl">{pkg.used}</span>
            <span className="text-muted"> of {pkg.sessions} used</span>
            <span
              className={`ml-2 text-sm ${pkg.left <= 0 ? 'text-red-400' : pkg.left <= 2 ? 'text-gold' : 'text-muted'}`}
            >
              · {leftText(pkg)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-expanded={open}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-white"
        >
          {open ? 'Done' : 'Manage'}
        </button>
      </div>
      <Bar used={pkg.used} sessions={pkg.sessions} />
      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-xs text-muted">
            Finished live sessions count on their own. Correct the count here for sessions done outside Reforge.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => correct(-1)}
              disabled={pkg.used === 0}
              aria-label="One fewer session used"
              className={`w-12 ${buttonSecondary}`}
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => correct(1)}
              aria-label="One more session used"
              className={`w-12 ${buttonSecondary}`}
            >
              +1
            </button>
            <button type="button" onClick={newPackage} disabled={busy} className={`flex-1 ${buttonSecondary}`}>
              New package
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// Client, on their Profile: how many 1-1 sessions they have left with their professional
export function PackageLine({ proId }) {
  const [pkg, setPkg] = useState(null)
  useEffect(() => {
    fetchPackage(me(), proId)
      .then(setPkg)
      .catch(() => {})
  }, [proId])
  if (!pkg) return null
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-sm text-neutral-300">
        1-1 sessions:{' '}
        <span className="font-semibold text-white">
          {pkg.used} of {pkg.sessions} used
        </span>
        <span className={pkg.left <= 0 ? 'text-red-400' : 'text-muted'}> · {leftText(pkg)}</span>
      </p>
      <Bar used={pkg.used} sessions={pkg.sessions} />
    </div>
  )
}
