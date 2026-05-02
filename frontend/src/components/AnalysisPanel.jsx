import { useState, useEffect } from 'react'
import { useCameras, useAnalysis } from '../hooks/useAnalysis'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const FOLDER_AZ = {
  Entrance:  'Giriş',
  Escalator: 'Eskalator',
  Platform:  'Platforma',
  Train:     'Qatar',
  Turnstile: 'Turniket',
}

const STATION_AZ = {
  '28MAY':    '28 May',
  'ELIMLER':  'Elmlər',
  'ELMLER':   'Elmlər',
  'KOROGLU':  'Koroğlu',
  '20YANVAR': '20 Yanvar',
}

// Folders where in/out tracking makes sense
const TRACKING_FOLDERS = new Set(['Entrance', 'Escalator', 'Turnstile'])

// Pre-computed tracked demo videos per folder
const FOLDER_DEMO_VIDEO = {
  Escalator: '28MAY11 ESKALATOR UST-16.04.2026 SAAT 08.45_tracked.mp4',
  Entrance:  '28MAY02 GIRIS POLIS-16.04.2026 SAAT 18.00_tracked.mp4',
}

function formatFilename(name) {
  const base = name.replace(/_detection\.(jpg|mp4)$/i, '').replace(/\.avi$/i, '')

  const trainMatch = base.match(/^(В\d+)-КАМ(\d+)(?:_\w+)?_\d{2}-\d{2}-\d{2}_(\d{2})-(\d{2})/)
  if (trainMatch) {
    return `Vaqon ${trainMatch[1].replace('В', '')} · Kamera ${trainMatch[2]} · ${trainMatch[3]}:${trainMatch[4]}`
  }

  const stationMatch = base.match(/^([A-Z0-9]+?)[\s-].*?(\d{2,3}\.\d{2}\.\d{4})\s+SAAT?\s+(\d{2}[.:]\d{2})/)
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
    startTracking,
  } = useAnalysis()

  const [showTrackedVideo, setShowTrackedVideo] = useState(false)
  const [videoError, setVideoError]             = useState(false)

  useEffect(() => {
    setShowTrackedVideo(false)
    setVideoError(false)
  }, [folder])

  useEffect(() => {
    setShowTrackedVideo(false)
    setVideoError(false)
  }, [filename])

  const folders          = Object.keys(cameras)
  const filenames        = folder ? (cameras[folder] || []) : []
  const supportsTracking = TRACKING_FOLDERS.has(folder)
  const MAX_SEC          = 30

  const demoVideo = folder && FOLDER_DEMO_VIDEO[folder]
    ? `${API_BASE}/api/outputs/${encodeURIComponent(FOLDER_DEMO_VIDEO[folder])}`
    : null

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

      {/* Preview area */}
      {loading && !previewUrl && (
        <p className="text-sm text-slate-400 mb-4">Yüklənir…</p>
      )}
      {previewError && (
        <p className="text-sm text-red-500 mb-4">{previewError}</p>
      )}
      {previewUrl && (
        <div className="mb-5">
          {personCount && (
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
              {personCount} nəfər aşkarlandı
            </p>
          )}
          <img
            src={previewUrl}
            alt="Detection preview"
            className="rounded-lg w-full object-contain max-h-80 border border-slate-100"
          />
        </div>
      )}

      {/* Tracked demo video — only shown after the user submits the in/out button */}
      {showTrackedVideo && demoVideo && (
        <div className="mb-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
            Giriş / Çıxış İzlənməsi
          </p>
          {videoError ? (
            <p className="text-sm text-slate-400 py-4 text-center">Video oynadıla bilmədi</p>
          ) : (
            <video
              key={folder}
              src={demoVideo}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="rounded-lg w-full border border-slate-100 bg-slate-900"
              onError={() => setVideoError(true)}
            />
          )}
        </div>
      )}

      {/* Tracking controls — only for in/out folders */}
      {supportsTracking && filename && (
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Müddət</label>
            <input
              type="number" min="1" max={MAX_SEC} step="1"
              value={seconds}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v)) setSeconds(Math.min(Math.max(1, v), MAX_SEC))
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-20 text-center"
            />
            <span className="text-xs text-slate-400">san (maks {MAX_SEC}s)</span>
          </div>

          <button
            onClick={() => { setShowTrackedVideo(true); startTracking() }}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-600 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
          >
            {loading && job?.status === 'running' ? 'İzlənir…' : 'Giriş / çıxışı izlə'}
          </button>

          {job && (
            <div className="flex items-center gap-4 flex-wrap">
              {(job.status === 'running' || job.status === 'done') && (
                <>
                  <span className="text-sm font-bold text-green-600">IN {job.total_in}</span>
                  <span className="text-sm font-bold text-red-500">OUT {job.total_out}</span>
                </>
              )}
              {job.status === 'running' && (
                <span className="text-xs text-blue-500 animate-pulse">təhlil edilir…</span>
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
      )}
    </div>
  )
}
