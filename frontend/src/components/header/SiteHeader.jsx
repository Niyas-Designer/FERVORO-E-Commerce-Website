import { DESKTOP_QUERY } from '../../data/categories'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import DesktopNav from './DesktopNav'
import MobileNav from './MobileNav'
import UtilityIcons from './UtilityIcons'
import Wordmark from './Wordmark'

function AnnouncementBar() {
  return (
    <div className="fervoro-announce">
      <p>Where Style Becomes Signature…</p>
    </div>
  )
}

/**
 * Three-column grid `1fr auto 1fr` keeps the wordmark exactly centred in the viewport
 * regardless of the width of the left / right controls.
 */
export default function SiteHeader() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <>
      <AnnouncementBar />
      <header className="fervoro-header">
        <div className="fervoro-header-grid">
          <div className="justify-self-start">{isDesktop ? <DesktopNav /> : <MobileNav />}</div>
          <Wordmark />
          <UtilityIcons compact={!isDesktop} />
        </div>
      </header>
    </>
  )
}
