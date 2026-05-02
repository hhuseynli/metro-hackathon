function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-slate-100'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function StatsPanel({ stats }) {
  if (!stats) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Tarixi uyğunsuzluq</h2>
        <p className="text-slate-500 text-sm">Statistika yüklənir…</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Tarixi uyğunsuzluq</h2>
        <span className="text-xs text-slate-500">
          {stats.train_visits_analyzed?.toLocaleString()} qatar səfəri
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          label="Orta fərq"
          value={`${stats.avg_imbalance_pct}%`}
          sub="maks vaqon − min vaqon yükü"
          accent="text-orange-400"
        />
        <StatCard
          label="Sıxlıq nisbəti"
          value={`${stats.ratio}×`}
          sub="ən sıx və ən az sıx"
          accent="text-red-400"
        />
        <StatCard
          label="Ən dolu vaqon"
          value={`${stats.most_crowded_car_avg}%`}
          sub="orta doluluq"
        />
        <StatCard
          label="Ən boş vaqon"
          value={`${stats.least_crowded_car_avg}%`}
          sub="orta doluluq"
          accent="text-emerald-400"
        />
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-700 font-medium">Əsas nəticə: </span>
          Ön vaqonların orta doluluğu <span className="text-red-500 font-semibold">{stats.most_crowded_car_avg}%</span>-dir,
          arxa vaqonlar isə <span className="text-emerald-600 font-semibold">{stats.least_crowded_car_avg}%</span> —
          bu, real vaxt yönləndirmə sistemimizin hədəflədiyi <span className="text-orange-500 font-semibold">{stats.ratio}× fərq</span>dir.
        </p>
      </div>
    </div>
  )
}
