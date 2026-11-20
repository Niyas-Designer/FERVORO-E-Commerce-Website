/* Fine-stroke (1.5px) line icons, 24x24 grid, inheriting currentColor. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
}

export const SearchIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
)

export const AccountIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c.6-3.6 3.5-5.5 7.5-5.5s6.9 1.9 7.5 5.5" />
  </svg>
)

export const WishlistIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 20.2s-7.6-4.6-7.6-10.3A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.6 2.6c0 5.7-7.6 10.3-7.6 10.3Z" />
  </svg>
)

export const BagIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5.2 8h13.6l-.9 12H6.1L5.2 8Z" />
    <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
  </svg>
)

export const ChevronIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
