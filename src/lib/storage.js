const KEY = 'gymlog.sessions.v1'

function migrateEntry(e) {
  if (!e || typeof e !== 'object') return null
  if (Array.isArray(e.sets)) {
    const sets = e.sets
      .map((s) => ({ reps: Number(s?.reps) || 0, weight: Number(s?.weight) || 0 }))
      .filter((s) => s.reps > 0 || s.weight > 0)
    return {
      id: e.id,
      exercise: String(e.exercise || '').trim(),
      sets,
      createdAt: Number(e.createdAt) || Date.now()
    }
  }
  const count = Math.max(1, Math.floor(Number(e.sets) || 1))
  const reps = Number(e.reps) || 0
  const weight = Number(e.weight) || 0
  return {
    id: e.id,
    exercise: String(e.exercise || '').trim(),
    sets: Array.from({ length: count }, () => ({ reps, weight })),
    createdAt: Number(e.createdAt) || Date.now()
  }
}

export function migrateSessions(sessions) {
  return sessions.map((s) => ({
    ...s,
    entries: (s.entries || []).map(migrateEntry).filter(Boolean)
  }))
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? migrateSessions(parsed) : []
  } catch {
    return []
  }
}

export function topWeight(entry) {
  if (!entry?.sets?.length) return 0
  let best = 0
  for (const s of entry.sets) if (s.weight > best) best = s.weight
  return best
}

export function saveSessions(sessions) {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  })
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const BW_KEY = 'gymlog.bodyweight.v1'

export function loadBodyWeights() {
  try {
    const raw = localStorage.getItem(BW_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBodyWeights(entries) {
  localStorage.setItem(BW_KEY, JSON.stringify(entries))
}

const TEMPLATES_KEY = 'gymlog.templates.v1'

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

export const EXPORT_SCHEMA = 'gymlog/v1'

export function exportSessions(sessions) {
  const payload = {
    schema: EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    sessions
  }
  return JSON.stringify(payload, null, 2)
}

export function parseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON')
  }

  const sessions = Array.isArray(parsed) ? parsed : parsed?.sessions
  if (!Array.isArray(sessions)) {
    throw new Error('Missing "sessions" array')
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const cleaned = []
  for (const s of sessions) {
    if (!s || typeof s !== 'object') throw new Error('Invalid session')
    if (typeof s.id !== 'string' || !s.id) throw new Error('Session missing id')
    if (typeof s.date !== 'string' || !dateRe.test(s.date))
      throw new Error(`Invalid session date: ${s.date}`)
    if (!Array.isArray(s.entries)) throw new Error('Session entries must be array')

    const entries = []
    for (const e of s.entries) {
      if (!e || typeof e !== 'object') throw new Error('Invalid entry')
      if (typeof e.id !== 'string' || !e.id) throw new Error('Entry missing id')
      if (typeof e.exercise !== 'string' || !e.exercise.trim())
        throw new Error('Entry missing exercise name')

      let sets
      if (Array.isArray(e.sets)) {
        sets = e.sets.map((set, i) => {
          const reps = Number(set?.reps)
          const weight = Number(set?.weight)
          if (!Number.isFinite(reps) || !Number.isFinite(weight))
            throw new Error(`Entry "${e.exercise}" set ${i + 1} has invalid numbers`)
          return { reps, weight }
        })
      } else {
        const count = Math.max(1, Math.floor(Number(e.sets) || 1))
        const reps = Number(e.reps)
        const weight = Number(e.weight)
        if (!Number.isFinite(reps) || !Number.isFinite(weight))
          throw new Error(`Entry "${e.exercise}" has non-numeric reps/weight`)
        sets = Array.from({ length: count }, () => ({ reps, weight }))
      }

      entries.push({
        id: e.id,
        exercise: e.exercise.trim(),
        sets,
        createdAt: Number.isFinite(Number(e.createdAt)) ? Number(e.createdAt) : Date.now()
      })
    }

    cleaned.push({ id: s.id, date: s.date, entries })
  }

  return cleaned.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function mergeSessions(existing, incoming) {
  const byDate = new Map()
  for (const s of existing) {
    byDate.set(s.date, { ...s, entries: [...s.entries] })
  }

  for (const inc of incoming) {
    const target = byDate.get(inc.date)
    if (!target) {
      byDate.set(inc.date, { ...inc, entries: [...inc.entries] })
      continue
    }
    const existingIds = new Set(target.entries.map((e) => e.id))
    for (const e of inc.entries) {
      if (!existingIds.has(e.id)) target.entries.push(e)
    }
  }

  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function countEntries(sessions) {
  let n = 0
  for (const s of sessions) n += s.entries.length
  return n
}
