/**
 * Collection slider content (five main menswear categories, in display order).
 *
 * Photographs come from the central catalogue (genuine photography first); the approved FERVORO navigation reference
 * images (public/images/nav/*) are only the fallback, chosen by `slug`. Originals are never modified.
 *
 * Every card's `href` is the collection landing page (COLLECTION_ROUTE), so Shop Now is a normal client-side link. Set an
 * item's `href` to `null` to fall back to a button that only shows `previewMessage` (no dead link); once a category
 * listing page exists, point that item's `href` at it (see CollectionCard.jsx).
 */
import { categoryCover } from './catalog'
import { COLLECTION_ROUTE } from './collection-page'

export const COLLECTIONS_COPY = {
  title: 'FERVORO ITALY Collections',
  description:
    'Discover the FERVORO menswear collection — a refined expression of everyday essentials, contemporary design, and timeless style.',
  cardLabel: 'Fervoro Menswear', // shown uppercase on every card
  cta: 'Shop Now', // shown uppercase on every card
  previewMessage: 'The collection opens soon.',
}

const IMG_BASE = '/images/nav'
const photo = (slug, alt) => ({
  src: `${IMG_BASE}/${slug}-900.webp`,
  srcSet: `${IMG_BASE}/${slug}-480.webp 480w, ${IMG_BASE}/${slug}-900.webp 900w`,
  alt,
  width: 900,
  height: 1192,
})

/**
 * Photograph priority (see data/catalog.js): the first product in Featured order leads each card — Important 1, then
 * Important 2, then public/products. Only when a category has no genuine photograph at all (Shirt) is the approved
 * reference image (public/images/nav) kept.
 */
const cover = (categoryId, slug, alt) => {
  const { image } = categoryCover(categoryId)
  return image.tier <= 3 ? { src: image.src, srcSet: image.srcSet, alt: image.alt, width: image.width, height: image.height } : photo(slug, alt)
}

export const COLLECTIONS = [
  { id: 'polo', title: 'Polo', href: COLLECTION_ROUTE, image: cover('polo', 'core-polo', 'Model in a deep green polo, leaning against a stone arch') },
  { id: 'shirt', title: 'Shirt', href: COLLECTION_ROUTE, image: cover('shirt', 'core-shirt', 'Model in a white shirt with sleeves rolled') },
  { id: 't-shirt', title: 'T-Shirt', href: COLLECTION_ROUTE, image: cover('t-shirt', 'fashion-t-shirt', 'Model in a navy t-shirt with ivory chest stripes') },
  { id: 'bottom', title: 'Bottom', href: COLLECTION_ROUTE, image: cover('bottom', 'core-jogger', 'Black drawstring joggers') },
  { id: 'knit', title: 'Knit', href: COLLECTION_ROUTE, image: cover('knit', 'knit-shorts', 'Brown knit drawstring shorts') },
]
