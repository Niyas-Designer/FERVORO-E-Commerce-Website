import Link from '../../router/Link'

/**
 * Editorial image card with a lower gradient and a white serif label.
 * Shared by the desktop mega menu and the mobile/tablet carousel.
 * Opens the category listing filtered to this sub-category (client-side), and closes the menu first.
 */
export default function CategoryCard({ item, sizes, eager = false, onSelect }) {
  const { label, href, image } = item
  return (
    <Link href={href} onClick={() => onSelect?.(item)} className="fervoro-card group">
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable="false"
        className="fervoro-card-img"
      />
      <span className="fervoro-card-shade" aria-hidden="true" />
      <span className="fervoro-card-label">
        <span className="fervoro-card-title">{label}</span>
        <span className="fervoro-card-rule" aria-hidden="true" />
      </span>
    </Link>
  )
}
