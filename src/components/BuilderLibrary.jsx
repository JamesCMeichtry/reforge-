import { useMemo, useState } from 'react'
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary.js'
import { inputBase } from './ui.jsx'

// The exercise library down the right of the builder: search, filter, then click or drag into a day

const GROUPS = ['All', 'Rehab', ...new Set(EXERCISE_LIBRARY.map((e) => e.group))]
const LOAD_TEXT = { kg: 'Weight', band: 'Band', bodyweight: 'Bodyweight' }

export const DRAG_TYPE = 'application/x-reforge-exercise'

export default function BuilderLibrary({ activeDayName, onAdd, searchRef }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EXERCISE_LIBRARY.filter(
      (e) =>
        (group === 'All' ||
          (group === 'Rehab' ? e.section === 'Rehab' || e.section === 'Physio' : e.group === group)) &&
        (!needle || e.name.toLowerCase().includes(needle)),
    ).sort((a, b) => {
      if (!needle) return 0
      return Number(!a.name.toLowerCase().startsWith(needle)) - Number(!b.name.toLowerCase().startsWith(needle))
    })
  }, [query, group])

  return (
    <aside
      className="flex min-h-0 w-[17rem] shrink-0 flex-col border-l border-line bg-panel"
      aria-label="Exercise library"
    >
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Library</h2>
          <span className="text-xs text-muted">{EXERCISE_LIBRARY.length} exercises</span>
        </div>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && shown[0]) {
              event.preventDefault()
              onAdd(shown[0])
            }
            if (event.key === 'Escape') {
              setQuery('')
              event.currentTarget.blur()
            }
          }}
          placeholder="Search  ( / )"
          aria-label="Search the exercise library"
          className={`${inputBase} py-1.5 text-sm`}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by movement">
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              aria-pressed={group === g}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                group === g ? 'border-white bg-white text-ink' : 'border-line text-muted hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <p className="border-b border-line px-4 py-2.5 text-xs text-muted">
        Click to add to <span className="font-semibold text-white">{activeDayName ?? 'the selected day'}</span>, or drag
        into any day.
      </p>
      <ul className="bd-scroll min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {shown.map((item) => (
          <li key={item.name}>
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'library', item }))
                event.dataTransfer.setData('text/plain', item.name)
              }}
              onClick={() => onAdd(item)}
              className="bd-lib-item group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{item.name}</span>
                <span className="block text-xs text-muted">
                  {item.group} · {LOAD_TEXT[item.load]}
                  {item.section !== 'Main' ? ` · ${item.section}` : ''}
                </span>
              </span>
              <span aria-hidden="true" className="text-lg leading-none text-muted group-hover:text-white">
                +
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-2.5 py-3 text-sm text-muted">
            Nothing matches. You can still type any exercise name straight onto a card.
          </li>
        )}
      </ul>
    </aside>
  )
}
