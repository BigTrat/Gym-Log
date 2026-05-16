import { useMemo, useState } from 'react'
import { formatDate, topWeight } from '../lib/storage.js'
import { detectCategory, maxWeightBeforeEntry } from '../lib/pr.js'
import { setsSummary } from './LogScreen.jsx'

export default function HistoryScreen({ sessions, removeSession, restDays = [], removeRestDay }) {
  const [openId, setOpenId] = useState(null)

  const items = useMemo(() => {
    const list = [
      ...sessions.map((s) => ({ ...s, _type: 'session' })),
      ...restDays.map((r) => ({ ...r, _type: 'rest' })),
    ]
    return list.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [sessions, restDays])

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm font-medium">No sessions yet</div>
        <div className="text-xs text-slate-500 mt-1">
          Logged workouts will appear here, grouped by day.
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        if (item._type === 'rest') {
          return (
            <li key={item.id} className="card">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-base leading-none">💤</span>
                  <div>
                    <div className="font-medium text-sm">{formatDate(item.date)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Rest day</div>
                  </div>
                </div>
                <button
                  onClick={() => removeRestDay(item.id)}
                  aria-label="Delete rest day"
                  className="text-slate-500 hover:text-red-400 transition p-2 -mr-2 shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                  </svg>
                </button>
              </div>
            </li>
          )
        }

        const s = item
        const open = openId === s.id
        const totalSets = s.entries.reduce((sum, e) => sum + (e.sets?.length || 0), 0)
        const exercises = new Set(s.entries.map((e) => e.exercise.toLowerCase())).size
        const category = detectCategory(s.entries.map((e) => e.exercise))
        return (
          <li key={s.id} className="card">
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{formatDate(s.date)}</span>
                  {category && <CategoryBadge category={category} />}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {exercises} exercise{exercises !== 1 ? 's' : ''} · {totalSets} sets
                </div>
              </div>
              <svg
                viewBox="0 0 24 24"
                className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div className="border-t border-ink-700 px-4 py-3 space-y-2">
                {s.entries.map((e) => {
                  const prior = maxWeightBeforeEntry(sessions, e, s.date)
                  const top = topWeight(e)
                  const isPR = top > prior && top > 0
                  return (
                    <div
                      key={e.id}
                      className="flex items-start justify-between gap-3 text-sm py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0 shrink-0 max-w-[40%]">
                        <span className="truncate">{e.exercise}</span>
                        {isPR && (
                          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            PR
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-right break-words min-w-0">
                        {setsSummary(e.sets)}
                      </span>
                    </div>
                  )
                })}
                <button
                  onClick={() => {
                    if (confirm('Delete this entire session?')) {
                      removeSession(s.id)
                      setOpenId(null)
                    }
                  }}
                  className="mt-2 text-xs text-red-400/80 hover:text-red-400 transition"
                >
                  Delete session
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const CATEGORY_STYLES = {
  Push:      'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Pull:      'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Legs:      'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Full Body': 'bg-violet-500/15 text-violet-300 border-violet-500/30'
}

function CategoryBadge({ category }) {
  return (
    <span
      className={`text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded border ${
        CATEGORY_STYLES[category] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
      }`}
    >
      {category}
    </span>
  )
}
