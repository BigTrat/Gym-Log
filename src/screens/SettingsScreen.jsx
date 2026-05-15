import { useRef, useState } from 'react'
import {
  countEntries,
  exportSessions,
  mergeSessions,
  parseImport,
  todayISO
} from '../lib/storage.js'

export default function SettingsScreen({ sessions, replaceSessions }) {
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
    const merged = mergeSessions(sessions, pending.sessions)
    replaceSessions(merged)
    setPending(null)
    flash('Merged.')
  }

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
          Your data
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

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {pending && (
          <div className="border border-accent-500/30 bg-accent-500/5 rounded-xl p-3 space-y-3">
            <div className="text-xs">
              <div className="text-slate-300 font-medium truncate">
                {pending.fileName}
              </div>
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
            <button
              onClick={() => setPending(null)}
              className="btn-ghost text-xs"
            >
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
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  )
}
