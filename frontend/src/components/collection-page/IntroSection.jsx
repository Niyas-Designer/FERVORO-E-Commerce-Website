import { COLLECTION_PAGE } from '../../data/collection-page'

/** Short, centred brand statement under the hero. */
export default function IntroSection() {
  const { eyebrow, text } = COLLECTION_PAGE.intro
  return (
    <section className="fervoro-intro" aria-labelledby="fervoro-intro-title">
      <h2 id="fervoro-intro-title" className="fervoro-intro-eyebrow">
        {eyebrow}
      </h2>
      <p className="fervoro-intro-text">{text}</p>
      <span className="fervoro-intro-rule" aria-hidden="true" />
    </section>
  )
}
