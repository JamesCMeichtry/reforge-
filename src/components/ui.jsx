export function ScreenHeader({ title, intro }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight">{title}</h1>
      <div aria-hidden="true" className="mt-3 h-1 w-10 bg-gold" />
      {intro && <p className="mt-4 text-base leading-relaxed text-neutral-300">{intro}</p>}
    </header>
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
