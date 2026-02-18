import type { ReactNode } from 'react'
import { UtilityBar } from './UtilityBar'
import { Masthead } from './Masthead'
import { PrimaryNav } from './PrimaryNav'
import type { Category } from '../types'
import { Footer } from './Footer'
import { LeadCaptureModal } from './LeadCaptureModal'
import { useLeadCapturePopup } from '../hooks/useLeadCapturePopup'

interface Props {
  categories: Category[]
  children: ReactNode
}

export function Layout({ categories, children }: Props) {
  const { config, showModal, handleClose, handleSuccess } = useLeadCapturePopup()

  return (
    <div className="page">
      <UtilityBar />
      <Masthead />
      <PrimaryNav categories={categories} />
      <main>
        {children}
      </main>
      <Footer categories={categories} />
      
      {/* Lead Capture Popup */}
      {showModal && config && (
        <LeadCaptureModal
          config={config}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

