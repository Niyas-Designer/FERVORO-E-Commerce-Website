import { useEffect, useRef, useState } from 'react'
import { MOTION_WIDTHS, motionAsset } from '../../data/motion'
import { useInView } from '../../hooks/useInView'

/**
 * One 9:16 video panel of the homepage gallery. No visible text or controls: the poster <img> sits underneath, the muted
 * looping <video> fades in once it really plays. The video file is only requested once the panel is within half a
 * screen of the scroller's visible area, and it plays only while it is on screen (and the tab is visible).
 * Clicking / tapping the panel pauses or resumes that clip.
 */
export default function GalleryPanel({ clip, index, total, trackRef, paused, pageVisible, small, onToggle }) {
  const boxRef = useRef(null)
  const vidRef = useRef(null)
  const visible = useInView(boxRef, 0.5)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const { large, small: sm } = MOTION_WIDTHS

  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { root: trackRef.current, rootMargin: '0px 60% 0px 60%' })
    io.observe(el)
    return () => io.disconnect()
  }, [trackRef])

  const wantPlay = !paused && visible && pageVisible && !failed
  useEffect(() => {
    const v = vidRef.current
    if (!v || !near) return
    if (wantPlay) {
      const p = v.play()
      if (p?.then) p.then(() => setBlocked(false)).catch((e) => e?.name !== 'AbortError' && setBlocked(true))
    } else v.pause()
  }, [wantPlay, near])

  return (
    <div
      className="fervoro-gallery-media"
      ref={boxRef}
      role="group"
      aria-roledescription="slide"
      aria-label={`${clip.title}, ${index + 1} of ${total}`}
      onClick={() => !failed && onToggle(blocked ? false : !paused)}
    >
      <img
        className="fervoro-gallery-fill"
        src={motionAsset(clip.id, large, 'webp')}
        srcSet={`${motionAsset(clip.id, sm, 'webp')} ${sm}w, ${motionAsset(clip.id, large, 'webp')} ${large}w`}
        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 34vw, 72vw"
        width={large}
        height={1280}
        alt=""
        loading="lazy"
        decoding="async"
        draggable="false"
      />
      {!failed && (
        <video
          ref={(el) => {
            vidRef.current = el
            if (el) {
              el.muted = true
              el.setAttribute('muted', '')
            }
          }}
          className={`fervoro-gallery-fill fervoro-gallery-video${ready ? ' is-live' : ''}`}
          src={near ? motionAsset(clip.id, small ? sm : large, 'mp4') : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          onPlaying={() => setReady(true)}
          onError={() => near && setFailed(true)}
        />
      )}
    </div>
  )
}
