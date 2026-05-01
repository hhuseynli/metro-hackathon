import { useState, useEffect } from 'react'

const API_BASE = ''  // proxied through Vite → http://localhost:8000

export function useMetroData(intervalMs = 2000) {
  const [zones, setZones] = useState({ zones: {}, frame_count: 0, mode: 'connecting', fps: 0 })
  const [nudge, setNudge] = useState({ active: false })
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true

    const fetchAll = async () => {
      try {
        const [zRes, nRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/api/zones`),
          fetch(`${API_BASE}/api/nudge`),
          fetch(`${API_BASE}/api/stats`),
        ])
        if (!alive) return
        const [z, n, s] = await Promise.all([zRes.json(), nRes.json(), sRes.json()])
        setZones(z)
        setNudge(n)
        setStats(s)
        setError(null)
      } catch (e) {
        if (alive) setError('Backend ilə əlaqə yoxdur — uvicorn :8000 portunda işləyirmi?')
      }
    }

    fetchAll()
    const id = setInterval(fetchAll, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [intervalMs])

  return { zones, nudge, stats, error }
}
