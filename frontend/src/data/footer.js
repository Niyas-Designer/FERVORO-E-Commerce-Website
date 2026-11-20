/**
 * Footer content. A link with `href: null` is a planned destination that has no page yet: it keeps its
 * place in the navigation structure but renders as a non-navigating, aria-disabled control (never a
 * dead or misleading link). Set `href` once the page exists and it becomes a normal link automatically.
 */
export const FOOTER_COLUMNS = [
  {
    id: 'about',
    title: 'About FERVORO',
    links: [
      { label: 'About Us', href: null },
      { label: 'Our Story', href: null },
      { label: 'Our Collections', href: null },
      { label: 'Contact Us', href: null },
      { label: 'Privacy Policy', href: null },
      { label: 'Terms & Conditions', href: null },
    ],
  },
  {
    id: 'account',
    title: 'My Account',
    links: [
      { label: 'My Account', href: '/account' },
      { label: 'My Orders', href: null },
      { label: 'Track Order', href: null },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Shopping Bag', href: '/bag' },
    ],
  },
  {
    id: 'service',
    title: 'Customer Service',
    links: [
      { label: 'Help & Support', href: null },
      { label: 'Shipping Information', href: null },
      { label: 'Returns & Exchanges', href: null },
      { label: 'FAQs', href: null },
      { label: 'Size Guide', href: null },
      { label: 'Contact Support', href: null },
    ],
  },
]

export const NEWSLETTER = {
  title: 'Stay Connected',
  description: 'Discover the latest collections, refined essentials, and exclusive updates from FERVORO.',
  privacy: 'By subscribing, you agree to receive updates from FERVORO. You can unsubscribe at any time.',
  button: 'Subscribe',
}

/** Official profile URLs are not available in the project yet: `url: null` = not configured (no link is rendered). */
export const SOCIAL_LINKS = [
  { id: 'instagram', label: 'Instagram', url: null },
  { id: 'facebook', label: 'Facebook', url: null },
  { id: 'youtube', label: 'YouTube', url: null },
  { id: 'pinterest', label: 'Pinterest', url: null },
]

export const COPYRIGHT_YEAR = new Date().getFullYear()
