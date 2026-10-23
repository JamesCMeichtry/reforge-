import { flushSync } from 'react-dom'

// Page transitions. When the address changes, the old page slides out and the new one slides in, in the
// direction you're going: deeper (a day, a client) slides in from the right, Back slides out to the right,
// and tabs slide the way they sit on the tab bar. Uses the browser's View Transitions; phones without them,
// or with Reduce Motion on, switch pages instantly as before. Tiles on Today's menu open their page out of the tile.

const TAB_ORDER = ['today', 'programme', 'body-map', 'progress', 'rehab', 'profile', 'clients']
const replays = new WeakSet()
let latest = 0

const partsOf = (url) => {
  try {
    return new URL(url).hash.replace('#', '').split('/').filter(Boolean)
  } catch {
    return []
  }
}

function direction(fromUrl, toUrl) {
  const from = partsOf(fromUrl)
  const to = partsOf(toUrl)
  const fromTab = from[0] ?? 'today'
  const toTab = to[0] ?? 'today'
  if (fromTab !== toTab) return TAB_ORDER.indexOf(toTab) >= TAB_ORDER.indexOf(fromTab) ? 'forward' : 'back'
  if (to.length > from.length) return 'forward'
  if (to.length < from.length) return 'back'
  return 'fade'
}

if (typeof window !== 'undefined' && typeof document.startViewTransition === 'function') {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  // Registered before any screen listens, so it can hold the change back and replay it inside the transition:
  // the browser photographs the old page, every screen updates at once, then the two pages slide.
  window.addEventListener('hashchange', (event) => {
    if (replays.has(event)) return
    const root = document.documentElement
    // A tile on Today's menu asked for its page to open out of the tile
    const fromTile = root.dataset.zoom === '1'
    delete root.dataset.zoom
    if (reduce.matches || document.visibilityState !== 'visible') return
    event.stopImmediatePropagation()
    const replay = new HashChangeEvent('hashchange', { oldURL: event.oldURL, newURL: event.newURL })
    replays.add(replay)
    const id = ++latest
    root.dataset.nav = fromTile ? 'zoom' : direction(event.oldURL, event.newURL)
    try {
      const transition = document.startViewTransition(() => flushSync(() => window.dispatchEvent(replay)))
      transition.finished.finally(() => {
        if (id === latest) delete root.dataset.nav
      })
    } catch {
      window.dispatchEvent(replay)
      delete root.dataset.nav
    }
  })
}
