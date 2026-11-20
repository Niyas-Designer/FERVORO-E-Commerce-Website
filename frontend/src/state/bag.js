import { useSyncExternalStore } from 'react'

/**
 * Shopping bag (frontend only, like the wishlist): lines live in this browser's localStorage — no account, server,
 * stock check or checkout exists yet. A line is `{ key, productId, variantId, size, qty }`; names, images and prices are
 * always read from the catalogue, never stored. Storage access is guarded; the in-memory bag works without it.
 */
const KEY = 'fervoro:bag:v1'
const MAX_QTY = 10
const listeners = new Set()
const EMPTY = []

const read = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY))
    return Array.isArray(raw)
      ? raw.filter((l) => l && typeof l.key === 'string' && typeof l.productId === 'string' && typeof l.variantId === 'string' && Number.isInteger(l.qty) && l.qty > 0)
      : []
  } catch {
    return []
  }
}
let lines = typeof window === 'undefined' ? EMPTY : read()

const commit = (next) => {
  lines = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* storage unavailable: keep the in-memory bag */
  }
  listeners.forEach((l) => l())
}
const subscribe = (onChange) => {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export const lineKey = (productId, variantId, size = null) => `${productId}|${variantId}|${size ?? ''}`

export function addToBag(product, variantId, size = null, qty = 1) {
  const key = lineKey(product.id, variantId, size)
  const found = lines.find((l) => l.key === key)
  commit(found
    ? lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
    : [...lines, { key, productId: product.id, variantId, size, qty: Math.min(MAX_QTY, qty) }])
}
export const setQty = (key, qty) => commit(qty < 1 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)))
export const removeLine = (key) => commit(lines.filter((l) => l.key !== key))

/** `{ lines, count }` (count = total units) — re-renders on every change. */
export function useBag() {
  const current = useSyncExternalStore(subscribe, () => lines, () => EMPTY)
  return { lines: current, count: current.reduce((n, l) => n + l.qty, 0), MAX_QTY }
}
