// hooks/usePrices.js
// Fetches real electricity prices from our proxy backend
// Auto-refreshes every 15 minutes (prices update on the hour)

import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://smart-energy-production-aef3.up.railway.app/api'
const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

export function usePrices() {
  const [prices, setPrices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [source, setSource] = useState(null)

  const fetchPrices = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`${API_BASE}/prices/today`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Unknown error from API')

      setPrices(json.data)
      setStats(json.stats)
      setSource(json.source)
      setLastFetched(new Date())
    } catch (err) {
      setError(err.message)
      console.error('Price fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchPrices])

  return { prices, stats, loading, error, lastFetched, source, refetch: fetchPrices }
}

export function useCurrentPrice() {
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/current`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setCurrent(json.current)
    } catch (err) {
      console.error('Current price error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrent()
    // Price only changes on the hour, so 60s was 60x more frequent than needed —
    // 5 min still feels live and catches the hourly change with low latency
    const interval = setInterval(fetchCurrent, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchCurrent])

  return { current, loading }
}

export function useCheapestHours(n = 5) {
  const [cheapest, setCheapest] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/cheapest?hours=${n}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setCheapest(json.cheapest_hours) })
      .catch(console.error)
  }, [n])

  return cheapest
}
