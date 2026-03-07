import { useEffect } from 'react'
import './ErrorToast.css'

/**
 * ErrorToast — displays a ProblemDetail error message.
 *
 * Props:
 *   message  {string}    — the error string to display
 *   onClose  {function}  — called to dismiss
 *   duration {number}    — auto-dismiss ms (default 6000, pass 0 to disable)
 */
export default function ErrorToast({ message, onClose, duration = 6000 }) {
  useEffect(() => {
    if (!duration || !message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div className="error-toast fade-in" role="alert">
      <div className="error-toast__icon">✕</div>
      <div className="error-toast__body">
        <span className="error-toast__title">Error</span>
        <span className="error-toast__msg">{message}</span>
      </div>
      <button className="error-toast__close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  )
}