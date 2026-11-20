import { useState } from 'react'
import { MOTION_WIDTHS, motionAsset } from '../../data/motion'

const Icon = ({ playing }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    {playing ? (
      <path fill="currentColor" d="M3.5 2h3v12h-3zM9.5 2h3v12h-3z" />
    ) : (
      <path fill="currentColor" d="M4 2.2v11.6L13.6 8z" />
    )}
  </svg>
)

/**
 * One portrait (9:16) panel. The poster <img> is always present underneath; the <video> sits on top and only
 * becomes visible once it is genuinely playing, so a slow/blocked/failed video degrades to the poster.
 */
export default function MotionSlide({ clip, index, total, active, paused, smallRendition, videoRef, onSelect }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const { large, small } = MOTION_WIDTHS
  const videoWidth = smallRendition ? small : large
  const playing = active && !paused
  const label = `${playing ? 'Pause' : 'Play'} video: ${clip.title}`

  return (
    <figure
      className={`fervoro-motion-slide${active ? ' is-active' : ''}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${clip.title}, ${index + 1} of ${total}`}
    >
      <div className="fervoro-motion-media" onClick={() => !failed && onSelect(index)}>
        <img
          className="fervoro-motion-poster"
          src={motionAsset(clip.id, large, 'webp')}
          srcSet={`${motionAsset(clip.id, small, 'webp')} ${small}w, ${motionAsset(clip.id, large, 'webp')} ${large}w`}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          width={large}
          height={1280}
          alt=""
          loading="lazy"
          decoding="async"
        />
        {!failed && (
          <video
            ref={videoRef}
            className={`fervoro-motion-video${ready && active ? ' is-live' : ''}`}
            src={motionAsset(clip.id, videoWidth, 'mp4')}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            aria-hidden="true"
            onPlaying={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
        {!failed && (
          <button
            type="button"
            className="fervoro-motion-toggle"
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(index)
            }}
          >
            <Icon playing={playing} />
          </button>
        )}
      </div>
      <figcaption className="fervoro-motion-caption">
        <span className="fervoro-motion-num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span>{clip.title}</span>
        {failed && <span className="fervoro-motion-unavail">Preview unavailable</span>}
      </figcaption>
    </figure>
  )
}
