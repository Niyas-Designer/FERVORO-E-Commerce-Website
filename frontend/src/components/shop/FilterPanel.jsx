import { useId, useState } from 'react'
import Link from '../../router/Link'
import { CheckIcon } from './icons'

/**
 * Accordion filter sections, shared by the desktop sidebar and the mobile / tablet drawer.
 * Section kinds:
 *  - 'check': multi-select checkboxes (optionally with a colour dot)
 *  - 'link' : single-choice navigation list (category pages)
 */
export default function FilterPanel({ sections }) {
  const uid = useId()
  const [closed, setClosed] = useState({})
  const toggle = (id) => setClosed((c) => ({ ...c, [id]: !c[id] }))

  return (
    <div className="fervoro-fa">
      {sections.map((s) => {
        const open = !closed[s.id]
        const bodyId = `${uid}-${s.id}`
        const selected = s.options.filter((o) => o.checked).length
        return (
          <section key={s.id} className="fervoro-fa-item" data-section={s.id} data-open={open}>
            <h3 className="fervoro-fa-h">
              <button type="button" className="fervoro-fa-btn" aria-expanded={open} aria-controls={bodyId} onClick={() => toggle(s.id)}>
                <span>{s.label}</span>
                {selected > 0 && <span className="fervoro-fa-sel">{selected}</span>}
                <span className="fervoro-fa-chev" aria-hidden="true" />
              </button>
            </h3>
            <div id={bodyId} className="fervoro-fa-body" role="group" aria-label={s.label}>
              <div className="fervoro-fa-inner">
                {s.kind === 'link' ? (
                  <ul>
                    {s.options.map((o) => (
                      <li key={o.id}>
                        <Link href={o.href} className="fervoro-fa-link" aria-current={o.current ? 'page' : undefined}>
                          <span className="fervoro-check-label">{o.label}</span>
                          <span className="fervoro-check-count">{o.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul>
                    {s.options.map((o) => (
                      <li key={o.id}>
                        <label className="fervoro-check">
                          <input type="checkbox" checked={o.checked} onChange={() => s.onToggle(o.id)} />
                          <span className="fervoro-check-box" aria-hidden="true">
                            <CheckIcon />
                          </span>
                          {o.hex && <span className="fervoro-check-dot" style={{ background: o.hex }} aria-hidden="true" />}
                          <span className="fervoro-check-label">{o.label}</span>
                          <span className="fervoro-check-count">{o.count}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
