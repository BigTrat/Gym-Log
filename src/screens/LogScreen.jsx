import { useMemo, useState } from 'react'
import { formatDate, todayISO, topWeight } from '../lib/storage.js'
import { dailyStreak, exerciseNames, lastLoggedEntry, maxWeightBeforeEntry, normalizeName } from '../lib/pr.js'

const BUILT_IN = [
  'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
  'Overhead Press', 'Lateral Raise', 'Front Raise',
  'Dumbbell Fly', 'Cable Fly', 'Dip',
  'Tricep Pushdown', 'Tricep Extension', 'Skullcrusher',
  'Pull-up', 'Chin-up', 'Lat Pulldown',
  'Cable Row', 'Barbell Row', 'Dumbbell Row',
  'Deadlift', 'Romanian Deadlift',
  'Bicep Curl', 'Hammer Curl', 'Preacher Curl',
  'Squat', 'Leg Press', 'Leg Extension', 'Leg Curl',
  'Lunge', 'Hip Thrust', 'Glute Bridge', 'Calf Raise',
  'Plank', 'Crunch', 'Cable Crunch',
]

const emptySet = { reps: '', weight: '' }
const emptyForm = { exercise: '', sets: [{ ...emptySet }] }

function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return '< 1m'
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function LogScreen({ sessions, addEntry, removeEntry, updateEntry, finishSession, templates, saveTemplate, deleteTemplate, restDays, logRestDay, removeRestDay }) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [prFlash, setPrFlash] = useState(null)
  const [workoutSummary, setWorkoutSummary] = useState(null)
  const today = todayISO()

  const todaySession = useMemo(
    () => sessions.find((s) => s.date === today),
    [sessions, today]
  )

  const todayRestDay = useMemo(
    () => (restDays ?? []).find((r) => r.date === today),
    [restDays, today]
  )

  const streak = useMemo(() => dailyStreak(sessions, restDays ?? []), [sessions, restDays])

  const [activeIdx, setActiveIdx] = useState(-1)
  const [dropOpen, setDropOpen] = useState(false)

  const allNames = useMemo(() => {
    const logged = exerciseNames(sessions)
    const loggedLower = new Set(logged.map((n) => n.toLowerCase()))
    return [...logged, ...BUILT_IN.filter((n) => !loggedLower.has(n.toLowerCase()))]
  }, [sessions])

  const suggestions = useMemo(() => {
    const q = form.exercise.trim().toLowerCase()
    if (!q) return []
    const filtered = allNames.filter(
      (n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q
    )
    filtered.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q)
      const bStarts = b.toLowerCase().startsWith(q)
      if (aStarts === bStarts) return 0
      return aStarts ? -1 : 1
    })
    return filtered.slice(0, 5)
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

  const pickSuggestion = (name) => {
    setForm((f) => ({ ...f, exercise: name }))
    setDropOpen(false)
    setActiveIdx(-1)
  }

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setForm({
      exercise: entry.exercise,
      sets: entry.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) }))
    })
    setDropOpen(false)
    setActiveIdx(-1)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return

    if (editingId) {
      updateEntry(todaySession.id, editingId, { exercise: form.exercise, sets: validSets })
      setEditingId(null)
      setForm(emptyForm)
      return
    }

    const newTopWeight = Math.max(...validSets.map((s) => Number(s.weight)))
    const exerciseKey = normalizeName(form.exercise)
    let existingBest = 0
    for (const s of sessions) {
      for (const en of s.entries) {
        if (normalizeName(en.exercise) !== exerciseKey) continue
        const w = topWeight(en)
        if (w > existingBest) existingBest = w
      }
    }

    addEntry({ exercise: form.exercise, sets: validSets })
    setForm({ exercise: form.exercise, sets: [{ ...emptySet }] })

    if (newTopWeight > existingBest && newTopWeight > 0) {
      setPrFlash({ exercise: form.exercise, weight: newTopWeight })
      navigator.vibrate?.(200)
    }
  }

  const handleFinish = () => {
    if (!todaySession || todaySession.entries.length === 0) return
    navigator.vibrate?.([100, 50, 100])
    const now = Date.now()
    const firstAt =
      todaySession.workoutStartedAt ??
      Math.min(...todaySession.entries.map((e) => e.createdAt || now))
    const totalSets = todaySession.entries.reduce((n, e) => n + e.sets.length, 0)
    const totalVolume = todaySession.entries.reduce(
      (v, e) => v + e.sets.reduce((sv, s) => sv + s.reps * s.weight, 0),
      0
    )
    const summary = {
      exercises: todaySession.entries.length,
      sets: totalSets,
      volume: Math.round(totalVolume),
      duration: formatDuration(now - firstAt),
    }
    finishSession(todaySession.id, now, summary)
    setEditingId(null)
    setForm(emptyForm)
    setWorkoutSummary({ ...summary, label: formatDate(today) })
  }

  const handleLoadTemplate = (template) => {
    template.exercises.forEach((ex) => addEntry(ex))
    setShowTemplates(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {streak > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span>🔥</span>
            <span className="text-sm font-semibold text-orange-300">{streak} day streak</span>
          </div>
        )}
        {todayRestDay ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/40 border border-ink-700">
            <span>💤</span>
            <span className="text-sm font-medium text-slate-300">Rest day</span>
            <button
              onClick={() => removeRestDay(todayRestDay.id)}
              className="text-slate-600 hover:text-red-400 transition leading-none ml-1"
              aria-label="Remove rest day"
            >
              ×
            </button>
          </div>
        ) : !todaySession && (
          <button
            onClick={logRestDay}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-700 text-slate-400 hover:text-slate-200 hover:border-ink-600 transition text-sm"
          >
            <span>💤</span>
            Log Rest Day
          </button>
        )}
      </div>
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">
            {editingId ? 'Edit entry' : 'New entry'}
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
              onChange={(e) => {
                setForm({ ...form, exercise: e.target.value })
                setActiveIdx(-1)
                setDropOpen(true)
              }}
              onKeyDown={(e) => {
                if (!dropOpen || !suggestions.length) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActiveIdx((i) => (i < suggestions.length - 1 ? i + 1 : i))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIdx((i) => (i > 0 ? i - 1 : -1))
                } else if (e.key === 'Enter' && activeIdx >= 0) {
                  e.preventDefault()
                  pickSuggestion(suggestions[activeIdx])
                } else if (e.key === 'Escape') {
                  setDropOpen(false)
                  setActiveIdx(-1)
                }
              }}
              onBlur={() => setTimeout(() => { setDropOpen(false); setActiveIdx(-1) }, 120)}
              autoCapitalize="words"
              autoComplete="off"
            />
            {dropOpen && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 left-0 right-0 bg-ink-800 border border-ink-700 rounded-xl overflow-hidden shadow-xl divide-y divide-ink-700/60">
                {suggestions.map((s, idx) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        idx === activeIdx
                          ? 'bg-ink-600 text-slate-100'
                          : 'hover:bg-ink-700/60 text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!editingId && lastEntry && (
            <p className="text-xs text-slate-500 -mt-1 ml-1">
              Last time: {setsSummary(lastEntry.sets)}
            </p>
          )}

          <div>
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wider text-slate-500 px-1 mb-1">
              <span></span>
              <span className="text-center">Weight (kg)</span>
              <span className="text-center">Reps</span>
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
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.5"
                    value={s.weight}
                    placeholder="60"
                    onChange={(e) => updateSet(i, 'weight', e.target.value)}
                  />
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

          {editingId ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 bg-accent-500 hover:bg-accent-600 active:bg-accent-600 text-ink-950 font-semibold rounded-xl py-3 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Update entry
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 text-slate-400 hover:text-slate-100 border border-ink-700 hover:border-ink-600 rounded-xl text-sm transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button type="submit" disabled={!canSubmit} className="btn-primary">
              Add to session
            </button>
          )}
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
          <>
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
                      isEditing={editingId === entry.id}
                      onEdit={() => startEdit(entry)}
                      onRemove={() => removeEntry(todaySession.id, entry.id)}
                    />
                  )
                })}
            </ul>
            <button
              type="button"
              onClick={handleFinish}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 active:bg-emerald-500/20 transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Finish Workout
            </button>
          </>
        )}
      </section>

      {prFlash && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-pr-toast"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
          onAnimationEnd={() => setPrFlash(null)}
        >
          <div className="bg-amber-400 text-ink-950 font-bold text-sm px-5 py-2.5 rounded-full shadow-lg shadow-amber-400/20 flex items-center gap-2 whitespace-nowrap">
            🏆 New PR — {prFlash.exercise}: {prFlash.weight} kg
          </div>
        </div>
      )}

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

      {workoutSummary && (
        <WorkoutSummaryModal
          summary={workoutSummary}
          onDone={() => setWorkoutSummary(null)}
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

function EntryCard({ entry, isPR, isEditing, onEdit, onRemove }) {
  return (
    <li
      className={`card transition ${
        isEditing
          ? 'border-accent-500/50 bg-accent-500/5'
          : isPR
          ? 'border-amber-400/40 bg-amber-400/5'
          : ''
      }`}
    >
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{entry.exercise}</span>
            {isPR && !isEditing && (
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                PR
              </span>
            )}
            {isEditing && (
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-300 border border-accent-500/30">
                editing
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400 mt-0.5 break-words">
            {setsSummary(entry.sets)}
          </div>
        </div>
        <div className="flex items-center shrink-0">
          <button
            onClick={onEdit}
            aria-label="Edit entry"
            className="text-slate-500 hover:text-accent-400 transition p-2 shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            aria-label="Remove entry"
            className="text-slate-500 hover:text-red-400 transition p-2 -mr-2 shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
            </svg>
          </button>
        </div>
      </div>
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

function WorkoutSummaryModal({ summary, onDone }) {
  const stats = [
    { label: 'Exercises', value: summary.exercises },
    { label: 'Total sets', value: summary.sets },
    { label: 'Volume', value: `${summary.volume.toLocaleString()} kg` },
    { label: 'Duration', value: summary.duration },
  ]
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-950/90 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="w-full max-w-xs bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl">
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight">Workout complete</h2>
              <p className="text-sm text-slate-500 mt-1">{summary.label}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {stats.map(({ label, value }) => (
                <div key={label} className="bg-ink-800 border border-ink-700 rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                  <div className="text-xl font-bold mt-0.5 tabular-nums">{value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={onDone}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-600 text-ink-950 font-bold rounded-xl py-3 text-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
