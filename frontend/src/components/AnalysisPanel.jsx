import { useCameras, useAnalysis } from '../hooks/useAnalysis'

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
    framePct, setFramePct, seconds, setSeconds,
    previewUrl, personCount,
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
      <h2 className="text-lg font-bold text-slate-800 mb-4">Camera Analysis</h2>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white min-w-[140px]"
          value={folder}
          onChange={handleFolderChange}
        >
          <option value="">— Folder —</option>
          {folders.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white min-w-[260px] max-w-sm"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          disabled={!folder}
        >
          <option value="">— Video —</option>
          {filenames.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Preview controls */}
      <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Frame</label>
          <input
            type="range" min="0" max="1" step="0.01"
            value={framePct}
            onChange={e => setFramePct(parseFloat(e.target.value))}
            className="w-28"
          />
          <span className="text-xs text-slate-400 w-8">{Math.round(framePct * 100)}%</span>
        </div>

        <button
          onClick={preview}
          disabled={!filename || loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          Preview Frame
        </button>

        {personCount && (
          <span className="text-sm font-bold text-slate-700">{personCount} persons</span>
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
          <label className="text-xs text-slate-500 font-medium">Analyse first</label>
          <input
            type="number" min="5" max="600" step="5"
            value={seconds}
            onChange={e => setSeconds(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-20 text-center"
          />
          <span className="text-xs text-slate-400">sec</span>
        </div>

        <button
          onClick={startTracking}
          disabled={!filename || loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
        >
          {loading && job?.status === 'running' ? 'Tracking…' : 'Track IN / OUT'}
        </button>

        {/* Job result */}
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
              <a
                href={job.video_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 underline"
              >
                Download video
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
