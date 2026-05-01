import { useState } from 'react'

function occupancyColor(pct) {
  if (pct >= 75) return { bar: 'bg-red-500',    text: 'text-red-500' }
  if (pct >= 50) return { bar: 'bg-orange-400', text: 'text-orange-400' }
  return              { bar: 'bg-emerald-500',  text: 'text-emerald-500' }
}

function WagonBar({ wagon, data }) {
  const { bar, text } = occupancyColor(data.percentage)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-700">{wagon}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{data.persons} persons</span>
          <span className={`text-sm font-bold tabular-nums ${text}`}>
            {data.percentage}%
          </span>
        </div>
      </div>
      <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${data.percentage}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">
        {data.cameras_sampled} camera{data.cameras_sampled !== 1 ? 's' : ''} · capacity {data.capacity}
      </p>
    </div>
  )
}

export default function WagonOccupancy() {
  const [wagons, setWagons] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/wagon-occupancy')
      if (!res.ok) throw new Error(`${res.status}`)
      setWagons(await res.json())
    } catch (e) {
      setError('Failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Wagon Occupancy</h2>
          <p className="text-xs text-slate-400 mt-0.5">Based on YOLO detection · max 315 persons per wagon</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          {loading ? 'Analysing…' : wagons ? 'Refresh' : 'Run Analysis'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {wagons && Object.keys(wagons).length > 0 && (
        <div className="space-y-5">
          {Object.entries(wagons).map(([wagon, data]) => (
            <WagonBar key={wagon} wagon={wagon} data={data} />
          ))}

          {/* Imbalance callout */}
          {Object.keys(wagons).length >= 2 && (() => {
            const pcts = Object.values(wagons).map(d => d.percentage)
            const max  = Math.max(...pcts)
            const min  = Math.min(...pcts)
            const ratio = min > 0 ? (max / min).toFixed(1) : '—'
            return (
              <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Imbalance: </span>
                  Most occupied wagon at{' '}
                  <span className="font-bold text-red-500">{max}%</span>, least at{' '}
                  <span className="font-bold text-emerald-600">{min}%</span> —{' '}
                  a <span className="font-bold text-orange-500">{ratio}× gap</span>.
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {wagons && Object.keys(wagons).length === 0 && (
        <p className="text-sm text-slate-400">No train camera footage found.</p>
      )}
    </div>
  )
}
