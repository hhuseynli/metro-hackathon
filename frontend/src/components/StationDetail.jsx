import { useStation } from '../hooks/useMetroData'
import PlatformDiagram from './PlatformDiagram'

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

export default function StationDetail({ stationId, stationName, lines }) {
  const data = useStation(stationId)

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-slate-800">{stationName}</h2>
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
      </div>

      {!data ? (
        <div className="py-10 text-center text-slate-400 text-sm">Yüklənir…</div>
      ) : (
        <div className="space-y-5">
          {/* Load bar + metrics */}
          <div className="space-y-4">
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
                  <span className="font-semibold tabular-nums" style={{ color: loadColor(data.predicted_load_pct) }}>
                    {data.predicted_load_pct?.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MetricBox label="Giriş"          value={`+${data.inflow_per_min?.toFixed(1)}/dəq`}  accent="text-emerald-600" />
              <MetricBox label="Çıxış"          value={`−${data.outflow_per_min?.toFixed(1)}/dəq`} accent="text-orange-500" />
              <MetricBox label="Növbəti qatar"  value={`${data.next_train_min} dəq`}               accent="text-sky-600" />
            </div>
          </div>

          {/* Platform diagram */}
          {data.zones && <PlatformDiagram zones={data.zones} nudge={data.nudge} />}

        </div>
      )}
    </div>
  )
}
