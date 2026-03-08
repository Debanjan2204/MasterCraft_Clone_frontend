import { createContext, useContext, useState, useCallback } from 'react'

const LoadingContext = createContext(null)

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0) // reference-counted so nested calls work

  const startLoading = useCallback(() => setCount(c => c + 1), [])
  const stopLoading  = useCallback(() => setCount(c => Math.max(0, c - 1)), [])

  return (
    <LoadingContext.Provider value={{ isLoading: count > 0, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export const useLoading = () => useContext(LoadingContext)