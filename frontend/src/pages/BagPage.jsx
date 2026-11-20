import { useMemo } from 'react'
import { PRODUCT_LIST, productHref, variantById } from '../data/catalog'
import { formatPrice } from '../lib/format'
import Link from '../router/Link'
import { removeLine, setQty, useBag } from '../state/bag'

/**
 * `/bag` — the lines added with "Add to Bag". Prices come from the catalogue; a total is only shown when every line
 * has a confirmed price. There is no checkout yet, so the checkout button is disabled and says so.
 */
export default function BagPage() {
  const { lines, count, MAX_QTY } = useBag()
  const rows = useMemo(
    () => lines.map((l) => {
      const product = PRODUCT_LIST.find((p) => p.id === l.productId) ?? null
      return product ? { line: l, product, variant: variantById(product, l.variantId) } : null
    }).filter(Boolean),
    [lines],
  )
  const verified = rows.length > 0 && rows.every((r) => r.product.price.status === 'verified')
  const total = verified ? rows.reduce((n, r) => n + r.product.price.amount * r.line.qty, 0) : null

  return (
    <section className="fervoro-plp fervoro-bag" aria-labelledby="bag-title">
      <header className="fervoro-plp-head">
        <h1 id="bag-title" className="fervoro-plp-title">Shopping bag</h1>
        <p className="fervoro-page-sub" role="status" aria-live="polite">
          {count ? `${count} ${count === 1 ? 'item' : 'items'}` : 'Your bag is empty'}
        </p>
      </header>
      {rows.length ? (
        <div className="fervoro-bag-layout">
          <ul className="fervoro-bag-lines" aria-label="Items in your bag">
            {rows.map(({ line, product, variant }) => {
              const img = variant.images[0]
              const href = productHref(product, variant.id)
              return (
                <li key={line.key} className="fervoro-bag-line" data-line={line.key}>
                  <Link href={href} className="fervoro-bag-thumb" tabIndex={-1} aria-hidden="true">
                    <img src={img.src} srcSet={img.srcSet} sizes="120px" width={img.width} height={img.height} alt="" loading="lazy" />
                  </Link>
                  <div className="fervoro-bag-info">
                    <h2 className="fervoro-bag-name"><Link href={href}>{product.name}</Link></h2>
                    <p className="fervoro-bag-meta">Colour: {variant.name}{line.size ? ` · Size ${line.size}` : ''}</p>
                    <p className="fervoro-bag-price">{formatPrice(product.price)}</p>
                    <div className="fervoro-bag-actions">
                      <div className="fervoro-qty" role="group" aria-label={`Quantity of ${product.name}`}>
                        <button type="button" aria-label="Decrease quantity" onClick={() => setQty(line.key, line.qty - 1)}>−</button>
                        <output aria-live="polite">{line.qty}</output>
                        <button type="button" aria-label="Increase quantity" disabled={line.qty >= MAX_QTY} onClick={() => setQty(line.key, line.qty + 1)}>+</button>
                      </div>
                      <button type="button" className="fervoro-bag-remove" onClick={() => removeLine(line.key)} aria-label={`Remove ${product.name} (${variant.name}) from bag`}>Remove</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <aside className="fervoro-bag-summary" aria-label="Order summary">
            <h2 className="fervoro-pdp-label">Summary</h2>
            <p className="fervoro-bag-total"><span>Subtotal</span><strong>{total === null ? 'Price to be confirmed' : formatPrice({ amount: total, currency: 'INR' })}</strong></p>
            {total === null && <p className="fervoro-pdp-note">Pricing hasn't been confirmed for every item yet.</p>}
            <button type="button" className="fervoro-pdp-add" disabled aria-describedby="bag-checkout-note">Checkout</button>
            <p className="fervoro-pdp-note" id="bag-checkout-note">Preview only — checkout and payment aren't available yet.</p>
            <Link href="/shop" className="fervoro-bag-continue">Continue shopping</Link>
          </aside>
        </div>
      ) : (
        <div className="fervoro-plp-empty" role="status">
          <p>Add a product to start your bag.</p>
          <Link href="/shop" className="fervoro-cat-all">Browse the collection</Link>
        </div>
      )}
    </section>
  )
}
