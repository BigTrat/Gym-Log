import { useMemo, useState } from 'react'
import { formatDate, todayISO, topWeight } from '../lib/storage.js'
import { exerciseNames, lastLoggedEntry, maxWeightBeforeEntry } from '../lib/pr.js'

const emptySet = { reps: '', weight: '' }
const emptyForm = { exercise: '', sets: [{ ...emptySet }] }

export default function LogScreen({ sessions, addEntry, removeEntry, templates, saveTemplate, deleteTemplate }) {
  const [form, setForm] = useState(emptyForm)
  const [showTemplates, setShowTemplates] = useState(false)
  const today = todayISO()

  const todaySession = useMemo(
    () => sessions.find((s) => s.date === today),
    [sessions, today]
  )

  const allNames = useMemo(() => exerciseNames(sessions), [sessions])
  const suggestions = useMemo(() => {
    const q = form.exercise.trim().toLowerCase()
    if (!q) return []
    return allNames
      .filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 4)
  }, [form.exercise, allNames])

  const lastEntry = useMemo(
    () => (form.exercise.trim() ? lastLoggedEntry(sessions, form.exercise) : null),
    [form.exercise, sessions]
  )

  const validSets = form.sets.filter(
    (s) =>
      s.reps !== '' &&
      s.weight !== '' &&
      Number(s.reps) > 0 &&
      Number(s.weight) >= 0
  )
  const canSubmit = form.exercise.trim() !== '' && validSets.length > 0

  const updateSet = (i, field, value) => {
    setForm((f) => ({
      ...f,
      sets: f.sets.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    }))
  }

  const addSet = () => {
    setForm((f) => {
      const last = f.sets[f.sets.length - 1] || emptySet
      return { ...f, sets: [...f.sets, { reps: last.reps, weight: last.weight }] }
    })
  }

  const removeSet = (i) => {
    setForm((f) =>
      f.sets.length <= 1
        ? f
        : { ...f, sets: f.sets.filter((_, idx) => idx !== i) }
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    addEntry({ exercise: form.exercise, sets: validSets })
    setForm({ exercise: form.exercise, sets: [{ ...emptySet }] })
  }

  const handleLoadTemplate = (template) => {
    template.exercises.forEach((ex) => addEntry(ex))
    setShowTemplates(false)
  }

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">
            New entry
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-accent-300 transition"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Templates
            </button>
            <span className="text-xs text-slate-500">{formatDate(today)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              className="input"
              placeholder="Exercise (e.g. Bench Press)"
              value={form.exercise}
              onChange={(e) => setForm({ ...form, exercise: e.target.value })}
              autoCapitalize="words"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 left-0 right-0 bg-ink-800 border border-ink-700 rounded-xl overflow-hidden shadow-lg">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-ink-700 text-slate-200"
                    onClick={() => setForm({ ...form, exercise: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {lastEntry && (
            <p className="text-xs text-slate-500 -mt-1 ml-1">
              Last time: {setsSummary(lastEntry.sets)}
            </p>
          )}

          <div>
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wider text-slate-500 px-1 mb-1">
              <span></span>
              <span className="text-center">Reps</span>
              <span className="text-center">Weight (kg)</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {form.sets.map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center"
                >
                  <div className="text-xs text-slate-500 text-center font-medium">
                    {i + 1}
                  </div>
                  <input
                    className="input text-center font-medium"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    step="1"
                    value={s.reps}
                    placeholder="8"
                    onChange={(e) => updateSet(i, 'reps', e.target.value)}
                  />
                  <input
                    className="input text-center font-medium"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.5"
                    value={s.weight}
                    placeholder="60"
                    onChange={(e) => updateSet(i, 'weight', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    disabled={form.sets.length === 1}
                    aria-label="Remove set"
                    className="text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-500 transition grid place-items-center h-9"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSet}
              className="mt-2 w-full text-sm text-accent-300 hover:text-accent-400 border border-dashed border-ink-600 hover:border-accent-500/50 rounded-xl py-2 transition flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add set
            </button>
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-primary">
            Add to session
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">
            Today's session
          </h2>
          <span className="text-xs text-slate-500">
            {todaySession ? `${todaySession.entries.length} entries` : '—'}
          </span>
        </div>

        {!todaySession ? (
          <EmptyState
            title="No entries yet"
            body="Log your first exercise to start today's session."
          />
        ) : (
          <ul className="space-y-2">
            {todaySession.entries
              .slice()
              .reverse()
              .map((entry) => {
                const prior = maxWeightBeforeEntry(sessions, entry, today)
                const top = topWeight(entry)
                const isPR = top > prior && top > 0
                return (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isPR={isPR}
                    onRemove={() => removeEntry(todaySession.id, entry.id)}
                  />
                )
              })}
          </ul>
        )}
      </section>

      {showTemplates && (
        <TemplatesSheet
          templates={templates}
          todaySession={todaySession}
          onLoad={handleLoadTemplate}
          onSave={saveTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}

function TemplatesSheet({ templates, todaySession, onLoad, onSave, onDelete, onClose }) {
  const [nameDraft, setNameDraft] = useState('')
  const canSave = todaySession && todaySession.entries.length > 0

  const handleSave = () => {
    if (!nameDraft.trim() || !canSave) return
    onSave(nameDraft, todaySession.entries)
    setNameDraft('')
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-ink-900 border-t border-ink-700 max-h-[75vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700 shrink-0">
          <h2 className="font-semibold text-sm">Templates</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition p-1 -mr-1"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {templates.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-sm text-slate-400">No templates yet</div>
              <div className="text-xs text-slate-500 mt-1">
                {canSave
                  ? 'Save today\'s session below to create one.'
                  : 'Log a session first, then save it as a template.'}
              </div>
            </div>
          ) : (
            templates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onLoad={() => onLoad(t)}
                onDelete={() => onDelete(t.id)}
              />
            ))
          )}
        </div>

        {canSave && (
          <div className="shrink-0 border-t border-ink-700 px-4 py-4 space-y-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">
              Save today as template
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="e.g. Push Day"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoCapitalize="words"
              />
              <button
                onClick={handleSave}
                disabled={!nameDraft.trim()}
                className="shrink-0 px-4 bg-accent-500 hover:bg-accent-600 active:bg-accent-600 text-ink-950 font-semibold rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TemplateRow({ template, onLoad, onDelete }) {
  return (
    <div className="card px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{template.name}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
          {' · '}
          {template.exercises.reduce((n, e) => n + (e.sets?.length || 0), 0)} sets
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onLoad}
          className="text-xs font-semibold text-accent-300 hover:text-accent-400 bg-accent-500/10 hover:bg-accent-500/20 px-3 py-1.5 rounded-lg transition"
        >
          Load
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete template"
          className="text-slate-500 hover:text-red-400 transition p-1.5"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function setsSummary(sets) {
  if (!sets || sets.length === 0) return ''
  const allSame = sets.every(
    (s) => s.reps === sets[0].reps && s.weight === sets[0].weight
  )
  if (allSame) {
    return `${sets.length} × ${sets[0].reps} @ ${sets[0].weight} kg`
  }
  return sets.map((s) => `${s.reps}×${s.weight}`).join(' · ') + ' kg'
}

function EntryCard({ entry, isPR, onRemove }) {
  return (
    <li
      className={`card px-4 py-3 flex items-center justify-between gap-3 ${
        isPR ? 'border-amber-400/40 bg-amber-400/5' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{entry.exercise}</span>
          {isPR && (
            <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              PR
            </span>
          )}
        </div>
        <div className="text-sm text-slate-400 mt-0.5 break-words">
          {setsSummary(entry.sets)}
        </div>
      </div>
      <button
        onClick={onRemove}
        aria-label="Remove entry"
        className="text-slate-500 hover:text-red-400 transition p-2 -mr-2 shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
        </svg>
      </button>
    </li>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="card p-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{body}</div>
    </div>
  )
}
