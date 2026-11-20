import { useSyncExternalStore } from 'react'

/**
 * Wishlist foundation (frontend only). Saved product ids live in this browser's localStorage — there is no account,
 * server or sync, and it must not be presented as a customer wishlist yet. Reads/writes are guarded because storage can
 * throw (private windows, blocked site data); the in-memory list keeps working either way.
 */
const KEY = 'fervoro:wishlist:v1'
const listeners = new Set()
const EMPTY = []

const read = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}
let ids = typeof window === 'undefined' ? EMPTY : read()

const subscribe = (onChange) => {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function toggleWishlist(id) {
  ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* storage unavailable: keep the in-memory list */
  }
  listeners.forEach((l) => l())
}

/** `{ has(id), toggle(id), ids }` — re-renders on every change. */
export function useWishlist() {
  const current = useSyncExternalStore(subscribe, () => ids, () => EMPTY)
  return { ids: current, has: (id) => current.includes(id), toggle: toggleWishlist }
}
