/* Minimal, consistent 24×24 outline icons (1.5px stroke, currentColor). */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export const InstagramIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
)

export const FacebookIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V8.5z" />
  </svg>
)

export const YouTubeIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="3.5" />
    <path d="M10.2 9.4v5.2l4.4-2.6-4.4-2.6z" />
  </svg>
)

export const PinterestIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10.6 16.4 12.2 9.6M9.8 13.2c-.5-2 .8-4.2 3-4.2 1.7 0 2.6 1.2 2.6 2.6 0 1.8-1.1 3.2-2.5 3.2-.8 0-1.3-.6-1.1-1.4" />
  </svg>
)

export const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
}
