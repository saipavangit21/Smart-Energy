// hooks/usePrices.js
// Fetches real electricity prices from our proxy backend
// Auto-refreshes every 15 minutes (prices update on the hour)

import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
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
      const res = await fetch(`${API_BASE}/prices/today`)
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
      const res = await fetch(`${API_BASE}/current`)
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
    // Refresh current price every 60 seconds for the live ticker
    const interval = setInterval(fetchCurrent, 60000)
    return () => clearInterval(interval)
  }, [fetchCurrent])

  return { current, loading }
}

export function useCheapestHours(n = 5) {
  const [cheapest, setCheapest] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/cheapest?hours=${n}`)
      .then(r => r.json())
      .then(json => { if (json.success) setCheapest(json.cheapest_hours) })
      .catch(console.error)
  }, [n])

  return cheapest
}
