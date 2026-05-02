import { useState } from 'react'
import { useMetroData } from './hooks/useMetroData'
import PlatformDiagram from './components/PlatformDiagram'
import StatusBar from './components/StatusBar'
import AnalysisPanel from './components/AnalysisPanel'
import WagonOccupancy from './components/WagonOccupancy'
import MetroMap from './components/MetroMap'
import NudgePanel from './components/NudgePanel'
import StatsPanel from './components/StatsPanel'
import StationDetail from './components/StationDetail'

const TABS = [
  { id: 'map',      label: 'Xəritə'     },
  { id: 'platform', label: 'Platform'   },
  { id: 'stats',    label: 'Statistika' },
  { id: 'analysis', label: 'Analiz'     },
]

function App() {
  const { zones, nudge, stats, error } = useMetroData()
  const [activeTab, setActiveTab]         = useState('map')
  const [selectedStation, setSelectedStation] = useState(null)

  const handleSelectStation = (info) => {
    setSelectedStation(info)
    // Auto-switch to map tab if selecting from elsewhere
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">

      {/* ── Compact sticky header ───────────────────────────────────────── */}
      <header className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm z-20">
        <div className="px-3 md:px-6 h-14 flex items-center justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <img src="https://metro.gov.az/default.png" alt="Bakı Metro" className="w-7 h-auto shrink-0" />
            <div className="hidden sm:block min-w-0">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">Bakı Metropoliteni</p>
              <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">Sərnişin Paylanması</p>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="flex gap-0.5 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 active:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Status dot (desktop) */}
          <div className="shrink-0 hidden md:block">
            <StatusBar
              mode={zones.mode}
              frameCount={zones.frame_count}
              fps={zones.fps}
              error={error}
              compact
            />
          </div>

        </div>
      </header>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">

        {/* MAP — full-viewport map with slide-up station detail */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <MetroMap onSelect={setSelectedStation} fullscreen />

          {/* Station detail overlay — slides up from bottom */}
          <div className={`absolute inset-x-0 bottom-0 z-10 transition-transform duration-300 ease-out ${selectedStation ? 'translate-y-0' : 'translate-y-full'}`}>
            {selectedStation && (
              <div className="p-3 md:p-4 max-h-[65vh] overflow-y-auto">
                <StationDetail
                  stationId={selectedStation.apiId}
                  stationName={selectedStation.name}
                  lines={selectedStation.lines}
                  onClose={() => setSelectedStation(null)}
                />
              </div>
            )}
          </div>

          {/* Mobile status indicator overlay */}
          <div className="absolute top-2 left-2 z-10 md:hidden">
            <StatusBar mode={zones.mode} frameCount={zones.frame_count} fps={zones.fps} error={error} compact />
          </div>
        </div>

        {/* PLATFORM — PlatformDiagram + NudgePanel */}
        {activeTab === 'platform' && (
          <div className="h-full overflow-y-auto">
            <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-safe">
              <StatusBar mode={zones.mode} frameCount={zones.frame_count} fps={zones.fps} error={error} />
              <div className="grid md:grid-cols-2 gap-4">
                <PlatformDiagram zones={zones.zones || {}} nudge={nudge} />
                <NudgePanel nudge={nudge} />
              </div>
            </div>
          </div>
        )}

        {/* STATS — StatsPanel + WagonOccupancy */}
        {activeTab === 'stats' && (
          <div className="h-full overflow-y-auto">
            <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-safe">
              <StatsPanel stats={stats} />
              <WagonOccupancy />
            </div>
          </div>
        )}

        {/* ANALYSIS — AnalysisPanel */}
        {activeTab === 'analysis' && (
          <div className="h-full overflow-y-auto">
            <div className="p-4 md:p-6 max-w-5xl mx-auto pb-safe">
              <AnalysisPanel />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
