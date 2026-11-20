import { useEffect } from 'react'

/**
 * While `active`, prevents the underlying page from scrolling and removes it from the
 * tab order / accessibility tree (`inert` on #main). Scrolling inside the menu is unaffected.
 */
export function usePageLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const html = document.documentElement
    const body = document.body
    // Everything behind the open menu (page content + footer) leaves the tab order / accessibility tree.
    const behind = [document.getElementById('main'), document.getElementById('site-footer')].filter(Boolean)
    const prev = { html: html.style.overflow, body: body.style.overflow }

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    behind.forEach((el) => el.setAttribute('inert', ''))

    return () => {
      html.style.overflow = prev.html
      body.style.overflow = prev.body
      behind.forEach((el) => el.removeAttribute('inert'))
    }
  }, [active])
}
