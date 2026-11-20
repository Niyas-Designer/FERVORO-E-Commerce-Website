import { useEffect, useRef, useState } from 'react'
import { HERO } from '../../data/hero'
import Link from '../../router/Link'

/**
 * Full-bleed campaign hero: one immersive photograph, centred editorial typography in the
 * lower-middle, a bottom-only gradient for legibility and a minimal underline CTA.
 * `content` defaults to the homepage HERO; the collection page passes its own (without a CTA).
 */
export default function HeroBanner({ content = HERO }) {
  const [note, setNote] = useState('')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const showPreview = () => {
    setNote(content.ctaPreviewMessage)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNote(''), 4000)
  }

  const { image } = content
  return (
    <section className="fervoro-hero" aria-labelledby="hero-title">
      <picture>
        <source media={image.portraitMedia} srcSet={image.portrait.srcSet} sizes="100vw" type="image/webp" />
        <img
          className="fervoro-hero-img"
          src={image.landscape.src}
          srcSet={image.landscape.srcSet}
          sizes="100vw"
          width={image.landscape.width}
          height={image.landscape.height}
          alt={image.alt}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
      </picture>
      <div className="fervoro-hero-shade" aria-hidden="true" />

      <div className="fervoro-hero-content">
        <p className="fervoro-hero-caption fervoro-reveal" style={{ '--d': '0.15s' }}>
          {content.caption}
        </p>
        <h1 id="hero-title" className="fervoro-hero-title fervoro-reveal" style={{ '--d': '0.3s' }}>
          {content.headline}
        </h1>

        {content.cta ? (
          <div className="fervoro-reveal" style={{ '--d': '0.5s' }}>
            {content.ctaHref ? (
              <Link className="fervoro-hero-cta" href={content.ctaHref}>
                {content.cta}
              </Link>
            ) : (
              <button type="button" className="fervoro-hero-cta" onClick={showPreview} aria-describedby="hero-note">
                {content.cta}
              </button>
            )}
            {/* Fixed-height live region: announces the preview state without shifting layout. */}
            <p id="hero-note" role="status" aria-live="polite" className="fervoro-hero-note">
              {note}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
