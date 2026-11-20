import { useSyncExternalStore } from 'react'

const connection = () => (typeof navigator !== 'undefined' ? navigator.connection : undefined)

function snapshot() {
  const c = connection()
  const slow = !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-data: reduce)').matches
  return slow || reduced
}

/** True when the visitor asked to save data (Save-Data / prefers-reduced-data) or is on a 2G-class connection. */
export function useSaveData() {
  return useSyncExternalStore(
    (onChange) => {
      const c = connection()
      c?.addEventListener?.('change', onChange)
      return () => c?.removeEventListener?.('change', onChange)
    },
    snapshot,
    () => false,
  )
}
