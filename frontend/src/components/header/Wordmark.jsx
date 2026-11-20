/**
 * FERVORO ITALY wordmark. Centralised so the official SVG logo can be dropped in here later
 * without touching the header layout.
 * The left padding equals the trailing letter-spacing so the glyphs (not the box) are centred.
 */
import Link from '../../router/Link'

export default function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="FERVORO ITALY — home"
      className="fervoro-wordmark rounded-sm font-serif font-medium uppercase leading-none text-forest-900 no-underline"
    >
      FERVORO ITALY
    </Link>
  )
}
