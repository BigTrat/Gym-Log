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
import { exerciseNames, progressSeries } from '../lib/pr.js'
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

  if (names.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm font-medium">No data yet</div>
        <div className="text-xs text-slate-500 mt-1">
          Log a few sessions to see your progress chart.
        </div>
      </div>
    )
  }

  const best = data.reduce(
    (acc, p) => (p.weight > acc.weight ? p : acc),
    { weight: -1 }
  )
  const latest = data[data.length - 1]
  const prCount = data.filter((p) => p.pr).length

  return (
    <div className="space-y-4">
      <div className="card p-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
          {names.map((name) => {
            const isActive = name === selected
            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition ${
                  isActive
                    ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
                    : 'border-ink-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {name}
              </button>
            )
          })}
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
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
  )
}
