import { useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '../shop/icons'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Product photographs. ≥1024px: editorial two-column grid of every photograph. Below: one swipeable strip with arrows
 * and a counter. Either way a photograph opens in a zoom dialog (arrow keys / buttons, Esc to close).
 * Tier-1 photographs come first (the order is decided in data/catalog.js).
 */
export default function Gallery({ images, name }) {
  const trackRef = useRef(null)
  const dialogRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(null)
  const n = images.length

  const onScroll = () => {
    const t = trackRef.current
    if (t && t.clientWidth && getComputedStyle(t).display === 'flex') setIndex(Math.round(t.scrollLeft / t.clientWidth))
    else if (t) setIndex(0)
  }
  const go = (dir) => {
    const t = trackRef.current
    const next = Math.min(Math.max(index + dir, 0), n - 1)
    if (t && next !== index) t.scrollTo({ left: next * t.clientWidth, behavior: reduced() ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (zoom !== null && !d.open) d.showModal()
    if (zoom === null && d.open) d.close()
  }, [zoom])

  const step = (dir) => setZoom((z) => (z + dir + n) % n)
  const onKey = (e) => {
    if (e.key === 'ArrowRight') step(1)
    if (e.key === 'ArrowLeft') step(-1)
  }
  const current = zoom === null ? null : images[zoom]

  return (
    <div className="fervoro-pdp-gallery">
      <ul ref={trackRef} className="fervoro-pdp-slides" data-count={n} onScroll={onScroll} aria-label={`${name} photographs`}>
        {images.map((img, i) => (
          <li key={img.src} className="fervoro-pdp-slide" data-tier={img.tier}>
            <button type="button" className="fervoro-pdp-zoom" onClick={() => setZoom(i)} aria-label={`Enlarge photo ${i + 1} of ${n}: ${img.view}`} aria-haspopup="dialog">
              <img
                src={img.src}
                srcSet={img.srcSet}
                sizes="(min-width: 1024px) 30vw, 100vw"
                width={img.width}
                height={img.height}
                alt={img.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding="async"
                draggable="false"
              />
            </button>
          </li>
        ))}
      </ul>

      {n > 1 && (
        <div className="fervoro-pdp-pager">
          <button type="button" aria-label="Previous photo" aria-disabled={index === 0} onClick={() => go(-1)}>
            <ArrowLeftIcon />
          </button>
          <span role="status" aria-live="polite">{`${index + 1} / ${n}`}</span>
          <button type="button" aria-label="Next photo" aria-disabled={index === n - 1} onClick={() => go(1)}>
            <ArrowRightIcon />
          </button>
        </div>
      )}

      <dialog ref={dialogRef} className="fervoro-zoom" aria-label={`${name} photo viewer`} onClose={() => setZoom(null)} onKeyDown={onKey} onClick={(e) => e.target === dialogRef.current && setZoom(null)}>
        {current && (
          <div className="fervoro-zoom-inner">
            <img src={current.full} alt={current.alt} />
            <button type="button" className="fervoro-zoom-x" aria-label="Close photo viewer" onClick={() => setZoom(null)}>
              <CloseIcon />
            </button>
            {n > 1 && (
              <>
                <button type="button" className="fervoro-zoom-nav is-prev" aria-label="Previous photo" onClick={() => step(-1)}>
                  <ArrowLeftIcon />
                </button>
                <button type="button" className="fervoro-zoom-nav is-next" aria-label="Next photo" onClick={() => step(1)}>
                  <ArrowRightIcon />
                </button>
                <p className="fervoro-zoom-count" role="status">{`${zoom + 1} / ${n}`}</p>
              </>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
