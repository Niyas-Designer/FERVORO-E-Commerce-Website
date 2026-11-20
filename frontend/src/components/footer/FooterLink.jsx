import Link from '../../router/Link'

/**
 * Real link when the destination exists; otherwise a focusable, aria-disabled control that does nothing,
 * so the intended navigation structure is visible without a misleading working link.
 */
export default function FooterLink({ label, href }) {
  if (href) {
    return (
      <Link className="fervoro-footer-link" href={href}>
        {label}
      </Link>
    )
  }
  return (
    <button type="button" className="fervoro-footer-link is-pending" aria-disabled="true" title="Coming soon">
      {label}
      <span className="sr-only"> (coming soon)</span>
    </button>
  )
}
