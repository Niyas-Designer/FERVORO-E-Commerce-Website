import { useCallback, useEffect, useRef, useState } from 'react'
import { MOTION_CLIPS, MOTION_COPY } from '../../data/motion'
import { useInView, usePageVisible } from '../../hooks/useInView'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSaveData } from '../../hooks/useSaveData'
import MotionSlide from './MotionSlide'

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d={dir === 'prev' ? 'M10 2.5 4.5 8 10 13.5' : 'M6 2.5 11.5 8 6 13.5'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const pad = (n) => String(n).padStart(2, '0')

/** Distance between two neighbouring slides (slide width + gap). */
const slideStep = (track) => {
  const s = track.children
  return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : track.clientWidth || 1
}

/**
 * "FERVORO IN MOTION" — portrait video gallery. 3 panels per group on desktop, 2 on tablet, 1 on phones; the rest
 * are reached with the previous/next controls or by swiping/scrolling. Exactly one clip plays at a time.
 */
export default function MotionGallery() {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const videoRefs = useRef([])
  const scrollTimer = useRef(0)

  const desktop = useMediaQuery('(min-width: 1024px)')
  const tablet = useMediaQuery('(min-width: 640px)')
  const perView = desktop ? 3 : tablet ? 2 : 1
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const saveData = useSaveData()
  const inView = useInView(sectionRef, 0.15)
  const pageVisible = usePageVisible()

  const total = MOTION_CLIPS.length
  const groups = Math.ceil(total / perView)
  const [active, setActive] = useState(0)
  const [group, setGroup] = useState(0)
  // null = follow the visitor's settings (no autoplay with reduced motion / data saving); boolean = their explicit choice
  const [userPaused, setUserPaused] = useState(null)
  const paused = userPaused ?? (reduceMotion || saveData)
  const shouldPlay = !paused && inView && pageVisible

  // One clip at a time: pause every other clip first, then start (or pause) the active one.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (v && i !== active) v.pause()
    })
    const v = videoRefs.current[active]
    if (!v) return
    if (shouldPlay) {
      v.play()?.catch((err) => {
        if (err?.name === 'NotAllowedError') setUserPaused(true) // autoplay blocked: show the Play state honestly
      })
    } else {
      v.pause()
    }
  }, [active, shouldPlay])

  // After scrolling settles, derive the visible group and make sure the active clip is one of the visible ones.
  const syncFromScroll = useCallback(() => {
    const t = trackRef.current
    if (!t) return
    const first = Math.min(total - 1, Math.max(0, Math.round(t.scrollLeft / slideStep(t))))
    setGroup(Math.min(groups - 1, Math.floor(first / perView)))
    setActive((a) => (a >= first && a < first + perView ? a : first))
  }, [groups, perView, total])

  const onScroll = () => {
    window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(syncFromScroll, 120)
  }
  useEffect(() => () => window.clearTimeout(scrollTimer.current), [])

  const goTo = (g) => {
    const t = trackRef.current
    if (!t) return
    const target = Math.min(groups - 1, Math.max(0, g))
    t.scrollTo({ left: target * perView * slideStep(t), behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const select = (i) => {
    if (i === active) setUserPaused(!paused)
    else {
      setActive(i)
      setUserPaused(false)
    }
  }

  const first = group * perView + 1
  const last = Math.min(total, first + perView - 1)
  const smallRendition = !tablet || saveData

  return (
    <section ref={sectionRef} className="fervoro-motion" aria-roledescription="carousel" aria-labelledby="fervoro-motion-title">
      <header className="fervoro-motion-head">
        <h2 id="fervoro-motion-title" className="fervoro-motion-title">
          {MOTION_COPY.title}
        </h2>
        <p className="fervoro-motion-tagline">{MOTION_COPY.tagline}</p>
      </header>

      <div className="fervoro-motion-stage" style={{ '--per': perView }}>
        <div ref={trackRef} className="fervoro-motion-track" role="group" aria-label="Videos" tabIndex={0} onScroll={onScroll}>
          {MOTION_CLIPS.map((clip, i) => (
            <MotionSlide
              key={clip.id}
              clip={clip}
              index={i}
              total={total}
              active={i === active}
              paused={paused}
              smallRendition={smallRendition}
              videoRef={(el) => {
                videoRefs.current[i] = el
              }}
              onSelect={select}
            />
          ))}
        </div>
      </div>

      <div className="fervoro-motion-controls">
        <button
          type="button"
          className="fervoro-motion-nav"
          aria-label="Previous videos"
          aria-disabled={group === 0}
          onClick={() => group > 0 && goTo(group - 1)}
        >
          <Arrow dir="prev" />
        </button>
        <span className="fervoro-motion-count" aria-hidden="true">
          {pad(group + 1)} / {pad(groups)}
        </span>
        <button
          type="button"
          className="fervoro-motion-nav"
          aria-label="Next videos"
          aria-disabled={group >= groups - 1}
          onClick={() => group < groups - 1 && goTo(group + 1)}
        >
          <Arrow dir="next" />
        </button>
      </div>
      <p className="fervoro-sr" aria-live="polite">
        {first === last ? `Showing video ${first} of ${total}` : `Showing videos ${first} to ${last} of ${total}`}
      </p>
    </section>
  )
}
