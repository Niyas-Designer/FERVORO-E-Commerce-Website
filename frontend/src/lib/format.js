const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const PRICE_PENDING_LABEL = 'Price to be confirmed'

/** True when a catalogue price has a usable amount (preview or verified). Pending prices have `amount: null`. */
export const hasPrice = (price) => typeof price?.amount === 'number'

/** "₹2,490" from a catalogue price `{ amount, currency }`; "Price to be confirmed" when no amount exists yet. */
export const formatPrice = (price) => {
  if (!hasPrice(price)) return PRICE_PENDING_LABEL
  return price.currency === 'INR'
    ? money.format(price.amount)
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: price.currency, maximumFractionDigits: 0 }).format(price.amount)
}
