import { useEffect, useRef, useState } from 'react'
import { COLLECTION_PAGE } from '../../data/collection-page'
import Link from '../../router/Link'
import ProductCard from './ProductCard'

/**
 * One category: title, short line, "View All" and its product cards. Sections with fewer than four products use a
 * split layout on desktop (text left, two cards right) so the row never looks half empty.
 *
 * "View All" opens the category listing (`/shop/:category`). If a section has no `href` it falls back to a button that
 * announces "<Category> opens soon." in a polite live region.
 */
export default function CategorySection({ section }) {
  const { id, title, blurb, href, products } = section
  const { viewAll, previewSuffix } = COLLECTION_PAGE
  const [note, setNote] = useState('')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const showPreview = () => {
    setNote(`${title} ${previewSuffix}`)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNote(''), 4000)
  }

  const headingId = `collection-${id}-title`
  const noteId = `collection-${id}-note`
  const label = `${viewAll} ${title}`
  return (
    <section id={`collection-${id}`} className={`fervoro-cat${products.length < 4 ? ' is-short' : ''}`} aria-labelledby={headingId}>
      <div className="fervoro-cat-inner">
        <header className="fervoro-cat-head">
          <div>
            <h2 id={headingId} className="fervoro-cat-title">
              {title}
            </h2>
            <p className="fervoro-cat-blurb">{blurb}</p>
          </div>
          <div className="fervoro-cat-action">
            {href ? (
              <Link className="fervoro-cat-all" href={href} aria-label={label}>
                {viewAll}
              </Link>
            ) : (
              <>
                <button type="button" className="fervoro-cat-all" onClick={showPreview} aria-label={label} aria-describedby={noteId}>
                  {viewAll}
                </button>
                <p id={noteId} role="status" aria-live="polite" className="fervoro-cat-note">
                  {note}
                </p>
              </>
            )}
          </div>
        </header>
        <ul className="fervoro-cat-grid" aria-label={`${title} products`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      </div>
    </section>
  )
}
