import { useId, useState } from 'react'
import { ChevronIcon } from '../header/icons'
import FooterLink from './FooterLink'

/**
 * One link column. On phones (`collapsible`) it is an accessible accordion group; from tablet up it is a
 * plain, always-open column with a static heading.
 */
export default function FooterColumn({ column, collapsible }) {
  const [open, setOpen] = useState(false)
  const uid = useId()
  const regionId = `${uid}-region`
  const expanded = !collapsible || open

  return (
    <div className="fervoro-footer-col" data-collapsible={collapsible}>
      <nav aria-label={column.title}>
        <h2 className="fervoro-footer-title">
          {collapsible ? (
            <button
              type="button"
              className="fervoro-footer-acc"
              aria-expanded={open}
              aria-controls={regionId}
              onClick={() => setOpen((o) => !o)}
            >
              <span>{column.title}</span>
              <ChevronIcon className="fervoro-footer-chevron" />
            </button>
          ) : (
            column.title
          )}
        </h2>
        <div id={regionId} className="fervoro-footer-region" data-open={expanded} inert={!expanded}>
          <ul className="fervoro-footer-links">
            {column.links.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  )
}
