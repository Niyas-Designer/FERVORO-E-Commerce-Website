/**
 * Homepage "Men / Boys" editorial category section.
 * Images: the user's own photographs (`public/Mens Banner.png`, `public/Boys Banner.png`, 1122×1402, never modified).
 * `images/categories/*` are responsive WebP derivatives of those originals (npm run images:categories);
 * the original PNG stays as the <img> fallback `src`.
 *
 * `status: 'active'` panels get a Shop Now CTA. With `href: null` (no collection page exists yet) it renders as a
 * button that only shows `previewMessage`; set `href` when the page exists and it becomes a normal link.
 * `status: 'coming-soon'` panels get a non-interactive status label and no action at all.
 */
const widths = [480, 760, 1122]
const srcSet = (slug) => widths.map((w) => `/images/categories/${slug}-${w}.webp ${w}w`).join(', ')

export const SHOWCASE_SIZES = '(min-width: 640px) 50vw, 100vw'

export const SHOWCASE_PANELS = [
  {
    id: 'men',
    status: 'active',
    label: 'Fervoro Menswear',
    heading: "The Men's Collection",
    description: 'Refined essentials for the modern gentleman.',
    cta: 'Shop Now',
    href: null,
    previewMessage: 'The collection opens soon.',
    image: {
      fallback: '/Mens%20Banner.png',
      srcSet: srcSet('men'),
      width: 1122,
      height: 1402,
      alt: 'A man in a red FERVORO Polo League polo with royal-blue shoulder panels, seated and looking to the side in a warm, softly lit lounge',
    },
  },
  {
    id: 'boys',
    status: 'coming-soon',
    label: 'Fervoro Boys',
    heading: "The Boys' Collection",
    description: 'A new generation of timeless style.',
    statusLabel: 'Coming Soon',
    image: {
      fallback: '/Boys%20Banner.png',
      srcSet: srcSet('boys'),
      width: 1122,
      height: 1402,
      alt: 'A boy in a cream knitted polo and sunglasses, leaning on a sunlit stone wall',
    },
  },
]
