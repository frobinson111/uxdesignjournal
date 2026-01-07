import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { identifySession } from '../api/public'

interface Props {
  open: boolean
  onClose: () => void
  onIdentified: () => void
}

export function EmailGateModal({ open, onClose, onIdentified }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open && dialogRef.current) {
      const previouslyFocused = document.activeElement as HTMLElement | null
      dialogRef.current.focus()
      return () => {
        previouslyFocused?.focus?.()
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      await identifySession(email)
      sessionStorage.setItem('uxdj_identifiedEmail', email)
      setStatus('idle')
      onIdentified()
      onClose()
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        aria-describedby="gate-desc"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="gate-title">Subscribe to continue reading</h3>
        <p id="gate-desc">Enter your email to continue.</p>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address"
          />
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Continuing…' : 'Continue'}
          </button>
        </form>
        {status === 'error' && <div className="form-note error">Could not save your email. Please try again.</div>}
        <button className="text-btn" onClick={onClose}>Already subscribed? Enter email</button>
      </div>
    </div>
  )
}

