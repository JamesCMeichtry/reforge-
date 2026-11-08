import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function ScreenHeader({ title, intro }) {
  const titleRef = useRef(null)
  const compact = useScrolledPast(titleRef)
  return (
    <header className="mb-8">
      <h1 ref={titleRef} className="font-display text-6xl font-bold uppercase leading-none tracking-tight">
        {title}
      </h1>
      <div aria-hidden="true" className="mt-3 h-1 w-10 bg-gold" />
      {intro && <p className="mt-4 text-base leading-relaxed text-neutral-300">{intro}</p>}
      <CompactTitle title={title} shown={compact} />
    </header>
  )
}

// True once an element has scrolled up out of view (not when it's still below the fold)
function useScrolledPast(ref) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) =>
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return past
}

// A slim bar with the screen's name that slides down while you're scrolled into the page
function CompactTitle({ title, shown }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      aria-hidden="true"
      data-shown={shown}
      className="compact-title pointer-events-none fixed inset-x-0 top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-md lg:left-60"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-12 max-w-xl items-center gap-2.5 px-5 lg:max-w-2xl lg:px-8">
        <span className="h-3.5 w-1 rounded-full bg-gold" />
        <span className="truncate font-display text-xl font-bold uppercase leading-none tracking-tight">{title}</span>
      </div>
    </div>,
    document.body,
  )
}

export function Panel({ heading, note, children }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">{heading}</h2>
      <p className="mt-2 leading-relaxed text-neutral-300">{children}</p>
      {note && <p className="mt-4 text-sm font-medium text-gold">{note}</p>}
    </section>
  )
}

// Placeholder blocks shown while data loads, shaped like the content that's coming
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-2xl bg-panel ${className}`} />
}

export function LoadingCards({ count = 3, height = 'h-28', label = 'Loading' }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </div>
  )
}

export const buttonPrimary =
  'rounded-xl bg-gold px-5 py-3 font-semibold text-ink hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-40'

export const buttonSecondary =
  'rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-white hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-40'

export const inputBase =
  'w-full rounded-lg border border-line bg-ink px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-gold focus:outline-none'
