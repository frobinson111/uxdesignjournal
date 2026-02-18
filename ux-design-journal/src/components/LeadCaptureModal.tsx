import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './LeadCaptureModal.css'

interface PopupConfig {
  id: string
  title: string
  description: string
  imageUrl: string
  imageCaption: string
  pdfTitle: string
  buttonText: string
  delaySeconds: number
}

interface Props {
  config: PopupConfig
  onClose: () => void
  onSuccess: (downloadUrl: string, pdfTitle: string) => void
}

export function LeadCaptureModal({ config, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (dialogRef.current) {
      const previouslyFocused = document.activeElement as HTMLElement | null
      dialogRef.current.focus()
      return () => {
        previouslyFocused?.focus?.()
      }
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('input,button,a[href]')
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || status === 'loading') return
    
    setStatus('loading')
    setErrorMessage('')
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || ''
      const res = await fetch(`${API_BASE}/api/public/popup/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, popupId: config.id }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit')
      }
      
      setStatus('success')
      sessionStorage.setItem('uxdj_popup_submitted', 'true')
      onSuccess(data.downloadUrl, data.pdfTitle)
      
      // Close after showing success briefly
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Popup submission error:', err)
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="lead-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lead-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        
        {config.imageUrl && (
          <div className="lead-modal-image">
            <img src={config.imageUrl} alt={config.imageCaption || config.title} />
            {config.imageCaption && <p className="lead-modal-caption">{config.imageCaption}</p>}
          </div>
        )}
        
        <div className="lead-modal-content">
          <h2 id="lead-modal-title">{config.title}</h2>
          {config.description && <p className="lead-modal-description">{config.description}</p>}
          
          {status === 'success' ? (
            <div className="lead-modal-success">
              <p>✓ Success! Check your email for the download link.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="lead-modal-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
                aria-label="Email address"
              />
              <button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : config.buttonText}
              </button>
            </form>
          )}
          
          {status === 'error' && errorMessage && (
            <div className="lead-modal-error">{errorMessage}</div>
          )}
          
          <p className="lead-modal-privacy">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
