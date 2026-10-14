import { Component, useEffect, useId, useRef, useState } from 'react'
import { buttonPrimary, buttonSecondary, inputBase } from './ui.jsx'

/* ---------- Questions and messages, in the app's own style instead of the browser's pop-ups ----------
   ask() shows a sheet and waits for the answer; toast() shows a short message above the tab bar.
   Both work from anywhere, so any screen can call them without passing anything down. */

let showSheet = null
let showToast = null

// Resolves true or false, or the typed text (null if cancelled) when `input` is given
export function ask({ title, body, confirm = 'OK', cancel = 'Cancel', danger = false, input = null }) {
  return new Promise((resolve) => {
    if (!showSheet) return resolve(input ? null : window.confirm(title))
    showSheet({ title, body, confirm, cancel, danger, input, resolve })
  })
}

export function toast(text, { tone = 'info', undo = null, onTimeout = null, duration } = {}) {
  if (!showToast) return onTimeout?.()
  showToast({ id: Math.random(), text, tone, undo, onTimeout, duration: duration ?? (undo ? 5000 : 3500) })
}

// Removes something straight away with a few seconds to undo, and only then deletes it for real
const waiting = new Set()
export function deleteWithUndo({ text, remove, restore, commit }) {
  remove()
  let done = false
  const run = async () => {
    if (done) return
    done = true
    waiting.delete(run)
    try {
      await commit()
    } catch {
      restore()
      toast("Couldn't delete that. Check your connection.", { tone: 'error' })
    }
  }
  waiting.add(run)
  toast(text, {
    undo: () => {
      done = true
      waiting.delete(run)
      restore()
    },
    onTimeout: run,
  })
}

// Closing the app inside the undo window still finishes the delete
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => [...waiting].forEach((run) => run()))
}

function Sheet({ request, onClose }) {
  const [value, setValue] = useState(request.input?.value ?? '')
  const titleId = useId()
  const focusRef = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    focusRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && close.current(request.input ? null : false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request.input])

  const submit = (event) => {
    event.preventDefault()
    if (request.input) {
      if (value.trim()) onClose(value.trim())
    } else onClose(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => onClose(request.input ? null : false)}
        className="sheet-fade absolute inset-0 bg-black/60"
      />
      <form
        onSubmit={submit}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-up relative w-full max-w-md rounded-t-3xl border border-line bg-panel px-5 pt-5 sm:rounded-3xl sm:pb-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <div aria-hidden="true" className="mx-auto -mt-1 mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <h2 id={titleId} className="font-display text-2xl font-bold leading-tight">
          {request.title}
        </h2>
        {request.body && <p className="mt-2 text-neutral-300">{request.body}</p>}
        {request.input && (
          <label className="mt-4 block text-sm font-medium text-muted">
            {request.input.label}
            <input
              ref={focusRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={request.input.placeholder}
              maxLength={request.input.maxLength ?? 120}
              className={`mt-1 ${inputBase}`}
            />
          </label>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onClose(request.input ? null : false)}
            className={`flex-1 py-3 ${buttonSecondary}`}
          >
            {request.cancel}
          </button>
          <button
            ref={request.input ? undefined : focusRef}
            type="submit"
            disabled={request.input ? !value.trim() : false}
            className={`flex-1 ${
              request.danger
                ? 'rounded-xl bg-red-400 px-5 py-3 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400'
                : buttonPrimary
            }`}
          >
            {request.confirm}
          </button>
        </div>
      </form>
    </div>
  )
}

function Toast({ item, onDone }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const timer = setTimeout(() => {
      item.onTimeout?.()
      done.current()
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item])
  return (
    <div
      className={`slide-up pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${
        item.tone === 'error' ? 'border-red-400/60 bg-red-950 text-red-300' : 'border-line bg-panel text-white'
      }`}
    >
      <p className="min-w-0 flex-1 text-sm font-semibold">{item.text}</p>
      {item.undo && (
        <button
          type="button"
          onClick={() => {
            item.undo()
            onDone()
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-gold"
        >
          Undo
        </button>
      )}
    </div>
  )
}

// Mounted once near the top of the app
export function FeedbackHost() {
  const [sheet, setSheet] = useState(null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    showSheet = setSheet
    showToast = (item) => setToasts((current) => [...current.slice(-2), item])
    return () => {
      showSheet = null
      showToast = null
    }
  }, [])

  const closeSheet = (answer) => {
    sheet?.resolve(answer)
    setSheet(null)
  }

  return (
    <>
      {sheet && <Sheet key={sheet.title} request={sheet} onClose={closeSheet} />}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 z-[55] mx-auto flex max-w-xl flex-col gap-2 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.75rem)' }}
      >
        {toasts.map((item) => (
          <Toast
            key={item.id}
            item={item}
            onDone={() => setToasts((current) => current.filter((t) => t.id !== item.id))}
          />
        ))}
      </div>
    </>
  )
}

/* ---------- When something breaks ----------
   One bug shows a calm message with a way out, instead of a blank screen. Sets waiting to sync and any live
   session are kept on the phone, so nothing logged is lost by reloading. */

const isStaleUpdate = (error) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(
    String(error?.message ?? error),
  )

export class CrashGuard extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Reforge crashed:', error)
    // After an update, an old copy of the app can ask for files that no longer exist: reload once to get the new one
    if (isStaleUpdate(error)) {
      try {
        if (!sessionStorage.getItem('reforge.reloaded')) {
          sessionStorage.setItem('reforge.reloaded', '1')
          window.location.reload()
        }
      } catch {
        // Storage blocked: show the message instead
      }
    }
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const update = isStaleUpdate(this.state.error)
    const message = (
      <section className="rounded-2xl border border-line bg-panel p-5" role="alert">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          {update ? 'Reforge has updated' : 'Something went wrong'}
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none">
          {update ? 'Reload to carry on' : 'This screen hit a problem'}
        </h2>
        <p className="mt-3 text-neutral-300">
          Nothing you've logged is lost. Sets waiting to sync and any live session are saved on this phone.
        </p>
        <div className="mt-5 flex gap-2">
          {this.props.resetKey !== undefined && !update && (
            <a href="#today" className={`flex-1 text-center ${buttonSecondary}`}>
              Go to Today
            </a>
          )}
          <button type="button" onClick={() => window.location.reload()} className={`flex-1 ${buttonPrimary}`}>
            Reload
          </button>
        </div>
        {!update && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">Details for support</summary>
            <p className="mt-2 break-words font-mono">{String(this.state.error?.message ?? this.state.error)}</p>
          </details>
        )}
      </section>
    )
    if (!this.props.page) return message
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center bg-ink px-6 text-white">{message}</main>
    )
  }
}
