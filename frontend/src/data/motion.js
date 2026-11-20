/**
 * FERVORO IN MOTION — approved clip selection (display order).
 * `source` names the untouched master in public/Videos/; the web-delivery copies and posters are generated
 * into public/videos-web/ by `npm run videos:motion` (see scripts/build-motion-videos.py and manifest.json).
 */
export const MOTION_COPY = {
  title: 'FERVORO IN MOTION',
  tagline: 'A Moving Expression of Style.',
}

export const MOTION_CLIPS = [
  { id: 'a8', source: 'A8.mp4', title: 'Diagonal Stripe Polo' },
  { id: 'a4', source: 'A4.mp4', title: 'Mandarin Collar Polo' },
  { id: 'a7', source: 'A7.mp4', title: 'Classic Blue Polo' },
  { id: 'a21', source: 'A21.mp4', title: 'Studio Black Polo' },
  { id: 'a22', source: 'A22.mp4', title: 'Studio Navy Mandarin' },
  { id: 'a23', source: 'A23.mp4', title: 'Studio Maroon Polo' },
]

/** Rendition widths (strict 9:16): 720×1280 for tablet/desktop, 540×960 for phones and data-saving mode. */
export const MOTION_WIDTHS = { large: 720, small: 540 }

export const motionAsset = (id, width, ext) => `/videos-web/${id}-${width}.${ext}`
