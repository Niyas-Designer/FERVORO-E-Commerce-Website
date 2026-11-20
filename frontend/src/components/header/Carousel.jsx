import { useRef } from 'react'

const DRAG_THRESHOLD = 5 // px of movement before a mouse press counts as a drag

/**
 * Horizontal card carousel.
 *  • Touch / pen: 100% native scrolling (overflow-x + CSS scroll-snap). No JS touch handlers.
 *  • Mouse: native scrolling has no drag gesture, so click-and-drag scrolling is added here
 *    (mouse pointers only), with snap-to-nearest-card on release and click suppression after a drag.
 *  • Trackpads / shift+wheel keep working natively.
 */
export default function Carousel({ label, children }) {
  const ref = useRef(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth) return

    const start = { x: e.clientX, left: el.scrollLeft, moved: false }

    const onMove = (ev) => {
      const dx = ev.clientX - start.x
      if (!start.moved && Math.abs(dx) > DRAG_THRESHOLD) {
        start.moved = true
        el.classList.add('is-dragging') // disables snapping while dragging
      }
      if (start.moved) el.scrollLeft = start.left - dx
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (!start.moved) return

      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0
      const max = el.scrollWidth - el.clientWidth
      // Snap points are clamped to the scroll limit, so the final card is reachable (as with native snapping).
      const offsets = [...el.children].filter((c) => c.tagName === 'LI').map((c) => Math.min(c.offsetLeft - pad, max))
      const target = offsets.reduce((best, o) => (Math.abs(o - el.scrollLeft) < Math.abs(best - el.scrollLeft) ? o : best), 0)
      el.classList.remove('is-dragging')
      el.scrollTo({ left: target, behavior: 'smooth' })

      suppressClick.current = true // the click that follows a drag must not open a card
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const onClickCapture = (e) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <ul
      ref={ref}
      className="fervoro-carousel"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </ul>
  )
}
