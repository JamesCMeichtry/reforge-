import { useId, useState } from 'react'
import { WAITLIST_ROLES, isValidEmail, joinWaitlist } from '../lib/waitlist.js'

// Waiting-list sign-up for the landing page: email and who you are, nothing else

const inputClass =
  'w-full rounded-xl border border-line bg-ink px-4 py-3 text-base text-white placeholder:text-neutral-600 focus:border-gold focus:outline-none'

export default function Waitlist() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('solo')
  // Bots fill every field; people never see this one
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle · sending · joined · already · error
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (status === 'sending') return
    if (!isValidEmail(email)) {
      setStatus('error')
      setMessage('That email doesn’t look right. Check it and try again.')
      return
    }
    if (website) {
      setStatus('joined')
      return
    }
    setStatus('sending')
    setMessage('')
    try {
      setStatus(await joinWaitlist({ email, role }))
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Check your connection and try again.')
    }
  }

  if (status === 'joined' || status === 'already') {
    return (
      <div role="status" className="mx-auto mt-8 max-w-md rounded-xl border border-gold/60 bg-ink px-5 py-4">
        <p className="font-semibold text-gold">
          {status === 'joined' ? 'You’re on the list' : 'You’re already on the list'}
        </p>
        <p className="mt-1 text-sm text-muted">
          {status === 'joined'
            ? 'We’ll email you when there’s news. Nothing else.'
            : 'No need to sign up again. We’ll email you when there’s news.'}
        </p>
      </div>
    )
  }

  const sending = status === 'sending'

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-8 max-w-md text-left" aria-labelledby={`${id}-heading`}>
      <p id={`${id}-heading`} className="text-center text-sm font-semibold text-white">
        Not ready yet? Join the waiting list
      </p>
      <p className="mt-1 text-center text-sm text-muted">Hear about new features and the full launch first.</p>

      <fieldset className="mt-4">
        <legend className="sr-only">I am</legend>
        <div className="grid grid-cols-3 gap-2">
          {WAITLIST_ROLES.map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${
                role === value ? 'border-gold bg-gold text-ink' : 'border-line text-muted hover:text-white'
              }`}
            >
              <input
                type="radio"
                name={`${id}-role`}
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          maxLength={254}
          onChange={(event) => {
            setEmail(event.target.value)
            if (status === 'error') setStatus('idle')
          }}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={status === 'error' ? `${id}-error` : undefined}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={sending}
          className="shrink-0 rounded-xl border border-gold px-5 py-3 font-semibold text-gold hover:bg-gold hover:text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {sending ? 'Joining…' : 'Join'}
        </button>
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      {status === 'error' && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-400">
          {message}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-muted">
        We only use your email to tell you about Reforge. Ask us to remove it at any time.
      </p>
    </form>
  )
}
