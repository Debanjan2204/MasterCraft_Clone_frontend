import { useLoading } from '../context/LoadingContext'
import { useCallback } from 'react'

/**
 * Returns a wrapper that shows the global loader for the duration of any async call.
 *
 * Usage:
 *   const api = useApi()
 *   const data = await api(getTickets, params)
 */
export function useApi() {
  const { startLoading, stopLoading } = useLoading()

  return useCallback(async (fn, ...args) => {
    startLoading()
    try {
      return await fn(...args)
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])
}