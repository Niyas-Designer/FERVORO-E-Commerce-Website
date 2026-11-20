import { useSyncExternalStore } from 'react'

/**
 * Minimal History-API navigation (no extra dependency). Only the pages that exist are routed in App.jsx;
 * every other path keeps rendering the homepage exactly as before.
 */
const EVENT = 'fervoro:navigate'
let pushed = false

export const normalizePath = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path) || '/'

const subscribe = (onChange) => {
  window.addEventListener('popstate', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

/** Current pathname, re-rendering subscribers on every client-side navigation (including back/forward). */
export const usePath = () => useSyncExternalStore(subscribe, () => normalizePath(window.location.pathname), () => '/')

/** Current query string as URLSearchParams (stable between renders while the string is unchanged). */
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => '')
  return new URLSearchParams(search)
}

/**
 * Client-side navigation to a same-origin URL; anything else falls back to a normal page load.
 * `replace` swaps the current history entry (used for filter / sort / colour changes so Back leaves the page).
 */
export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, window.location.href)
  if (url.origin !== window.location.origin) {
    window.location.assign(url.href)
    return
  }
  const next = url.pathname + url.search + url.hash
  if (next === window.location.pathname + window.location.search + window.location.hash) return
  // Only a change of page scrolls to the top / moves focus (see consumePushed); in-page query changes do not.
  pushed = !replace && normalizePath(url.pathname) !== normalizePath(window.location.pathname)
  const idx = window.history.state?.idx ?? 0
  window.history[replace ? 'replaceState' : 'pushState']({ idx: replace ? idx : idx + 1 }, '', next)
  window.dispatchEvent(new Event(EVENT))
}

/** True once after a link-driven page change (not for back/forward, which keep the browser's scroll position). */
export function consumePushed() {
  const was = pushed
  pushed = false
  return was
}

/**
 * Back that always works: steps back through the app's own history when there is an earlier in-app page
 * (every client-side push records `history.state.idx`), otherwise goes to `fallback` (a deep link opened in a new tab).
 */
export function goBack(fallback = '/') {
  if ((window.history.state?.idx ?? 0) > 0) window.history.back()
  else navigate(fallback)
}
