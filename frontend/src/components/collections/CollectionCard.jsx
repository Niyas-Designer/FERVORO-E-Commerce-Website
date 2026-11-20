import { useEffect, useRef, useState } from 'react'
import { COLLECTIONS_COPY } from '../../data/collections'
import Link from '../../router/Link'

/**
 * One slide: full-bleed photograph, a soft dark gradient at the base and a three-level text block lower-left
 * (small uppercase label · serif category heading · underlined Shop Now).
 *
 * Shop Now is the card's ONLY interactive element; a stretched ::after makes the whole card its hit area, so there is
 * never a link inside a link/button. Without `href` (category page not built yet) it is a button that only shows
 * `previewMessage` in a live region; with `href` it is a normal link.
 */
export default function CollectionCard({ item, index, total }) {
  const { image, title, href } = item
  const { cardLabel, cta, previewMessage } = COLLECTIONS_COPY
  const [note, setNote] = useState('')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const showPreview = () => {
    setNote(previewMessage)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNote(''), 4000)
  }

  // Keyboard/screen-reader focus on a partly hidden card brings the whole card into view (horizontal only).
  const revealCard = (e) => {
    const li = e.currentTarget.closest('li')
    const track = li?.parentElement
    if (!li || !track) return
    const c = li.getBoundingClientRect()
    const t = track.getBoundingClientRect()
    const dx = c.left < t.left ? c.left - t.left : c.right > t.right ? c.right - t.right : 0
    if (dx) track.scrollBy({ left: dx, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const headingId = `collection-${item.id}-title`
  const noteId = `collection-${item.id}-note`
  const ctaLabel = `${cta}: ${title}` // visible text "Shop Now" + which category, for screen readers
  return (
    <li className="fervoro-collections-card" role="group" aria-roledescription="slide" aria-label={`${title}, ${index + 1} of ${total}`}>
      <div className="fervoro-collections-link">
        <img
          className="fervoro-collections-img"
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 1024px) min(30vw, 720px), (min-width: 640px) 43vw, 87vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span className="fervoro-collections-shade" aria-hidden="true" />

        <p className="fervoro-collections-label">{cardLabel}</p>
        <h3 id={headingId} className="fervoro-collections-card-title">
          {title}
        </h3>
        {href ? (
          <Link className="fervoro-collections-cta" href={href} aria-label={ctaLabel} onFocus={revealCard}>
            {cta}
          </Link>
        ) : (
          <>
            <button type="button" className="fervoro-collections-cta" onClick={showPreview} onFocus={revealCard} aria-label={ctaLabel} aria-describedby={noteId}>
              {cta}
            </button>
            <p id={noteId} role="status" aria-live="polite" className="fervoro-collections-note">
              {note}
            </p>
          </>
        )}
      </div>
    </li>
  )
}
