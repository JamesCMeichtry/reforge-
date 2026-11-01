import { supabase } from './supabase.js'
import { isInstalled, platform } from './install.js'
import { me } from './me.js'

// Push notifications: turning them on for this phone, and telling the server something happened.
// The server (the "notify" function in Supabase) decides who hears about it and sends it.

const bytes = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// What this phone can do: 'on', 'ask', 'blocked', 'install-first' (iPhone, not on the home screen) or 'unsupported'
export async function pushStatus() {
  if (!supported()) {
    const apple = platform() === 'iphone' || platform() === 'ipad'
    return apple && !isInstalled() ? 'install-first' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'blocked'
  const subscription = await currentSubscription()
  return Notification.permission === 'granted' && subscription ? 'on' : 'ask'
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

// The service worker is what receives notifications, so wait for it (it isn't there on the preview server)
async function serviceWorker() {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('no-worker')), 8000))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

// Must be called straight from a tap: the phone only shows its permission question in response to one
export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('blocked')
  const { data, error } = await supabase.functions.invoke('notify', { body: { type: 'key' } })
  if (error || !data?.key) throw new Error('not-set-up')
  const registration = await serviceWorker()
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(data.key) }))
  const { endpoint, keys } = subscription.toJSON()
  const { error: saveError } = await supabase.rpc('save_push_subscription', {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })
  if (saveError) throw saveError
}

// Stops notifications to this phone (also used when signing out, so the next person doesn't get yours)
export async function disablePush() {
  if (!supported()) return
  const subscription = await currentSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

// Something happened that someone else should hear about. Never holds anything up, and never fails loudly:
// if notifications aren't set up yet, nothing happens.
export function notify(type, id) {
  if (!id) return
  supabase.functions.invoke('notify', { body: { type, id } }).catch(() => {})
}

/* ---------- Reminders ---------- */

export const REMINDERS = [
  ['bookings', '1-1 reminder', 'The evening before a booked session'],
  ['morning', 'Morning check-in', 'At 9am, the day after a check-in'],
  ['report', 'Monthly report', 'On the 1st, when last month is ready'],
]
const ALL_ON = { bookings: true, morning: true, report: true }

// Which reminders you get. Everything is on until you turn something off.
export async function fetchReminderSettings() {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('bookings, morning, report')
    .eq('user_id', me())
    .maybeSingle()
  if (error) throw error
  return { ...ALL_ON, ...(data ?? {}) }
}

export async function saveReminderSettings(settings) {
  const { error } = await supabase
    .from('reminder_settings')
    .upsert({ user_id: me(), ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// Testing tools: makes the pair of keys the server needs, here on this phone. The private one is never sent anywhere.
export async function makeKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const base64url = (data) =>
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  return { publicKey: base64url(raw), privateKey: jwk.d }
}
