import { useEffect, useRef, useState } from 'react'
import Gallery from '../components/product/Gallery'
import NotFoundState from '../components/shop/NotFoundState'
import WishlistButton from '../components/shop/WishlistButton'
import { categoryHref, getCategory, getProduct, isPurchasable, subcategoryHref, variantById } from '../data/catalog'
import { formatPrice, hasPrice } from '../lib/format'
import Link from '../router/Link'
import { goBack, navigate, useSearchParams } from '../router/navigation'
import { addToBag } from '../state/bag'

/**
 * Product detail page for `/product/:slug` (colour in `?color=`).
 * Only data that exists is shown. Sizes, size guide, composition / care and stock are not provided, so each of those
 * renders an explicit "not available yet" state. Add to Bag fills the frontend-only bag (state/bag.js); when sizes exist
 * one must be chosen first. Checkout is not available, which the bag page states (see isPurchasable in data/catalog.js).
 */
function Crumbs({ category, product, className, label }) {
  return (
    <nav aria-label={label} className={className}>
      <ol>
        <li><Link href="/">Home</Link></li>
        <li><Link href={categoryHref(category.id)}>{category.label}</Link></li>
        <li><Link href={subcategoryHref(category.id, product.subcategory)}>{product.subcategoryLabel}</Link></li>
      </ol>
    </nav>
  )
}

export default function ProductPage({ slug }) {
  const params = useSearchParams()
  const product = getProduct(slug)
  const [size, setSize] = useState(null)
  const [added, setAdded] = useState(false)
  const [sizeError, setSizeError] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!product) return <NotFoundState title="Product not found" message="This product doesn't exist or is no longer available." />

  const category = getCategory(product.category)
  const variant = variantById(product, params.get('color'))
  const hasSizes = Boolean(product.sizes?.length)
  const checkoutReady = isPurchasable(product)
  const add = () => {
    if (hasSizes && !size) { setSizeError(true); return }
    addToBag(product, variant.id, size)
    setSizeError(false)
    setAdded(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAdded(false), 4000)
  }
  const pickColor = (id) => navigate(`/product/${product.slug}${id === product.variants[0].id ? '' : `?color=${id}`}`, { replace: true })

  return (
    <article className="fervoro-pdp" aria-labelledby="pdp-title">
      <div className="fervoro-pdp-topbar">
        <button type="button" className="fervoro-pdp-back" onClick={() => goBack(categoryHref(category.id))}>
          <span aria-hidden="true">←</span> Back
        </button>
        <Crumbs category={category} product={product} label="Breadcrumb" className="fervoro-pdp-crumbs" />
      </div>
      <Gallery key={variant.id} images={variant.images} name={`${product.name} in ${variant.name}`} />

      <div className="fervoro-pdp-panel">

        <h1 id="pdp-title" className="fervoro-pdp-title">{product.name}</h1>
        <p className="fervoro-pdp-price">{formatPrice(product.price)}</p>
        {product.price.status === 'preview' && <p className="fervoro-pdp-note">Preview price — final pricing to be confirmed.</p>}
        {!hasPrice(product.price) && <p className="fervoro-pdp-note">Pricing for this product has not been provided yet.</p>}

        <div className="fervoro-pdp-block">
          <p className="fervoro-pdp-label" id="pdp-color-label">
            Colour: <span>{variant.name}</span>
          </p>
          <div role="group" aria-labelledby="pdp-color-label" className="fervoro-swatches is-large">
            {product.variants.map((v) => (
              <button key={v.id} type="button" className="fervoro-swatch" aria-pressed={v.id === variant.id} aria-label={v.name} title={v.name} onClick={() => pickColor(v.id)}>
                <span style={{ background: v.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="fervoro-pdp-block">
          <div className="fervoro-pdp-sizehead">
            <p className="fervoro-pdp-label" id="pdp-size-label">Size</p>
            <button type="button" className="fervoro-pdp-guide" disabled={!product.sizeGuide} aria-describedby="pdp-size-note">
              Size guide
            </button>
          </div>
          {product.sizes?.length ? (
            <div role="radiogroup" aria-labelledby="pdp-size-label" className="fervoro-pdp-sizes">
              {product.sizes.map((s) => (
                <label key={s.id}>
                  <input type="radio" name="size" value={s.id} disabled={!s.inStock} checked={size === s.id} onChange={() => { setSize(s.id); setSizeError(false) }} />
                  <span>{s.id}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="fervoro-pdp-unavailable" id="pdp-size-note">Sizes and the size guide haven't been confirmed for this style yet.</p>
          )}
        </div>

        <div className="fervoro-pdp-buy">
          <button type="button" className="fervoro-pdp-add" onClick={add} aria-describedby="pdp-buy-note">
            {added ? 'Added to Bag ✓' : 'Add to Bag'}
          </button>
          <WishlistButton product={product} className="fervoro-pdp-heart" />
        </div>
        <p className="fervoro-pdp-note fervoro-pdp-status" role="status" aria-live="polite">
          {sizeError ? 'Please choose a size first.' : added ? <>Added to your bag. <Link href="/bag">View bag</Link></> : ''}
        </p>
        {!checkoutReady && (
          <p className="fervoro-pdp-note" id="pdp-buy-note">
            Preview only — checkout isn't available yet.
          </p>
        )}

        <section className="fervoro-pdp-block fervoro-pdp-desc" aria-labelledby="pdp-desc-title">
          <h2 id="pdp-desc-title" className="fervoro-pdp-label">Description</h2>
          <p>{product.description}</p>
        </section>

        <details className="fervoro-pdp-details">
          <summary>Composition &amp; care</summary>
          {product.composition || product.care ? (
            <div>
              {product.composition && <p>{product.composition}</p>}
              {product.care && <p>{product.care}</p>}
            </div>
          ) : (
            <p className="fervoro-pdp-unavailable">Fabric composition and care instructions haven't been provided for this product yet.</p>
          )}
        </details>
      </div>
    </article>
  )
}
