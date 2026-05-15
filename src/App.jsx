import { useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import LogScreen from './screens/LogScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import ProgressScreen from './screens/ProgressScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import BodyScreen from './screens/BodyScreen.jsx'
import { useSessions } from './hooks/useSessions.js'
import { useTemplates } from './hooks/useTemplates.js'
import { useBodyWeight } from './hooks/useBodyWeight.js'

const titles = {
  log: 'Today',
  history: 'History',
  progress: 'Progress',
  body: 'Body Weight',
  settings: 'Settings'
}

export default function App() {
  const [tab, setTab] = useState('log')
  const store = useSessions()
  const templateStore = useTemplates()
  const bwStore = useBodyWeight()

  return (
    <div className="min-h-full flex flex-col bg-ink-950 text-slate-100">
      <header className="sticky top-0 z-20 bg-ink-950/80 backdrop-blur border-b border-ink-800 safe-top">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/15 border border-accent-500/30 grid place-items-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
              </svg>
            </div>
            <span className="text-sm text-slate-400">Gym Log</span>
          </div>
          <h1 className="text-base font-semibold">{titles[tab]}</h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-5 pt-4 pb-24">
        {tab === 'log' && <LogScreen {...store} {...templateStore} />}
        {tab === 'history' && <HistoryScreen {...store} />}
        {tab === 'progress' && <ProgressScreen {...store} />}
        {tab === 'body' && <BodyScreen {...bwStore} />}
        {tab === 'settings' && <SettingsScreen {...store} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
