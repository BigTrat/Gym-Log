import { useMemo, useState } from 'react'

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

const PLATE_META = {
  25:   { color: '#ef4444', h: 72, dark: false },
  20:   { color: '#3b82f6', h: 62, dark: false },
  15:   { color: '#eab308', h: 52, dark: false },
  10:   { color: '#22c55e', h: 44, dark: false },
  5:    { color: '#e2e8f0', h: 34, dark: true  },
  2.5:  { color: '#f97316', h: 26, dark: false },
  1.25: { color: '#94a3b8', h: 20, dark: false },
}

function calcPlatesPerSide(perSide) {
  let remaining = Math.round(perSide * 1000) / 1000
  const result = []
  for (const p of PLATES) {
    while (remaining >= p - 0.0001) {
      result.push(p)
      remaining = Math.round((remaining - p) * 1000) / 1000
    }
  }
  return { plates: result, remainder: remaining }
}

export default function CalcScreen() {
  return (
    <div className="space-y-5">
      <OneRMCalc />
      <PlateCalc />
    </div>
  )
}

function OneRMCalc() {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const r = parseInt(reps, 10)

  const result = useMemo(() => {
    const w = parseFloat(weight)
    if (!w || w <= 0 || !r || r < 1) return null
    return Math.round(w * (1 + r / 30) * 10) / 10
  }, [weight, r])

  return (
    <section className="card p-4 space-y-4">
      <div>
        <h2 className="text-xs uppercase tracking-wider text-slate-500">1RM Calculator</h2>
        <p className="text-xs text-slate-500 mt-0.5">Epley formula · weight × (1 + reps / 30)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Weight (kg)</label>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Reps performed</label>
          <input
            className="input"
            inputMode="numeric"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 5"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
      </div>

      {result !== null && (
        <div className="rounded-xl bg-accent-500/10 border border-accent-500/20 px-4 py-4 text-center">
          <div className="text-xs text-slate-500 mb-1.5">Estimated 1RM</div>
          <div className="text-4xl font-bold text-accent-400 leading-none">
            {result}
            <span className="text-xl font-normal text-slate-400 ml-1.5">kg</span>
          </div>
          {r > 10 && (
            <div className="text-[11px] text-slate-500 mt-2">Most accurate for 1–10 reps</div>
          )}
        </div>
      )}
    </section>
  )
}

function PlateCalc() {
  const [target, setTarget] = useState('')
  const [bar, setBar] = useState('20')

  const result = useMemo(() => {
    const t = parseFloat(target)
    const b = parseFloat(bar) || 0
    if (!t || t <= 0) return null
    if (t < b) return { error: 'Target weight must be ≥ bar weight.' }
    const perSide = Math.round(((t - b) / 2) * 1000) / 1000
    if (perSide === 0) return { plates: [], perSide: 0, remainder: 0 }
    return { perSide, ...calcPlatesPerSide(perSide) }
  }, [target, bar])

  return (
    <section className="card p-4 space-y-4">
      <h2 className="text-xs uppercase tracking-wider text-slate-500">Plate Calculator</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Target weight (kg)</label>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min="0"
            step="2.5"
            placeholder="e.g. 100"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Bar weight (kg)</label>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.5"
            placeholder="20"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
          />
        </div>
      </div>

      {result?.error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Per side" value={`${result.perSide} kg`} />
            {result.remainder > 0.001
              ? <StatCard label="Unloaded" value={`${result.remainder} kg`} accent="red" />
              : <StatCard label="Match" value="Exact" accent="green" />
            }
          </div>

          {result.plates.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-1">Bar only — no plates needed.</p>
          ) : (
            <div>
              <div className="text-[11px] text-slate-500 mb-3">Each side — heaviest to lightest:</div>
              <BarbellVisual plates={result.plates} />
              <div className="flex flex-wrap gap-1.5 mt-4">
                {result.plates.map((p, i) => {
                  const { color, dark } = PLATE_META[p]
                  return (
                    <span
                      key={i}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: color, color: dark ? '#1e293b' : '#fff' }}
                    >
                      {p} kg
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function BarbellVisual({ plates }) {
  return (
    <div className="flex items-center overflow-x-auto no-scrollbar py-1 gap-0.5">
      <div className="shrink-0 h-2.5 w-10 rounded-l-full bg-slate-500" />
      {plates.map((p, i) => {
        const { color, h } = PLATE_META[p]
        return (
          <div
            key={i}
            className="shrink-0 rounded-[3px]"
            style={{ width: 20, height: h, background: color }}
            aria-label={`${p} kg`}
          />
        )
      })}
      <div className="shrink-0 h-10 w-3 rounded-r-sm bg-slate-400" />
    </div>
  )
}

function StatCard({ label, value, accent }) {
  const valueClass =
    accent === 'green' ? 'text-emerald-400' :
    accent === 'red'   ? 'text-red-400'     :
                         'text-slate-100'
  return (
    <div className="card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${valueClass}`}>{value}</div>
    </div>
  )
}
