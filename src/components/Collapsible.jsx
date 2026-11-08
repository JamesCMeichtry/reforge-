import { useId, useState } from 'react'

// A card that shows a one-line summary and opens to the full detail when tapped.
// It remembers whether you left it open, per card, on this device.

const storeKey = (id) => `reforge.open.${id}`

function readOpen(id, fallback) {
  try {
    const saved = localStorage.getItem(storeKey(id))
    return saved == null ? fallback : saved === '1'
  } catch {
    return fallback
  }
}

function writeOpen(id, open) {
  try {
    localStorage.setItem(storeKey(id), open ? '1' : '0')
  } catch {
    // Storage can be off (private windows); it just won't be remembered
  }
}

export default function Collapsible({ id, eyebrow, title, summary, defaultOpen = false, accent, children }) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen))
  // Contents are only built once first opened, so closed cards don't load anything
  const [opened, setOpened] = useState(open)
  const panelId = useId()

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) setOpened(true)
    writeOpen(id, next)
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-line bg-panel"
      style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
      >
        <span className="min-w-0 flex-1">
          {eyebrow && (
            <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</span>
          )}
          <span className="mt-0.5 block truncate font-display text-2xl font-semibold leading-tight">{title}</span>
        </span>
        {summary && (
          <span
            className={`max-w-[50%] truncate text-right text-sm font-semibold transition-opacity duration-200 ${open ? 'text-muted' : 'text-white'}`}
          >
            {summary}
          </span>
        )}
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {/* Grows from nothing to its full height (the grid-rows trick animates "auto" height) */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          {/* Cards placed inside lose their own frame, so there's never a box in a box */}
          <div className="space-y-4 border-t border-line px-5 pt-4 pb-5 [&>*]:mb-0 [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:bg-none [&>section]:p-0">
            {opened && children}
          </div>
        </div>
      </div>
    </section>
  )
}
