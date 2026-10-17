// The app's movement, kept in one place so screens don't need to know about it:
// - cards fade up one after another as they load, and further down the page as you scroll to them
// - big numbers in those cards count up as they appear
// - anything that appears later (an opened section, a message) eases in instead of popping
// It only adds markers that index.css and motion.css style. If anything here fails, pages simply show as normal.

const CARD = '.rounded-2xl.border, .rounded-xl.border'
const APPEAR = new Set(['DIV', 'P', 'UL', 'OL', 'LI', 'FORM', 'SECTION', 'ARTICLE', 'FIGURE', 'DETAILS', 'FIELDSET'])
const NUMBER = /^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/
const STEP = 45 // ms between cards in a cascade
const seen = new WeakSet()

const inPage = (el) => el.closest('main') && !el.closest('.live-root')
const easeOut = (t) => 1 - (1 - t) ** 3

// A card that isn't inside another card (inner panels move with their card)
function isTopCard(el) {
  if (el.classList.contains('skeleton') || seen.has(el)) return false
  const parent = el.parentElement?.closest(CARD)
  return !parent || !parent.closest('main')
}

// Counts a big number up from zero, writing into the same text the page already shows
function countUp(el, delay) {
  const node = el.firstChild
  const text = node.nodeValue.trim()
  const target = Number(text.replace(/,/g, ''))
  if (!target || !Number.isFinite(target)) return
  const decimals = (text.split('.')[1] ?? '').length
  const format = (value) =>
    value.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: text.includes(','),
    })
  const original = node.nodeValue
  const duration = Math.min(900, 450 + target * 6)
  let written = format(0)
  node.nodeValue = written
  const start = performance.now() + delay
  const tick = (now) => {
    // If the page changed the number itself meanwhile, leave it alone
    if (node.nodeValue !== written) return
    const t = Math.min(1, Math.max(0, (now - start) / duration))
    written = t === 1 ? original : format(target * easeOut(t))
    node.nodeValue = written
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function countNumbers(card, delay) {
  for (const el of card.querySelectorAll('.font-display')) {
    if (el.childNodes.length !== 1 || el.firstChild.nodeType !== Node.TEXT_NODE) continue
    if (!NUMBER.test(el.firstChild.nodeValue.trim())) continue
    if (parseFloat(getComputedStyle(el).fontSize) < 22) continue
    countUp(el, delay)
  }
}

export function startMotion() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window) || !('MutationObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.documentElement.classList.add('motion')

  const reveal = new IntersectionObserver(
    (entries) => {
      const shown = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      shown.forEach((el, i) => {
        reveal.unobserve(el)
        const delay = Math.min(i, 6) * STEP
        el.style.setProperty('--reveal-delay', `${delay}ms`)
        el.dataset.reveal = 'in'
        countNumbers(el, delay + 80)
        // Hand the card back to the page once it has settled
        setTimeout(() => {
          delete el.dataset.reveal
          el.style.removeProperty('--reveal-delay')
        }, delay + 1200)
      })
    },
    { rootMargin: '0px 0px -6% 0px' },
  )

  const take = (node, isNew) => {
    if (!(node instanceof HTMLElement) || !inPage(node)) return
    const cards = [...(node.matches(CARD) ? [node] : []), ...node.querySelectorAll(CARD)].filter(isTopCard)
    if (cards.length) {
      for (const card of cards) {
        seen.add(card)
        card.dataset.reveal = 'wait'
        reveal.observe(card)
      }
    } else if (isNew && APPEAR.has(node.tagName) && !node.closest('[data-reveal="wait"]')) {
      node.dataset.appear = ''
      setTimeout(() => delete node.dataset.appear, 500)
    }
  }

  const watch = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) take(node, true)
  })
  watch.observe(document.body, { childList: true, subtree: true })
  document.querySelectorAll('main').forEach((main) => take(main, false))
}
