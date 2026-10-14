import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import DayEditor from '../components/DayEditor.jsx'
import { ask, toast } from '../components/Feedback.jsx'
import { GiveTemplate, TemplateDays, exerciseCount, exerciseLine } from '../components/Templates.jsx'
import { REFORGE_TEMPLATES } from '../data/templateLibrary.js'
import {
  copyDays,
  deleteTemplate,
  fetchTemplate,
  fetchTemplates,
  saveTemplate,
  updateTemplate,
} from '../lib/coaching.js'

// #clients/templates is the library, #clients/templates/<id> is one template, /<dayId> edits one of its days
const parts = () => window.location.hash.replace('#', '').split('/')
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
const shortDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const go = (path) => (window.location.hash = path)

export default function TemplatesScreen() {
  const [route, setRoute] = useState(() => parts())
  useEffect(() => {
    const onChange = () => setRoute(parts())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const [, , templateId, dayId] = route
  if (!templateId) return <Library />
  return <TemplateDetail key={templateId} templateId={templateId} dayId={dayId} />
}

async function newTemplate() {
  const name = await ask({
    title: 'New template',
    body: 'Give it a name your clients will see, like "ACL phase 2" or "Strength block 1".',
    confirm: 'Create',
    input: { label: 'Template name', placeholder: 'e.g. Strength block 1', maxLength: 80 },
  })
  if (!name) return
  try {
    const created = await saveTemplate(name, [{ id: newId(), name: 'Day 1', focus: '', exercises: [] }])
    go(`clients/templates/${created.id}`)
  } catch {
    toast("Couldn't create the template. Check your connection.", { tone: 'error' })
  }
}

function TemplateCard({ template, href }) {
  return (
    <a href={href} className="block rounded-2xl border border-line bg-panel p-4 hover:border-gold">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-bold uppercase leading-none">{template.name}</p>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {template.days.length} {template.days.length === 1 ? 'day' : 'days'} · {exerciseCount(template.days)} exercises
        {template.updated_at ? ` · edited ${shortDate(template.updated_at)}` : ''}
      </p>
      {template.description && <p className="mt-2 line-clamp-2 text-sm text-neutral-300">{template.description}</p>}
    </a>
  )
}

function Library() {
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setError(true))
  }, [])

  return (
    <>
      <a href="#clients" className="text-sm font-semibold text-muted hover:text-white">
        ‹ All clients
      </a>
      <div className="mt-3">
        <ScreenHeader
          title="Templates"
          intro="Build a programme once and give it to any client. Each client gets their own copy you can adjust."
        />
      </div>
      <button type="button" onClick={newTemplate} className={`mb-6 w-full ${buttonPrimary}`}>
        + New template
      </button>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">Your templates</h2>
      {error && <p className="text-red-400">Couldn't load your templates. Check your connection.</p>}
      {!templates && !error && <LoadingCards count={2} label="Loading your templates" />}
      {templates?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-neutral-300">
          None yet. Start one above, copy one from Reforge below, or save any client's programme as a template from
          their Programme section.
        </p>
      )}
      {templates?.length > 0 && (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li key={t.id}>
              <TemplateCard template={t} href={`#clients/templates/${t.id}`} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">From Reforge</h2>
      <p className="mb-3 text-sm text-muted">Ready-made starting points. Copy one to make it yours.</p>
      <ul className="space-y-3">
        {REFORGE_TEMPLATES.map((t) => (
          <li key={t.id}>
            <TemplateCard template={t} href={`#clients/templates/${t.id}`} />
          </li>
        ))}
      </ul>
    </>
  )
}

function DetailsForm({ template, onSave, onCancel }) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onSave({ name: name.trim(), description: description.trim() || null })
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="mb-6 space-y-3 rounded-2xl border border-gold/50 bg-panel p-4">
      <label className="block text-xs font-medium text-muted">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          className={`mt-1 ${inputBase}`}
        />
      </label>
      <label className="block text-xs font-medium text-muted">
        Who it's for (optional)
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Weeks 6–12 after ACL reconstruction, cleared to load"
          className={`mt-1 ${inputBase}`}
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={`flex-1 ${buttonSecondary}`}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !name.trim()} className={`flex-1 ${buttonPrimary}`}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function TemplateDetail({ templateId, dayId }) {
  const builtIn = REFORGE_TEMPLATES.find((t) => t.id === templateId)
  const [template, setTemplate] = useState(builtIn ?? null)
  const [missing, setMissing] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [giving, setGiving] = useState(false)

  useEffect(() => {
    if (builtIn) return
    fetchTemplate(templateId)
      .then((found) => (found ? setTemplate(found) : setMissing(true)))
      .catch(() => setMissing(true))
  }, [templateId, builtIn])

  async function save(changes) {
    const next = { ...template, ...changes, updated_at: new Date().toISOString() }
    try {
      await updateTemplate(template.id, changes)
      setTemplate(next)
      return true
    } catch {
      toast("Couldn't save. Check your connection.", { tone: 'error' })
      return false
    }
  }

  async function copyToMine(name = template.name) {
    try {
      const created = await saveTemplate(name, copyDays(template.days), template.description ?? null)
      toast(builtIn ? 'Copied to your templates. Change anything you like.' : 'Duplicated')
      go(`clients/templates/${created.id}`)
    } catch {
      toast("Couldn't copy the template. Check your connection.", { tone: 'error' })
    }
  }

  async function remove() {
    const sure = await ask({
      title: `Delete "${template.name}"?`,
      body: 'Clients already using it keep their programme. This only removes the template.',
      confirm: 'Delete template',
      danger: true,
    })
    if (!sure) return
    try {
      await deleteTemplate(template.id)
      toast('Template deleted')
      go('clients/templates')
    } catch {
      toast("Couldn't delete it. Check your connection.", { tone: 'error' })
    }
  }

  if (missing) {
    return (
      <div>
        <p className="text-neutral-300">This template couldn't be found. It may have been deleted.</p>
        <a href="#clients/templates" className={`mt-4 inline-block ${buttonSecondary}`}>
          Back to templates
        </a>
      </div>
    )
  }
  if (!template) return <LoadingCards count={3} label="Loading template" />

  const day = dayId && !builtIn ? template.days.find((d) => d.id === dayId) : null
  if (day) {
    return (
      <>
        <a
          href={`#clients/templates/${template.id}`}
          className="mb-4 inline-block text-sm font-semibold text-muted hover:text-white"
        >
          ← {template.name}
        </a>
        <h2 className="mb-6 font-display text-4xl font-bold uppercase leading-none">Edit {day.name}</h2>
        <DayEditor
          day={day}
          onCancel={() => go(`clients/templates/${template.id}`)}
          onDelete={async () => {
            const sure = await ask({
              title: `Remove ${day.name}?`,
              body: 'It comes out of this template only.',
              confirm: 'Remove day',
              danger: true,
            })
            if (!sure) return
            if (await save({ days: template.days.filter((d) => d.id !== day.id) })) {
              go(`clients/templates/${template.id}`)
            }
          }}
          onSave={async (updated) => {
            await updateTemplate(template.id, { days: template.days.map((d) => (d.id === updated.id ? updated : d)) })
            setTemplate((t) => ({ ...t, days: t.days.map((d) => (d.id === updated.id ? updated : d)) }))
            toast(`${updated.name} saved`)
            go(`clients/templates/${template.id}`)
          }}
        />
      </>
    )
  }

  async function addDay() {
    const added = { id: newId(), name: `Day ${template.days.length + 1}`, focus: '', exercises: [] }
    if (await save({ days: [...template.days, added] })) go(`clients/templates/${template.id}/${added.id}`)
  }

  return (
    <>
      <a href="#clients/templates" className="text-sm font-semibold text-muted hover:text-white">
        ‹ Templates
      </a>
      <div className="mt-3">
        <ScreenHeader title={template.name} intro={template.description} />
      </div>
      {builtIn && (
        <p className="-mt-4 mb-6 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          From Reforge · copy it to change anything
        </p>
      )}
      {editingDetails && (
        <DetailsForm
          template={template}
          onCancel={() => setEditingDetails(false)}
          onSave={async (changes) => (await save(changes)) && setEditingDetails(false)}
        />
      )}

      <button type="button" onClick={() => setGiving(true)} className={`mb-3 w-full ${buttonPrimary}`}>
        Give to a client
      </button>
      {builtIn ? (
        <button type="button" onClick={() => copyToMine()} className={`mb-6 w-full ${buttonSecondary}`}>
          Copy to my templates
        </button>
      ) : (
        !editingDetails && (
          <button type="button" onClick={() => setEditingDetails(true)} className={`mb-6 w-full ${buttonSecondary}`}>
            Edit name and description
          </button>
        )
      )}

      {builtIn ? (
        <TemplateDays days={template.days} />
      ) : (
        <ol className="space-y-3">
          {template.days.map((d) => (
            <li key={d.id}>
              <a
                href={`#clients/templates/${template.id}/${d.id}`}
                className="block rounded-2xl border border-line bg-panel p-4 hover:border-gold"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-xl font-bold uppercase leading-none">{d.name}</p>
                  <span className="text-sm font-semibold text-gold">Edit</span>
                </div>
                {d.focus && <p className="mt-1 text-sm text-muted">{d.focus}</p>}
                <ul className="mt-3 space-y-1.5">
                  {d.exercises.map((e) => (
                    <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-neutral-200">{e.name}</span>
                      <span className="shrink-0 text-muted">{exerciseLine(e)}</span>
                    </li>
                  ))}
                  {d.exercises.length === 0 && <li className="text-sm text-muted">No exercises yet. Tap to add.</li>}
                </ul>
              </a>
            </li>
          ))}
        </ol>
      )}

      {!builtIn && (
        <>
          <button type="button" onClick={addDay} className={`mt-3 w-full ${buttonSecondary}`}>
            + Add a day
          </button>
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              onClick={() => copyToMine(`${template.name} (copy)`)}
              className={`flex-1 ${buttonSecondary}`}
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={remove}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:text-red-400"
            >
              Delete template
            </button>
          </div>
        </>
      )}
      {giving && <GiveTemplate template={template} onClose={() => setGiving(false)} />}
    </>
  )
}
