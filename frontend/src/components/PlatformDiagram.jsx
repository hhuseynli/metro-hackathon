const ZONE_LABELS = ['Vaqon 1', 'Vaqon 2', 'Vaqon 3', 'Vaqon 4', 'Vaqon 5']

function densityColor(pct) {
  if (pct >= 35) return 'bg-red-600'
  if (pct >= 25) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export default function PlatformDiagram({ zones, nudge }) {
  const counts = Object.values(zones || {})
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platforma Görünüşü</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Real-vaxt monitorinqi</p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex flex-col items-end">
          <span className="text-2xl font-mono font-black text-[#0077C8]">{total}</span>
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Ümumi Sərnişin</p>
        </div>
      </div>

      {/* Train silhouette */}
      <div className="relative mb-6 hidden md:block">
        <div className="flex gap-2 h-8 rounded-t-2xl overflow-hidden bg-slate-100/50">
          {ZONE_LABELS.map((_, i) => (
            <div key={i} className="flex-1 border-r border-white last:border-0" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Qatar</span>
        </div>
      </div>

      {/* Platform zones */}
      <div className="flex flex-row flex-wrap justify-center gap-4">
        {ZONE_LABELS.map((label, i) => {
          const raw = zones[i] ?? 0
          const pct = total > 0 ? Math.round((raw / total) * 100) : 0
          const bg = densityColor(pct)
          const isTarget = nudge?.active && nudge.target_zone === i

          return (
            <div
              key={i}
              className={`
                w-40 h-28 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-500
                border shadow-sm relative overflow-hidden shrink-0
                ${isTarget ? 'border-[#0077C8] ring-4 ring-[#0077C8]/10' : 'border-transparent'}
                ${bg}
              `}
            >
              {/* Subtle glass effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-4xl font-black text-white tracking-tighter drop-shadow-sm">{pct}%</span>
                <span className="text-[11px] font-black text-white/90 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] text-white/80 mt-1">{raw} nəfər</span>
              </div>
              
              {/* Decorative line */}
              <div className="absolute bottom-3 w-10 h-1 bg-white/20 rounded-full" />
            </div>
          )
        })}
      </div>

      {/* Platform floor */}
      <div className="mt-6 h-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hidden md:block" />

      {/* Legend */}
      <div className="flex gap-10 mt-10 justify-center">
        {[
          { color: 'bg-emerald-500', label: '<25%', desc: 'Aşağı Sıxlıq' },
          { color: 'bg-yellow-500', label: '25-35%', desc: 'Orta' },
          { color: 'bg-red-600',    label: '>35%', desc: 'Yüksək Sıxlıq' },
        ].map(({ color, label, desc }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color} shadow-sm`} />
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 tracking-tight">{label}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
