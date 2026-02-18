import { useEffect, useState } from 'react'

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

export function useLeadCapturePopup() {
  const [config, setConfig] = useState<PopupConfig | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Check if user already submitted (this session)
    const hasSubmitted = sessionStorage.getItem('uxdj_popup_submitted')
    if (hasSubmitted) return

    // Check if popup was already dismissed today
    const dismissedDate = localStorage.getItem('uxdj_popup_dismissed')
    if (dismissedDate) {
      const today = new Date().toDateString()
      if (dismissedDate === today) return
    }

    // Fetch active popup config
    const fetchPopupConfig = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || ''
        const res = await fetch(`${API_BASE}/api/public/popup/active`)
        const data = await res.json()
        
        if (data.popup) {
          setConfig(data.popup)
          
          // Show popup after delay
          const delay = (data.popup.delaySeconds || 10) * 1000
          const timer = setTimeout(() => {
            setShowModal(true)
          }, delay)
          
          return () => clearTimeout(timer)
        }
      } catch (err) {
        console.error('Failed to fetch popup config:', err)
      }
    }

    fetchPopupConfig()
  }, [])

  const handleClose = () => {
    setShowModal(false)
    // Remember dismissal for today
    localStorage.setItem('uxdj_popup_dismissed', new Date().toDateString())
  }

  const handleSuccess = (downloadUrl: string, pdfTitle: string) => {
    // Could trigger download or show success message
    console.log('Download ready:', pdfTitle, downloadUrl)
    // In a real implementation, you might:
    // - Open the PDF in a new tab
    // - Show a persistent success notification
    // - Track conversion analytics
  }

  return {
    config,
    showModal,
    handleClose,
    handleSuccess,
  }
}
