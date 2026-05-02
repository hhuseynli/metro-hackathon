import { useStation } from '../hooks/useMetroData'

const LC = { red: '#EF4444', green: '#10B981', purple: '#A855F7', yellow: '#CA8A04' }
const LL = { red: 'I Xətt', green: 'II Xətt', purple: 'III Xətt', yellow: 'Xətai' }

function loadColor(pct) {
  if (pct > 75) return '#EF4444'
  if (pct > 45) return '#F59E0B'
  return '#10B981'
}

function LoadBar({ pct }) {
  const color = loadColor(pct || 0)
  return (
    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct || 0, 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function MetricBox({ label, value, accent }) {
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center border border-slate-100">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
    </div>
  )
}

export default function StationDetail({ stationId, stationName, lines, onClose }) {
  const data = useStation(stationId)

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-slate-800">{stationName}</h2>
          {lines.map(l => (
            <span
              key={l}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: LC[l] }}
            >
              {LL[l]}
            </span>
          ))}
          <span className="text-[10px] text-slate-400 font-medium">Canlı məlumat · hər 3 san</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0"
        >
          ×
        </button>
      </div>

      {!data ? (
        <div className="px-6 py-10 text-center text-slate-400 text-sm">Yüklənir…</div>
      ) : (
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left col: load + metrics + guidance */}
          <div className="space-y-4">
            {/* Current load bar */}
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Hazırkı yük</span>
                <span className="text-xs text-slate-400 tabular-nums">{data.inside_count} nəfər içəridə</span>
              </div>
              <LoadBar pct={data.load_pct} />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs font-semibold tabular-nums" style={{ color: loadColor(data.load_pct) }}>
                  {data.load_pct?.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">
                  Proqnoz (növbəti qatar):{' '}
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: loadColor(data.predicted_load_pct) }}
                  >
                    {data.predicted_load_pct?.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>

            {/* 3 metric boxes */}
            <div className="grid grid-cols-3 gap-2">
              <MetricBox
                label="Giriş"
                value={`+${data.inflow_per_min?.toFixed(1)}/dəq`}
                accent="text-emerald-600"
              />
              <MetricBox
                label="Çıxış"
                value={`−${data.outflow_per_min?.toFixed(1)}/dəq`}
                accent="text-orange-500"
              />
              <MetricBox
                label="Növbəti qatar"
                value={`${data.next_train_min} dəq`}
                accent="text-sky-600"
              />
            </div>

            {/* Guidance box */}
            {data.guidance_active ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide mb-1">
                  Zona Tövsiyəsi
                </p>
                <p className="text-sm text-emerald-800 font-medium">{data.guidance_text}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-1">
                  Zona Tövsiyəsi
                </p>
                <p className="text-sm text-slate-400">Bütün zonalar balanslaşdırılıb</p>
              </div>
            )}
          </div>

          {/* Right col: zone bars */}
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">
              Platform Zonaları
            </p>
            {data.zones ? (
              <div className="space-y-2">
                {Object.entries(data.zones).map(([zone, count]) => {
                  const maxCount = Math.max(...Object.values(data.zones), 1)
                  const isTarget = data.guidance_zones?.includes(parseInt(zone))
                  const pct = (count / maxCount) * 100
                  return (
                    <div key={zone} className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold w-14 shrink-0 ${isTarget ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Zona {zone}
                        {isTarget && <span className="ml-0.5">✓</span>}
                      </span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isTarget ? '#34d399' : pct > 70 ? '#f87171' : '#94a3b8',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-6 text-right shrink-0 tabular-nums ${isTarget ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Zona məlumatı mövcud deyil</p>
            )}

            {data.historical_baseline != null && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tarixi bazis (15 dəq)</p>
                <p className="text-sm font-semibold text-slate-600 tabular-nums">
                  {Math.round(data.historical_baseline).toLocaleString()} giriş
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
