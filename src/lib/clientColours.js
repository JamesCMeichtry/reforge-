// Each client gets their own colour so they're easy to tell apart at a glance.
// Colours are handed out in the order clients connected and remembered on this phone,
// so nobody's colour changes when someone new joins. Red and gold are left out:
// red means a flare-up and gold is Reforge's own colour.
export const CLIENT_COLOURS = [
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#34d399', // emerald
  '#f472b6', // pink
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#818cf8', // indigo
  '#a3e635', // lime
  '#e879f9', // fuchsia
  '#60a5fa', // blue
]

const KEY = 'reforge.client-colours'

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

// Someone not handed a colour yet (say, opened from a link) still gets a steady one from their id
function fromId(id) {
  let hash = 0
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % CLIENT_COLOURS.length
}

export function clientColour(id) {
  const index = readMap()[id] ?? fromId(id)
  return CLIENT_COLOURS[index % CLIENT_COLOURS.length]
}

// Give any new clients the next colour nobody is using. Call this whenever the client list loads.
export function assignClientColours(clients) {
  const map = readMap()
  const ordered = [...clients].sort((a, b) => String(a.since ?? '').localeCompare(String(b.since ?? '')))
  let changed = false
  for (const client of ordered) {
    if (map[client.id] != null) continue
    const used = new Set(Object.values(map))
    let index = CLIENT_COLOURS.findIndex((_, i) => !used.has(i))
    if (index === -1) index = Object.keys(map).length % CLIENT_COLOURS.length
    map[client.id] = index
    changed = true
  }
  if (!changed) return
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // Private browsing: colours fall back to the steady one from each id
  }
}
