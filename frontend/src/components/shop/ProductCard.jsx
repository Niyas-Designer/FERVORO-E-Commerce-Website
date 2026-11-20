import { useRef, useState } from 'react'
import { defaultVariant, productHref } from '../../data/catalog'
import { formatPrice } from '../../lib/format'
import Link from '../../router/Link'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'
import WishlistButton from './WishlistButton'

/** A card strip shows at most this many photographs per colour (the product page shows all of them). */
const CARD_IMAGE_LIMIT = 6
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Listing card for ONE colourway of a product (the listing shows every colourway as its own card): swipeable photograph
 * strip of that colour (arrows on hover / focus and always on touch), wishlist heart, name link, placeholder price and a
 * plain "N colours" label (the product's total). Sizes are not shown because no size data exists.
 * Name + every photograph link to the product page on this colour; arrows and heart are separate buttons (never nested).
 * The wishlist is per product, so every card of one product shares the same heart state.
 */
export default function ProductCard({ product, variant = null, colorCount = null, first = true, priority = false }) {
  const [index, setIndex] = useState(0)
  // Only the first photograph is mounted until the card is used (hover / focus / touch): a listing holds one card per
  // colourway (150+ cards), so loading every photograph of every card up-front would be needlessly heavy.
  const [engaged, setEngaged] = useState(false)
  const engage = () => setEngaged(true)
  const trackRef = useRef(null)
  const shown = variant ?? defaultVariant(product)
  const total = colorCount ?? product.variants.length
  const images = shown.images.slice(0, CARD_IMAGE_LIMIT)
  const href = productHref(product, shown.id)

  const onScroll = () => {
    const t = trackRef.current
    if (t && t.clientWidth) setIndex(Math.round(t.scrollLeft / t.clientWidth))
  }
  const go = (dir) => {
    const t = trackRef.current
    if (!t) return
    const next = Math.min(Math.max(index + dir, 0), images.length - 1)
    if (next === index) return
    t.scrollTo({ left: next * t.clientWidth, behavior: reduced() ? 'auto' : 'smooth' })
  }

  return (
    <li className="fervoro-plp-card" data-product={product.slug} data-variant={shown.id} data-first={first ? 'true' : undefined} onPointerEnter={engage} onFocus={engage} onTouchStart={engage}>
      <div className="fervoro-plp-media">
        <ul ref={trackRef} className="fervoro-plp-track" onScroll={onScroll}>
          {images.map((img, i) => (
            <li key={img.src} className="fervoro-plp-slide" data-tier={img.tier}>
              {(i === 0 || engaged) && (
              <Link href={href} tabIndex={-1} aria-hidden="true">
                <img
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
                  width={img.width}
                  height={img.height}
                  alt=""
                  loading={priority && i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable="false"
                />
              </Link>
              )}
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <>
            <button type="button" className="fervoro-plp-arrow is-prev" aria-label={`Previous photo of ${product.name} in ${shown.name}`} aria-disabled={index === 0} onClick={() => go(-1)}>
              <ArrowLeftIcon />
            </button>
            <button type="button" className="fervoro-plp-arrow is-next" aria-label={`Next photo of ${product.name} in ${shown.name}`} aria-disabled={index === images.length - 1} onClick={() => go(1)}>
              <ArrowRightIcon />
            </button>
            <span className="fervoro-plp-dots" aria-hidden="true">
              {images.map((img, i) => (
                <i key={img.src} data-on={i === index} />
              ))}
            </span>
            <span className="sr-only" role="status" aria-live="polite">{`Photo ${index + 1} of ${images.length}`}</span>
          </>
        )}
        <WishlistButton product={product} className="fervoro-plp-heart" />
      </div>

      <div className="fervoro-plp-info">
        <h3 className="fervoro-plp-name">
          <Link href={href} aria-label={`${product.name} — ${shown.name}`}>{product.name}</Link>
        </h3>
        <p className="fervoro-plp-price">{formatPrice(product.price)}</p>
        <p className="fervoro-plp-colorcount">{total} {total === 1 ? 'colour' : 'colours'}</p>
      </div>
    </li>
  )
}
