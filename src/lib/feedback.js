import { supabase } from './supabase.js'
import { isInstalled } from './install.js'

// Feedback from inside the app: bug reports and ideas. Read them in Supabase under Table Editor → feedback.

export const KINDS = [
  ['bug', 'A bug'],
  ['idea', 'An idea'],
  ['other', 'Other'],
]

// The phone, browser and screen size, so a bug can be reproduced. Nothing personal.
export function deviceText() {
  const agent = navigator.userAgent
  const phone = /iPhone|iPad/.test(agent)
    ? `iOS ${agent.match(/OS (\d+[_\d]*)/)?.[1]?.replace(/_/g, '.') ?? ''}`.trim()
    : /Android ([\d.]+)/.test(agent)
      ? `Android ${agent.match(/Android ([\d.]+)/)[1]}`
      : /Mac OS X/.test(agent)
        ? 'Mac'
        : /Windows/.test(agent)
          ? 'Windows'
          : 'Other'
  const browser = /CriOS|Chrome/.test(agent)
    ? 'Chrome'
    : /FxiOS|Firefox/.test(agent)
      ? 'Firefox'
      : /Safari/.test(agent)
        ? 'Safari'
        : 'Browser'
  const screen = `${window.innerWidth}×${window.innerHeight}`
  const theme = document.documentElement.dataset.theme ?? ''
  return [phone, browser, screen, isInstalled() ? 'home screen app' : 'in browser', theme]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 400)
}

export async function sendFeedback({ kind, body, area = null, error = null }) {
  const { error: failed } = await supabase.from('feedback').insert({
    kind,
    body: body.trim().slice(0, 2000),
    area,
    device: deviceText(),
    error: error ? String(error).slice(0, 1000) : null,
  })
  if (failed) throw failed
}

// What you've sent, newest first
export async function fetchMyFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('id, kind, body, area, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}
