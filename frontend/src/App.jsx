import { useState } from 'react'
import { useMetroData } from './hooks/useMetroData'
import StatusBar from './components/StatusBar'
import AnalysisPanel from './components/AnalysisPanel'
import WagonOccupancy from './components/WagonOccupancy'
import MetroMap from './components/MetroMap'
import StatsPanel from './components/StatsPanel'
import StationDetail from './components/StationDetail'

const TABS = [
  { id: 'map',      label: 'Xəritə'     },
  { id: 'stats',    label: 'Statistika' },
  { id: 'analysis', label: 'Təhlil'     },
]

function App() {
  const { zones, stats, error } = useMetroData()
  const [activeTab, setActiveTab]             = useState('map')
  const [selectedStation, setSelectedStation] = useState(null)

  const handleBack = () => setSelectedStation(null)

  // Station page replaces the entire layout
  if (selectedStation) {
    return (
      <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden">
        <header className="shrink-0 border-b border-slate-100 bg-white z-20">
          <div className="px-4 md:px-8 h-16 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Xəritəyə qayıt
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-4xl mx-auto pb-safe">
            <StationDetail
              stationId={selectedStation.apiId}
              stationName={selectedStation.name}
              lines={selectedStation.lines}
              onClose={handleBack}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm z-20">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="https://metro.gov.az/default.png" alt="Bakı Metro" className="w-11 h-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] leading-none font-semibold">Bakı Metropoliteni</p>
              <p className="text-base font-black text-slate-800 leading-tight truncate">Sərnişin Paylanması</p>
            </div>
          </div>
          <div className="shrink-0 hidden md:block">
            <StatusBar mode={zones.mode} frameCount={zones.frame_count} fps={zones.fps} error={error} compact />
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        <div className="shrink-0 flex justify-center pt-3 pb-2 px-4">
          <nav className="flex gap-0.5 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 active:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 relative overflow-hidden">

          {/* MAP */}
          <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <MetroMap onSelect={setSelectedStation} fullscreen />
            <div className="absolute top-2 left-2 z-10 md:hidden">
              <StatusBar mode={zones.mode} frameCount={zones.frame_count} fps={zones.fps} error={error} compact />
            </div>
          </div>

          {/* STATS */}
          {activeTab === 'stats' && (
            <div className="h-full overflow-y-auto">
              <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-safe">
                <StatsPanel stats={stats} />
                <WagonOccupancy />
              </div>
            </div>
          )}

          {/* ANALYSIS */}
          {activeTab === 'analysis' && (
            <div className="h-full overflow-y-auto">
              <div className="p-4 md:p-6 max-w-5xl mx-auto pb-safe">
                <AnalysisPanel />
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default App
