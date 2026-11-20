import { COPYRIGHT_YEAR, FOOTER_COLUMNS } from '../../data/footer'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import FooterColumn from './FooterColumn'
import NewsletterForm from './NewsletterForm'
import SocialLinks from './SocialLinks'

const PHONE_QUERY = '(max-width: 639px)'

export default function SiteFooter() {
  const isPhone = useMediaQuery(PHONE_QUERY)
  return (
    <footer id="site-footer" className="fervoro-footer">
      <div className="fervoro-footer-grid">
        {FOOTER_COLUMNS.map((column) => (
          <FooterColumn key={column.id} column={column} collapsible={isPhone} />
        ))}
        <div className="fervoro-footer-col fervoro-footer-col-news">
          <NewsletterForm />
        </div>
      </div>

      <div className="fervoro-footer-band">
        <SocialLinks />
      </div>

      <p className="fervoro-footer-copy">© {COPYRIGHT_YEAR} FERVORO. All rights reserved.</p>
    </footer>
  )
}
