import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary } from './ui.jsx'
import { dayLabel, fetchMessages, fetchUnread, markRead, messageTime, sendMessage } from '../lib/chat.js'
import { fetchMyPros, professionLabel } from '../lib/pro.js'
import { me } from '../lib/me.js'

const POLL_MS = 4000
const preview = (text, length = 90) => (text.length > length ? `${text.slice(0, length).trimEnd()}…` : text)
// On a laptop Enter sends; on a phone it adds a new line and the Send button sends
const enterSends = () => window.matchMedia?.('(pointer: fine)').matches ?? false

/* ---------- One conversation ---------- */

function Bubble({ message, mine, seen, onRetry }) {
  const failed = message.status === 'failed'
  return (
    <li className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 leading-snug ${
          mine ? 'rounded-br-md bg-gold text-ink' : 'rounded-bl-md border border-line bg-panel text-white'
        } ${message.status === 'sending' ? 'opacity-60' : ''}`}
      >
        {message.body}
      </div>
      <p className={`mt-1 px-1 text-[11px] ${failed ? 'font-semibold text-red-400' : 'text-muted'}`}>
        {failed ? (
          <button type="button" onClick={() => onRetry(message)} className="font-semibold text-red-400 underline">
            Not sent. Tap to try again
          </button>
        ) : message.status === 'sending' ? (
          'Sending…'
        ) : (
          <>
            {messageTime(message.created_at)}
            {seen ? ' · Seen' : ''}
          </>
        )}
      </p>
    </li>
  )
}

export function ChatThread({ clientId, proId, otherName = 'them' }) {
  const [messages, setMessages] = useState(null)
  const [failed, setFailed] = useState(false)
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const boxRef = useRef(null)
  const lastCount = useRef(0)
  const myId = me()

  // Load now, then check for new messages every few seconds while the conversation is on screen
  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (document.visibilityState !== 'visible') return
      fetchMessages(clientId, proId)
        .then((list) => {
          if (cancelled) return
          setFailed(false)
          setMessages((current) => {
            // Keep messages still sending or that failed to send at the bottom
            const local = (current ?? []).filter((m) => m.status)
            return [...list, ...local]
          })
          if (list.some((m) => m.sender_id !== myId && !m.read_at)) markRead(clientId, proId).catch(() => {})
        })
        .catch(() => !cancelled && setFailed(true))
    }
    load()
    const timer = setInterval(load, POLL_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [clientId, proId, myId])

  // Jump to the newest message when the conversation opens or something new arrives
  useLayoutEffect(() => {
    const count = messages?.length ?? 0
    if (count > lastCount.current) endRef.current?.scrollIntoView({ block: 'end' })
    lastCount.current = count
  }, [messages])

  // The box grows with what you type, up to about six lines
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${Math.min(box.scrollHeight, 160)}px`
  }, [text])

  async function deliver(local) {
    setMessages((current) => current.map((m) => (m.id === local.id ? { ...local, status: 'sending' } : m)))
    try {
      const saved = await sendMessage(clientId, proId, local.body)
      setMessages((current) => current.map((m) => (m.id === local.id ? saved : m)))
    } catch {
      setMessages((current) => current.map((m) => (m.id === local.id ? { ...local, status: 'failed' } : m)))
    }
  }

  function send(event) {
    event?.preventDefault()
    const body = text.trim()
    if (!body) return
    const local = {
      id: `local-${Date.now()}`,
      client_id: clientId,
      pro_id: proId,
      sender_id: myId,
      body,
      created_at: new Date().toISOString(),
      status: 'sending',
    }
    setMessages((current) => [...(current ?? []), local])
    setText('')
    deliver(local)
    boxRef.current?.focus()
  }

  if (messages === null && failed) {
    return (
      <div>
        <p className="text-neutral-300">Couldn't load your messages. Check your connection.</p>
        <button type="button" onClick={() => window.location.reload()} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </div>
    )
  }
  if (messages === null) return <LoadingCards count={3} height="h-14" label="Loading messages" />

  const lastSeen = [...messages].reverse().find((m) => m.sender_id === myId && !m.status)
  let previousDay = null

  return (
    <div>
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
          <p className="font-semibold text-white">No messages yet</p>
          <p className="mt-1 text-sm text-muted">Say hello to {otherName}. Only the two of you can see this.</p>
        </div>
      ) : (
        <ol className="space-y-2" aria-label={`Messages with ${otherName}`}>
          {messages.map((m) => {
            const day = new Date(m.created_at).toLocaleDateString('en-CA')
            const heading = day !== previousDay ? dayLabel(m.created_at) : null
            previousDay = day
            return [
              heading && (
                <li
                  key={`day-${day}`}
                  className="pt-3 pb-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-muted"
                >
                  {heading}
                </li>
              ),
              <Bubble
                key={m.id}
                message={m}
                mine={m.sender_id === myId}
                seen={m === lastSeen && Boolean(m.read_at)}
                onRetry={deliver}
              />,
            ]
          })}
        </ol>
      )}
      {failed && (
        <p className="mt-3 text-center text-xs text-muted">
          No connection. New messages will appear when you're back online.
        </p>
      )}
      <div ref={endRef} />

      <form
        onSubmit={send}
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-10 -mx-1 mt-4 bg-ink px-1 pt-2 pb-2 lg:bottom-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-panel p-1.5 focus-within:border-gold">
          <textarea
            ref={boxRef}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 2000))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && enterSends()) send(event)
            }}
            rows={1}
            placeholder={`Message ${otherName}`}
            aria-label={`Message ${otherName}`}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-base text-white placeholder:text-neutral-600 focus:outline-none"
          />
          <button type="submit" disabled={!text.trim()} className={`${buttonPrimary} px-4 py-2`}>
            Send
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          Not for emergencies. If it's urgent call 111, or 999 in an emergency.
        </p>
      </form>
    </div>
  )
}

/* ---------- Client: their conversation with their physio or PT (#profile/messages) ---------- */

export function MessagesPage() {
  const [pros, setPros] = useState(undefined)

  useEffect(() => {
    fetchMyPros()
      .then(setPros)
      .catch(() => setPros(null))
  }, [])

  const pro = pros?.[0]
  return (
    <>
      <a href="#profile" className="text-sm font-semibold text-muted hover:text-white">
        ‹ Profile
      </a>
      <div className="mt-3">
        <ScreenHeader
          title="Messages"
          intro={
            pro
              ? `With ${pro.display_name ?? 'your professional'}, your ${professionLabel(pro.profession).toLowerCase()}.`
              : undefined
          }
        />
      </div>
      {pros === undefined && <LoadingCards count={3} height="h-14" label="Loading messages" />}
      {pros === null && <p className="text-neutral-300">Couldn't load your messages. Check your connection.</p>}
      {pros?.length === 0 && (
        <p className="text-neutral-300">Connect with a physio or PT on your Profile and you can message them here.</p>
      )}
      {pro && <ChatThread clientId={me()} proId={pro.id} otherName={pro.display_name ?? 'your coach'} />}
    </>
  )
}

// Profile: the way into the conversation, with how many are unread
export function MessagesLink({ proId, proName }) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetchUnread()
      .then((list) => setUnread(list.find((u) => u.otherId === proId)?.count ?? 0))
      .catch(() => {})
  }, [proId])

  return (
    <a
      href="#profile/messages"
      className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:border-gold"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-white">Message {proName ?? 'them'}</span>
        <span className="block text-sm text-muted">
          {unread ? `${unread} new ${unread === 1 ? 'message' : 'messages'}` : 'Questions, updates, how it went'}
        </span>
      </span>
      {unread ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
          {unread}
        </span>
      ) : (
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      )}
    </a>
  )
}

// Today: a card when your physio or PT has sent you something you haven't read
export function NewMessages() {
  const [state, setState] = useState(null)

  useEffect(() => {
    Promise.all([fetchUnread(), fetchMyPros()])
      .then(([unread, pros]) => {
        const fromPro = unread.find((u) => u.last.client_id === me() && pros.some((p) => p.id === u.otherId))
        if (fromPro) setState({ ...fromPro, name: pros.find((p) => p.id === fromPro.otherId)?.display_name })
      })
      .catch(() => {})
  }, [])

  if (!state) return null
  return (
    <a href="#profile/messages" className="block rounded-2xl border border-gold/60 bg-panel p-5 hover:border-gold">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        {state.count === 1 ? 'New message' : `${state.count} new messages`} · {messageTime(state.last.created_at)}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold">From {state.name ?? 'your coach'}</h2>
      <p className="mt-1 text-neutral-300">“{preview(state.last.body)}”</p>
      <p className="mt-3 text-sm font-semibold text-gold">Reply ›</p>
    </a>
  )
}
