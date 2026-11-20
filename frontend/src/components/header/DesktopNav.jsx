import { useCallback, useEffect, useRef, useState } from 'react'
import { MEN_CATEGORIES } from '../../data/categories'
import Link from '../../router/Link'
import CategoryCard from './CategoryCard'

const HOVER_OPEN_DELAY = 90
const HOVER_CLOSE_DELAY = 180
const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** Desktop / large-laptop navigation: "MEN" trigger + editorial category mega menu. */
export default function DesktopNav() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(MEN_CATEGORIES[0].id)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const timer = useRef(0)
  const openedBy = useRef('click') // 'click' | 'hover'

  const clearTimer = () => window.clearTimeout(timer.current)

  const close = useCallback((restoreFocus = false) => {
    window.clearTimeout(timer.current)
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const focusFirstCategory = () =>
    requestAnimationFrame(() => listRef.current?.querySelector('button')?.focus())

  const onTriggerClick = (e) => {
    clearTimer()
    const byKeyboard = e.detail === 0
    if (open && openedBy.current === 'hover' && !byKeyboard) {
      openedBy.current = 'click' // pin it open after a hover-open, instead of flickering shut
      return
    }
    if (open) return close()
    openedBy.current = 'click'
    setOpen(true)
    if (byKeyboard) focusFirstCategory()
  }

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      openedBy.current = 'click'
      setOpen(true)
      focusFirstCategory()
    }
  }

  const onEnter = () => {
    if (!canHover()) return
    clearTimer()
    if (!open) {
      timer.current = window.setTimeout(() => {
        openedBy.current = 'hover'
        setOpen(true)
      }, HOVER_OPEN_DELAY)
    }
  }

  const onLeave = () => {
    if (!canHover()) return
    clearTimer()
    if (open && openedBy.current === 'hover') {
      timer.current = window.setTimeout(() => close(), HOVER_CLOSE_DELAY)
    }
  }

  const onBlur = (e) => {
    // Close when focus leaves the whole menu area (trigger + panel).
    if (open && !e.currentTarget.contains(e.relatedTarget)) close()
  }

  const onListKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const buttons = [...listRef.current.querySelectorAll('button')]
    const i = buttons.indexOf(document.activeElement)
    if (i < 0) return
    e.preventDefault()
    const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length
    buttons[next].focus()
  }

  const active = MEN_CATEGORIES.find((c) => c.id === activeId) ?? MEN_CATEGORIES[0]

  return (
    <div className="contents" onMouseEnter={onEnter} onMouseLeave={onLeave} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="fervoro-men-trigger"
        aria-expanded={open}
        aria-controls="mega-menu"
        aria-haspopup="true"
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        data-open={open}
      >
        Men
      </button>

      {open && (
        <>
          <div className="fervoro-scrim" aria-hidden="true" onClick={() => close()} onMouseEnter={onLeave} />
          <div id="mega-menu" className="fervoro-mega" aria-label="Men's categories" onMouseEnter={clearTimer}>
            <div className="fervoro-mega-grid">
              <nav aria-label="Men's categories" className="fervoro-mega-list">
                <ul ref={listRef} onKeyDown={onListKeyDown}>
                  {MEN_CATEGORIES.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        className="fervoro-mega-cat"
                        aria-current={cat.id === activeId ? 'true' : undefined}
                        onMouseEnter={() => setActiveId(cat.id)}
                        onFocus={() => setActiveId(cat.id)}
                        onClick={() => setActiveId(cat.id)}
                      >
                        {cat.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <section key={active.id} className="fervoro-mega-panel" aria-labelledby="mega-heading">
                <h2 id="mega-heading" className="fervoro-eyebrow">
                  <Link href={`/shop/${active.id}`} onClick={() => close()} className="fervoro-eyebrow-link">
                    {active.heading}
                  </Link>
                </h2>
                <hr className="fervoro-hairline" />
                <ul className="fervoro-mega-cards" style={{ '--n': active.items.length }}>
                  {active.items.map((item) => (
                    <li key={item.id}>
                      <CategoryCard
                        item={item}
                        eager
                        sizes="(min-width: 1024px) 18vw, 25vw"
                        onSelect={() => close()}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
