import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

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
  if (message.includes('Failed to fetch')) {
    return "Can't reach Reforge right now. Check your connection and try again."
  }
  return message || 'Something went wrong. Try again.'
}

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-panel px-4 py-3 text-base text-white placeholder:text-neutral-600 focus:border-gold focus:outline-none'

export default function AuthScreen() {
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isSignUp = mode === 'signUp'

  function switchMode() {
    setMode(isSignUp ? 'signIn' : 'signUp')
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (isSignUp) {
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
    <main
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
    >
      <h1 className="font-display text-7xl font-bold uppercase leading-none tracking-tight">Reforge</h1>
      <div aria-hidden="true" className="mt-3 h-1 w-12 bg-gold" />
      <p className="mt-4 text-muted">
        {isSignUp ? 'Create your account to build your programme.' : 'Sign in to your training and rehab.'}
      </p>

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

        <label className="block text-sm font-medium text-neutral-300">
          Password
          <input
            type="password"
            required
            minLength={isSignUp ? 6 : undefined}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
          {isSignUp && <span className="mt-2 block text-xs text-muted">At least 6 characters.</span>}
        </label>

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
          {busy ? (isSignUp ? 'Creating account…' : 'Signing in…') : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {isSignUp ? 'Already have an account?' : 'New to Reforge?'}{' '}
        <button
          type="button"
          onClick={switchMode}
          className="font-semibold text-white underline decoration-gold underline-offset-4 hover:text-gold"
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </main>
  )
}
