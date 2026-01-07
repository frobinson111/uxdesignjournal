import { useEffect, useRef, useState } from 'react'
import { sessionHeartbeat } from '../api/public'

const SESSION_KEY = 'uxdj_gate_dismissed'
const IDENTIFIED_KEY = 'uxdj_identifiedEmail'

export function useEngagedTimer(thresholdSeconds = 360) {
  const [engaged, setEngaged] = useState(0)
  const [open, setOpen] = useState(false)
  const lastActiveRef = useRef(Date.now())
  const heartbeatRef = useRef<number | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem(IDENTIFIED_KEY)) {
      return
    }

    const updateActivity = () => { lastActiveRef.current = Date.now() }
    const interval = setInterval(() => {
      const now = Date.now()
      const isVisible = document.visibilityState === 'visible'
      if (isVisible && now - lastActiveRef.current < 15000) {
        setEngaged((v) => v + 1)
      }
    }, 1000)

    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('scroll', updateActivity, { passive: true })
    window.addEventListener('keydown', updateActivity)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('scroll', updateActivity)
      window.removeEventListener('keydown', updateActivity)
    }
  }, [])

  useEffect(() => {
    if (engaged >= thresholdSeconds && !open && !sessionStorage.getItem(SESSION_KEY) && !sessionStorage.getItem(IDENTIFIED_KEY)) {
      setOpen(true)
    }
  }, [engaged, open, thresholdSeconds])

  useEffect(() => {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
    heartbeatRef.current = window.setInterval(() => {
      if (engaged > 0) {
        sessionHeartbeat(engaged).catch((err) => console.warn('heartbeat failed', err))
      }
    }, 30000)
    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
    }
  }, [engaged])

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, 'true')
    setOpen(false)
  }

  const markIdentified = () => {
    sessionStorage.setItem(IDENTIFIED_KEY, 'true')
    setOpen(false)
  }

  return { engaged, open, dismiss, markIdentified }
}

