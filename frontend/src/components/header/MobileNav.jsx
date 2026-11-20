import { useCallback, useEffect, useRef, useState } from 'react'
import { MEN_CATEGORIES } from '../../data/categories'
import { usePageLock } from '../../hooks/usePageLock'
import Link from '../../router/Link'
import CategoryCard from './CategoryCard'
import Carousel from './Carousel'
import { ChevronIcon } from './icons'
import { UTILITY_ITEMS } from './utilityItems'

/* Search / Account / Wishlist moved out of the compact header into the menu. */
const MENU_UTILITIES = UTILITY_ITEMS.filter((i) => i.key !== 'bag')

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* While the accordion animates (previous row collapsing above, new row expanding),
   keep the selected row's title – and as much of its carousel as fits – in view. */
function keepRowInView(panel, row) {
  if (!panel || !row) return
  const duration = prefersReducedMotion() ? 0 : 480
  const start = performance.now()
  let stopped = false
  const stop = () => {
    stopped = true
  }
  panel.addEventListener('touchstart', stop, { once: true, passive: true })
  panel.addEventListener('wheel', stop, { once: true, passive: true })

  const step = (now) => {
    if (stopped || !panel.isConnected) return
    const p = panel.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    let delta = 0
    if (r.top < p.top + 8) delta = r.top - (p.top + 8)
    else if (r.bottom > p.bottom) delta = Math.min(r.bottom - p.bottom, r.top - (p.top + 8))
    if (delta) panel.scrollTop += delta
    if (now - start < duration + 80) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * Mobile / tablet navigation: hamburger toggle + full-screen panel containing an
 * accordion (one category open at a time) whose body is a swipeable image carousel.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [panelTop, setPanelTop] = useState(0)
  const buttonRef = useRef(null)
  const scrollRef = useRef(null)

  usePageLock(open)

  const measure = useCallback(() => {
    const header = buttonRef.current?.closest('header')
    if (header) setPanelTop(Math.round(header.getBoundingClientRect().bottom))
  }, [])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    setActiveId(null)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  const toggle = () => {
    if (open) return close(false)
    measure() // panel starts exactly below the header, wherever the page is scrolled
    setOpen(true)
  }

  // Escape closes; keep the panel flush under the header on resize / rotation.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close(true)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    const header = buttonRef.current?.closest('header')
    const ro = header ? new ResizeObserver(measure) : null
    if (header) ro.observe(header)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      ro?.disconnect()
    }
  }, [open, close, measure])

  const onCategoryClick = (id, e) => {
    const next = activeId === id ? null : id
    setActiveId(next)
    if (next) keepRowInView(scrollRef.current, e.currentTarget.closest('li'))
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="fervoro-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        data-open={open}
        onClick={toggle}
      >
        <span className="fervoro-burger-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Men's categories"
          className="fervoro-mobile-panel"
          style={{ top: panelTop }}
        >
          {/* Independently scrollable category list; the utility bar below stays anchored. */}
          <div ref={scrollRef} className="fervoro-mobile-scroll">
          <p className="fervoro-eyebrow px-5 pb-2 pt-7">Men</p>
          <ul className="fervoro-accordion">
            {MEN_CATEGORIES.map((cat) => {
              const expanded = activeId === cat.id
              return (
                <li key={cat.id} className="fervoro-acc-item">
                  <h2>
                    <button
                      type="button"
                      id={`acc-btn-${cat.id}`}
                      className="fervoro-acc-trigger"
                      aria-expanded={expanded}
                      aria-controls={`acc-region-${cat.id}`}
                      onClick={(e) => onCategoryClick(cat.id, e)}
                    >
                      <span className="fervoro-acc-label">{cat.label}</span>
                      <ChevronIcon className="fervoro-acc-chevron" />
                    </button>
                  </h2>
                  <div
                    id={`acc-region-${cat.id}`}
                    role="region"
                    aria-labelledby={`acc-btn-${cat.id}`}
                    className="fervoro-acc-region"
                    data-open={expanded}
                    inert={!expanded}
                  >
                    <div className="fervoro-acc-inner">
                      <Carousel label={`${cat.label} collections`}>
                        {cat.items.map((item) => (
                          <li key={item.id}>
                            <CategoryCard
                              item={item}
                              sizes="(min-width: 640px) 210px, 52vw"
                              onSelect={() => close()}
                            />
                          </li>
                        ))}
                      </Carousel>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          </div>

          <div className="fervoro-mobile-utils" role="group" aria-label="Search, account and wishlist">
            {MENU_UTILITIES.map(({ key, label, href, Icon }) => (
              <Link key={key} href={href} className="fervoro-mobile-util" onClick={() => close(false)}>
                <Icon className="fervoro-mobile-util-icon" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
