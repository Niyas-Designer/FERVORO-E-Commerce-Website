import Link from '../router/Link'
import { useBag } from '../state/bag'
import { useWishlist } from '../state/wishlist'

/**
 * `/account` — account entry point. Customer accounts (sign-in, orders, addresses) are not built yet, so this page says
 * so honestly instead of showing a fake login form, and links to the parts that do work on this device.
 */
export default function AccountPage() {
  const { ids } = useWishlist()
  const { count } = useBag()
  return (
    <section className="fervoro-plp fervoro-account" aria-labelledby="account-title">
      <header className="fervoro-plp-head">
        <h1 id="account-title" className="fervoro-plp-title">Account</h1>
        <p className="fervoro-page-sub">Sign-in and customer accounts aren't available yet.</p>
      </header>
      <ul className="fervoro-account-list">
        <li><Link href="/wishlist">Wishlist <span>{ids.length} saved on this device</span></Link></li>
        <li><Link href="/bag">Shopping bag <span>{count} {count === 1 ? 'item' : 'items'} on this device</span></Link></li>
        <li><Link href="/shop">Continue shopping <span>Browse the full collection</span></Link></li>
      </ul>
    </section>
  )
}
