export default function NudgePanel({ nudge }) {
  const active = nudge?.active

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-500 ${
      active
        ? 'bg-emerald-950 border-emerald-500 shadow-lg shadow-emerald-900/40'
        : 'bg-slate-900 border-slate-700'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <h2 className="text-lg font-semibold text-slate-200">Nudge Engine</h2>
      </div>

      {active ? (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Chip color="emerald">Active</Chip>
            <Chip color="amber">{nudge.nudge_type}</Chip>
            <Chip color="sky">{nudge.intensity}</Chip>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Target zone" value={`Zone ${nudge.target_zone} → Car ${nudge.target_car}`} />
            <InfoRow label="Crowded zone" value={`Zone ${nudge.overcrowded_zone} → Car ${nudge.overcrowded_car}`} />
            <InfoRow label="Density ratio" value={`${nudge.ratio}×`} />
          </div>

          <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/30 p-3">
            <p className="text-xs text-emerald-300 font-medium mb-1">Passenger message (ambient):</p>
            <p className="text-sm text-emerald-100">{nudge.messages?.az}</p>
            <p className="text-xs text-emerald-400 mt-0.5">{nudge.messages?.en}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-3xl mb-1">✓</div>
          <p className="text-slate-400 text-sm">Distribution balanced</p>
          {nudge?.ratio && (
            <p className="text-slate-600 text-xs mt-1">Max/min ratio: {nudge.ratio}×</p>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ children, color }) {
  const colors = {
    emerald: 'bg-emerald-900 text-emerald-300 border-emerald-700',
    amber: 'bg-amber-900/60 text-amber-300 border-amber-700',
    sky: 'bg-sky-900/60 text-sky-300 border-sky-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {children}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-slate-800 rounded-lg px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-200 font-medium">{value}</p>
    </div>
  )
}
