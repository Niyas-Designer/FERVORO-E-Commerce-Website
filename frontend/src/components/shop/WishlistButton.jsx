import { useWishlist } from '../../state/wishlist'
import { HeartIcon } from './icons'

/** Heart toggle. State is the frontend-only wishlist (state/wishlist.js): saved on this device, not an account. */
export default function WishlistButton({ product, className = '' }) {
  const { has, toggle } = useWishlist()
  const on = has(product.id)
  return (
    <button
      type="button"
      className={`fervoro-heart ${className}`}
      aria-pressed={on}
      aria-label={`Save ${product.name} to wishlist`}
      onClick={() => toggle(product.id)}
    >
      <HeartIcon filled={on} />
    </button>
  )
}
