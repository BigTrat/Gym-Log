import { useRef, useState } from 'react'
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
import {
  countEntries,
  exportSessions,
  formatDate,
  mergeSessions,
  parseImport,
  todayISO
} from '../lib/storage.js'

export default function SettingsScreen({
  sessions,
  replaceSessions,
  weightEntries,
  logWeight,
  removeWeight
}) {
  return (
    <div className="space-y-5">
      <BodyWeightSection
        weightEntries={weightEntries}
        logWeight={logWeight}
        removeWeight={removeWeight}
      />
      <WorkoutDataSection sessions={sessions} replaceSessions={replaceSessions} />
    </div>
  )
}

function BodyWeightSection({ weightEntries, logWeight, removeWeight }) {
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
    <section className="card p-4 space-y-4">
      <h2 className="text-xs uppercase tracking-wider text-slate-500">Body Weight</h2>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          inputMode="decimal"
          type="number"
          min="0"
          step="0.1"
          placeholder="Today's weight (kg)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLog()}
        />
        <button
          onClick={handleLog}
          disabled={!input || parseFloat(input) <= 0}
          className="shrink-0 px-4 bg-accent-500 hover:bg-accent-600 active:bg-accent-600 text-ink-950 font-semibold rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Log
        </button>
      </div>

      {todayEntry && (
        <p className="text-xs text-slate-500 -mt-2">
          Today: <span className="text-slate-300 font-medium">{todayEntry.weight} kg</span>
          <button
            onClick={() => removeWeight(todayEntry.id)}
            className="ml-2 text-slate-600 hover:text-red-400 transition"
            aria-label="Remove today's entry"
          >
            ×
          </button>
        </p>
      )}

      {weightEntries.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-xs text-slate-500">No weight logged yet.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <BWstat label="Start" value={first ? `${first.weight} kg` : '—'} />
            <BWstat label="Current" value={last ? `${last.weight} kg` : '—'} />
            <BWstat
              label="Change"
              value={
                change !== null
                  ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`
                  : '—'
              }
              highlight={
                change === null ? null : change < 0 ? 'green' : change > 0 ? 'red' : null
              }
            />
          </div>

          {hasChart && (
            <div className="h-48 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weightEntries}
                  margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
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
                    tickFormatter={(v) => `${v}`}
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
          )}
        </>
      )}
    </section>
  )
}

function BWstat({ label, value, highlight }) {
  const valueClass =
    highlight === 'green'
      ? 'text-emerald-400'
      : highlight === 'red'
      ? 'text-red-400'
      : 'text-slate-100'
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${valueClass}`}>{value}</div>
    </div>
  )
}

function WorkoutDataSection({ sessions, replaceSessions }) {
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const totalEntries = countEntries(sessions)
  const dateRange = sessions.length
    ? `${sessions[sessions.length - 1].date} → ${sessions[0].date}`
    : '—'

  const flash = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2500)
  }

  const handleExport = () => {
    if (sessions.length === 0) {
      setError('Nothing to export yet.')
      return
    }
    setError('')
    const blob = new Blob([exportSessions(sessions)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymlog-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('Exported.')
  }

  const handleFile = async (e) => {
    setError('')
    setStatus('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseImport(text)
      setPending({ sessions: parsed, fileName: file.name })
    } catch (err) {
      setError(err.message || 'Could not read file')
      setPending(null)
    } finally {
      e.target.value = ''
    }
  }

  const applyReplace = () => {
    if (!pending) return
    if (!confirm('Replace all existing data with the imported file? This cannot be undone.'))
      return
    replaceSessions(pending.sessions)
    setPending(null)
    flash('Replaced.')
  }

  const applyMerge = () => {
    if (!pending) return
    replaceSessions(mergeSessions(sessions, pending.sessions))
    setPending(null)
    flash('Merged.')
  }

  return (
    <>
      <section className="card p-4">
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
          Workout data
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Sessions" value={sessions.length} />
          <Stat label="Entries" value={totalEntries} />
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Range: <span className="text-slate-300">{dateRange}</span>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-500">Backup</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save a JSON file with all sessions to your device.
          </p>
        </div>
        <button onClick={handleExport} className="btn-primary">
          Export to JSON
        </button>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </section>

      <section className="card p-4 space-y-3">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-500">Restore</h2>
          <p className="text-xs text-slate-500 mt-1">
            Load a previously exported JSON file.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-ink-700 hover:bg-ink-600 active:bg-ink-600 text-slate-100 font-medium rounded-xl py-3 text-sm transition border border-ink-600"
        >
          Choose file…
        </button>

        {pending && (
          <div className="border border-accent-500/30 bg-accent-500/5 rounded-xl p-3 space-y-3">
            <div className="text-xs">
              <div className="text-slate-300 font-medium truncate">{pending.fileName}</div>
              <div className="text-slate-500 mt-0.5">
                {pending.sessions.length} session
                {pending.sessions.length !== 1 ? 's' : ''} ·{' '}
                {countEntries(pending.sessions)} entries
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={applyMerge}
                className="bg-accent-500 hover:bg-accent-600 text-ink-950 font-semibold rounded-lg py-2 text-xs transition"
              >
                Merge
              </button>
              <button
                onClick={applyReplace}
                className="bg-red-500/90 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-xs transition"
              >
                Replace all
              </button>
            </div>
            <button onClick={() => setPending(null)} className="btn-ghost text-xs">
              Cancel
            </button>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-300">Merge</span> keeps existing data and adds
              entries that aren't already there.{' '}
              <span className="text-slate-300">Replace all</span> overwrites everything.
            </p>
          </div>
        )}

        {status && !pending && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
            {status}
          </div>
        )}
      </section>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  )
}
