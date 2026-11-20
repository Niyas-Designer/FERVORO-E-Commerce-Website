import { CATEGORIES, categoryHref, primaryImage, productHref, queryProducts } from './catalog'
import { HERO } from './hero'

/**
 * Content for the collection landing page (`/collection`). Product names, images and category order come from
 * the central catalogue (data/catalog.js), so they can never drift apart from the menu, listing and product pages.
 * Prices are PLACEHOLDERS (see catalog.js).
 */
export const COLLECTION_ROUTE = '/collection'

/** Same campaign photograph as the homepage hero; this page's hero has a different headline and no CTA. */
export const COLLECTION_HERO = {
  ...HERO,
  caption: 'Autumn / Winter 2027',
  headline: 'The FERVORO Collection.',
  cta: null,
  ctaHref: null,
}

export const COLLECTION_PAGE = {
  documentTitle: 'The FERVORO Collection — FERVORO',
  intro: {
    eyebrow: 'About FERVORO',
    text: 'FERVORO is menswear built on quiet confidence — considered silhouettes, honest materials and a palette drawn from forest, stone and ivory. Each piece is made to be worn often and kept for years, from the polo that anchors a working week to the knit that finishes an autumn evening. Modern dressing without noise: refined, versatile and unmistakably yours.',
  },
  viewAll: 'View All',
  /** Shown after the category name if a section ever has no `href` (button fallback in CategorySection). */
  previewSuffix: 'opens soon.',
}

const BLURBS = {
  polo: 'The signature silhouette — refined collars, clean lines.',
  shirt: 'Crisp, considered shirting for every hour of the day.',
  't-shirt': 'Everyday basics with a quiet point of view.',
  bottom: 'Easy, tailored comfort in clean drawstring lines.',
  knit: 'Textured knitwear made for the cooler months.',
}

/** A landing-page row previews the first products in Featured order (real photographs first); View All opens the full listing. */
export const PREVIEW_LIMIT = 8

export const COLLECTION_SECTIONS = CATEGORIES.map((category) => ({
  id: category.id,
  title: category.label,
  blurb: BLURBS[category.id],
  /** The category listing page (see pages/ShopPage.jsx). */
  href: categoryHref(category.id),
  total: queryProducts({ category: category.id }).length,
  products: queryProducts({ category: category.id }).slice(0, PREVIEW_LIMIT).map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    href: productHref(product),
    image: primaryImage(product), // tier-1 photograph first, see data/catalog.js
  })),
}))
