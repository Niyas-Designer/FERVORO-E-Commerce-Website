import { useCallback, useEffect, useRef, useState } from 'react'
import { COLLECTIONS, COLLECTIONS_COPY } from '../../data/collections'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import CollectionCard from './CollectionCard'

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d={dir === 'prev' ? 'M10 2.5 4.5 8 10 13.5' : 'M6 2.5 11.5 8 6 13.5'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Horizontal collection slider: heading + previous/next on top, full-bleed scroll-snap track below.
 * Swipe/scroll works natively; the arrows move one card at a time. The next card peeks in so it reads as scrollable.
 */
export default function CollectionSlider() {
  const trackRef = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [edge, setEdge] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const t = trackRef.current
    if (!t) return
    const start = t.scrollLeft <= 1
    const end = t.scrollLeft + t.clientWidth >= t.scrollWidth - 1
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }))
  }, [])

  useEffect(() => {
    const t = trackRef.current
    if (!t || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update) // also fires once on observe → initial state
    ro.observe(t)
    return () => ro.disconnect()
  }, [update])

  const move = (dir) => {
    const t = trackRef.current
    if (!t) return
    const c = t.children
    const step = c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : t.clientWidth
    const base = Math.round(t.scrollLeft / step) * step
    t.scrollTo({ left: Math.max(0, base + dir * step), behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <section className="fervoro-collections" aria-roledescription="carousel" aria-labelledby="fervoro-collections-title">
      <div className="fervoro-collections-head">
        <h2 id="fervoro-collections-title" className="fervoro-collections-title">
          {COLLECTIONS_COPY.title}
        </h2>
        <p className="fervoro-collections-desc">{COLLECTIONS_COPY.description}</p>
        <div className="fervoro-collections-nav">
          <button type="button" aria-label="Previous collections" aria-disabled={edge.start} onClick={() => !edge.start && move(-1)}>
            <Arrow dir="prev" />
          </button>
          <button type="button" aria-label="Next collections" aria-disabled={edge.end} onClick={() => !edge.end && move(1)}>
            <Arrow dir="next" />
          </button>
        </div>
      </div>
      <ul ref={trackRef} className="fervoro-collections-track" aria-label="Collections" onScroll={update}>
        {COLLECTIONS.map((item, i) => (
          <CollectionCard key={item.id} item={item} index={i} total={COLLECTIONS.length} />
        ))}
      </ul>
    </section>
  )
}
