import { useState } from 'react'

const LC = { red: '#EF4444', green: '#10B981', purple: '#A855F7', yellow: '#6EE7B7' }
const LL = { red: 'Qırmızı Xətt', green: 'Yaşıl Xətt', purple: 'Bənövşəyi Xətt', yellow: 'Xətai Xətti' }

const PAX = {
  icherisheher:  { avg: 261, max: 1696 },
  sahil:         { avg: 396, max: 2295 },
  '28may':       { avg: 686, max: 3286 },
  ganjlik:       { avg: 594, max: 5076 },
  nariman:       { avg: 597, max: 3391 },
  ulduz:         { avg: 110, max: 930  },
  bakmil:        { avg: 22,  max: 679  },
  koroghlu:      { avg: 744, max: 2891 },
  qaraQarayev:   { avg: 315, max: 1281 },
  neftchilar:    { avg: 479, max: 2116 },
  khalglar:      { avg: 364, max: 2013 },
  akhmedli:      { avg: 422, max: 2582 },
  haziAslanov:   { avg: 237, max: 1319 },
  darnagul:      { avg: 44,  max: 337  },
  azadlig:       { avg: 283, max: 1300 },
  nasimi:        { avg: 128, max: 671  },
  memarAjami:    { avg: 347, max: 1371 },
  '20yanvar':    { avg: 662, max: 2362 },
  inshaatchilar: { avg: 407, max: 1711 },
  elmlar:        { avg: 504, max: 3845 },
  nizami:        { avg: 255, max: 1428 },
  khocasen:      { avg: 39,  max: 310  },
  avtovaghzal:   { avg: 163, max: 1004 },
  memarAjami2:   { avg: 17,  max: 117  },
  '8noyabr':     { avg: 58,  max: 604  },
  khatai:        { avg: 178, max: 1625 },
}

// lDir: l=left r=right t=top b=bottom tl=top-left tr=top-right
const ST = [
  // ── Red line (U-shape: İçərişəhər → … → Həzi Aslanov) ──────────────────
  { id: 'icherisheher',   apiId: 'icherisheher',        name: 'İçərişəhər',          short: 'İçərişəhər',   x:  88, y: 510, lines: ['red'],                  lDir: 'l'  },
  { id: 'sahil',          apiId: 'sahil',               name: 'Sahil',               short: 'Sahil',        x: 155, y: 445, lines: ['red'],                  lDir: 'l'  },
  { id: '28may',          apiId: '28-may',              name: '28 May / Cəfər Cabbarlı', short: '28 May',   x: 228, y: 368, lines: ['red','green','yellow'], lDir: 'tl' },
  { id: 'ganjlik',        apiId: 'ganjlik',             name: 'Gənclik',             short: 'Gənclik',      x: 298, y: 292, lines: ['red','green'],          lDir: 'r'  },
  { id: 'nariman',        apiId: 'nariman-narimanov',   name: 'Nəriman Nərimanov',   short: 'N.Nərimanov',  x: 378, y: 225, lines: ['red'],                  lDir: 'r'  },
  { id: 'ulduz',          apiId: 'ulduz',               name: 'Ulduz',               short: 'Ulduz',        x: 450, y: 172, lines: ['red'],                  lDir: 'r'  },
  { id: 'bakmil',         apiId: 'bakmil',              name: 'Bakmil',              short: 'Bakmil',       x: 415, y: 100, lines: ['red'],                  lDir: 'l'  },
  { id: 'koroghlu',       apiId: 'koroghlu',            name: 'Koroğlu',             short: 'Koroğlu',      x: 552, y: 150, lines: ['red'],                  lDir: 't'  },
  { id: 'qaraQarayev',    apiId: 'gara-garayev',        name: 'Qara Qarayev',        short: 'Q.Qarayev',    x: 648, y: 178, lines: ['red'],                  lDir: 'r'  },
  { id: 'neftchilar',     apiId: 'neftchilar',          name: 'Neftçilər',           short: 'Neftçilər',    x: 712, y: 258, lines: ['red'],                  lDir: 'r'  },
  { id: 'khalglar',       apiId: 'khalglar-dostlughu',  name: 'Xalqlar Dostluğu',   short: 'Xalqlar D.',   x: 742, y: 345, lines: ['red'],                  lDir: 'r'  },
  { id: 'akhmedli',       apiId: 'akhmedli',            name: 'Əhmədli',             short: 'Əhmədli',      x: 730, y: 422, lines: ['red'],                  lDir: 'r'  },
  { id: 'haziAslanov',    apiId: 'hazi-aslanov',        name: 'Həzi Aslanov',        short: 'H.Aslanov',    x: 718, y: 510, lines: ['red'],                  lDir: 'r'  },
  // ── Green line (Dərnəgül → Gənclik) ────────────────────────────────────
  { id: 'darnagul',       apiId: 'darnagul',            name: 'Dərnəgül',            short: 'Dərnəgül',     x: 468, y:  62, lines: ['green'],                lDir: 'r'  },
  { id: 'azadlig',        apiId: 'azadlig-prospekti',   name: 'Azadlıq Prospekti',   short: 'Azadlıq Pr.',  x: 318, y:  62, lines: ['green'],                lDir: 't'  },
  { id: 'nasimi',         apiId: 'nasimi',              name: 'Nəsimi',              short: 'Nəsimi',       x: 218, y:  95, lines: ['green'],                lDir: 'l'  },
  { id: 'memarAjami',     apiId: 'memar-ajami',         name: 'Memar Əcəmi',         short: 'M.Əcəmi',      x: 155, y: 165, lines: ['green'],                lDir: 'l'  },
  { id: '20yanvar',       apiId: '20-yanvar',           name: '20 Yanvar',           short: '20 Yanvar',    x: 130, y: 238, lines: ['green'],                lDir: 'l'  },
  { id: 'inshaatchilar',  apiId: 'inshaatchilar',       name: 'İnşaatçılar',         short: 'İnşaatçılar', x: 132, y: 320, lines: ['green'],                lDir: 'l'  },
  { id: 'elmlar',         apiId: 'elmlar-akademiyasi',  name: 'Elmlər Akademiyası',  short: 'Elmlər Ak.',   x: 172, y: 412, lines: ['green'],                lDir: 'l'  },
  { id: 'nizami',         apiId: 'nizami',              name: 'Nizami',              short: 'Nizami',       x: 205, y: 375, lines: ['green'],                lDir: 'l'  },
  // ── Purple line (Xocəsən → 8 Noyabr) ──────────────────────────────────
  { id: 'khocasen',       apiId: 'khocasen',            name: 'Xocəsən',             short: 'Xocəsən',      x:  48, y: 148, lines: ['purple'],               lDir: 'l'  },
  { id: 'avtovaghzal',    apiId: 'avtovaghzal',         name: 'Avtovağzal',          short: 'Avtovağzal',   x:  92, y: 198, lines: ['purple'],               lDir: 'l'  },
  { id: 'memarAjami2',    apiId: 'memar-ajami-2',       name: 'Memar Əcəmi 2',       short: 'M.Əcəmi 2',    x: 138, y: 248, lines: ['purple'],               lDir: 'r'  },
  { id: '8noyabr',        apiId: '8-noyabr',            name: '8 Noyabr',            short: '8 Noyabr',     x: 175, y: 292, lines: ['purple'],               lDir: 'r'  },
  // ── Yellow branch (28 May → Xətai) ─────────────────────────────────────
  { id: 'khatai',         apiId: 'khatai',              name: 'Xətai',               short: 'Xətai',        x: 330, y: 378, lines: ['yellow'],               lDir: 'b'  },
]

const SEGMENTS = [
  { line: 'red',    ids: ['icherisheher','sahil','28may','ganjlik','nariman','ulduz','koroghlu','qaraQarayev','neftchilar','khalglar','akhmedli','haziAslanov'] },
  { line: 'red',    ids: ['ulduz','bakmil'] },
  { line: 'green',  ids: ['darnagul','azadlig','nasimi','memarAjami','20yanvar','inshaatchilar','elmlar','nizami','28may','ganjlik'] },
  { line: 'purple', ids: ['khocasen','avtovaghzal','memarAjami2','8noyabr'] },
  { line: 'yellow', ids: ['28may','khatai'] },
]

function buildPath(ids, byId) {
  const pts = ids.map(id => byId[id]).filter(Boolean)
  if (pts.length < 2) return ''
  return 'M ' + pts.map(s => `${s.x},${s.y}`).join(' L ')
}

function labelProps(dir, x, y, off = 13) {
  if (dir === 'l')  return { x: x - off, y, textAnchor: 'end',    dominantBaseline: 'middle'  }
  if (dir === 'r')  return { x: x + off, y, textAnchor: 'start',  dominantBaseline: 'middle'  }
  if (dir === 't')  return { x, y: y - off, textAnchor: 'middle', dominantBaseline: 'auto'    }
  if (dir === 'b')  return { x, y: y + off, textAnchor: 'middle', dominantBaseline: 'hanging' }
  if (dir === 'tl') return { x: x - off * 0.7, y: y - off * 0.7, textAnchor: 'end',   dominantBaseline: 'auto' }
  if (dir === 'tr') return { x: x + off * 0.7, y: y - off * 0.7, textAnchor: 'start', dominantBaseline: 'auto' }
  return { x: x + off, y, textAnchor: 'start', dominantBaseline: 'middle' }
}

function loadColor(avg) {
  const pct = avg / 750
  if (pct > 0.65) return '#EF4444'
  if (pct > 0.35) return '#F59E0B'
  return '#10B981'
}

function MapSvgContent({ byId, selected, toggle }) {
  return (
    <>
      <line
        x1={byId.memarAjami.x}  y1={byId.memarAjami.y}
        x2={byId.memarAjami2.x} y2={byId.memarAjami2.y}
        stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3"
      />
      {SEGMENTS.map((seg, i) => (
        <path
          key={i}
          d={buildPath(seg.ids, byId)}
          fill="none"
          stroke={LC[seg.line]}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {ST.map(s => {
        const isTransfer = s.lines.length > 1
        const isSel      = selected === s.id
        const r          = isSel ? 11 : isTransfer ? 9 : 6
        const dotColor   = isTransfer ? '#fff' : LC[s.lines[0]]
        const stroke     = isTransfer ? '#1e293b' : LC[s.lines[0]]
        const lp         = labelProps(s.lDir, s.x, s.y)
        return (
          <g key={s.id} onClick={() => toggle(s.id)} className="cursor-pointer">
            <circle cx={s.x} cy={s.y} r={18} fill="transparent" />
            {isSel && (
              <circle cx={s.x} cy={s.y} r={r + 5}
                fill="none" stroke={LC[s.lines[0]]} strokeWidth={2} opacity={0.35} />
            )}
            <circle cx={s.x} cy={s.y} r={r} fill={dotColor} stroke={stroke} strokeWidth={isTransfer ? 2.5 : 1.8} />
            {isTransfer && s.lines.map((ln, li) => (
              <circle key={ln} cx={s.x + (li - (s.lines.length - 1) / 2) * 4.5} cy={s.y} r={2.5} fill={LC[ln]} />
            ))}
            <text
              {...lp}
              fontSize={isSel ? 10 : 9}
              fontWeight={isSel ? 700 : 500}
              fill={isSel ? LC[s.lines[0]] : '#374151'}
              className="select-none pointer-events-none"
            >
              {s.short}
            </text>
          </g>
        )
      })}
    </>
  )
}

export default function MetroMap({ onSelect, fullscreen = false }) {
  const [selected, setSelected] = useState(null)
  const byId = Object.fromEntries(ST.map(s => [s.id, s]))

  const toggle = id => {
    setSelected(prev => {
      const next = prev === id ? null : id
      if (onSelect) {
        if (next) {
          const s = byId[next]
          onSelect({ id: s.id, apiId: s.apiId, name: s.name, lines: s.lines })
        } else {
          onSelect(null)
        }
      }
      return next
    })
  }

  const sel = selected ? byId[selected] : null
  const pax = selected ? PAX[selected] : null

  if (fullscreen) {
    return (
      <div className="relative w-full h-full bg-white">
        {/* Floating legend */}
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-100 flex flex-wrap gap-3 shadow-sm">
          {Object.entries(LC).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[9px] font-semibold text-slate-500 hidden sm:block">{LL[k]}</span>
            </div>
          ))}
        </div>
        <p className="absolute top-3 left-3 z-10 text-[10px] text-slate-400 bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm">
          Stansiyaya klikləyin
        </p>
        <div className="w-full h-full overflow-auto">
          <svg
            viewBox="0 0 800 560"
            className="w-full"
            style={{ height: '100%', minWidth: '560px', minHeight: '300px' }}
          >
            <MapSvgContent byId={byId} selected={selected} toggle={toggle} />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="px-6 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Metro Xəritəsi</h2>
          <p className="text-xs text-slate-400 mt-0.5">Stansiyaya klikləyin</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(LC).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-6 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] font-semibold text-slate-500">{LL[k]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 800 560" className="w-full min-w-[560px]" style={{ height: 310 }}>
          <MapSvgContent byId={byId} selected={selected} toggle={toggle} />
        </svg>
      </div>

      <div className={`border-t border-slate-100 overflow-hidden transition-all duration-300 ${sel ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
        {sel && pax && (
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base font-black text-slate-900">{sel.name}</h3>
                {sel.lines.map(l => (
                  <span key={l} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: LC[l] }}>
                    {LL[l]}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">Tarixi məlumat əsasında · 15 dəq. ortalama</p>
            </div>
            <div className="flex gap-8 shrink-0 items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5">Ortalama</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: loadColor(pax.avg) }}>
                  {pax.avg.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">15 dəq / giriş</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5">Pik</p>
                <p className="text-2xl font-black tabular-nums text-slate-800">{pax.max.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">maksimum</p>
              </div>
              <div className="min-w-[110px]">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Yük</p>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min((pax.avg / 750) * 100, 100)}%`,
                    backgroundColor: loadColor(pax.avg),
                  }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Zirvənin {Math.round((pax.avg / 750) * 100)}%-i
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
