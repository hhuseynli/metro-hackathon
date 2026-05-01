const ZONE_LABELS = ['Car 1', 'Car 2', 'Car 3', 'Car 4', 'Car 5']

function densityColor(count, max) {
  if (max === 0) return { bg: 'bg-slate-800', glow: '' }
  const ratio = count / max
  if (ratio >= 0.75) return { bg: 'bg-red-600',    glow: 'shadow-red-600/60' }
  if (ratio >= 0.50) return { bg: 'bg-orange-500', glow: 'shadow-orange-500/60' }
  if (ratio >= 0.25) return { bg: 'bg-yellow-500', glow: 'shadow-yellow-500/60' }
  return { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/60' }
}

export default function PlatformDiagram({ zones, nudge }) {
  const counts = Object.values(zones || {})
  const max = Math.max(...counts, 1)
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Platform View</h2>
        <span className="text-xs text-slate-500">{total} passengers detected</span>
      </div>

      {/* Train silhouette */}
      <div className="relative mb-3">
        <div className="flex gap-1 h-6 rounded-t-lg overflow-hidden">
          {ZONE_LABELS.map((_, i) => (
            <div key={i} className="flex-1 bg-slate-700 rounded-t" />
          ))}
        </div>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 uppercase tracking-widest">
          Train
        </div>
      </div>

      {/* Platform zones */}
      <div className="flex gap-2">
        {ZONE_LABELS.map((label, i) => {
          const count = zones[i] ?? 0
          const pct = Math.round((count / max) * 100)
          const { bg, glow } = densityColor(count, max)
          const isTarget = nudge?.active && nudge.target_zone === i
          const isCrowded = nudge?.active && nudge.overcrowded_zone === i

          return (
            <div
              key={i}
              className={`
                flex-1 flex flex-col items-center gap-1 rounded-xl border p-3 transition-all duration-500
                ${isTarget  ? 'border-emerald-400 ring-2 ring-emerald-400/30' : ''}
                ${isCrowded ? 'border-red-400 ring-2 ring-red-400/20' : ''}
                ${!isTarget && !isCrowded ? 'border-slate-700' : ''}
                bg-slate-800
              `}
            >
              {/* Density bar */}
              <div className="w-full h-24 bg-slate-700 rounded-lg overflow-hidden flex flex-col-reverse">
                <div
                  className={`w-full transition-all duration-700 ${bg} ${glow ? `shadow-lg ${glow}` : ''}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-xl font-bold text-slate-100">{count}</span>
              <span className="text-[11px] text-slate-400">{label}</span>

              {/* Nudge indicators */}
              {isTarget && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-wide">Nudge →</span>
                  <div className="flex gap-0.5">
                    <span className="text-[9px] text-amber-400">💡</span>
                    <span className="text-[9px] text-blue-400">🔊</span>
                  </div>
                </div>
              )}
              {isCrowded && (
                <span className="text-[9px] font-medium text-red-400 uppercase tracking-wide">Crowded</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Platform floor */}
      <div className="mt-2 h-3 bg-slate-700 rounded-b-lg" />

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        {[
          { color: 'bg-emerald-500', label: 'Low' },
          { color: 'bg-yellow-500', label: 'Moderate' },
          { color: 'bg-orange-500', label: 'High' },
          { color: 'bg-red-600',    label: 'Critical' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
