import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts'
import { formatDate, todayISO } from '../lib/storage.js'

export default function BodyScreen({ weightEntries, logWeight, removeWeight }) {
  const [input, setInput] = useState('')
  const today = todayISO()
  const todayEntry = weightEntries.find((e) => e.date === today)

  const handleLog = () => {
    const w = parseFloat(input)
    if (!w || w <= 0) return
    logWeight(w)
    setInput('')
  }

  const first = weightEntries[0]
  const last = weightEntries[weightEntries.length - 1]
  const change = first && last && first !== last ? last.weight - first.weight : null
  const hasChart = weightEntries.length >= 2

  return (
    <div className="space-y-5">
      <section className="card p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wider text-slate-500">Log weight</h2>
          <span className="text-xs text-slate-500">{formatDate(today)}</span>
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.1"
            placeholder="Weight (kg)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLog()}
          />
          <button
            onClick={handleLog}
            disabled={!input || parseFloat(input) <= 0}
            className="shrink-0 px-5 bg-accent-500 hover:bg-accent-600 active:bg-accent-600 text-ink-950 font-semibold rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Log
          </button>
        </div>

        {todayEntry && (
          <div className="flex items-center gap-2 -mt-1">
            <p className="text-xs text-slate-500">
              Today:{' '}
              <span className="text-slate-300 font-medium">{todayEntry.weight} kg</span>
            </p>
            <button
              onClick={() => removeWeight(todayEntry.id)}
              className="text-xs text-slate-600 hover:text-red-400 transition leading-none"
              aria-label="Remove today's entry"
            >
              ×
            </button>
          </div>
        )}
      </section>

      {weightEntries.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-sm font-medium">No entries yet</div>
          <div className="text-xs text-slate-500 mt-1">
            Log your weight above to start tracking.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Start" value={first ? `${first.weight} kg` : '—'} />
            <Stat label="Current" value={last ? `${last.weight} kg` : '—'} />
            <Stat
              label="Change"
              value={
                change !== null
                  ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`
                  : '—'
              }
              accent={change === null ? null : change < 0 ? 'green' : change > 0 ? 'red' : null}
            />
          </div>

          {hasChart && (
            <section className="card p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-sm font-medium">Body weight</h2>
                <span className="text-[11px] text-slate-500">
                  {weightEntries.length} entries
                </span>
              </div>

              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weightEntries}
                    margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid stroke="#1a1f2c" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={10}
                      tickMargin={6}
                      tickLine={false}
                      axisLine={{ stroke: '#1a1f2c' }}
                      tickFormatter={(v) => {
                        const [, m, d] = v.split('-')
                        return `${Number(m)}/${Number(d)}`
                      }}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={10}
                      width={34}
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
                      formatter={(value) => [`${value} kg`, 'Weight']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    {first && (
                      <ReferenceLine
                        y={first.weight}
                        stroke="#334155"
                        strokeDasharray="4 3"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#c4b5fd' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent }) {
  const valueClass =
    accent === 'green'
      ? 'text-emerald-400'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-slate-100'
  return (
    <div className="card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${valueClass}`}>{value}</div>
    </div>
  )
}
