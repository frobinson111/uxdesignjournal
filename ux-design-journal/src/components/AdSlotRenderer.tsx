import DOMPurify from 'dompurify'
import type { AdSlot } from '../types'

interface Props {
  slot: AdSlot
  placement?: 'inline' | 'sidebar'
  label?: string
}

export function AdSlotRenderer({ slot, placement = 'inline', label }: Props) {
  if (slot.type === 'IMAGE_LINK' && slot.imageUrl && slot.href) {
    return (
      <aside className={`ad-slot ${placement}`} aria-label={slot.label || label || 'Advertisement'}>
        <a href={slot.href} target="_blank" rel="noreferrer">
          <img src={slot.imageUrl} alt={slot.alt || 'Advertisement'} />
        </a>
      </aside>
    )
  }

  if (slot.type === 'EMBED_SNIPPET' && slot.html) {
    const safe = DOMPurify.sanitize(slot.html, { ADD_ATTR: ['target', 'rel'] })
    return (
      <aside className={`ad-slot ${placement}`} aria-label={slot.label || label || 'Advertisement'}>
        <div dangerouslySetInnerHTML={{ __html: safe }} />
      </aside>
    )
  }

  return null
}

