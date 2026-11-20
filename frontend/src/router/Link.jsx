import { navigate } from './navigation'

/** A plain <a href> that navigates client-side on an ordinary left click; modified clicks keep native behaviour. */
export default function Link({ href, onClick, target, children, ...rest }) {
  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (target && target !== '_self') return
    event.preventDefault()
    navigate(href)
  }
  return (
    <a href={href} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
