import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthProvider.jsx'
import { useLegal } from '../components/Legal.jsx'

function friendlyError(error) {
  const message = error?.message ?? ''
  if (message.includes('Invalid login credentials')) {
    return "That email and password don't match. Check them and try again."
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirm your email first. The link is in your inbox.'
  }
  if (message.toLowerCase().includes('rate limit')) {
    return 'Too many attempts in a short time. Wait a few minutes and try again.'
  }
  if (message.includes('should be different')) {
    return 'Choose a password you haven’t used for Reforge before.'
  }
  if (message.includes('Failed to fetch')) {
    return "Can't reach Reforge right now. Check your connection and try again."
  }
  return message || 'Something went wrong. Try again.'
}

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-panel px-4 py-3 text-base text-white placeholder:text-neutral-600 focus:border-gold focus:outline-none'

function Brand({ intro }) {
  return (
    <>
      <h1 className="font-display text-7xl font-bold uppercase leading-none tracking-tight">Reforge</h1>
      <div aria-hidden="true" className="mt-3 h-1 w-12 bg-gold" />
      <p className="mt-4 text-muted">{intro}</p>
    </>
  )
}

const pageStyle = {
  paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
}

export default function AuthScreen({ initialMode = 'signIn' }) {
  const { linkError, clearLinkError } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(linkError ? `${linkError}. Request a new one below.` : '')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef(null)
  const { link, doc } = useLegal()

  const isSignUp = mode === 'signUp'
  const isReset = mode === 'reset'

  // Keeps the keyboard up and the cursor at the end when showing or hiding the password
  function togglePassword() {
    const input = passwordRef.current
    setShowPassword((shown) => !shown)
    input?.focus()
    requestAnimationFrame(() => {
      const end = input?.value.length ?? 0
      try {
        input?.setSelectionRange(end, end)
      } catch {
        // Some browsers don't allow moving the cursor on this input type
      }
    })
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
    clearLinkError?.()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (isReset) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (resetError) throw resetError
        setNotice(`If there's a Reforge account for ${email}, a link to reset the password is on its way.`)
      } else if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice(`We've sent a confirmation link to ${email}. Open it, then sign in here.`)
          setMode('signIn')
          setPassword('')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6" style={pageStyle}>
      <a href="#welcome" className="mb-8 self-start text-sm font-semibold text-muted hover:text-white">
        ‹ About Reforge
      </a>
      <Brand
        intro={
          isReset
            ? 'Enter your email and we’ll send you a link to choose a new password.'
            : isSignUp
              ? 'Create your account to build your programme.'
              : 'Sign in to your training and rehab.'
        }
      />

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        <label className="block text-sm font-medium text-neutral-300">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </label>

        {!isReset && (
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-sm font-semibold text-muted hover:text-white"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isSignUp ? 6 : undefined}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-20`}
              />
              <button
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={togglePassword}
                aria-pressed={showPassword}
                className="absolute top-2 right-2 bottom-0 my-auto h-10 rounded-lg px-3 text-sm font-semibold text-muted hover:text-white focus-visible:outline-2 focus-visible:outline-gold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isSignUp && <p className="mt-2 text-xs text-muted">At least 6 characters.</p>}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-gold">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gold py-3.5 font-semibold text-ink transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        >
          {busy
            ? isReset
              ? 'Sending…'
              : isSignUp
                ? 'Creating account…'
                : 'Signing in…'
            : isReset
              ? 'Send reset link'
              : isSignUp
                ? 'Create account'
                : 'Sign in'}
        </button>
        {isSignUp && (
          <p className="text-center text-xs leading-relaxed text-muted">
            By creating an account you agree to the {link('terms', 'Terms of use')} and{' '}
            {link('privacy', 'Privacy policy')}.
          </p>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {isReset ? 'Remembered it?' : isSignUp ? 'Already have an account?' : 'New to Reforge?'}{' '}
        <button
          type="button"
          onClick={() => switchMode(isSignUp || isReset ? 'signIn' : 'signUp')}
          className="font-semibold text-white underline decoration-gold underline-offset-4 hover:text-gold"
        >
          {isSignUp || isReset ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <p className="mt-6 flex justify-center gap-4 text-xs text-muted">
        {link('privacy', 'Privacy')}
        {link('terms', 'Terms')}
      </p>
      {doc}
    </main>
  )
}

// Opened from a password reset email: choose the new password, then carry on into the app
export function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(friendlyError(updateError))
      setBusy(false)
      return
    }
    window.history.replaceState(null, '', window.location.pathname)
    onDone()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6" style={pageStyle}>
      <Brand intro="Choose a new password for your account." />
      <form onSubmit={submit} className="mt-10 space-y-5">
        <label className="block text-sm font-medium text-neutral-300">
          New password
          <input
            type={shown ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={shown} onChange={(event) => setShown(event.target.checked)} />
          Show password
        </label>
        <p className="text-xs text-muted">At least 6 characters.</p>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || password.length < 6}
          className="w-full rounded-xl bg-gold py-3.5 font-semibold text-ink hover:bg-gold-light disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </main>
  )
}
