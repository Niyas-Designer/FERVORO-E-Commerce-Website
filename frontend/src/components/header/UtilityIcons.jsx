import { useBag } from '../../state/bag'
import { useWishlist } from '../../state/wishlist'
import Link from '../../router/Link'
import { usePath } from '../../router/navigation'
import { UTILITY_ITEMS } from './utilityItems'

/** Header controls. `compact` (mobile/tablet) shows wishlist + bag; search and account live in the menu. */
export default function UtilityIcons({ compact = false }) {
  const path = usePath()
  const { ids } = useWishlist()
  const { count: bagCount } = useBag()
  const counts = { wishlist: ids.length, bag: bagCount }
  const items = compact ? UTILITY_ITEMS.filter((i) => i.key === 'wishlist' || i.key === 'bag') : UTILITY_ITEMS
  return (
    <div className="fervoro-utils justify-self-end" role="group" aria-label={compact ? 'Wishlist and bag' : 'Utilities'}>
      {items.map(({ key, label, href, Icon }) => {
        const n = counts[key] ?? 0
        const unit = key === 'bag' ? 'item' : 'saved item'
        return (
          <Link
            key={key}
            href={href}
            className="fervoro-util-btn"
            data-util={key}
            aria-current={path === href ? 'page' : undefined}
            aria-label={n ? `${label}, ${n} ${unit}${n === 1 ? '' : 's'}` : label}
          >
            <span className="fervoro-util-wrap">
              <Icon className="fervoro-util-icon" data-filled={key === 'wishlist' && n > 0 ? 'true' : undefined} />
              {n > 0 && <span className="fervoro-util-badge" aria-hidden="true">{n > 99 ? '99+' : n}</span>}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
