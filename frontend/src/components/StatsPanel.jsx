function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function StatsPanel({ stats }) {
  if (!stats) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Historical Imbalance</h2>
        <p className="text-slate-500 text-sm">Loading statistics…</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Historical Imbalance</h2>
        <span className="text-xs text-slate-500">
          {stats.train_visits_analyzed?.toLocaleString()} train visits
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          label="Avg imbalance"
          value={`${stats.avg_imbalance_pct}%`}
          sub="max car − min car load"
          accent="text-orange-400"
        />
        <StatCard
          label="Crowding ratio"
          value={`${stats.ratio}×`}
          sub="most crowded vs least"
          accent="text-red-400"
        />
        <StatCard
          label="Most crowded car"
          value={`${stats.most_crowded_car_avg}%`}
          sub="avg occupancy"
        />
        <StatCard
          label="Least crowded car"
          value={`${stats.least_crowded_car_avg}%`}
          sub="avg occupancy"
          accent="text-emerald-400"
        />
      </div>

      <div className="rounded-xl bg-slate-800 border border-slate-700 p-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-200 font-medium">Key finding: </span>
          Front cars average <span className="text-red-400 font-semibold">{stats.most_crowded_car_avg}%</span> occupancy
          while rear cars sit at <span className="text-emerald-400 font-semibold">{stats.least_crowded_car_avg}%</span> —
          a <span className="text-orange-400 font-semibold">{stats.ratio}× imbalance</span> that
          our nudge system targets in real time.
        </p>
      </div>
    </div>
  )
}
