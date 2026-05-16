import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine
} from 'recharts'
import {
  exerciseNames,
  muscleHeatThisWeek,
  progressSeries,
  weeklyVolumeByCategory
} from '../lib/pr.js'
import { formatDate } from '../lib/storage.js'

const CHART = {
  grid: '#1a1f2c', axis: '#475569', axisLine: '#1a1f2c',
  cursor: '#334155', tooltipBg: '#11151f', tooltipBorder: '#1a1f2c',
  tooltipLabel: '#94a3b8', refLine: '#334155', refLineLabel: '#64748b',
}

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
  const cc = CHART

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
                <LineChart data={data} margin={{ top: 12, right: 76, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="line" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={cc.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={cc.axis}
                    fontSize={10}
                    tickMargin={6}
                    tickFormatter={(v) => {
                      const [, m, d] = v.split('-')
                      return `${Number(m)}/${Number(d)}`
                    }}
                    tickLine={false}
                    axisLine={{ stroke: cc.axisLine }}
                  />
                  <YAxis
                    stroke={cc.axis}
                    fontSize={10}
                    width={32}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    cursor={{ stroke: cc.cursor, strokeDasharray: 3 }}
                    contentStyle={{
                      background: cc.tooltipBg,
                      border: `1px solid ${cc.tooltipBorder}`,
                      borderRadius: 10,
                      fontSize: 12
                    }}
                    labelStyle={{ color: cc.tooltipLabel }}
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
                  {best.weight >= 0 && (
                    <ReferenceLine
                      y={best.weight}
                      stroke={cc.refLine}
                      strokeDasharray="4 3"
                      label={{
                        value: `Best: ${best.weight} kg`,
                        position: 'right',
                        fill: cc.refLineLabel,
                        fontSize: 10
                      }}
                    />
                  )}
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

const HEAT = {
  body: '#252d3d',
  levels: ['#0b3d5e', '#0d6499', '#1a8ec4', '#38bdf8'],
  legend: ['#252d3d', '#0b3d5e', '#0d6499', '#38bdf8'],
}

function heatColor(sets, scheme) {
  if (!sets || sets === 0) return scheme.body
  if (sets <= 3) return scheme.levels[0]
  if (sets <= 6) return scheme.levels[1]
  if (sets <= 10) return scheme.levels[2]
  return scheme.levels[3]
}

function BodySVG({ view, heat, scheme }) {
  const c = (sets) => heatColor(sets, scheme)
  const back = view === 'back'
  return (
    <svg viewBox="0 0 100 220" className="w-full" aria-hidden="true">
      {/* ── base silhouette ── */}
      <g fill={scheme.body}>
        {/* head */}
        <circle cx="50" cy="12" r="9.5" />
        {/* neck */}
        <path d="M45,22 Q43,26 43,30 L57,30 Q57,26 55,22 Z" />
        {/* torso – wide shoulders, narrow waist (V-taper) */}
        <path d="M22,30 C36,26 64,26 78,30 C78,40 74,48 68,52 C68,64 67,76 67,82 C67,90 68,95 70,98 C68,104 62,108 54,109 L46,109 C38,108 32,104 30,98 C32,95 33,90 33,82 C33,76 32,64 32,52 C26,48 22,40 22,30 Z" />
        {/* left arm */}
        <path d="M22,32 C16,36 11,46 10,60 C9,72 10,84 12,94 C13,99 14,103 15,107 L21,106 C21,100 21,93 22,86 C23,74 24,62 25,54 C25,46 24,38 22,32 Z" />
        {/* right arm */}
        <path d="M78,32 C84,36 89,46 90,60 C91,72 90,84 88,94 C87,99 86,103 85,107 L79,106 C79,100 79,93 78,86 C77,74 76,62 75,54 C75,46 76,38 78,32 Z" />
        {/* left leg */}
        <path d="M30,108 C26,118 24,132 24,148 C24,158 25,166 27,174 C26,184 27,196 29,207 L38,208 C37,196 37,184 38,174 C40,166 41,158 41,148 C42,132 42,118 43,108 Z" />
        {/* right leg */}
        <path d="M70,108 C74,118 76,132 76,148 C76,158 75,166 73,174 C74,184 73,196 71,207 L62,208 C63,196 63,184 62,174 C60,166 59,158 59,148 C58,132 58,118 57,108 Z" />
      </g>

      {back ? (
        /* ── Back muscles ── */
        <>
          {/* upper back / traps */}
          <path d="M34,32 C26,36 24,46 26,56 C28,62 36,66 50,66 C64,66 72,62 74,56 C76,46 74,36 66,32 C60,28 56,28 50,30 C44,28 40,28 34,32 Z" fill={c(heat.back)} />
          {/* lats – left */}
          <path d="M28,54 C22,60 20,70 22,80 C24,86 28,89 34,87 C38,85 39,78 38,68 C37,60 34,55 28,54 Z" fill={c(heat.lats)} />
          {/* lats – right */}
          <path d="M72,54 C78,60 80,70 78,80 C76,86 72,89 66,87 C62,85 61,78 62,68 C63,60 66,55 72,54 Z" fill={c(heat.lats)} />
          {/* rear delts – left */}
          <path d="M19,32 C13,36 11,44 13,52 C15,58 20,60 26,57 C29,54 29,47 27,41 C25,36 22,31 19,32 Z" fill={c(heat.shoulders)} />
          {/* rear delts – right */}
          <path d="M81,32 C87,36 89,44 87,52 C85,58 80,60 74,57 C71,54 71,47 73,41 C75,36 78,31 81,32 Z" fill={c(heat.shoulders)} />
          {/* triceps – left */}
          <path d="M14,56 C10,63 9,73 11,83 C13,89 17,91 22,88 C26,85 26,76 24,66 C22,58 18,54 14,56 Z" fill={c(heat.triceps)} />
          {/* triceps – right */}
          <path d="M86,56 C90,63 91,73 89,83 C87,89 83,91 78,88 C74,85 74,76 76,66 C78,58 82,54 86,56 Z" fill={c(heat.triceps)} />
          {/* glutes */}
          <path d="M33,110 C28,115 27,123 30,131 C32,137 38,139 50,137 C62,139 68,137 70,131 C73,123 72,115 67,110 C62,105 56,104 50,105 C44,104 38,105 33,110 Z" fill={c(heat.legs)} />
          {/* hamstrings – left */}
          <path d="M30,135 C26,143 25,155 27,165 C29,171 34,173 40,171 C44,169 45,160 44,148 C43,136 41,129 38,129 Z" fill={c(heat.legs)} />
          {/* hamstrings – right */}
          <path d="M70,135 C74,143 75,155 73,165 C71,171 66,173 60,171 C56,169 55,160 56,148 C57,136 59,129 62,129 Z" fill={c(heat.legs)} />
        </>
      ) : (
        /* ── Front muscles ── */
        <>
          {/* chest – left pec */}
          <path d="M35,37 C29,40 26,49 29,57 C31,63 37,65 45,62 C49,60 51,54 50,46 C49,40 45,36 41,36 C39,36 37,36 35,37 Z" fill={c(heat.chest)} />
          {/* chest – right pec */}
          <path d="M65,37 C71,40 74,49 71,57 C69,63 63,65 55,62 C51,60 49,54 50,46 C51,40 55,36 59,36 C61,36 63,36 65,37 Z" fill={c(heat.chest)} />
          {/* front delts – left */}
          <path d="M19,32 C13,36 11,44 13,52 C15,58 20,60 26,57 C29,54 29,47 27,41 C25,36 22,31 19,32 Z" fill={c(heat.shoulders)} />
          {/* front delts – right */}
          <path d="M81,32 C87,36 89,44 87,52 C85,58 80,60 74,57 C71,54 71,47 73,41 C75,36 78,31 81,32 Z" fill={c(heat.shoulders)} />
          {/* biceps – left */}
          <path d="M14,56 C10,63 9,73 11,83 C13,89 17,91 22,88 C26,85 26,76 24,66 C22,58 18,54 14,56 Z" fill={c(heat.biceps)} />
          {/* biceps – right */}
          <path d="M86,56 C90,63 91,73 89,83 C87,89 83,91 78,88 C74,85 74,76 76,66 C78,58 82,54 86,56 Z" fill={c(heat.biceps)} />
          {/* abs / core */}
          <path d="M38,63 C35,70 35,78 37,84 C39,89 43,91 50,91 C57,91 61,89 63,84 C65,78 65,70 62,63 C59,58 55,58 50,59 C45,58 41,58 38,63 Z" fill={c(heat.core)} />
          {/* quads – left */}
          <path d="M32,110 C27,120 25,134 26,150 C27,158 31,164 38,162 C43,160 45,151 44,137 C43,122 41,112 39,110 Z" fill={c(heat.legs)} />
          {/* quads – right */}
          <path d="M68,110 C73,120 75,134 74,150 C73,158 69,164 62,162 C57,160 55,151 56,137 C57,122 59,112 61,110 Z" fill={c(heat.legs)} />
        </>
      )}
    </svg>
  )
}

function HeatmapCard({ muscleHeat }) {
  const totalSets = Object.values(muscleHeat).reduce((a, b) => a + b, 0)
  const scheme = HEAT
  const legend = [
    { color: scheme.legend[0], label: 'None' },
    { color: scheme.legend[1], label: 'Low'  },
    { color: scheme.legend[2], label: 'Med'  },
    { color: scheme.legend[3], label: 'High' },
  ]
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
          <BodySVG view="front" heat={muscleHeat} scheme={scheme} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 text-center mb-1">Back</p>
          <BodySVG view="back" heat={muscleHeat} scheme={scheme} />
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center justify-center gap-3 mt-2">
        {legend.map(({ color, label }) => (
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
              style={{ background: heatColor(sets, scheme) }}
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
