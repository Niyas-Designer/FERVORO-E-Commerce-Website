import { formatPrice } from '../../lib/format'
import Link from '../../router/Link'

/** Image, name and placeholder price; the name link covers the whole card and opens the product page. */
export default function ProductCard({ product }) {
  const { image, name, price, href } = product
  return (
    <li className="fervoro-pcard">
      <div className="fervoro-pcard-media">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 1024px) 23vw, 46vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </div>
      <h3 className="fervoro-pcard-name">
        <Link href={href} className="fervoro-pcard-link">
          {name}
        </Link>
      </h3>
      <p className="fervoro-pcard-price">{formatPrice(price)}</p>
    </li>
  )
}
