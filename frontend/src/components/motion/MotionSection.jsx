import { useCallback, useEffect, useRef, useState } from 'react'
import { MOTION_CLIPS } from '../../data/motion'
import { usePageVisible } from '../../hooks/useInView'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSaveData } from '../../hooks/useSaveData'
import GalleryPanel from './GalleryPanel'

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
    <path d={dir === 'prev' ? 'M10 2.5 4.5 8 10 13.5' : 'M6 2.5 11.5 8 6 13.5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Homepage video gallery: one continuous, edge-to-edge strip of 9:16 clips with no gaps, no text and no visible controls.
 * Desktop shows five panels, tablet three, phones one and a bit; the rest is reached by scrolling / swiping. Left / right
 * arrows are overlaid on the videos and appear only while hovering (or keyboard-focusing) the gallery on desktop.
 * All clips are local (public/videos-web). Visitors who prefer reduced motion or less data get still posters until they
 * tap a panel; a pause / play-all button is available to keyboard and screen-reader users (visible only on focus).
 */
export default function MotionSection() {
  const trackRef = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const saveData = useSaveData()
  const pageVisible = usePageVisible()
  const phone = !useMediaQuery('(min-width: 640px)')
  const defaultPaused = reduceMotion || saveData
  const [all, setAll] = useState(null) // null = follow the visitor's settings
  const [choice, setChoice] = useState({}) // per clip: true = paused, false = playing (a tap on that panel)
  const [edge, setEdge] = useState({ prev: false, next: true })

  const measure = useCallback(() => {
    const t = trackRef.current
    if (t) setEdge({ prev: t.scrollLeft > 2, next: t.scrollLeft < t.scrollWidth - t.clientWidth - 2 })
  }, [])
  useEffect(() => {
    const t = trackRef.current
    if (!t) return undefined
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(t)
    return () => ro.disconnect()
  }, [measure])

  const step = (dir) => {
    const t = trackRef.current
    t.scrollBy({ left: dir * (t.children[0]?.getBoundingClientRect().width ?? t.clientWidth), behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  const pausedFor = (id) => choice[id] ?? all ?? defaultPaused
  const anyPlaying = MOTION_CLIPS.some((c) => !pausedFor(c.id))

  return (
    <section className="fervoro-video fervoro-gallery" aria-label="FERVORO video gallery">
      <button
        type="button"
        className="fervoro-gallery-pause"
        aria-pressed={!anyPlaying}
        onClick={() => {
          setChoice({})
          setAll(anyPlaying)
        }}
      >
        {anyPlaying ? 'Pause videos' : 'Play videos'}
      </button>
      <ul className="fervoro-gallery-track" ref={trackRef} onScroll={measure} aria-label="Videos">
        {MOTION_CLIPS.map((clip, i) => (
          <li key={clip.id}>
            <GalleryPanel
              clip={clip}
              index={i}
              total={MOTION_CLIPS.length}
              trackRef={trackRef}
              paused={pausedFor(clip.id)}
              pageVisible={pageVisible}
              small={phone || saveData}
              onToggle={(p) => setChoice((c) => ({ ...c, [clip.id]: p }))}
            />
          </li>
        ))}
      </ul>
      <button type="button" className="fervoro-gallery-arrow is-prev" aria-label="Previous videos" data-edge={!edge.prev} onClick={() => step(-1)}>
        <Arrow dir="prev" />
      </button>
      <button type="button" className="fervoro-gallery-arrow is-next" aria-label="Next videos" data-edge={!edge.next} onClick={() => step(1)}>
        <Arrow dir="next" />
      </button>
    </section>
  )
}
