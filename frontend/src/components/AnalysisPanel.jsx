import { useCameras, useAnalysis } from '../hooks/useAnalysis'

const FOLDER_AZ = {
  Entrance:  'Giriş',
  Escalator: 'Eskalator',
  Platform:  'Platforma',
  Train:     'Qatar',
  Turnstile: 'Turniket',
}

const STATION_AZ = {
  '28MAY':    '28 May',
  'ELIMLER':  'Elmlar',
  'KOROGLU':  'Koroğlu',
  '20YANVAR': '20 Yanvar',
}

function formatFilename(name) {
  const base = name.replace(/_detection\.(jpg|mp4)$/i, '')

  // Train cameras: В2-КАМ2_16-04-26_13-00-00
  const trainMatch = base.match(/^(В\d+)-КАМ(\d+)(?:_\w+)?_\d{2}-\d{2}-\d{2}_(\d{2})-(\d{2})/)
  if (trainMatch) {
    return `Vaqon ${trainMatch[1].replace('В', '')} · Kamera ${trainMatch[2]} · ${trainMatch[3]}:${trainMatch[4]}`
  }

  // Station cameras: STATIONCODE... DD.MM.YYYY SAAT HH.MM
  const stationMatch = base.match(/^([A-Z0-9]+?)[\s-].*?(\d{2}\.\d{2}\.\d{4})\s+SAAT\s+(\d{2}[.:]\d{2})/)
  if (stationMatch) {
    const code    = Object.keys(STATION_AZ).find(k => stationMatch[1].startsWith(k))
    const station = code ? STATION_AZ[code] : stationMatch[1]
    const time    = stationMatch[3].replace('.', ':')
    return `${station} · ${stationMatch[2]} · ${time}`
  }

  return base
}

const STATUS_COLOR = {
  queued:  'text-slate-400',
  running: 'text-blue-500',
  done:    'text-green-600',
  error:   'text-red-500',
}

export default function AnalysisPanel() {
  const cameras = useCameras()
  const {
    folder, setFolder, filename, setFilename,
    seconds, setSeconds,
    previewUrl, personCount, previewError,
    job, loading,
    preview, startTracking,
  } = useAnalysis()

  const folders   = Object.keys(cameras)
  const filenames = folder ? (cameras[folder] || []) : []

  const handleFolderChange = (e) => {
    setFolder(e.target.value)
    setFilename('')
  }

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Kamera təhlili</h2>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white min-w-[140px]"
          value={folder}
          onChange={handleFolderChange}
        >
          <option value="">— Məkan —</option>
          {folders.map(f => <option key={f} value={f}>{FOLDER_AZ[f] ?? f}</option>)}
        </select>

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white min-w-[260px] max-w-sm"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          disabled={!folder}
        >
          <option value="">— Görüntü —</option>
          {filenames.map(f => <option key={f} value={f}>{formatFilename(f)}</option>)}
        </select>
      </div>

      {/* Preview controls */}
      <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-slate-100">
        <button
          onClick={preview}
          disabled={!filename || loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
        >
          Önizlə
        </button>

        {personCount && (
          <span className="text-sm font-bold text-slate-700">{personCount} nəfər</span>
        )}
        {previewError && (
          <span className="text-sm text-red-500">{previewError}</span>
        )}
      </div>

      {/* Preview image */}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Detection preview"
          className="rounded-lg w-full object-contain max-h-80 mb-5 border border-slate-100"
        />
      )}

      {/* Track controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">İlk müddəti təhlil et</label>
          <input
            type="number" min="5" max="600" step="5"
            value={seconds}
            onChange={e => setSeconds(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-20 text-center"
          />
          <span className="text-xs text-slate-400">san</span>
        </div>

        <button
          onClick={startTracking}
          disabled={!filename || loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-600 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
        >
          {loading && job?.status === 'running' ? 'İzlənir…' : 'Giriş / çıxışı izlə'}
        </button>

        {job && (
          <div className="flex items-center gap-4">
            <span className={`text-xs font-bold uppercase tracking-wide ${STATUS_COLOR[job.status] || 'text-slate-400'}`}>
              {job.status}
            </span>
            {(job.status === 'running' || job.status === 'done') && (
              <>
                <span className="text-sm font-bold text-green-600">IN {job.total_in}</span>
                <span className="text-sm font-bold text-red-500">OUT {job.total_out}</span>
              </>
            )}
            {job.status === 'done' && job.video_url && (
              <a href={job.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">
                Videonu yüklə
              </a>
            )}
            {job.status === 'error' && (
              <span className="text-xs text-red-400">{job.error}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
