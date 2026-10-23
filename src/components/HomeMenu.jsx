import { useEffect, useState } from 'react'
import './HomeMenu.css'
import { CLIENTS_TAB, TABS } from './TabBar.jsx'
import { computeStreak, fetchActivityDays } from '../lib/streak.js'
import { fetchTargets } from '../lib/plans.js'
import { fetchInjurySites, fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchUnread } from '../lib/chat.js'
import { attentionItems, fetchMyClients, fetchMyPros } from '../lib/pro.js'
import { fetchProfile } from '../lib/profile.js'
import { me } from '../lib/me.js'

// Today's main menu: every other part of the app as a big tile, each with a live line of what's going on there

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const areaLabel = (areaId) => areaId.charAt(0).toUpperCase() + areaId.slice(1).replace(/-/g, ' ')
const shortDay = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function whenText(date) {
  const day = (d) => d.toLocaleDateString('en-CA')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date === day(today)) return 'today'
  if (date === day(yesterday)) return 'yesterday'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })
}

// Each line loads on its own, so one slow or missing piece never holds up the menu
const settle = (promise) => promise.then((value) => value).catch(() => null)

async function liveLines(upNext) {
  const [days, targets, sites, checkIns, unread, pros, profile] = await Promise.all([
    settle(fetchActivityDays(120)),
    settle(fetchTargets()),
    settle(fetchInjurySites()),
    settle(fetchRecentCheckIns(7)),
    settle(fetchUnread()),
    settle(fetchMyPros()),
    settle(fetchProfile(me())),
  ])
  const lines = { alert: {} }

  lines.programme = upNext
    ? `Next: ${upNext.name} · ${plural(upNext.exercises.length, 'exercise')}`
    : 'Your plan and every session'

  if (sites) {
    lines['body-map'] = sites.length
      ? `${plural(sites.length, 'injured area')} tracked`
      : 'Injuries and strength on one body'
  }

  const streak = days ? computeStreak(days).current : 0
  const nextTarget = targets?.find((t) => !t.done_at)
  const progress = [
    streak ? `${streak}-day streak` : 'Start a streak today',
    nextTarget ? `target by ${shortDay(nextTarget.due_on)}` : null,
  ]
  lines.progress = progress.filter(Boolean).join(' · ')

  const latest = checkIns?.at(-1)
  if (latest) {
    const pain = latest.next_morning ?? latest.pain_after ?? latest.pain_during
    lines.rehab = `${areaLabel(latest.area_id)} · ${pain ?? '–'}/10 ${whenText(latest.session_date)}`
  } else if (sites?.length) {
    lines.rehab = 'No check-in this week yet'
  }

  const pro = pros?.[0]
  const fromPro = pro && unread?.find((u) => u.otherId === pro.id)
  if (fromPro) {
    lines.profile = `${plural(fromPro.count, 'new message')} from ${pro.display_name ?? 'your coach'}`
    lines.alert.profile = true
  } else if (pro) {
    lines.profile = `With ${pro.display_name ?? 'your coach'} · friends and settings`
  }

  if (profile?.role === 'pro') {
    const clients = await settle(fetchMyClients())
    const waiting = clients ? attentionItems(clients).length : null
    lines.clients =
      waiting == null ? 'Everyone you look after' : waiting ? `${waiting} to look at today` : 'All clear today'
    lines.alert.clients = Boolean(waiting)
    lines.pro = true
  }
  return lines
}

const FALLBACK = {
  programme: 'Your plan and every session',
  'body-map': 'Injuries and strength on one body',
  progress: 'Streak, targets and strength',
  rehab: 'How each injury is going',
  profile: 'Friends, settings and your data',
  clients: 'Everyone you look after',
}

function Tile({ tab, line, wide = false, alert = false }) {
  const [pressed, setPressed] = useState(false)

  // Hold the press for a moment so it's seen, then open the page out of this tile
  function open(event) {
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    const root = document.documentElement
    root.style.setProperty('--tile-top', `${Math.max(0, box.top)}px`)
    root.style.setProperty('--tile-left', `${Math.max(0, box.left)}px`)
    root.style.setProperty('--tile-right', `${Math.max(0, window.innerWidth - box.right)}px`)
    root.style.setProperty('--tile-bottom', `${Math.max(0, window.innerHeight - box.bottom)}px`)
    root.dataset.zoom = '1'
    navigator.vibrate?.(8)
    setPressed(true)
    setTimeout(() => {
      window.location.hash = tab.id
    }, 110)
  }

  return (
    <a
      href={`#${tab.id}`}
      onClick={open}
      className={`menu-tile flex min-h-36 flex-col rounded-2xl border border-line bg-panel p-4 ${
        wide ? 'col-span-2' : ''
      } ${pressed ? 'pressed' : ''}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="menu-icon flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {tab.icon}
          </svg>
        </span>
        <span aria-hidden="true" className="text-xl text-muted">
          ›
        </span>
      </span>
      <span className="mt-4 block">
        <span className="block font-display text-2xl font-bold uppercase leading-none text-white">{tab.label}</span>
        <span
          className={`mt-1.5 line-clamp-2 block text-sm leading-snug ${alert ? 'font-semibold text-gold' : 'text-muted'}`}
        >
          {line}
        </span>
      </span>
    </a>
  )
}

export default function HomeMenu({ upNext }) {
  const [lines, setLines] = useState({})

  // Waits for Today to know the next session (undefined while it loads), so everything is fetched once
  useEffect(() => {
    if (upNext === undefined) return
    let cancelled = false
    liveLines(upNext).then((found) => !cancelled && setLines(found))
    return () => {
      cancelled = true
    }
  }, [upNext])

  const tabs = TABS.filter((tab) => tab.id !== 'today')
  const lineFor = (id) => lines[id] ?? FALLBACK[id]

  return (
    <section aria-labelledby="menu-heading">
      <h2 id="menu-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Main menu
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {lines.pro && <Tile tab={CLIENTS_TAB} line={lineFor('clients')} alert={lines.alert?.clients} wide />}
        {tabs.map((tab, i) => (
          // With an odd number, the last tile spans the row so the grid stays tidy
          <Tile
            key={tab.id}
            tab={tab}
            line={lineFor(tab.id)}
            alert={lines.alert?.[tab.id]}
            wide={tabs.length % 2 === 1 && i === tabs.length - 1}
          />
        ))}
      </div>
    </section>
  )
}
