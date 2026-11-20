import CategorySection from '../components/collection-page/CategorySection'
import IntroSection from '../components/collection-page/IntroSection'
import HeroBanner from '../components/hero/HeroBanner'
import { COLLECTION_HERO, COLLECTION_SECTIONS } from '../data/collection-page'

/** Collection landing page (`/collection`): hero, FERVORO intro, then one product section per category. */
export default function CollectionPage() {
  return (
    <>
      <HeroBanner content={COLLECTION_HERO} />
      <IntroSection />
      {COLLECTION_SECTIONS.map((section) => (
        <CategorySection key={section.id} section={section} />
      ))}
    </>
  )
}
