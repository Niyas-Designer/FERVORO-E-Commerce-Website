const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' }

export const HeartIcon = ({ filled = false, ...props }) => (
  <svg {...base} {...props} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.2s-7.6-4.6-7.6-10.3A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.6 2.6c0 5.7-7.6 10.3-7.6 10.3Z" />
  </svg>
)
export const ArrowLeftIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </svg>
)
export const ArrowRightIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </svg>
)
export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)
export const CheckIcon = (props) => (
  <svg {...base} strokeWidth={2} {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
