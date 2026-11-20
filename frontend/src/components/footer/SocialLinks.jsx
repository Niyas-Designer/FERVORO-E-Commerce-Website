import { SOCIAL_LINKS } from '../../data/footer'
import { SOCIAL_ICONS } from './socialIcons'

/** Only verified destinations become links; unconfigured profiles render as inert, clearly labelled controls. */
export default function SocialLinks() {
  return (
    <ul className="fervoro-footer-social" aria-label="FERVORO on social media">
      {SOCIAL_LINKS.map(({ id, label, url }) => {
        const Icon = SOCIAL_ICONS[id]
        return (
          <li key={id}>
            {url ? (
              <a className="fervoro-footer-social-item" href={url} target="_blank" rel="noopener noreferrer" aria-label={`FERVORO on ${label} (opens in a new tab)`}>
                <Icon />
              </a>
            ) : (
              <button type="button" className="fervoro-footer-social-item is-pending" aria-disabled="true" aria-label={`FERVORO on ${label} (profile link not available yet)`} title="Coming soon">
                <Icon />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
