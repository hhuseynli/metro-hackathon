import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useCameras() {
  const [cameras, setCameras] = useState({})

  useEffect(() => {
    fetch(`${API_BASE}/api/cameras`)
      .then(r => r.json())
      .then(setCameras)
      .catch(() => {})
  }, [])

  return cameras
}

export function useAnalysis() {
  const [folder, setFolder]       = useState('')
  const [filename, setFilename]   = useState('')
  const [framePct, setFramePct]   = useState(0.5)
  const [seconds, setSeconds]     = useState(30)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [personCount, setPersonCount] = useState(null)
  const [job, setJob]             = useState(null)   // {job_id, status, total_in, total_out, video_url}
  const [loading, setLoading]     = useState(false)
  const pollRef                   = useRef(null)

  const preview = async () => {
    if (!folder || !filename) return
    setLoading(true)
    setPreviewUrl(null)
    setPersonCount(null)
    try {
      const res = await fetch(`${API_BASE}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, frame_pct: framePct }),
      })
      if (!res.ok) throw new Error(await res.text())
      setPersonCount(res.headers.get('X-Person-Count'))
      const blob = await res.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      console.error('Preview failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const startTracking = async () => {
    if (!folder || !filename) return
    setLoading(true)
    setJob(null)
    clearInterval(pollRef.current)
    try {
      const res = await fetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename, seconds }),
      })
      const { job_id } = await res.json()
      setJob({ job_id, status: 'queued', total_in: 0, total_out: 0 })

      pollRef.current = setInterval(async () => {
        const r = await fetch(`${API_BASE}/api/track/${job_id}`)
        const data = await r.json()
        setJob({ job_id, ...data })
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(pollRef.current)
          setLoading(false)
        }
      }, 1500)
    } catch (e) {
      console.error('Track failed:', e)
      setLoading(false)
    }
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  return {
    folder, setFolder, filename, setFilename,
    framePct, setFramePct, seconds, setSeconds,
    previewUrl, personCount,
    job, loading,
    preview, startTracking,
  }
}
