import { topWeight } from './storage.js'

export function normalizeName(name) {
  return name.trim().toLowerCase()
}

export function maxWeightBeforeEntry(sessions, entry, sessionDate) {
  const key = normalizeName(entry.exercise)
  let best = 0
  for (const s of sessions) {
    if (s.date > sessionDate) continue
    for (const e of s.entries) {
      if (e.id === entry.id) continue
      if (normalizeName(e.exercise) !== key) continue
      if (s.date === sessionDate && (e.createdAt || 0) > (entry.createdAt || 0)) continue
      const w = topWeight(e)
      if (w > best) best = w
    }
  }
  return best
}

export function lastLoggedEntry(sessions, exerciseName) {
  const key = normalizeName(exerciseName)
  for (const s of sessions) {
    for (let i = s.entries.length - 1; i >= 0; i--) {
      if (normalizeName(s.entries[i].exercise) === key) return s.entries[i]
    }
  }
  return null
}

export function isPR(sessions, entry, sessionDate) {
  const prior = maxWeightBeforeEntry(sessions, entry, sessionDate)
  const w = topWeight(entry)
  return w > prior && w > 0
}

export function exerciseNames(sessions) {
  const map = new Map()
  for (const s of sessions) {
    for (const e of s.entries) {
      const key = normalizeName(e.exercise)
      if (!map.has(key)) map.set(key, e.exercise.trim())
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b))
}

const CATEGORY_KEYWORDS = {
  Push: ['bench', 'press', 'fly', 'dip', 'tricep', 'shoulder', 'overhead'],
  Pull: ['row', 'pull', 'curl', 'lat', 'deadlift', 'bicep', 'chin'],
  Legs: ['squat', 'lunge', 'leg', 'calf', 'hamstring', 'glute', 'hip']
}

export function detectCategory(exerciseNames) {
  const found = new Set()
  for (const name of exerciseNames) {
    const lower = name.toLowerCase()
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        found.add(cat)
        break
      }
    }
  }
  if (found.size === 0) return null
  if (found.size === 1) return [...found][0]
  return 'Full Body'
}

export function progressSeries(sessions, exerciseName) {
  const key = normalizeName(exerciseName)
  const byDate = new Map()
  for (const s of sessions) {
    for (const e of s.entries) {
      if (normalizeName(e.exercise) !== key) continue
      const w = topWeight(e)
      const current = byDate.get(s.date) || 0
      if (w > current) byDate.set(s.date, w)
    }
  }
  const points = [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  let runningMax = 0
  return points.map((p) => {
    const pr = p.weight > runningMax
    if (pr) runningMax = p.weight
    return { ...p, pr }
  })
}
