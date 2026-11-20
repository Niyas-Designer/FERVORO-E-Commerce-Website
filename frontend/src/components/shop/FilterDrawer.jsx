import { useEffect, useRef } from 'react'
import FilterPanel from './FilterPanel'
import { CloseIcon } from './icons'

/**
 * Mobile / tablet filter panel (slide-in) built on a modal <dialog> (focus trap, Esc to close and focus return come from the platform).
 * Filters apply instantly; Apply just closes the panel and reports the result count; Clear all resets every filter.
 */
export default function FilterDrawer({ open, onClose, sections, count, onClear, canClear }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="fervoro-filter"
      aria-labelledby="filter-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
    >
      <div className="fervoro-filter-panel">
        <div className="fervoro-filter-head">
          <h2 id="filter-title">Filters</h2>
          <button type="button" className="fervoro-filter-x" onClick={onClose} aria-label="Close filters">
            <CloseIcon />
          </button>
        </div>
        <div className="fervoro-filter-body">
          <FilterPanel sections={sections} />
        </div>
        <div className="fervoro-filter-foot">
          <button type="button" className="fervoro-filter-clear" onClick={onClear} disabled={!canClear}>
            Clear all
          </button>
          <button type="button" className="fervoro-filter-apply" onClick={onClose}>
            {`Apply · ${count} ${count === 1 ? 'product' : 'products'}`}
          </button>
        </div>
      </div>
    </dialog>
  )
}
