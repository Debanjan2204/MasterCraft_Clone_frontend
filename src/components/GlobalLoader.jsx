import { useLoading } from '../context/LoadingContext'
import './GlobalLoader.css'

export default function GlobalLoader() {
  const { isLoading } = useLoading()
  if (!isLoading) return null

  return (
    <div className="global-loader" aria-label="Loading" role="status">
      <div className="global-loader__backdrop" />
      <div className="global-loader__spinner">
        <div className="gl-ring" />
        <span className="gl-text">Loading…</span>
      </div>
    </div>
  )
}