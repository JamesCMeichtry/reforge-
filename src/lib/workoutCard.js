import { amountText } from './measure.js'

// A picture of a finished workout to share on Instagram, WhatsApp and the rest.
// Only training goes on it (the session, sets and weights), never injuries, pain or notes.

const W = 1080
const H = 1350
const PAD = 84
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const BODY = 'Barlow, system-ui, sans-serif'

// How each exercise reads on the card: "3 × 5 · 100 kg", "100 kg × 5, 90 kg × 8", "3 × 40 s"
function setsText(sets) {
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number)
  const amount = (s) => (s.reps == null ? '✓' : amountText(Number(s.reps), s.unit))
  const weights = [...new Set(ordered.map((s) => (s.weight_kg == null ? null : Number(s.weight_kg))))]
  const amounts = [...new Set(ordered.map(amount))]
  if (weights.length === 1) {
    const load = weights[0] == null ? (ordered[0].band ? ` · ${ordered[0].band} band` : '') : ` · ${weights[0]} kg`
    return amounts.length === 1
      ? `${ordered.length} × ${amounts[0]}${load}`
      : `${ordered.map(amount).join(', ')}${load}`
  }
  return ordered.map((s) => (s.weight_kg == null ? amount(s) : `${Number(s.weight_kg)}×${amount(s)}`)).join(', ')
}

const heaviest = (sets) => Math.max(0, ...sets.map((s) => Number(s.weight_kg) || 0))

// Exercises in the order of the session, each with its sets and whether it went up on last time
export function cardRows(day, logged, previous = {}) {
  return day.exercises
    .map((exercise) => {
      const sets = logged.filter((s) => s.exercise === exercise.name)
      if (!sets.length) return null
      const before = heaviest(previous[exercise.name]?.sets ?? [])
      return { name: exercise.name, text: setsText(sets), up: before > 0 && heaviest(sets) > before }
    })
    .filter(Boolean)
}

function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draws the card and returns it as a PNG file
export async function drawWorkoutCard({ title, focus, date, stats, rows, partner, site }) {
  // The app's own fonts, so the card looks like Reforge
  await Promise.all(
    [`700 120px ${DISPLAY}`, `600 40px ${DISPLAY}`, `600 36px ${BODY}`, `400 32px ${BODY}`].map((font) =>
      document.fonts?.load(font).catch(() => {}),
    ),
  )
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const gold = '#c9a227'

  // Background with a soft gold glow in the corner
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 900)
  glow.addColorStop(0, 'rgba(201,162,39,0.22)')
  glow.addColorStop(1, 'rgba(201,162,39,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Top line: brand and date
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  ctx.font = `700 52px ${DISPLAY}`
  ctx.fillText('REFORGE', PAD, PAD + 40)
  ctx.fillStyle = gold
  ctx.fillRect(PAD, PAD + 58, 56, 6)
  ctx.fillStyle = '#9a9a9a'
  ctx.font = `600 34px ${BODY}`
  ctx.textAlign = 'right'
  ctx.fillText(date, W - PAD, PAD + 40)
  ctx.textAlign = 'left'

  // The session's name, as big as fits
  let y = PAD + 230
  ctx.fillStyle = gold
  ctx.font = `600 34px ${BODY}`
  ctx.fillText('SESSION DONE', PAD, y - 120)
  let size = 150
  ctx.font = `700 ${size}px ${DISPLAY}`
  while (size > 70 && ctx.measureText(title.toUpperCase()).width > W - PAD * 2) {
    size -= 6
    ctx.font = `700 ${size}px ${DISPLAY}`
  }
  ctx.fillStyle = '#fff'
  ctx.fillText(fit(ctx, title.toUpperCase(), W - PAD * 2), PAD, y)
  if (focus) {
    ctx.fillStyle = '#d4d4d4'
    ctx.font = `400 36px ${BODY}`
    ctx.fillText(fit(ctx, focus, W - PAD * 2), PAD, y + 58)
    y += 58
  }

  // Three numbers
  y += 60
  const boxes = [
    ['SETS', String(stats.sets)],
    ['EXERCISES', `${stats.exercisesDone}`],
    ['VOLUME', stats.volume ? `${stats.volume.toLocaleString('en-GB')} kg` : '–'],
  ]
  const gap = 20
  const bw = (W - PAD * 2 - gap * 2) / 3
  boxes.forEach(([label, value], i) => {
    const x = PAD + i * (bw + gap)
    roundRect(ctx, x, y, bw, 150, 26)
    ctx.fillStyle = '#0f0f0f'
    ctx.fill()
    ctx.strokeStyle = '#262626'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#9a9a9a'
    ctx.font = `600 24px ${BODY}`
    ctx.fillText(label, x + 28, y + 50)
    ctx.fillStyle = '#fff'
    let valueSize = 64
    ctx.font = `700 ${valueSize}px ${DISPLAY}`
    while (valueSize > 36 && ctx.measureText(value).width > bw - 56) {
      valueSize -= 4
      ctx.font = `700 ${valueSize}px ${DISPLAY}`
    }
    ctx.fillText(value, x + 28, y + 118)
  })

  // The exercises
  y += 150 + 100
  const footerTop = H - PAD - 60
  // Short sessions spread out to fill the card; long ones squeeze in as many as fit
  const lineHeight = Math.min(112, Math.max(74, Math.floor((footerTop - y - 20) / Math.max(rows.length, 1))))
  const room = Math.max(1, Math.floor((footerTop - y - 20) / lineHeight))
  const shown = rows.length > room ? rows.slice(0, room - 1) : rows
  for (const row of shown) {
    ctx.fillStyle = '#262626'
    ctx.fillRect(PAD, y - 50, W - PAD * 2, 2)
    ctx.font = `600 34px ${BODY}`
    const rightWidth = Math.min(ctx.measureText(row.text).width, (W - PAD * 2) * 0.55)
    ctx.fillStyle = gold
    ctx.textAlign = 'right'
    ctx.fillText(fit(ctx, row.text, rightWidth), W - PAD, y)
    ctx.textAlign = 'left'
    // The name in white, with a gold arrow after it if it went up on last time
    ctx.font = `600 38px ${BODY}`
    const arrow = row.up ? '  ▲' : ''
    const name = fit(ctx, row.name, W - PAD * 2 - rightWidth - 30 - ctx.measureText(arrow).width)
    ctx.fillStyle = '#fff'
    ctx.fillText(name, PAD, y)
    if (arrow) {
      ctx.fillStyle = gold
      ctx.fillText(arrow, PAD + ctx.measureText(name).width, y)
    }
    y += lineHeight
  }
  if (rows.length > shown.length) {
    ctx.fillStyle = '#9a9a9a'
    ctx.font = `600 32px ${BODY}`
    ctx.fillText(`+ ${rows.length - shown.length} more`, PAD, y)
  }

  // Footer
  ctx.fillStyle = '#9a9a9a'
  ctx.font = `600 30px ${BODY}`
  const left = [partner ? `Trained with ${partner}` : null, rows.some((r) => r.up) ? '▲ up on last time' : null]
    .filter(Boolean)
    .join('  ·  ')
  if (left) ctx.fillText(fit(ctx, left, W - PAD * 2 - 360), PAD, H - PAD)
  ctx.textAlign = 'right'
  ctx.fillText(site, W - PAD, H - PAD)
  ctx.textAlign = 'left'

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return new File([blob], `reforge-${title.replace(/[^\w]+/g, '-').toLowerCase()}.png`, { type: 'image/png' })
}

// The phone's share sheet where it can share pictures, otherwise a download
export async function shareCard(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My workout' })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'saved'
}
