import { useCallback, useEffect, useState } from 'react'
import { loadTemplates, saveTemplates, uid } from '../lib/storage.js'

export function useTemplates() {
  const [templates, setTemplates] = useState(() => loadTemplates())

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const saveTemplate = useCallback((name, exercises) => {
    setTemplates((prev) => [
      ...prev,
      {
        id: uid(),
        name: name.trim(),
        exercises: exercises.map((e) => ({
          exercise: e.exercise,
          sets: e.sets.map((s) => ({ reps: s.reps, weight: s.weight }))
        }))
      }
    ])
  }, [])

  const deleteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { templates, saveTemplate, deleteTemplate }
}
