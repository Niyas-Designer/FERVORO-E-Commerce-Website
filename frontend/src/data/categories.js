/**
 * Single source of truth for the men's navigation hierarchy.
 * Used by BOTH the desktop mega menu and the mobile/tablet accordion-carousel.
 *
 * Images are responsive WebP derivatives generated from the approved originals
 * (see `npm run images`). Originals are never modified.
 */

const IMG_BASE = '/images/nav'

const image = (slug, alt) => ({
  src: `${IMG_BASE}/${slug}-480.webp`,
  srcSet: `${IMG_BASE}/${slug}-480.webp 480w, ${IMG_BASE}/${slug}-900.webp 900w`,
  alt,
  width: 480,
  height: 636,
})

/** Sub-category id used by the listing pages (?style=): style prefix for polo/shirt/t-shirt, garment suffix for bottom/knit. */
const styleOf = (category, slug) => (['bottom', 'knit'].includes(category) ? slug.split('-').pop() : slug.split('-')[0])

/** Each card opens that category's listing, filtered to the sub-category (e.g. /shop/polo?style=core). */
const item = (category, label, slug, alt) => ({
  id: slug,
  label,
  href: `/shop/${category}?style=${styleOf(category, slug)}`,
  image: image(slug, alt),
})

export const MEN_CATEGORIES = [
  {
    id: 'polo',
    label: 'Polo',
    heading: "Men's Polo",
    items: [
      item('polo', 'Core Polo', 'core-polo', 'Model in a deep green polo, leaning against a stone arch'),
      item('polo', 'Pocket Polo', 'pocket-polo', 'Model in a beige pocket polo, seated on a terrace'),
      item('polo', 'Fashion Polo', 'fashion-polo', 'Model in a green textured polo with ivory tipping'),
      item('polo', 'Texture Polo', 'texture-polo', 'Model in a dark green textured-knit polo'),
    ],
  },
  {
    id: 'shirt',
    label: 'Shirt',
    heading: "Men's Shirt",
    items: [
      item('shirt', 'Core Shirt', 'core-shirt', 'Model in a white shirt with sleeves rolled'),
      item('shirt', 'Pocket Shirt', 'pocket-shirt', 'Model in an olive-green pocket shirt'),
      item('shirt', 'Fashion Shirt', 'fashion-shirt', 'Model in a navy pinstripe shirt'),
      item('shirt', 'Texture Shirt', 'texture-shirt', 'Model in a grey linen-texture shirt'),
    ],
  },
  {
    id: 't-shirt',
    label: 'T-Shirt',
    heading: "Men's T-Shirt",
    items: [
      item('t-shirt', 'Core T-Shirt', 'core-t-shirt', 'Model in a white crew-neck t-shirt'),
      item('t-shirt', 'Graphic T-Shirt', 'graphic-t-shirt', 'Model in a washed black graphic t-shirt with a mountain print'),
      item('t-shirt', 'Fashion T-Shirt', 'fashion-t-shirt', 'Model in a navy t-shirt with ivory chest stripes'),
      item('t-shirt', 'Texture T-Shirt', 'texture-t-shirt', 'Model in an olive-green textured t-shirt'),
    ],
  },
  {
    id: 'bottom',
    label: 'Bottom',
    heading: "Men's Bottom",
    items: [
      item('bottom', 'Core Shorts', 'core-shorts', 'Cream drawstring shorts'),
      item('bottom', 'Core Jogger', 'core-jogger', 'Black drawstring joggers'),
    ],
  },
  {
    id: 'knit',
    label: 'Knit',
    heading: "Men's Knit",
    items: [
      item('knit', 'Knit Shorts', 'knit-shorts', 'Brown knit drawstring shorts'),
      item('knit', 'Knit Pants', 'knit-pants', 'Beige knit drawstring pants'),
    ],
  },
]

/** Viewport width (px) at which the desktop header + mega menu replaces the mobile/tablet nav. */
export const DESKTOP_BREAKPOINT = 1024
export const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`
