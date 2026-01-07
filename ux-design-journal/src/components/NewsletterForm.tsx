import type { FormEvent } from 'react'
import { useState } from 'react'
import { subscribe } from '../api/public'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setMessage('')
    try {
      const res = await subscribe(email)
      setStatus(res.success ? 'success' : 'error')
      setMessage(res.message || (res.success ? 'Subscribed.' : 'Something went wrong.'))
      if (res.success) setEmail('')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage('Could not subscribe right now.')
    }
  }

  return (
    <section className="newsletter" aria-label="Newsletter signup">
      <h3>Sign up for the UX Design Journal Brief</h3>
      <p>A weekly editorial for designers who already know the basics.</p>
      <form onSubmit={onSubmit} aria-live="polite">
        <input
          type="email"
          placeholder="your email address"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {message && <div className={`form-note ${status}`}>{message}</div>}
    </section>
  )
}

