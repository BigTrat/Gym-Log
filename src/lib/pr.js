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

export function maxWeightForExercise(sessions, exerciseName) {
  const key = normalizeName(exerciseName)
  let best = 0
  for (const s of sessions) {
    for (const e of s.entries) {
      if (normalizeName(e.exercise) !== key) continue
      const w = topWeight(e)
      if (w > best) best = w
    }
  }
  return best
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

export function categorizeExercise(name) {
  const lower = name.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat
  }
  return null
}

export function detectCategory(exerciseNames) {
  const found = new Set()
  for (const name of exerciseNames) {
    const cat = categorizeExercise(name)
    if (cat) found.add(cat)
  }
  if (found.size === 0) return null
  if (found.size === 1) return [...found][0]
  return 'Full Body'
}

// Muscle → keyword mapping (an exercise can light up multiple groups)
const MUSCLE_KEYWORDS = {
  chest:     ['bench', 'chest', 'fly', 'pec', 'dip', 'push-up', 'pushup'],
  shoulders: ['shoulder', 'press', 'overhead', 'delt', 'lateral', 'front raise', 'arnold'],
  triceps:   ['tricep', 'pushdown', 'extension', 'skull', 'close grip', 'dip'],
  biceps:    ['bicep', 'curl', 'chin'],
  back:      ['row', 'deadlift', 'shrug', 'hyperextension', 'trap', 'rear delt'],
  lats:      ['lat', 'pulldown', 'pull-up', 'pullup', 'chin', 'pull'],
  legs:      ['squat', 'lunge', 'leg', 'calf', 'hamstring', 'glute', 'hip', 'rdl', 'romanian'],
  core:      ['plank', 'crunch', 'ab', 'core', 'sit-up', 'situp', 'oblique', 'twist']
}

function exerciseMuscleGroups(name) {
  const lower = name.toLowerCase()
  const groups = []
  for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) groups.push(group)
  }
  return groups
}

function weekStart() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function muscleHeatThisWeek(sessions) {
  const start = weekStart()
  const heat = { chest: 0, shoulders: 0, triceps: 0, biceps: 0, back: 0, lats: 0, legs: 0, core: 0 }
  for (const s of sessions) {
    if (s.date < start) continue
    for (const e of s.entries) {
      for (const group of exerciseMuscleGroups(e.exercise)) {
        heat[group] += e.sets.length
      }
    }
  }
  return heat
}

export function weeklyVolumeByCategory(sessions) {
  const start = weekStart()
  const volume = { Push: 0, Pull: 0, Legs: 0 }
  for (const s of sessions) {
    if (s.date < start) continue
    for (const e of s.entries) {
      const cat = categorizeExercise(e.exercise)
      if (!cat || !(cat in volume)) continue
      for (const set of e.sets) {
        volume[cat] += set.reps * set.weight
      }
    }
  }
  return volume
}

// Returns ISO string for a Date object
function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}


export function dailyStreak(sessions, restDays = []) {
  if (!sessions.length && !restDays.length) return 0
  const workedDays = new Set([...sessions.map((s) => s.date), ...restDays.map((r) => r.date)])
  const today = isoDate(new Date())
  // If today has no workout yet, start checking from yesterday so a rest day
  // today doesn't immediately break a streak built up over previous days.
  const [ty, tm, td] = today.split('-').map(Number)
  const yesterday = isoDate(new Date(ty, tm - 1, td - 1))
  let cursor = workedDays.has(today) ? today : yesterday
  let streak = 0
  while (workedDays.has(cursor)) {
    streak++
    const [cy, cm, cd] = cursor.split('-').map(Number)
    cursor = isoDate(new Date(cy, cm - 1, cd - 1))
  }
  return streak
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
