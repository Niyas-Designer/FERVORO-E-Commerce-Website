import { useMemo } from 'react'
import ProductCard from '../components/shop/ProductCard'
import { PRODUCT_LIST } from '../data/catalog'
import Link from '../router/Link'
import { useWishlist } from '../state/wishlist'

/** `/wishlist` — every saved product, in the order it was saved. Removing a heart removes the card immediately. */
export default function WishlistPage() {
  const { ids } = useWishlist()
  const products = useMemo(() => ids.map((id) => PRODUCT_LIST.find((p) => p.id === id)).filter(Boolean), [ids])
  return (
    <section className="fervoro-plp fervoro-wish" aria-labelledby="wish-title">
      <header className="fervoro-plp-head">
        <h1 id="wish-title" className="fervoro-plp-title">Wishlist</h1>
        <p className="fervoro-page-sub" role="status" aria-live="polite">
          {products.length ? `${products.length} saved ${products.length === 1 ? 'item' : 'items'} · kept on this device` : 'Nothing saved yet'}
        </p>
      </header>
      {products.length ? (
        <ul className="fervoro-plp-grid" aria-label="Saved products">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </ul>
      ) : (
        <div className="fervoro-plp-empty" role="status">
          <p>Tap the heart on any product to save it here.</p>
          <Link href="/shop" className="fervoro-cat-all">Browse the collection</Link>
        </div>
      )}
    </section>
  )
}
