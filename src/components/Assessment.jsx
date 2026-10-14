import { useEffect, useRef, useState } from 'react'
import { LoadingCards, buttonPrimary, buttonSecondary, inputBase } from './ui.jsx'
import { INJURY_FIELDS, RED_FLAGS, RESULT, SECTIONS, keyFindings, sectionProgress } from '../data/assessmentForm.js'
import { fetchClientInjuries, fetchLatestAssessment, saveAssessment } from '../lib/assessment.js'
import { newId } from '../lib/live.js'

const longDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const LEVEL_COLOUR = { red: 'var(--pain-severe)', amber: 'var(--pain-moderate)', info: 'var(--color-gold)' }

// A professional's assessment of a client: start one, fill it in section by section, then read the summary
export default function AssessmentPanel({ clientId, clientName = 'your client' }) {
  const [assessment, setAssessment] = useState(undefined)
  const [injuries, setInjuries] = useState([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([fetchLatestAssessment(clientId), fetchClientInjuries(clientId)])
      .then(([found, list]) => {
        setAssessment(found)
        setInjuries(list)
      })
      .catch(() => setError(true))
  }, [clientId])

  function start() {
    setAssessment({
      id: newId(),
      client_id: clientId,
      answers: {},
      status: 'draft',
      created_at: new Date().toISOString(),
    })
    setEditing(true)
  }

  if (error) return <p className="text-red-400">Couldn't load the assessment. Check your connection.</p>
  if (assessment === undefined) return <LoadingCards count={2} label="Loading assessment" />

  if (!assessment) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Assessment</p>
        <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none">Get the full picture</h2>
        <p className="mt-3 text-neutral-300">
          About 10 minutes with {clientName}: goals, a health screen, the detail behind each injury, a quick movement
          screen, training background and life outside the gym.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>· Saves as you go, so you can stop and come back</li>
          <li>· Flags anything that needs medical clearance</li>
          <li>· Produces a summary you can keep for your records</li>
        </ul>
        <button type="button" onClick={start} className={`mt-5 w-full ${buttonPrimary}`}>
          Start assessment
        </button>
      </section>
    )
  }

  if (editing || assessment.status === 'draft') {
    return (
      <Wizard
        assessment={assessment}
        injuries={injuries}
        clientName={clientName}
        onChange={setAssessment}
        onDone={(finished) => {
          setAssessment(finished)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <Summary
      assessment={assessment}
      injuries={injuries}
      clientName={clientName}
      onEdit={() => setEditing(true)}
      onReassess={() => {
        if (!window.confirm(`Start a new assessment for ${clientName}? This one is kept.`)) return
        start()
      }}
    />
  )
}

/* ---------- Filling it in ---------- */

function Wizard({ assessment, injuries, clientName, onChange, onDone }) {
  const [step, setStep] = useState(0)
  const [saveState, setSaveState] = useState('saved')
  const timer = useRef(null)
  const latest = useRef(assessment)
  latest.current = assessment
  const section = SECTIONS[step]
  const injuryKeys = injuries.map((i) => i.key)
  const total = SECTIONS.reduce((sum, s) => sum + sectionProgress(s, assessment.answers, injuryKeys).total, 0)
  const done = SECTIONS.reduce((sum, s) => sum + sectionProgress(s, assessment.answers, injuryKeys).done, 0)

  // Saves a moment after the last change, so typing doesn't send a request per letter
  async function save(next) {
    setSaveState('saving')
    try {
      await saveAssessment(next)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }
  function setAnswer(path, value) {
    const answers = structuredClone(latest.current.answers)
    let node = answers
    for (const key of path.slice(0, -1)) node = node[key] ??= {}
    node[path.at(-1)] = value
    const next = { ...latest.current, answers }
    onChange(next)
    setSaveState('waiting')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(next), 700)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  async function finish() {
    clearTimeout(timer.current)
    const finished = { ...latest.current, status: 'complete', completed_at: new Date().toISOString() }
    setSaveState('saving')
    try {
      await saveAssessment(finished)
      onDone(finished)
    } catch {
      setSaveState('error')
    }
  }

  const go = (i) => {
    setStep(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Assessment · {Math.round((done / Math.max(total, 1)) * 100)}% done
        </p>
        <p className={`text-xs font-semibold ${saveState === 'error' ? 'text-red-400' : 'text-muted'}`}>
          {saveState === 'saving' || saveState === 'waiting'
            ? 'Saving…'
            : saveState === 'error'
              ? "Couldn't save · check signal"
              : 'Saved'}
        </p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${(done / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <nav aria-label="Assessment sections" className="-mx-5 mb-6 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {SECTIONS.map((s, i) => {
          const progress = sectionProgress(s, assessment.answers, injuryKeys)
          const complete = progress.done >= progress.total
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? 'step' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                i === step
                  ? 'border-gold bg-gold/15 text-white'
                  : complete
                    ? 'border-gold/40 text-gold'
                    : 'border-line text-muted'
              }`}
            >
              {complete ? '✓' : i + 1} {s.title}
            </button>
          )
        })}
      </nav>

      <h2 className="font-display text-4xl font-bold uppercase leading-none">{section.title}</h2>
      <p className="mt-2 text-muted">{section.intro}</p>

      <div className="mt-6 space-y-6">
        {section.custom === 'injuries' ? (
          <InjuryDetails
            injuries={injuries}
            values={assessment.answers.injuries ?? {}}
            clientName={clientName}
            onChange={(key, field, value) => setAnswer(['injuries', key, field], value)}
          />
        ) : (
          section.fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              value={assessment.answers[section.id]?.[field.id]}
              onChange={(value) => setAnswer([section.id, field.id], value)}
              flagged={
                section.id === 'screening' &&
                field.id === 'clearance' &&
                Object.values(assessment.answers.screening?.flags ?? {}).includes('yes')
              }
            />
          ))
        )}
      </div>

      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className={`flex-1 ${buttonSecondary}`}>
            ← Back
          </button>
        )}
        {step < SECTIONS.length - 1 ? (
          <button type="button" onClick={() => go(step + 1)} className={`flex-1 ${buttonPrimary}`}>
            Next: {SECTIONS[step + 1].title} →
          </button>
        ) : (
          <button type="button" onClick={finish} className={`flex-1 ${buttonPrimary}`}>
            Finish and see summary
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Skip anything that doesn't apply. You can come back to this at any time.
      </p>
    </div>
  )
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold text-white">{children}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

function Chip({ on, onClick, children, colour }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
        on ? 'border-transparent text-ink' : 'border-line text-neutral-300'
      }`}
      style={on ? { background: colour ?? 'var(--color-gold)' } : undefined}
    >
      {children}
    </button>
  )
}

function Field({ field, value, onChange, flagged }) {
  if (field.type === 'chips' || field.type === 'multi') {
    const multi = field.type === 'multi'
    const selected = multi ? (value ?? []) : [value]
    return (
      <div>
        <FieldLabel>{field.label}</FieldLabel>
        {flagged && (
          <p className="mb-2 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            The health screen has a “yes”. Record clearance before loading up.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((option) => {
            const on = selected.includes(option)
            return (
              <Chip
                key={option}
                on={on}
                onClick={() =>
                  multi
                    ? onChange(on ? selected.filter((o) => o !== option) : [...selected, option])
                    : onChange(on ? null : option)
                }
              >
                {option}
              </Chip>
            )
          })}
        </div>
      </div>
    )
  }
  if (field.type === 'scale') {
    const values = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i)
    return (
      <div>
        <FieldLabel>{field.label}</FieldLabel>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
          {values.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={value === n}
              onClick={() => onChange(value === n ? null : n)}
              className={`h-10 rounded-lg text-sm font-bold ${
                value === n ? 'bg-gold text-ink' : 'border border-line text-neutral-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (field.type === 'yesno') {
    const answers = value ?? {}
    return (
      <div>
        <FieldLabel>{field.label}</FieldLabel>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
          {field.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 text-sm text-neutral-200">{item.label}</span>
              <div className="flex shrink-0 gap-1">
                {['no', 'yes'].map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={answers[item.id] === answer}
                    aria-label={`${item.label}: ${answer}`}
                    onClick={() =>
                      onChange({ ...answers, [item.id]: answers[item.id] === answer ? undefined : answer })
                    }
                    className={`h-9 w-12 rounded-lg text-sm font-bold capitalize ${
                      answers[item.id] === answer
                        ? answer === 'yes'
                          ? 'bg-red-400 text-ink'
                          : 'bg-gold text-ink'
                        : 'border border-line text-muted'
                    }`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (field.type === 'tests') {
    const results = value ?? {}
    return (
      <ul className="space-y-3">
        {field.items.map((test) => (
          <li key={test.id} className="rounded-2xl border border-line bg-panel p-4">
            <FieldLabel hint={test.hint}>{test.label}</FieldLabel>
            {(test.sides ? ['left', 'right'] : [null]).map((side) => {
              const key = side ? `${test.id}-${side}` : test.id
              return (
                <div key={key} className="mt-2 flex items-center gap-2">
                  {side && <span className="w-10 shrink-0 text-xs font-bold uppercase text-muted">{side}</span>}
                  <div className="grid flex-1 grid-cols-3 gap-1">
                    {Object.entries(RESULT).map(([id, r]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={results[key] === id}
                        aria-label={`${test.label}${side ? ` ${side}` : ''}: ${r.label}`}
                        onClick={() => onChange({ ...results, [key]: results[key] === id ? undefined : id })}
                        className="h-9 rounded-lg text-sm font-bold"
                        style={
                          results[key] === id
                            ? { background: r.colour, color: '#111' }
                            : { border: '1px solid var(--color-line)', color: 'var(--color-neutral-300)' }
                        }
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </li>
        ))}
      </ul>
    )
  }
  const common = {
    value: value ?? '',
    onChange: (event) => onChange(event.target.value),
    placeholder: field.placeholder,
    className: inputBase,
    'aria-label': field.label,
  }
  return (
    <label className="block">
      <FieldLabel>{field.label}</FieldLabel>
      {field.type === 'textarea' ? (
        <textarea rows={3} maxLength={2000} {...common} />
      ) : field.type === 'number' ? (
        <input
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          {...common}
          onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        />
      ) : (
        <input type={field.type === 'date' ? 'date' : 'text'} maxLength={300} {...common} />
      )}
    </label>
  )
}

function InjuryDetails({ injuries, values, clientName, onChange }) {
  if (!injuries.length) {
    return (
      <p className="rounded-2xl border border-line bg-panel p-4 text-neutral-300">
        {clientName} has no injuries on their body map. Add any in the Injuries section and they'll appear here.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {injuries.map((injury) => (
        <article key={injury.key} className="space-y-5 rounded-2xl border border-line bg-panel p-4">
          <h3 className="font-display text-2xl font-semibold leading-tight">{injury.label}</h3>
          {INJURY_FIELDS.map((field) => (
            <Field
              key={field.id}
              field={field}
              value={values[injury.key]?.[field.id]}
              onChange={(value) => onChange(injury.key, field.id, value)}
            />
          ))}
        </article>
      ))}
    </div>
  )
}

/* ---------- The summary ---------- */

function formatValue(field, value) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null
  if (Array.isArray(value)) return value.join(', ')
  if (field.type === 'scale') return `${value}/${field.max}`
  if (field.type === 'date') return longDate(value)
  if (field.type === 'number') return `${value}`
  return String(value)
}

// Plain rows of label and answer for one section, shared by the screen and the printed report
function sectionRows(section, answers, injuries) {
  const values = answers[section.id] ?? {}
  if (section.custom === 'injuries') {
    return injuries.map((injury) => ({
      heading: injury.label,
      rows: INJURY_FIELDS.map((f) => [f.label, formatValue(f, values[injury.key]?.[f.id])]).filter(([, v]) => v),
    }))
  }
  const rows = []
  for (const field of section.fields) {
    if (field.type === 'yesno') {
      const yes = RED_FLAGS.filter((f) => values.flags?.[f.id] === 'yes').map((f) => f.label)
      const answered = Object.values(values.flags ?? {}).filter(Boolean).length
      if (answered) rows.push(['Health screen', yes.length ? `Yes to: ${yes.join('; ')}` : 'No to everything asked'])
    } else if (field.type === 'tests') {
      for (const test of field.items) {
        const sides = test.sides ? ['left', 'right'] : [null]
        const parts = sides
          .map((side) => {
            const result = values.tests?.[side ? `${test.id}-${side}` : test.id]
            return result ? `${side ? `${side[0].toUpperCase()}: ` : ''}${RESULT[result].label}` : null
          })
          .filter(Boolean)
        if (parts.length) rows.push([test.label, parts.join(' · ')])
      }
    } else {
      const formatted = formatValue(field, values[field.id])
      if (formatted) rows.push([field.label, formatted])
    }
  }
  return [{ rows }]
}

function Summary({ assessment, injuries, clientName, onEdit, onReassess }) {
  const findings = keyFindings(assessment.answers, injuries)
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Assessment · {longDate(assessment.completed_at ?? assessment.created_at)}
      </p>
      <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-none">{clientName}</h2>
      {assessment.answers.goals?.primary && (
        <p className="mt-2 text-neutral-300">
          Goal: <span className="font-semibold text-white">{assessment.answers.goals.primary}</span>
          {assessment.answers.goals.targetDate ? ` by ${longDate(assessment.answers.goals.targetDate)}` : ''}
        </p>
      )}

      <section className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Key findings</h3>
        {findings.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-300">No warning signs, painful tests or restrictions recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: LEVEL_COLOUR[f.level] }}
                  aria-hidden="true"
                />
                <span>
                  <span className={f.level === 'red' ? 'font-semibold text-red-400' : 'text-white'}>{f.text}</span>
                  {f.detail && <span className="block text-xs text-muted">{f.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-5 space-y-3">
        {SECTIONS.map((section) => {
          const groups = sectionRows(section, assessment.answers, injuries).filter((g) => g.rows.length)
          if (!groups.length) return null
          return (
            <details
              key={section.id}
              className="rounded-2xl border border-line bg-panel p-4"
              open={section.id === 'goals'}
            >
              <summary className="cursor-pointer font-display text-xl font-semibold">{section.title}</summary>
              {groups.map((group, i) => (
                <div key={i} className="mt-3">
                  {group.heading && <p className="mb-1 text-sm font-semibold text-gold">{group.heading}</p>}
                  <dl className="space-y-1.5 text-sm">
                    {group.rows.map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[40%_1fr] gap-2">
                        <dt className="text-muted">{label}</dt>
                        <dd className="text-neutral-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </details>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" onClick={onEdit} className={buttonSecondary}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => printReport(assessment, injuries, clientName, findings)}
          className={buttonSecondary}
        >
          Save as PDF
        </button>
      </div>
      <button type="button" onClick={onReassess} className={`mt-2 w-full ${buttonSecondary}`}>
        Start a reassessment
      </button>
    </div>
  )
}

const escape = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// A clean printable copy for the professional's records; the phone's print sheet can save it as a PDF
function printReport(assessment, injuries, clientName, findings) {
  const sections = SECTIONS.map((section) => {
    const groups = sectionRows(section, assessment.answers, injuries).filter((g) => g.rows.length)
    if (!groups.length) return ''
    return `<h2>${escape(section.title)}</h2>${groups
      .map(
        (g) =>
          `${g.heading ? `<h3>${escape(g.heading)}</h3>` : ''}<table>${g.rows
            .map(([l, v]) => `<tr><th>${escape(l)}</th><td>${escape(v)}</td></tr>`)
            .join('')}</table>`,
      )
      .join('')}`
  }).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Assessment – ${escape(clientName)}</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:32px;line-height:1.4}
h1{margin:0;font-size:26px}h2{font-size:16px;margin:24px 0 6px;border-bottom:2px solid #c9a227;padding-bottom:4px}
h3{font-size:13px;margin:12px 0 4px;color:#7a5f08}table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;width:38%;color:#555;font-weight:600;padding:4px 8px 4px 0;vertical-align:top}td{padding:4px 0}
.meta{color:#555;font-size:13px;margin-top:4px}.f{margin:4px 0;font-size:13px}.red{color:#b42318;font-weight:600}</style>
</head><body><h1>Assessment: ${escape(clientName)}</h1>
<p class="meta">${escape(longDate(assessment.completed_at ?? assessment.created_at))} · Reforge</p>
<h2>Key findings</h2>${
    findings.length
      ? findings
          .map(
            (f) =>
              `<p class="f ${f.level === 'red' ? 'red' : ''}">• ${escape(f.text)}${f.detail ? ` (${escape(f.detail)})` : ''}</p>`,
          )
          .join('')
      : '<p class="f">None recorded.</p>'
  }${sections}</body></html>`
  const win = window.open('', '_blank')
  if (!win) return window.alert('Allow pop-ups to save the assessment as a PDF.')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
