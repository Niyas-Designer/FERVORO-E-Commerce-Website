import { SHOWCASE_PANELS } from '../../data/categories-showcase'
import CategoryPanel from './CategoryPanel'

/** Full-width, two-panel editorial category section (Men · Boys) shown directly below the hero. */
export default function CategoryShowcase() {
  return (
    <section className="fervoro-showcase" aria-label="Shop by category">
      {SHOWCASE_PANELS.map((panel) => (
        <CategoryPanel key={panel.id} panel={panel} />
      ))}
    </section>
  )
}
