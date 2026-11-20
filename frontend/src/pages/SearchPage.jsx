import { useEffect, useRef } from 'react'
import ProductCard from '../components/shop/ProductCard'
import { listingCards, searchProducts } from '../data/catalog'
import Link from '../router/Link'
import { navigate, useSearchParams } from '../router/navigation'

/** `/search?q=` — searches name, category, sub-category and colour names across the whole catalogue. */
export default function SearchPage() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const inputRef = useRef(null)
  const products = searchProducts(q)
  const results = listingCards(products) // one card per colourway

  useEffect(() => { inputRef.current?.focus({ preventScroll: true }) }, [])

  const setQuery = (value) => navigate(value.trim() ? `/search?q=${encodeURIComponent(value)}` : '/search', { replace: true })

  return (
    <section className="fervoro-plp fervoro-search" aria-labelledby="search-title">
      <header className="fervoro-plp-head">
        <h1 id="search-title" className="fervoro-plp-title">Search</h1>
        <form role="search" className="fervoro-search-form" onSubmit={(e) => { e.preventDefault(); setQuery(inputRef.current.value) }}>
          <label className="sr-only" htmlFor="search-input">Search the collection</label>
          <input id="search-input" ref={inputRef} type="search" name="q" defaultValue={q} placeholder="Search polos, colours, styles…" autoComplete="off" enterKeyHint="search" onChange={(e) => setQuery(e.target.value)} />
        </form>
        <p className="fervoro-page-sub" role="status" aria-live="polite">
          {q.trim() ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${q.trim()}”` : 'Type to search the collection'}
        </p>
      </header>
      {q.trim() && results.length > 0 && (
        <ul className="fervoro-plp-grid" aria-label="Search results">
          {results.map((c, i) => <ProductCard key={c.key} product={c.product} variant={c.variant} colorCount={c.colorCount} first={c.first} priority={i < 4} />)}
        </ul>
      )}
      {q.trim() && results.length === 0 && (
        <div className="fervoro-plp-empty" role="status">
          <p>No products match “{q.trim()}”. Try a colour, a category (polo, t-shirt, bottom) or a style.</p>
          <Link href="/shop" className="fervoro-cat-all">Browse the collection</Link>
        </div>
      )}
    </section>
  )
}
