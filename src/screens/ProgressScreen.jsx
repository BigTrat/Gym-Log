import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot
} from 'recharts'
import {
  exerciseNames,
  muscleHeatThisWeek,
  progressSeries,
  weeklyVolumeByCategory
} from '../lib/pr.js'
import { formatDate } from '../lib/storage.js'

export default function ProgressScreen({ sessions }) {
  const names = useMemo(() => exerciseNames(sessions), [sessions])
  const [selected, setSelected] = useState(names[0] || '')

  useEffect(() => {
    if (!selected && names.length > 0) setSelected(names[0])
    if (selected && !names.includes(selected)) setSelected(names[0] || '')
  }, [names, selected])

  const data = useMemo(
    () => (selected ? progressSeries(sessions, selected) : []),
    [sessions, selected]
  )

  const muscleHeat = useMemo(() => muscleHeatThisWeek(sessions), [sessions])
  const weeklyVolume = useMemo(() => weeklyVolumeByCategory(sessions), [sessions])

  const best = data.reduce((acc, p) => (p.weight > acc.weight ? p : acc), { weight: -1 })
  const latest = data[data.length - 1]
  const prCount = data.filter((p) => p.pr).length

  return (
    <div className="space-y-4">
      <HeatmapCard muscleHeat={muscleHeat} />
      <WeeklyVolumeCard volume={weeklyVolume} />

      {names.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-sm font-medium">No exercise data yet</div>
          <div className="text-xs text-slate-500 mt-1">
            Log a few sessions to see your progress chart.
          </div>
        </div>
      ) : (
        <>
          <div className="card p-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
              {names.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition ${
                    name === selected
                      ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
                      : 'border-ink-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Best" value={best.weight >= 0 ? `${best.weight} kg` : '—'} />
            <Stat label="Latest" value={latest ? `${latest.weight} kg` : '—'} />
            <Stat label="PRs" value={prCount} />
          </div>

          <div className="card p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-medium">{selected}</h2>
              <span className="text-[11px] text-slate-500">
                {data.length} session{data.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="h-64 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="line" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1a1f2c" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickMargin={6}
                    tickFormatter={(v) => {
                      const [, m, d] = v.split('-')
                      return `${Number(m)}/${Number(d)}`
                    }}
                    tickLine={false}
                    axisLine={{ stroke: '#1a1f2c' }}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    width={32}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    cursor={{ stroke: '#334155', strokeDasharray: 3 }}
                    contentStyle={{
                      background: '#11151f',
                      border: '1px solid #1a1f2c',
                      borderRadius: 10,
                      fontSize: 12
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value) => [`${value} kg`, 'Top weight']}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="url(#line)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#7dd3fc' }}
                  />
                  {data
                    .filter((p) => p.pr)
                    .map((p) => (
                      <ReferenceDot
                        key={p.date}
                        x={p.date}
                        y={p.weight}
                        r={5}
                        fill="#fbbf24"
                        stroke="#0b0e15"
                        strokeWidth={2}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
              <Legend color="#38bdf8" label="Top weight" />
              <Legend color="#fbbf24" label="PR" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

function heatColor(sets) {
  if (!sets || sets === 0) return '#1e2535'
  if (sets <= 3) return '#0b3d5e'
  if (sets <= 6) return '#0d6499'
  if (sets <= 10) return '#1a8ec4'
  return '#38bdf8'
}

const BODY_FILL = '#252d3d'

function BodySVG({ view, heat }) {
  const back = view === 'back'
  return (
    <svg viewBox="0 0 80 185" className="w-full" aria-hidden="true">
      {/* silhouette */}
      <g fill={BODY_FILL}>
        <circle cx="40" cy="12" r="10" />
        <rect x="36" y="21" width="8" height="8" rx="2" />
        <rect x="22" y="27" width="36" height="68" rx="5" />
        <rect x="8"  y="26" width="14" height="48" rx="6" />
        <rect x="58" y="26" width="14" height="48" rx="6" />
        <rect x="22" y="93" width="16" height="85" rx="6" />
        <rect x="42" y="93" width="16" height="85" rx="6" />
      </g>

      {back ? (
        /* ── Back muscles ── */
        <>
          {/* upper back / traps */}
          <ellipse cx="40" cy="44" rx="14" ry="10" fill={heatColor(heat.back)} />
          {/* lats */}
          <ellipse cx="24" cy="59" rx="8"  ry="13" fill={heatColor(heat.lats)} />
          <ellipse cx="56" cy="59" rx="8"  ry="13" fill={heatColor(heat.lats)} />
          {/* rear delts */}
          <ellipse cx="17" cy="32" rx="8"  ry="7"  fill={heatColor(heat.shoulders)} />
          <ellipse cx="63" cy="32" rx="8"  ry="7"  fill={heatColor(heat.shoulders)} />
          {/* triceps */}
          <ellipse cx="11" cy="49" rx="5"  ry="9"  fill={heatColor(heat.triceps)} />
          <ellipse cx="69" cy="49" rx="5"  ry="9"  fill={heatColor(heat.triceps)} />
          {/* glutes */}
          <ellipse cx="40" cy="98" rx="15" ry="9"  fill={heatColor(heat.legs)} />
          {/* hamstrings */}
          <ellipse cx="30" cy="128" rx="8" ry="22" fill={heatColor(heat.legs)} />
          <ellipse cx="50" cy="128" rx="8" ry="22" fill={heatColor(heat.legs)} />
        </>
      ) : (
        /* ── Front muscles ── */
        <>
          {/* chest */}
          <ellipse cx="40" cy="44" rx="14" ry="10" fill={heatColor(heat.chest)} />
          {/* front delts */}
          <ellipse cx="17" cy="32" rx="8"  ry="7"  fill={heatColor(heat.shoulders)} />
          <ellipse cx="63" cy="32" rx="8"  ry="7"  fill={heatColor(heat.shoulders)} />
          {/* biceps */}
          <ellipse cx="11" cy="49" rx="5"  ry="9"  fill={heatColor(heat.biceps)} />
          <ellipse cx="69" cy="49" rx="5"  ry="9"  fill={heatColor(heat.biceps)} />
          {/* core / abs */}
          <rect x="27" y="57" width="26" height="34" rx="4" fill={heatColor(heat.core)} />
          {/* quads */}
          <ellipse cx="30" cy="122" rx="8" ry="22" fill={heatColor(heat.legs)} />
          <ellipse cx="50" cy="122" rx="8" ry="22" fill={heatColor(heat.legs)} />
        </>
      )}
    </svg>
  )
}

function HeatmapCard({ muscleHeat }) {
  const totalSets = Object.values(muscleHeat).reduce((a, b) => a + b, 0)
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">
          Muscle groups — this week
        </h2>
        <span className="text-xs text-slate-500">{totalSets} sets</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-slate-500 text-center mb-1">Front</p>
          <BodySVG view="front" heat={muscleHeat} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 text-center mb-1">Back</p>
          <BodySVG view="back" heat={muscleHeat} />
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center justify-center gap-3 mt-2">
        {[
          { color: '#1e2535', label: 'None' },
          { color: '#0b3d5e', label: 'Low' },
          { color: '#0d6499', label: 'Med' },
          { color: '#38bdf8', label: 'High' }
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span
              className="w-2.5 h-2.5 rounded-full border border-ink-600"
              style={{ background: color }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* muscle group labels */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
        {Object.entries(muscleHeat).map(([group, sets]) => (
          <div key={group} className="flex items-center gap-1 text-[10px]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: heatColor(sets) }}
            />
            <span className="text-slate-400 capitalize">{group}</span>
            {sets > 0 && <span className="text-slate-500">{sets}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Weekly volume ───────────────────────────────────────────────────────────

const CAT_COLORS = {
  Push: '#f97316',
  Pull: '#38bdf8',
  Legs: '#4ade80'
}

function formatVol(v) {
  if (v === 0) return null
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

function WeeklyVolumeCard({ volume }) {
  const max = Math.max(...Object.values(volume), 1)
  const hasAny = Object.values(volume).some((v) => v > 0)

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">
          Weekly volume
        </h2>
        <span className="text-[10px] text-slate-500">sets × reps × kg · resets Mon</span>
      </div>

      {!hasAny ? (
        <p className="text-xs text-slate-500 text-center py-2">No workouts logged this week.</p>
      ) : (
        <div className="space-y-2.5">
          {Object.entries(volume).map(([cat, vol]) => {
            const pct = (vol / max) * 100
            const label = formatVol(vol)
            return (
              <div key={cat} className="flex items-center gap-3">
                <span
                  className="text-xs font-medium w-9 shrink-0"
                  style={{ color: CAT_COLORS[cat] }}
                >
                  {cat}
                </span>
                <div className="flex-1 h-5 bg-ink-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: CAT_COLORS[cat],
                      opacity: vol === 0 ? 0 : 1
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                  {label ?? <span className="text-slate-600">—</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  )
}
