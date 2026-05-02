export default function NudgePanel({ nudge }) {
  const active = nudge?.active

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-500 shadow-sm ${
      active
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        <h2 className="text-lg font-semibold text-slate-800">Yönləndirmə sistemi</h2>
      </div>

      {active ? (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Chip color="emerald">Aktiv</Chip>
            <Chip color="amber">{nudge.nudge_type}</Chip>
            <Chip color="sky">{nudge.intensity}</Chip>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Hədəf zona" value={`Zona ${nudge.target_zone} → Vaqon ${nudge.target_car}`} />
            <InfoRow label="Sıx zona" value={`Zona ${nudge.overcrowded_zone} → Vaqon ${nudge.overcrowded_car}`} />
            <InfoRow label="Sıxlıq nisbəti" value={`${nudge.ratio}×`} />
          </div>

          <div className="rounded-xl bg-white border border-emerald-200 p-3 shadow-sm">
            <p className="text-xs text-emerald-700 font-medium mb-1">Sərnişin mesajı (dolayı):</p>
            <p className="text-sm text-slate-700">{nudge.messages?.az}</p>
            <p className="text-xs text-slate-500 mt-0.5">{nudge.messages?.en}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-3xl mb-1">✓</div>
          <p className="text-slate-600 text-sm">Paylanma balanslıdır</p>
          {nudge?.ratio && (
            <p className="text-slate-500 text-xs mt-1">Maks/min nisbəti: {nudge.ratio}×</p>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ children, color }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {children}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-700 font-medium">{value}</p>
    </div>
  )
}
