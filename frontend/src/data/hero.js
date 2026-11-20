/** Homepage hero content (Phase 2). Kept separate from the component so campaigns can be swapped easily. */
const BASE = '/images/hero'

export const HERO = {
  caption: 'Autumn / Winter 2027',
  headline: 'The Art of Modern Dressing.',
  cta: 'Explore the Collection',

  /**
   * Collection landing page route (see data/collection-page.js). Set to `null` to fall back to a preview-state button
   * that only shows `ctaPreviewMessage` instead of navigating.
   */
  ctaHref: '/collection',
  ctaPreviewMessage: 'The collection opens soon.',

  image: {
    alt: 'Six men in FERVORO polos — rugby-league colour-block, black polo-league, red-navy-ivory diagonal and aqua-green — posed along a wooden fence and a saddle in a golden field with mountains behind.',
    landscape: {
      src: `${BASE}/hero-polo-1440.webp`,
      srcSet: `${BASE}/hero-polo-960.webp 960w, ${BASE}/hero-polo-1440.webp 1440w, ${BASE}/hero-polo-1672.webp 1672w`,
      width: 1672,
      height: 941,
    },
    portrait: {
      srcSet: `${BASE}/hero-polo-portrait-480.webp 480w, ${BASE}/hero-polo-portrait-760.webp 760w`,
    },
    /** Viewports that get the portrait crop (must match the media query in index.css / index.html). */
    portraitMedia: '(max-width: 639px), (max-aspect-ratio: 1/1)',
  },
}
