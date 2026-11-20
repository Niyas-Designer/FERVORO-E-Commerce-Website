import Link from '../../router/Link'

/** Friendly dead-end for an unknown category or product (the router keeps the rest of the site intact). */
export default function NotFoundState({ title, message, href = '/shop', label = 'Browse the collection' }) {
  return (
    <section className="fervoro-notfound" aria-labelledby="notfound-title">
      <h1 id="notfound-title">{title}</h1>
      <p>{message}</p>
      <Link href={href} className="fervoro-cat-all">
        {label}
      </Link>
    </section>
  )
}
