import { useMetroData } from './hooks/useMetroData'
import PlatformDiagram from './components/PlatformDiagram'
import NudgePanel from './components/NudgePanel'
import StatsPanel from './components/StatsPanel'
import StatusBar from './components/StatusBar'

function App() {
  const { zones, nudge, stats, error } = useMetroData()

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white">M</div>
            <span className="text-xs text-slate-500 uppercase tracking-widest">Baku Metro</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Platform Distribution
          </h1>
          <p className="text-sm text-slate-500">
            Real-time passenger density &amp; behavioral nudge system
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-600">Challenge #4 — Metro Hackathon 2026</p>
        </div>
      </header>

      {/* Status bar */}
      <div className="mb-4">
        <StatusBar
          mode={zones.mode}
          frameCount={zones.frame_count}
          fps={zones.fps}
          error={error}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlatformDiagram zones={zones.zones || {}} nudge={nudge} />
        </div>
        <div className="flex flex-col gap-4">
          <NudgePanel nudge={nudge} />
          <StatsPanel stats={stats} />
        </div>
      </div>

      {/* Behavioral science callout */}
      <div className="mt-4 rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Why nudging works</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Subtle environmental cues —{' '}
          <span className="text-amber-400">warmer lighting</span> and{' '}
          <span className="text-blue-400">directional ambient sound</span> — shift passenger flow
          without explicit instructions. Passengers self-distribute naturally, reducing crowding
          by an estimated{' '}
          <span className="text-emerald-400 font-medium">20–35%</span> in peak hours,
          with no signage, no apps, and no behavior change required from riders.
        </p>
      </div>
    </div>
  )
}

export default App
