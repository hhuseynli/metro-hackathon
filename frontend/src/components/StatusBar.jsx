export default function StatusBar({ mode, frameCount, fps, error, compact = false }) {
  const modeColor = {
    live: 'text-emerald-400',
    precomputed: 'text-amber-400',
    demo: 'text-sky-400',
    connecting: 'text-slate-500',
  }[mode] || 'text-slate-500'

  const modeDisplay = {
    live: 'canlı',
    precomputed: 'əvvəlcədən hesablanmış',
    demo: 'demo',
    connecting: 'qoşulur...',
  }[mode] || mode

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px]">
        <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-400' : 'bg-current ' + modeColor}`} />
        <span className={error ? 'text-red-400' : modeColor}>{error ? 'xəta' : modeDisplay}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
      {error ? (
        <span className="text-red-400">{error}</span>
      ) : (
        <>
          <span>
            Rejim: <span className={`font-medium ${modeColor}`}>{modeDisplay}</span>
          </span>
          <span>Kadrlar: {frameCount}</span>
          {fps > 0 && <span>FPS: {fps}</span>}
          <span className="ml-auto text-slate-600">Hər 2 saniyədən bir yenilənir</span>
        </>
      )}
    </div>
  )
}
