import { useEffect, useRef, useState } from 'react'
import { SHOWCASE_SIZES } from '../../data/categories-showcase'

/** One editorial image panel: photograph, bottom gradient, lower-left text and either a CTA or a status label. */
export default function CategoryPanel({ panel }) {
  const { id, status, image } = panel
  const [note, setNote] = useState('')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const showPreview = () => {
    setNote(panel.previewMessage)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNote(''), 4000)
  }

  const headingId = `showcase-${id}-title`
  const noteId = `showcase-${id}-note`
  return (
    <article className="fervoro-showcase-panel" data-panel={id} data-status={status} aria-labelledby={headingId}>
      <img
        className="fervoro-showcase-img"
        src={image.fallback}
        srcSet={image.srcSet}
        sizes={SHOWCASE_SIZES}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading="lazy"
        decoding="async"
      />
      <div className="fervoro-showcase-shade" aria-hidden="true" />

      <div className="fervoro-showcase-content">
        <p className="fervoro-showcase-label">{panel.label}</p>
        <h2 id={headingId} className="fervoro-showcase-title">
          {panel.heading}
        </h2>
        <p className="fervoro-showcase-desc">{panel.description}</p>

        <div className="fervoro-showcase-action">
          {status === 'active' ? (
            <>
              {panel.href ? (
                <a className="fervoro-showcase-cta" href={panel.href}>
                  {panel.cta}
                </a>
              ) : (
                <button type="button" className="fervoro-showcase-cta" onClick={showPreview} aria-describedby={noteId}>
                  {panel.cta}
                </button>
              )}
              {/* Absolutely positioned live region: announces the preview state without shifting layout. */}
              <p id={noteId} role="status" aria-live="polite" className="fervoro-showcase-note">
                {note}
              </p>
            </>
          ) : (
            <p className="fervoro-showcase-status">{panel.statusLabel}</p>
          )}
        </div>
      </div>
    </article>
  )
}
