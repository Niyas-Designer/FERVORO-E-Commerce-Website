import { useEffect } from 'react'
import SiteFooter from './components/footer/SiteFooter'
import SiteHeader from './components/header/SiteHeader'
import { COLLECTION_PAGE, COLLECTION_ROUTE } from './data/collection-page'
import { getCategory, getProduct } from './data/catalog'
import AccountPage from './pages/AccountPage'
import BagPage from './pages/BagPage'
import CollectionPage from './pages/CollectionPage'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import ShopPage from './pages/ShopPage'
import WishlistPage from './pages/WishlistPage'
import { consumePushed, usePath } from './router/navigation'

const HOME_TITLE = 'FERVORO — Where Style Becomes Signature'
const withBrand = (t) => `${t} — FERVORO`

/**
 * Only existing pages are routed; any other path keeps showing the homepage (as before the router existed).
 *   /collection · /shop · /shop/:category · /product/:slug · /wishlist · /bag · /search · /account
 */
function resolve(path) {
  if (path === COLLECTION_ROUTE) return { element: <CollectionPage />, title: COLLECTION_PAGE.documentTitle }
  if (path === '/wishlist') return { element: <WishlistPage />, title: withBrand('Wishlist') }
  if (path === '/bag') return { element: <BagPage />, title: withBrand('Shopping bag') }
  if (path === '/search') return { element: <SearchPage />, title: withBrand('Search') }
  if (path === '/account') return { element: <AccountPage />, title: withBrand('Account') }
  if (path === '/shop') return { element: <ShopPage />, title: withBrand('All Menswear') }
  let m = path.match(/^\/shop\/([^/]+)$/)
  if (m) {
    const category = getCategory(m[1])
    return { element: <ShopPage key={m[1]} categoryId={m[1]} />, title: withBrand(category ? category.label : 'Collection not found') }
  }
  m = path.match(/^\/product\/([^/]+)$/)
  if (m) {
    const product = getProduct(m[1])
    return { element: <ProductPage key={m[1]} slug={m[1]} />, title: withBrand(product ? product.name : 'Product not found') }
  }
  return { element: <HomePage />, title: HOME_TITLE }
}

export default function App() {
  const path = usePath()
  const { element, title } = resolve(path)

  useEffect(() => {
    document.title = title
    // After a link click start at the top and move focus to the new page (keyboard / screen-reader users);
    // back/forward keep the browser's own scroll restoration.
    if (consumePushed()) {
      window.scrollTo(0, 0)
      document.getElementById('main')?.focus({ preventScroll: true })
    }
  }, [path, title])

  return (
    <>
      <a href="#main" className="fervoro-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="fervoro-main">
        {element}
      </main>
      <SiteFooter />
    </>
  )
}
