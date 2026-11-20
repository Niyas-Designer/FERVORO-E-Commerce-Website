import CategoryShowcase from '../components/categories/CategoryShowcase'
import CollectionSlider from '../components/collections/CollectionSlider'
import HeroBanner from '../components/hero/HeroBanner'
import MotionSection from '../components/motion/MotionSection'

/** Homepage: hero + Men/Boys category section + FERVORO IN MOTION placeholder + collection slider. */
export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryShowcase />
      <MotionSection />
      <CollectionSlider />
    </>
  )
}
