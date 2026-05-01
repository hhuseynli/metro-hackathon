import { useMetroData } from './hooks/useMetroData'
import PlatformDiagram from './components/PlatformDiagram'
import StatusBar from './components/StatusBar'

function App() {
  const { zones, nudge, stats, error } = useMetroData()

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 max-w-5xl mx-auto w-full border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="https://metro.gov.az/default.png" 
              alt="Baku Metro Logo" 
              className="w-16 h-auto"
            />
            <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black border-l border-slate-200 pl-3">Bakı Metropoliteni</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Platformada Paylanma
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Real-vaxt rejimində sərnişin sıxlığının monitorinq sistemi
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 font-medium tracking-tight">Tapşırıq #4 — Metro Hackathon 2026</p>
        </div>
      </header>

      {/* Status bar */}
      <div className="mb-6 max-w-5xl mx-auto w-full">
        <StatusBar
          mode={zones.mode}
          frameCount={zones.frame_count}
          fps={zones.fps}
          error={error}
        />
      </div>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center mt-6">
        <div className="max-w-5xl w-full">
          <PlatformDiagram zones={zones.zones || {}} nudge={nudge} />
        </div>
      </main>
    </div>
  )
}

export default App
