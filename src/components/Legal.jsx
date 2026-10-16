import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PRIVACY, TERMS, UPDATED } from '../data/legal.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { supabase } from '../lib/supabase.js'
import { deleteMyAccount, downloadMyData, giveConsent } from '../lib/account.js'
import { ask, toast } from './Feedback.jsx'
import { buttonPrimary, buttonSecondary } from './ui.jsx'

const DOCS = {
  privacy: { title: 'Privacy policy', sections: PRIVACY },
  terms: { title: 'Terms of use', sections: TERMS },
}

// The privacy policy or terms, opened over whatever screen you're on
export function LegalDoc({ which, onClose }) {
  const doc = DOCS[which]
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      className="sheet-up fixed inset-0 z-[58] overflow-y-auto bg-ink text-white"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="mx-auto max-w-xl px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold uppercase leading-none">{doc.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-10 w-10 shrink-0 rounded-full border border-line text-lg text-muted hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-muted">Last updated {UPDATED}</p>
        <div className="mt-6 space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="font-display text-xl font-semibold">{section.heading}</h3>
              {section.body.map((part, i) =>
                Array.isArray(part) ? (
                  <ul key={i} className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed text-neutral-300">
                    {part.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="mt-2 leading-relaxed text-neutral-300">
                    {part}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>
        <button type="button" onClick={onClose} className={`mt-8 w-full ${buttonPrimary}`}>
          Done
        </button>
      </div>
    </div>,
    document.body,
  )
}

// "Privacy policy" and "Terms" as links that open the documents
export function useLegal() {
  const [open, setOpen] = useState(null)
  const link = (which, label) => (
    <button
      type="button"
      onClick={() => setOpen(which)}
      className="font-semibold text-white underline decoration-gold underline-offset-4 hover:text-gold"
    >
      {label}
    </button>
  )
  const doc = open && <LegalDoc which={open} onClose={() => setOpen(null)} />
  return { link, doc }
}

function Check({ checked, onChange, children }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${checked ? 'border-gold bg-gold/10' : 'border-line bg-panel'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-gold)]"
      />
      <span className="text-sm leading-relaxed text-neutral-200">{children}</span>
    </label>
  )
}

// Shown once before the app, and again whenever the policy changes
export function ConsentScreen({ userId, profile, onDone }) {
  const { link, doc } = useLegal()
  const [terms, setTerms] = useState(false)
  const [health, setHealth] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const returning = Boolean(profile?.consented_at)

  async function agree() {
    setBusy(true)
    setError('')
    try {
      onDone(await giveConsent(userId))
    } catch {
      setError("Couldn't save that. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-xl flex-col px-5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
      }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Your data</p>
      <h1 className="mt-1 font-display text-5xl font-bold uppercase leading-none tracking-tight">
        {returning ? 'We’ve updated our policy' : 'Before you start'}
      </h1>
      <p className="mt-4 text-muted">
        Reforge works around your injuries, so it stores health information. Here’s the short version:
      </p>
      <ul className="mt-5 space-y-3">
        {[
          'Your injuries, pain scores and check-ins are used only to shape your training.',
          'Only you can see them, plus any physio, PT or coach you choose to connect with.',
          'Never sold, never used for adverts.',
          'Download everything or delete your account at any time from your profile.',
        ].map((line) => (
          <li key={line} className="flex gap-3 text-neutral-200">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        <Check checked={terms} onChange={setTerms}>
          I’m 16 or over and I agree to the {link('terms', 'Terms of use')} and {link('privacy', 'Privacy policy')}.
        </Check>
        <Check checked={health} onChange={setHealth}>
          I consent to Reforge using my health information, like injuries, pain and check-ins, to shape my training.
        </Check>
      </div>

      <div className="flex-1" />
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={agree}
        disabled={!terms || !health || busy}
        className={`mt-6 w-full ${buttonPrimary}`}
      >
        {busy ? 'Saving…' : 'Agree and continue'}
      </button>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="mt-3 py-2 text-sm font-semibold text-muted hover:text-white"
      >
        Not now, sign out
      </button>
      {doc}
    </main>
  )
}

// Profile: read the documents, download your data, delete your account
export function PrivacyPanel() {
  const { session } = useAuth()
  const { link, doc } = useLegal()
  const [busy, setBusy] = useState(null)
  const userId = session?.user?.id

  async function download() {
    setBusy('download')
    try {
      const { failed } = await downloadMyData(userId, session?.user?.email)
      toast(
        failed.length ? 'Downloaded. A few parts couldn’t be reached, so try again later.' : 'Your data is downloading',
      )
    } catch {
      toast("Couldn't collect your data. Check your connection.", { tone: 'error' })
    }
    setBusy(null)
  }

  async function remove() {
    const typed = await ask({
      title: 'Delete your account?',
      body: 'This permanently deletes your account, training, injuries, check-ins and anything a professional added for you. It can’t be undone. Download your data first if you want a copy.',
      confirm: 'Delete forever',
      danger: true,
      input: { label: 'Type DELETE to confirm', placeholder: 'DELETE', maxLength: 10 },
    })
    if (typed == null) return
    if (typed.trim().toUpperCase() !== 'DELETE') {
      toast('Nothing deleted. Type DELETE to confirm.', { tone: 'error' })
      return
    }
    setBusy('delete')
    try {
      await deleteMyAccount()
      toast('Your account and data have been deleted')
    } catch {
      toast("Couldn't delete your account. Check your connection and try again.", { tone: 'error' })
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Privacy and data</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-300">
        Read the {link('privacy', 'Privacy policy')} and {link('terms', 'Terms of use')}. Your data is yours: take a
        copy or delete it whenever you like.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={download} disabled={busy !== null} className={`flex-1 ${buttonSecondary}`}>
          {busy === 'download' ? 'Collecting…' : 'Download my data'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="flex-1 rounded-xl border border-red-400/50 px-4 py-2.5 text-sm font-semibold text-red-400 hover:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-40"
        >
          {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
      {doc}
    </section>
  )
}
