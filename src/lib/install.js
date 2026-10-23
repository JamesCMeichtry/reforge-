import { useEffect, useState } from 'react'

// Adding Reforge to the home screen, so it opens full screen like an app (and, on iPhone, can get notifications).
// Android and laptop Chrome offer a one-tap install; iPhone and iPad need the Share menu, so we show the steps.

const INSTALLED_KEY = 'reforge.installed'
const DISMISSED_KEY = 'reforge.install-dismissed'
const SEEN_KEY = 'reforge.seen'

function remember(key) {
  try {
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // Storage blocked: it just asks again next time
  }
}
function recall(key) {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  // Chrome fires this early, before any screen is showing, so it's caught here and kept for later
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    remember(INSTALLED_KEY)
    notify()
  })
}

// Opened from the home screen icon rather than a browser tab
export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export function platform() {
  const ua = navigator.userAgent
  if (/iPhone|iPod/.test(ua)) return 'iphone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ipad'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export const canPrompt = () => Boolean(deferredPrompt)

// Shows the browser's own install box; resolves true if they installed
export async function promptInstall() {
  if (!deferredPrompt) return false
  const event = deferredPrompt
  deferredPrompt = null
  notify()
  event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') remember(INSTALLED_KEY)
  return outcome === 'accepted'
}

// Dismissed cards stay hidden for two weeks, then ask once more
export const dismissInstall = () => remember(DISMISSED_KEY)
const recentlyDismissed = () => Date.now() - recall(DISMISSED_KEY) < 14 * 86400000

// Someone who has signed in on this device before goes straight to sign-in instead of the landing page
export const markSeen = () => remember(SEEN_KEY)
export const seenBefore = () => recall(SEEN_KEY) > 0

export function useInstall() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const update = () => setTick((n) => n + 1)
    listeners.add(update)
    return () => listeners.delete(update)
  }, [])
  const where = platform()
  const installed = isInstalled()
  return {
    installed,
    platform: where,
    canPrompt: canPrompt(),
    // Worth suggesting: on a phone or tablet, not already installed, and either one tap away or on Apple
    worthSuggesting: !installed && !recentlyDismissed() && (canPrompt() || where === 'iphone' || where === 'ipad'),
  }
}
