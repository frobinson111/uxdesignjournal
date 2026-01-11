import DOMPurify from 'dompurify'
import type { AdSlot } from '../types'

interface Props {
  slot: AdSlot
  placement?: 'inline' | 'sidebar'
  label?: string
  size?: '300x600' | string
  isSticky?: boolean
}

export function AdSlotRenderer({ slot, placement = 'inline', label, size, isSticky = false }: Props) {
  const sizeClass = size ? ` responsive-${size}` : ''
  const stickyClass = isSticky && placement === 'sidebar' ? ' sticky' : ''

  if (slot.type === 'IMAGE_LINK' && slot.imageUrl && slot.href) {
    return (
      <aside
        className={`ad-slot ${placement}${sizeClass}${stickyClass}`}
        aria-label={slot.label || label || 'Advertisement'}
      >
        <a href={slot.href} target="_blank" rel="noreferrer">
          <img src={slot.imageUrl} alt={slot.alt || 'Advertisement'} />
        </a>
      </aside>
    )
  }

  if (slot.type === 'EMBED_SNIPPET' && slot.html) {
    const safe = DOMPurify.sanitize(slot.html, { ADD_ATTR: ['target', 'rel'] })
    return (
      <aside
        className={`ad-slot ${placement}${sizeClass}${stickyClass}`}
        aria-label={slot.label || label || 'Advertisement'}
      >
        <div dangerouslySetInnerHTML={{ __html: safe }} />
      </aside>
    )
  }

  return null
}

