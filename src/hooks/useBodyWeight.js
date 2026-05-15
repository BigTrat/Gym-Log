import { useCallback, useEffect, useState } from 'react'
import { loadBodyWeights, saveBodyWeights, todayISO, uid } from '../lib/storage.js'

export function useBodyWeight() {
  const [weightEntries, setWeightEntries] = useState(() => loadBodyWeights())

  useEffect(() => {
    saveBodyWeights(weightEntries)
  }, [weightEntries])

  const logWeight = useCallback((weight) => {
    const date = todayISO()
    setWeightEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== date)
      return [...filtered, { id: uid(), date, weight: Number(weight) }].sort((a, b) =>
        a.date < b.date ? -1 : 1
      )
    })
  }, [])

  const removeWeight = useCallback((id) => {
    setWeightEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { weightEntries, logWeight, removeWeight }
}
