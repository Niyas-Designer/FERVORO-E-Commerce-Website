import { useState } from 'react'
import FilterDrawer from '../components/shop/FilterDrawer'
import FilterPanel from '../components/shop/FilterPanel'
import NotFoundState from '../components/shop/NotFoundState'
import ProductCard from '../components/shop/ProductCard'
import { CATEGORIES, COLOR_FAMILIES, SORT_OPTIONS, categoryHref, colorFacets, getCategory, listingCards, queryProducts } from '../data/catalog'
import { useMediaQuery } from '../hooks/useMediaQuery'
import Link from '../router/Link'
import { navigate, useSearchParams } from '../router/navigation'

const csv = (value, allowed) => (value ? value.split(',').filter((v) => allowed.includes(v)) : [])

/**
 * Product listing page for `/shop` (all) and `/shop/:category`.
 * State lives in the URL (?style= ?color= ?category= ?sort=, comma-separated for multi-select) so filters survive reloads,
 * sharing and Back / Forward. Desktop (≥1024px) shows a sticky left sidebar; below that a slide-in drawer.
 * Only attributes that exist in the data are offered: category, sub-category and colour (as photographed). There is no
 * price / size / availability filter and no price sort because no verified data exists for them.
 */
export default function ShopPage({ categoryId = null }) {
  const category = categoryId ? getCategory(categoryId) : null
  const params = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState({ wide: null, narrow: null })
  const isWide = useMediaQuery('(min-width: 1024px)')
  const isXL = useMediaQuery('(min-width: 1280px)')

  if (categoryId && !category) {
    return <NotFoundState title="Collection not found" message="We couldn't find that collection. Browse everything instead." />
  }

  const basePath = categoryHref(categoryId)
  const categories = category ? [] : csv(params.get('category'), CATEGORIES.map((c) => c.id))
  // Sub-categories belong to one main category: the current collection, or the single ticked category on /shop.
  const styleCategory = category ?? (categories.length === 1 ? getCategory(categories[0]) : null)
  const styleOk = styleCategory?.subcategories.map((x) => x.id) ?? []
  const styles = csv(params.get('style'), styleOk)
  // Colours offered = those that exist in the current scope; stale / unavailable ones in the URL are ignored.
  const scope = queryProducts({ category: categoryId, categories, style: styles })
  const colorSet = colorFacets(scope)
  const colors = csv(params.get('color'), colorSet.map((f) => f.id))
  const sort = SORT_OPTIONS.some((o) => o.id === params.get('sort')) ? params.get('sort') : 'featured'

  const setParams = (patch, { path = basePath, replace = true } = {}) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '' || (Array.isArray(v) && !v.length) || (k === 'sort' && v === 'featured')) next.delete(k)
      else next.set(k, Array.isArray(v) ? v.join(',') : v)
    }
    const qs = next.toString()
    navigate(path + (qs ? `?${qs}` : ''), { replace })
  }
  const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const products = queryProducts({ category: categoryId, categories, style: styles, colors, sort })
  const cards = listingCards(products, colors) // one card per colourway
  const cardsIn = (q) => listingCards(queryProducts({ ...q, colors }), colors).length

  // Switching category keeps only the colours that exist in the new category (counts reflect that).
  const carried = (id) => colors.filter((c) => colorFacets(queryProducts({ category: id })).some((f) => f.id === c))
  const categoryLink = (id) => {
    const keep = carried(id)
    const next = new URLSearchParams()
    if (keep.length) next.set('color', keep.join(','))
    if (sort !== 'featured') next.set('sort', sort)
    return categoryHref(id) + (next.toString() ? `?${next}` : '')
  }
  const linkCount = (id) => {
    const keep = carried(id)
    return listingCards(queryProducts({ category: id, colors: keep }), keep).length
  }

  const sections = [
    category
      ? {
          id: 'category',
          label: 'Category',
          kind: 'link',
          options: [{ id: 'all', label: 'All Menswear', count: linkCount(null), href: categoryLink(null), current: false }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: linkCount(c.id), href: categoryLink(c.id), current: c.id === categoryId }))],
        }
      : {
          id: 'category',
          label: 'Category',
          kind: 'check',
          // One category left ticked keeps its sub-categories; otherwise they are reset.
          onToggle: (id) => {
            const next = toggleIn(categories, id)
            setParams({ category: next, style: next.length === 1 && next[0] === categories[0] ? styles : null })
          },
          options: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: cardsIn({ category: c.id }), checked: categories.includes(c.id) })),
        },
    ...(styleCategory
      ? [{
          id: 'style',
          label: 'Subcategory',
          kind: 'check',
          onToggle: (id) => setParams({ style: toggleIn(styles, id) }),
          options: styleCategory.subcategories.map((x) => ({ id: x.id, label: x.label, count: cardsIn({ category: styleCategory.id, style: [x.id] }), checked: styles.includes(x.id) })),
        }]
      : []),
    {
      id: 'color',
      label: 'Colour',
      kind: 'check',
      onToggle: (id) => setParams({ color: toggleIn(colors, id) }),
      options: colorSet.map((f) => ({ id: f.id, label: f.label, hex: f.hex, count: f.count, checked: colors.includes(f.id) })),
    },
  ]
  const activeCount = colors.length + categories.length + styles.length
  const clearAll = () => setParams({ color: null, category: null, style: null })

  const defaultCols = isWide ? (isXL ? 4 : 3) : 2
  const colsNow = (isWide ? view.wide : view.narrow) ?? defaultCols
  const colOptions = isWide ? [2, 3, 4] : [1, 2]

  const tabs = category
    ? [{ id: null, label: 'All', href: basePath + (params.toString() ? `?${new URLSearchParams([...params].filter(([k]) => k !== 'style'))}`.replace(/\?$/, '') : '') }, ...category.subcategories.map((s) => ({ id: s.id, label: s.label, href: `${basePath}?${new URLSearchParams({ ...Object.fromEntries(params), style: s.id })}` }))]
    : [{ id: null, label: 'All', href: '/shop' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, href: categoryHref(c.id) }))]
  const activeTab = styles.length > 1 ? '__multi' : (category ? styles[0] ?? null : null)

  return (
    <section className="fervoro-plp" aria-labelledby="plp-title">
      <header className="fervoro-plp-head">
        <h1 id="plp-title" className="fervoro-plp-title">
          {category ? category.label : 'All Menswear'}
        </h1>
        <nav aria-label={category ? `${category.label} styles` : 'Categories'}>
          <ul className="fervoro-plp-tabs">
            {tabs.map((t) => (
              <li key={t.label}>
                <Link href={t.href} aria-current={t.id === activeTab ? 'page' : undefined} className="fervoro-plp-tab">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="fervoro-plp-layout">
        {isWide && (
          <aside className="fervoro-plp-side" aria-label="Product filters">
            <div className="fervoro-plp-side-head">
              <h2>Filters</h2>
              <button type="button" className="fervoro-plp-side-clear" onClick={clearAll} disabled={activeCount === 0}>
                Clear all
              </button>
            </div>
            <FilterPanel sections={sections} />
          </aside>
        )}
        <div className="fervoro-plp-main">
      <div className="fervoro-plp-bar">
        {!isWide && (
          <button type="button" className="fervoro-plp-filterbtn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            Filters{activeCount ? <span className="fervoro-plp-badge" aria-label={`${activeCount} active`}>{activeCount}</span> : null}
          </button>
        )}
        <p className="fervoro-plp-count" role="status" aria-live="polite">
          {`${cards.length} ${cards.length === 1 ? 'product' : 'products'}`}
        </p>
        <div className="fervoro-plp-tools">
          <label className="fervoro-plp-sort">
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setParams({ sort: e.target.value })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="fervoro-plp-view" role="group" aria-label="Products per row">
            <span aria-hidden="true">View</span>
            {colOptions.map((n) => (
              <button key={n} type="button" aria-pressed={colsNow === n} aria-label={`${n} per row`} onClick={() => setView((v) => ({ ...v, [isWide ? 'wide' : 'narrow']: n }))}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeCount > 0 && (
        <ul className="fervoro-plp-chips" aria-label="Active filters">
          {[...styles.map((id) => ({ key: `s-${id}`, label: styleCategory.subcategories.find((x) => x.id === id).label, off: () => setParams({ style: styles.filter((x) => x !== id) }) })),
            ...categories.map((id) => ({ key: `c-${id}`, label: getCategory(id).label, off: () => setParams({ category: categories.filter((x) => x !== id) }) })),
            ...colors.map((id) => ({ key: `k-${id}`, label: COLOR_FAMILIES.find((f) => f.id === id).label, off: () => setParams({ color: colors.filter((x) => x !== id) }) }))].map((c) => (
            <li key={c.key}>
              <button type="button" onClick={c.off} aria-label={`Remove filter ${c.label}`}>
                {c.label} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="is-clear" onClick={clearAll}>
              Clear all
            </button>
          </li>
        </ul>
      )}

      {cards.length ? (
        <ul className="fervoro-plp-grid" data-wide={view.wide ?? undefined} data-narrow={view.narrow ?? undefined} aria-label="Products">
          {cards.map((c, i) => (
            <ProductCard key={c.key} product={c.product} variant={c.variant} colorCount={c.colorCount} first={c.first} priority={i < 4} />
          ))}
        </ul>
      ) : (
        <div className="fervoro-plp-empty" role="status">
          <p>No products match these filters.</p>
          <button type="button" className="fervoro-cat-all" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      )}

        </div>
      </div>

      {!isWide && <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} sections={sections} count={cards.length} onClear={clearAll} canClear={activeCount > 0} />}
    </section>
  )
}
