import { AccountIcon, BagIcon, SearchIcon, WishlistIcon } from './icons'

/** Header / menu utilities. Each one is a real page: /search, /account, /wishlist, /bag. */
export const UTILITY_ITEMS = [
  { key: 'search', label: 'Search', href: '/search', Icon: SearchIcon },
  { key: 'account', label: 'Account', href: '/account', Icon: AccountIcon },
  { key: 'wishlist', label: 'Wishlist', href: '/wishlist', Icon: WishlistIcon },
  { key: 'bag', label: 'Shopping bag', href: '/bag', Icon: BagIcon },
]
