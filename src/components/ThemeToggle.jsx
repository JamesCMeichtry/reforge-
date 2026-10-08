import { useEffect, useState } from 'react'

const KEY = 'reforge.theme'
const OPTIONS = [
  ['system', 'Auto'],
  ['dark', 'Dark'],
  ['light', 'Light'],
]

function readChoice() {
  try {
    return localStorage.getItem(KEY) || 'system'
  } catch {
    return 'system'
  }
}

// Applies the theme to the page and the phone's status bar colour
export function applyTheme(choice) {
  const dark = choice === 'dark' || (choice === 'system' && !window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f4f1ea')
}

export default function ThemeToggle() {
  const [choice, setChoice] = useState(readChoice)

  useEffect(() => {
    applyTheme(choice)
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      // The theme still applies for this visit
    }
    if (choice !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const follow = () => applyTheme('system')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [choice])

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted">Auto follows your phone's setting.</p>
      <div className="mt-4 flex rounded-xl border border-line bg-ink p-1" role="group" aria-label="Theme">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            aria-pressed={choice === value}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              choice === value ? 'bg-gold text-ink' : 'text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
