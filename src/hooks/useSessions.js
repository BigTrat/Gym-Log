import { useCallback, useEffect, useState } from 'react'
import { loadSessions, saveSessions, todayISO, uid } from '../lib/storage.js'

export function useSessions() {
  const [sessions, setSessions] = useState(() => loadSessions())

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const addEntry = useCallback((entry) => {
    const date = todayISO()
    const cleanSets = (entry.sets || [])
      .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) }))
      .filter((s) => Number.isFinite(s.reps) && Number.isFinite(s.weight) && s.reps > 0)
    if (cleanSets.length === 0) return

    setSessions((prev) => {
      const next = [...prev]
      let session = next.find((s) => s.date === date)
      if (!session) {
        session = { id: uid(), date, entries: [] }
        next.push(session)
      } else {
        const idx = next.indexOf(session)
        session = { ...session, entries: [...session.entries] }
        next[idx] = session
      }
      session.entries.push({
        id: uid(),
        exercise: entry.exercise.trim(),
        sets: cleanSets,
        createdAt: Date.now()
      })
      return next.sort((a, b) => (a.date < b.date ? 1 : -1))
    })
  }, [])

  const removeEntry = useCallback((sessionId, entryId) => {
    setSessions((prev) => {
      return prev
        .map((s) => {
          if (s.id !== sessionId) return s
          return { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
        })
        .filter((s) => s.entries.length > 0)
    })
  }, [])

  const removeSession = useCallback((sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }, [])

  const replaceSessions = useCallback((next) => {
    const sorted = [...next].sort((a, b) => (a.date < b.date ? 1 : -1))
    setSessions(sorted)
  }, [])

  return { sessions, addEntry, removeEntry, removeSession, replaceSessions }
}
