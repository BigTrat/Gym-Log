import { useCallback, useEffect, useState } from 'react'
import { loadRestDays, saveRestDays, todayISO, uid } from '../lib/storage.js'

export function useRestDays() {
  const [restDays, setRestDays] = useState(() => loadRestDays())

  useEffect(() => {
    saveRestDays(restDays)
  }, [restDays])

  const logRestDay = useCallback(() => {
    const date = todayISO()
    setRestDays((prev) => {
      if (prev.some((r) => r.date === date)) return prev
      return [...prev, { id: uid(), date }]
    })
  }, [])

  const removeRestDay = useCallback((id) => {
    setRestDays((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { restDays, logRestDay, removeRestDay }
}
