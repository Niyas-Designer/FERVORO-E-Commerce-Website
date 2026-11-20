import { MEN_CATEGORIES } from './categories'
import { PHOTO_PRODUCTS } from './photo-catalog'

/**
 * FERVORO catalogue — the single source for navigation, collection page, listing pages and product pages.
 *
 * PROTOTYPE DATA (frontend only): the backend has no product API yet (only /api/health). Nothing here is a production
 * record. What is real and what is not:
 *  - Names / category / subcategory: the approved structure (data/categories.js).
 *  - Photographs: real project files, mapped by folder / file name (see IMAGE PRIORITY below).
 *  - Colour: the colourway *visible in the photograph* (name and swatch chosen from the picture, not from a SKU).
 *  - Price: PLACEHOLDER (status 'preview') — shown with a "preview price" note, never sortable/filterable.
 *  - Sizes, stock, composition, care, measurements: NOT PROVIDED → `null`. The UI shows explicit unavailable states and
 *    Add to Bag stays disabled until a product has verified purchasable data (see isPurchasable()).
 *
 * IMAGE PRIORITY (decided with the owner) — strict, in this order:
 *   tier 1  public/Important 1/*   genuine studio + outdoor photography (highest priority)      → public/catalog/i1/*
 *   tier 2  public/Important 2/*   genuine studio photography, expands the catalogue            → public/catalog/i2/*
 *   tier 3  public/products/*      earlier product images (supplement; products not in tiers 1–2)
 *   tier 4  public/images/nav/*    approved navigation reference imagery — used ONLY where no genuine photo exists
 * "Featured" order = tier of the product's primary image, then `order`, then slug (fully deterministic). A garment shot in
 * several folders is ONE record: its primary image comes from the highest-priority source, the rest stay in its gallery.
 * The originals are never renamed, moved, overwritten or deleted; web derivatives are generated into public/catalog by
 * scripts/build-catalog-photos.py, which also emits src/data/photo-catalog.js (tiers 1–2).
 *
 * Tier 4 reference products (the original 16 placeholders) are dropped wherever a genuine photograph now exists for the
 * same category + sub-category (see isSuperseded below); the rest stay flagged `assetSource: 'reference'`.
 * PRICES: only the original reference / products-folder items carry a PLACEHOLDER price (status 'preview'). Everything
 * else has `price.status: 'pending'` (no amount) and shows "Price to be confirmed".
 */

export const CATALOG_ASSET_STATUS = {
  tier1Dir: '/catalog/i1', // Important 1
  tier2Dir: '/catalog/i2', // Important 2
  tier3Dir: '/products',
  tier4Dir: '/images/nav',
}

/* ── Images ─────────────────────────────────────────────────────────── */
const NAV = '/images/nav'
const PRODUCTS = '/products'

/** Tier 4 — approved reference photoshoot image (public/images/nav/<slug>-{480,900}.webp, 900×1192). */
const navImage = (slug, alt) => ({
  tier: 4,
  view: 'Photoshoot',
  src: `${NAV}/${slug}-480.webp`,
  srcSet: `${NAV}/${slug}-480.webp 480w, ${NAV}/${slug}-900.webp 900w`,
  full: `${NAV}/${slug}-900.webp`,
  width: 900,
  height: 1192,
  alt,
})

/**
 * Tier 3 — public/products/<group>/<file>.webp. `big` files exist as `<file>-sm.webp` (600×800) + `<file>.webp`
 * (1200×1600); the others exist once at their native size (≈ 450–565 px wide).
 */
const productImage = (group, file, view, alt, dims) => {
  const base = `${PRODUCTS}/${group}/${file}`
  const [w, h] = dims ?? [1200, 1600]
  // Large originals ship as `<file>-sm.webp` (600 px) + `<file>.webp`; smaller originals (< 1000 px wide) exist once at native size.
  return w >= 1000
    ? { tier: 3, view, src: `${base}-sm.webp`, srcSet: `${base}-sm.webp 600w, ${base}.webp ${w}w`, full: `${base}.webp`, width: w, height: h, alt }
    : { tier: 3, view, src: `${base}.webp`, srcSet: undefined, full: `${base}.webp`, width: w, height: h, alt }
}

/**
 * Tiers 1–2 — generated derivatives public/catalog/<set>/<folder>/<nn>.webp (+ `-sm.webp`, half size).
 * Source tuple (src/data/photo-catalog.js): [file, view, width, height].
 */
const photoImage = (tier, name, colorName, [file, view, w, h]) => ({
  tier,
  view,
  src: `/catalog/${file}-sm.webp`,
  srcSet: `/catalog/${file}-sm.webp ${Math.round(w / 2)}w, /catalog/${file}.webp ${w}w`,
  full: `/catalog/${file}.webp`,
  width: w,
  height: h,
  alt: `${name} in ${colorName} — ${IMAGE_DESC[view]}`,
})

/* ── Colourways seen in the photographs (swatches are approximations of the garment colour) ── */
const COLORS = {
  forest: { name: 'Forest Green', family: 'green', hex: '#1f4a3a' },
  deep: { name: 'Deep Green', family: 'green', hex: '#14362c' },
  sand: { name: 'Sand', family: 'beige', hex: '#d6c7ac' },
  cream: { name: 'Cream', family: 'beige', hex: '#e8dcc3' },
  chocolate: { name: 'Chocolate', family: 'brown', hex: '#5a3a2e' },
  white: { name: 'White', family: 'white', hex: '#f4f2ec' },
  olive: { name: 'Olive', family: 'olive', hex: '#4d5b34' },
  navy: { name: 'Navy', family: 'navy', hex: '#1b2742' },
  grey: { name: 'Grey', family: 'grey', hex: '#a7a9a6' },
  black: { name: 'Black', family: 'black', hex: '#1d1d1d' },
  // — colourways seen in the newly mapped photographs (names / swatches chosen from the pictures, not from SKUs) —
  moss: { name: 'Olive Green', family: 'green', hex: '#4a6f4f' },
  maroon: { name: 'Maroon', family: 'red', hex: '#5a1a26' },
  brick: { name: 'Brick Red', family: 'red', hex: '#9a4a3c' },
  red: { name: 'Red', family: 'red', hex: '#a3262a' },
  royal: { name: 'Cornflower Blue', family: 'blue', hex: '#4d7bbf' },
  sky: { name: 'Sky Blue', family: 'blue', hex: '#8fb0d0' },
  pale: { name: 'Pale Blue', family: 'blue', hex: '#b7cfe8' },
  green: { name: 'Green', family: 'green', hex: '#1f5a3e' },
  jade: { name: 'Jade', family: 'green', hex: '#8fc4a8' },
  sage: { name: 'Sage', family: 'green', hex: '#a6c4b0' },
  mauve: { name: 'Mauve', family: 'pink', hex: '#c9a0a4' },
  peach: { name: 'Peach', family: 'pink', hex: '#f1b79a' },
  taupe: { name: 'Taupe', family: 'beige', hex: '#b09a88' },
  stone: { name: 'Stone', family: 'beige', hex: '#cfc3a8' },
  yellow: { name: 'Yellow', family: 'yellow', hex: '#f0d65a' },
  butter: { name: 'Butter Yellow', family: 'yellow', hex: '#f1dd8f' },
  mustard: { name: 'Mustard', family: 'yellow', hex: '#d3a428' },
  charcoal: { name: 'Charcoal', family: 'grey', hex: '#3a3b3d' },
  lightgrey: { name: 'Light Grey', family: 'grey', hex: '#c4c6c8' },
  whitemaroon: { name: 'White & Maroon', family: 'white', hex: '#efe9e4' },
}
export const COLOR_FAMILIES = [
  { id: 'green', label: 'Green', hex: '#1f4a3a' },
  { id: 'olive', label: 'Olive', hex: '#4d5b34' },
  { id: 'navy', label: 'Navy', hex: '#1b2742' },
  { id: 'blue', label: 'Blue', hex: '#4d7bbf' },
  { id: 'black', label: 'Black', hex: '#1d1d1d' },
  { id: 'grey', label: 'Grey', hex: '#a7a9a6' },
  { id: 'white', label: 'White', hex: '#f4f2ec' },
  { id: 'beige', label: 'Beige', hex: '#d6c7ac' },
  { id: 'brown', label: 'Brown', hex: '#5a3a2e' },
  { id: 'red', label: 'Red', hex: '#a3262a' },
  { id: 'pink', label: 'Pink', hex: '#e3b4a4' },
  { id: 'yellow', label: 'Yellow', hex: '#f0d65a' },
]

/**
 * PLACEHOLDER PRICES (INR) — illustrative until the real catalogue exists. `status: 'preview'` is what makes the UI
 * show the "preview price" note and keeps price out of sorting / filtering.
 */
export const PRICE_CURRENCY = 'INR'
const PRICES = {
  'core-polo': 2490, 'pocket-polo': 2690, 'fashion-polo': 2790, 'texture-polo': 2990,
  'core-shirt': 2790, 'pocket-shirt': 2990, 'fashion-shirt': 3290, 'texture-shirt': 3190,
  'core-t-shirt': 1290, 'graphic-t-shirt': 1590, 'fashion-t-shirt': 1490, 'texture-t-shirt': 1690,
  'core-shorts': 1990, 'core-jogger': 2390,
  'knit-shorts': 2490, 'knit-pants': 2990,
}

/** Short "as photographed" sentence per product (observations only — no fabric / fit claims). */
const PICTURED = {
  'core-polo': 'A deep-green short-sleeve polo with a classic collar and button placket.',
  'pocket-polo': 'A short-sleeve polo with a classic collar, button placket and a chest pocket.',
  'fashion-polo': 'A green ribbed-look polo with ivory tipping on the collar and sleeve cuffs.',
  'texture-polo': 'A dark-green polo in a richly textured knit.',
  'core-shirt': 'A white button-up shirt, shown with the sleeves rolled.',
  'pocket-shirt': 'An olive-green button-up shirt with a chest pocket.',
  'fashion-shirt': 'A navy button-up shirt with fine pinstripes.',
  'texture-shirt': 'A grey button-up shirt with a soft, linen-like texture.',
  'core-t-shirt': 'A white crew-neck t-shirt.',
  'graphic-t-shirt': 'A washed-black crew-neck t-shirt with a mountain print.',
  'fashion-t-shirt': 'A navy crew-neck t-shirt with ivory stripes across the chest and sleeves.',
  'texture-t-shirt': 'An olive-green crew-neck t-shirt in a textured knit.',
  'core-shorts': 'Drawstring shorts with an elasticated waist, side pockets and a small embroidered emblem.',
  'core-jogger': 'Drawstring joggers with side pockets and tapered, ribbed cuffs.',
  'knit-shorts': 'Brown drawstring shorts with a pressed front crease.',
  'knit-pants': 'Beige drawstring trousers with a pressed front crease.',
}

/* ── Categories + sub-categories (labels only; one product each today) ── */
const SUBCATEGORIES = {
  polo: [['core', 'Core'], ['pocket', 'Pocket'], ['fashion', 'Fashion'], ['texture', 'Texture']],
  shirt: [['core', 'Core'], ['pocket', 'Pocket'], ['fashion', 'Fashion'], ['texture', 'Texture']],
  't-shirt': [['core', 'Core'], ['graphic', 'Graphic'], ['fashion', 'Fashion'], ['texture', 'Texture']],
  bottom: [['shorts', 'Shorts'], ['jogger', 'Jogger']],
  knit: [['shorts', 'Shorts'], ['pants', 'Pants']],
}

export const CATEGORIES = MEN_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  heading: c.heading,
  subcategories: SUBCATEGORIES[c.id].map(([id, label]) => ({ id, label })),
}))

/* ── Products ───────────────────────────────────────────────────────── */
/** Variant spec: [colourKey, [products/ images…]] — the matching reference (tier 4) image is appended automatically. */
const IMAGE_DESC = { Front: 'front view', Styled: 'styled front view', 'Full length': 'full-length view', Side: 'side view', Back: 'back view', Detail: 'close-up detail', Outdoor: 'outdoor lifestyle view' }
const t1 = (group, name, items) => (colorName) =>
  items.map(([file, view, native]) => productImage(group, file, view, `${name} in ${colorName} — ${IMAGE_DESC[view]}`, native))

/**
 * Per product: where its variants come from. `tier1` (kept key name) maps a colour to its public/products photographs (tier 3);
 * `nav` is the colour shown in the approved reference image (tier 4). If both are the same colour they form ONE variant
 * (products/ images first).
 */
const SPEC = {
  'core-polo': { nav: 'deep' },
  'pocket-polo': {
    tier1: { group: 'pocket-polo', color: 'forest', images: t1('pocket-polo', 'Pocket Polo', [['model', 'Styled'], ['detail', 'Detail', [564, 753]], ['back', 'Back', [564, 753]]]) },
    nav: 'sand',
  },
  'fashion-polo': { nav: 'forest' },
  'texture-polo': { nav: 'deep' },
  'core-shirt': { nav: 'white' },
  'pocket-shirt': { nav: 'olive' },
  'fashion-shirt': { nav: 'navy' },
  'texture-shirt': { nav: 'grey' },
  'core-t-shirt': { nav: 'white' },
  'graphic-t-shirt': { nav: 'black' },
  'fashion-t-shirt': { nav: 'navy' },
  'texture-t-shirt': { nav: 'olive' },
  'core-shorts': {
    tier1: { group: 'core-shorts', color: 'cream', images: t1('core-shorts', 'Core Shorts', [['model', 'Styled'], ['legs', 'Full length']]) },
    nav: 'cream',
  },
  // NOTE: public/products/core-jogger is beige while the approved photoshoot Core Jogger is black → two colourways.
  'core-jogger': {
    tier1: { group: 'core-jogger', color: 'sand', images: t1('core-jogger', 'Core Jogger', [['model', 'Styled'], ['legs', 'Full length'], ['side', 'Side', [442, 590]], ['back', 'Back', [442, 590]]]) },
    nav: 'black',
  },
  'knit-shorts': {
    tier1: { group: 'knit-shorts', color: 'chocolate', images: t1('knit-shorts', 'Knit Shorts', [['model', 'Styled'], ['face', 'Front']]) },
    nav: 'chocolate',
  },
  // public/products group is named "knit-trouser"; the approved product is "Knit Pants" (same garment, beige).
  'knit-pants': {
    tier1: { group: 'knit-trouser', color: 'sand', images: t1('knit-trouser', 'Knit Pants', [['model', 'Styled'], ['face', 'Front'], ['side', 'Side', [455, 606]], ['back', 'Back', [455, 606]]]) },
    nav: 'sand',
  },
}

function buildProduct(category, item, index) {
  const spec = SPEC[item.id]
  const navFor = (colorKey) => navImage(item.id, `${item.label} in ${COLORS[colorKey].name} — approved photoshoot`)
  const variants = []
  if (spec.tier1) {
    const c = spec.tier1.color
    const images = spec.tier1.images(COLORS[c].name)
    if (spec.nav === c) images.push(navFor(c))
    variants.push({ id: c, ...COLORS[c], images })
  }
  if (!spec.tier1 || spec.nav !== spec.tier1.color) variants.push({ id: spec.nav, ...COLORS[spec.nav], images: [navFor(spec.nav)] })
  // polo / shirt / t-shirt: the style prefix (core-polo → core); bottom / knit: the garment suffix (knit-pants → pants).
  const token = ['bottom', 'knit'].includes(category.id) ? item.id.split('-').pop() : item.id.split('-')[0]
  const [subId, subLabel] = SUBCATEGORIES[category.id].find(([id]) => id === token)
  return {
    id: item.id,
    slug: item.id,
    name: item.label,
    category: category.id,
    subcategory: subId,
    subcategoryLabel: subLabel,
    order: index,
    price: { amount: PRICES[item.id], currency: PRICE_CURRENCY, status: 'preview' },
    description: PICTURED[item.id],
    variants,
    assetSource: variants[0].images[0].tier === 3 ? 'photo' : 'reference',
    sourceGroup: spec.tier1 ? spec.tier1.group : null,
    sizes: null, // not provided
    sizeGuide: null, // not provided
    composition: null, // not provided
    care: null, // not provided
    stock: null, // not provided
  }
}


/* ── Newly mapped real photographs (public/products/<group>) ──────────────────────────────────────────────────────
 * One entry per distinct garment. Colourways are grouped into ONE product only where the same print / garment is shown
 * in several colours (folder + visual evidence). Photo tuple: [file, view, [fullWidth, fullHeight]?] — dims are only
 * needed when the original is not 1200×1600. `review` documents classifications / groupings that need an owner check.
 * Prices are NOT provided → `price.status: 'pending'`. Sizes / composition / care / stock are NOT provided → null.
 */
const EXTRA_PRODUCTS = [
  // ── T-Shirt › Graphic ──
  { id: 'abstract-crest-graphic-t-shirt', name: 'Abstract Crest Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-abstract-crest', order: 21.57,
    description: 'A crew-neck t-shirt with a large abstract crest graphic across the chest.',
    variants: [['black', [['black', 'Front', [1157, 1543]]]], ['maroon', [['maroon', 'Front', [1157, 1543]]]]] },
  { id: 'country-club-graphic-t-shirt', name: 'Country Club Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-country-club', order: 21.5,
    description: 'A crew-neck t-shirt with a "Country Club" badge graphic on the chest.',
    variants: [['royal', [['blue', 'Front', [1157, 1543]]]], ['green', [['green', 'Front', [1157, 1543]]]]] },
  { id: 'field-classics-graphic-t-shirt', name: 'Field Classics Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-field-classics', order: 21.51,
    description: 'A crew-neck t-shirt with a "Field Classics" script and club crest on the chest.',
    variants: [['deep', [['green', 'Front']]], ['white', [['white', 'Front', [1180, 1574]]]]] },
  { id: 'field-sport-graphic-t-shirt', name: 'Field Sport Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-field-sport', order: 21.52,
    description: 'A crew-neck t-shirt with a "Field Sport" script and a polo-kit illustration.',
    variants: [['sand', [['beige', 'Front', [1153, 1538]]]], ['lightgrey', [['grey', 'Front', [1153, 1538]]]]] },
  { id: 'for-the-sport-graphic-t-shirt', name: 'For the Sport Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-for-the-sport', order: 21.53,
    description: 'A crew-neck t-shirt with a fine tone-on-tone "For the Sport" print on the chest.',
    variants: [['jade', [['jade', 'Front', [1158, 1544]]]], ['mauve', [['mauve', 'Front', [1158, 1544]]]]] },
  { id: 'polo-camo-graphic-t-shirt', name: 'Polo Camo Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-polo-camo', order: 21.54,
    description: 'A crew-neck t-shirt with a camouflage-pattern polo-player graphic.',
    variants: [['charcoal', [['charcoal', 'Front', [1153, 1538]]]], ['navy', [['navy', 'Front', [1153, 1538]]]]] },
  { id: 'polo-riders-graphic-t-shirt', name: 'Polo Riders Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-polo-riders', order: 21.55,
    description: 'A crew-neck t-shirt with a row-of-riders illustration across the chest.',
    variants: [['taupe', [['taupe', 'Front', [1153, 1538]]]], ['yellow', [['yellow', 'Front', [1153, 1538]]]]] },
  { id: 'polofields-graphic-t-shirt', name: 'Polofields Graphic T-Shirt', category: 't-shirt', sub: 'graphic', group: 'graphic-polofields', order: 21.56,
    description: 'A crew-neck t-shirt with a "Polofields Heritage" crest graphic on the chest.',
    review: 'Blue and peach are chest close-ups (702 px / 845 px wide); the two-model photo (both.webp) shows both colourways and is added to each gallery.',
    variants: [['pale', [['blue', 'Detail', [702, 936]], ['both', 'Styled']]], ['peach', [['peach', 'Detail', [845, 1127]], ['both', 'Styled']]]] },

  // ── Polo › Fashion (printed / illustrated) ──
  { id: 'heritage-polo', name: 'Heritage Polo', category: 'polo', sub: 'fashion', group: 'puckered-heritage', order: 2.5,
    description: 'A short-sleeve polo with a large "Heritage Club" polo-players illustration.',
    review: 'Folder name says "puckered" (a fabric term) but the dominant visible feature is the large illustration, so it is filed under Fashion Polo, not Texture Polo.',
    variants: [['charcoal', [['ch-3', 'Front', [653, 871]]]], ['navy', [['nv-1', 'Front', [653, 871]]]], ['mustard', [['yellow', 'Styled']]]] },
  { id: 'racehorse-polo', name: 'Racehorse Polo', category: 'polo', sub: 'fashion', group: 'puckered-racehorse', order: 2.51,
    description: 'A short-sleeve polo with a racehorse-and-jockey illustration.',
    review: 'Filed under Fashion Polo (see Heritage Polo). The two colours are grouped as one product by folder; the illustration is very similar but not pixel-identical.',
    variants: [['lightgrey', [['byb', 'Front', [1153, 1538]]]], ['charcoal', [['ch-2', 'Front', [1153, 1538]]]]] },
  { id: 'rider-polo', name: 'Rider Polo', category: 'polo', sub: 'fashion', group: 'puckered-rider', order: 2.52,
    description: 'A short-sleeve polo with a polo-player-on-horseback illustration.',
    review: 'Filed under Fashion Polo (see Heritage Polo). The illustration resembles a well-known brand\'s rider emblem — please check before launch.',
    variants: [['black', [['bk-1', 'Front', [1157, 1543]]]], ['brick', [['mr-1', 'Front', [1157, 1543]]]]] },
  ...[
    ['ayb-1', 'sky', 'Sky Blue', 'A short-sleeve polo with a tonal all-over geometric print.', [1157, 1543]],
    ['bg-1', 'green', 'Green', 'A short-sleeve polo with small scattered motifs.', [1157, 1543]],
    ['bk-1', 'black', 'Black', 'A short-sleeve polo with fine line detailing across the chest.', [1153, 1538], 'Plain-looking black polo with subtle line details; filed as printed because it sits in the printed-polo folder.'],
    ['cm-1', 'charcoal', 'Charcoal', 'A short-sleeve polo with a small all-over dot motif.', [1153, 1538]],
    ['doc', 'butter', 'Butter Yellow', 'A short-sleeve polo with a tonal all-over print.', [1157, 1543]],
    ['dwb', 'grey', 'Grey', 'A short-sleeve polo with a tonal all-over print.', [770, 1027]],
    ['nab', 'navy', 'Navy', 'A short-sleeve polo with a tonal leaf print.', [1157, 1543]],
    ['pap', 'peach', 'Peach', 'A short-sleeve polo with a small chest emblem in a soft melange look.', [1153, 1538], 'Looks like a plain / melange polo rather than a print; filed as printed because it sits in the printed-polo folder.'],
    ['re-1', 'red', 'Red', 'A short-sleeve polo with a tonal geometric print.', [1153, 1538]],
    ['ss-1', 'sage', 'Sage', 'A short-sleeve polo with a tonal leaf print.', [1200, 1562]],
    ['wcg', 'stone', 'Stone', 'A short-sleeve polo with a tonal geometric panel print.', [1200, 1562]],
    ['wh-1', 'whitemaroon', 'White & Maroon', 'A short-sleeve polo with a checkerboard medallion print.', [1200, 1600]],
  ].map(([file, color, label, description, dims, review], i) => ({
    id: `printed-polo-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    name: `Printed Polo — ${label}`,
    category: 'polo', sub: 'fashion', group: 'printed-polo', order: 2.6 + i / 100, sourceCode: file,
    description, review: review ?? 'Name is provisional (folder + colour); every printed polo has a different pattern, so each is its own product.',
    variants: [[color, [[file, 'Front', dims]]]],
  })),

  // ── Polo › Texture ──
  { id: 'structure-polo-olive', name: 'Structure Polo — Olive', category: 'polo', sub: 'texture', group: 'structure-polo', order: 3.5,
    description: 'A short-sleeve polo with a tonal diamond-pattern texture and a small shield emblem on the chest.',
    review: 'Filed under Texture Polo (visible woven texture + folder name).',
    variants: [['moss', [['olive', 'Styled'], ['olive-side', 'Side', [469, 625]], ['olive-detail', 'Detail', [558, 745]]]]] },
  { id: 'structure-polo-navy', name: 'Structure Polo — Navy', category: 'polo', sub: 'texture', group: 'structure-polo', order: 3.51,
    description: 'A short-sleeve polo with a fine tonal self-stripe texture and a small shield emblem on the chest.',
    review: 'Kept as a separate product from the olive Structure Polo: the surface texture differs (fine stripe vs diamond), so it is not reliably the same garment in another colour.',
    variants: [['navy', [['navy', 'Styled'], ['navy-side', 'Side', [392, 523]], ['navy-back', 'Back', [393, 523]]]]] },
]

function buildExtra(spec) {
  const sub = SUBCATEGORIES[spec.category].find(([id]) => id === spec.sub)
  return {
    id: spec.id,
    slug: spec.id,
    name: spec.name,
    category: spec.category,
    subcategory: sub[0],
    subcategoryLabel: sub[1],
    order: spec.order,
    price: { amount: null, currency: PRICE_CURRENCY, status: 'pending' }, // NOT provided
    description: spec.description,
    variants: spec.variants.map(([colorKey, photos]) => ({
      id: colorKey,
      ...COLORS[colorKey],
      images: photos.map(([file, view, dims]) => productImage(spec.group, file, view, `${spec.name} in ${COLORS[colorKey].name} — ${IMAGE_DESC[view]}`, dims)),
    })),
    assetSource: 'photo',
    sourceGroup: spec.group,
    sourceCode: spec.sourceCode ?? null,
    review: spec.review ?? null,
    sizes: null,
    sizeGuide: null,
    composition: null,
    care: null,
    stock: null,
  }
}

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Important 1 / Important 2 products (generated data): one record per garment design, one variant per colourway. */
function buildPhoto(spec) {
  const sub = SUBCATEGORIES[spec.category].find(([id]) => id === spec.sub)
  return {
    id: spec.slug,
    slug: spec.slug,
    name: spec.name,
    category: spec.category,
    subcategory: sub[0],
    subcategoryLabel: sub[1],
    order: spec.order,
    price: { amount: null, currency: PRICE_CURRENCY, status: 'pending' }, // NOT provided
    description: spec.description,
    variants: spec.variants.map((v) => ({
      id: slugify(v.name),
      name: v.name,
      family: v.family,
      hex: v.hex,
      images: v.images.map((img) => photoImage(spec.tier, spec.name, v.name, img)),
      sources: v.sources,
    })),
    assetSource: 'photo',
    sourceGroup: [...new Set(spec.variants.flatMap((v) => v.sources.map((s) => s.split('/').slice(0, 2).join('/'))))].join(', '),
    sourceCode: null,
    review: spec.review ?? null,
    sizes: null,
    sizeGuide: null,
    composition: null,
    care: null,
    stock: null,
  }
}

const PHOTO_LIST = PHOTO_PRODUCTS.map(buildPhoto)
const EXTRA_LIST = EXTRA_PRODUCTS.map(buildExtra)

/** A tier-4 reference product is superseded when a genuine photograph exists for the same category + sub-category. */
const GENUINE_KEYS = new Set([...PHOTO_LIST, ...EXTRA_LIST].map((p) => `${p.category}/${p.subcategory}`))
const isSuperseded = (p) => p.assetSource === 'reference' && GENUINE_KEYS.has(`${p.category}/${p.subcategory}`)
const BASE_LIST = MEN_CATEGORIES.flatMap((category, ci) => category.items.map((item, ii) => buildProduct(category, item, ci * 10 + ii)))

export const PRODUCT_LIST = [...PHOTO_LIST, ...EXTRA_LIST, ...BASE_LIST.filter((p) => !isSuperseded(p))]
/** Reference products dropped because genuine photographs exist (for the integration report / tests). */
export const SUPERSEDED_REFERENCE = BASE_LIST.filter(isSuperseded).map((p) => p.id)

/** Products whose classification / grouping needs an owner check (documented, never silently assumed). */
export const REVIEW_ITEMS = PRODUCT_LIST.filter((p) => p.review).map((p) => ({ id: p.id, name: p.name, note: p.review }))

/** Image tier of a product's primary photograph (1 = Important 1 … 4 = reference) — drives the "Featured" order. */
export const primaryTier = (product) => product.variants[0].images[0].tier
export const defaultVariant = (product) => product.variants[0]
export const variantById = (product, id) => product.variants.find((v) => v.id === id) ?? product.variants[0]
/** First photograph shown for a product (from its highest-priority source). */
export const primaryImage = (product) => product.variants[0].images[0]

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? null
export const getProduct = (slug) => PRODUCT_LIST.find((p) => p.slug === slug) ?? null
export const categoryHref = (id) => (id ? `/shop/${id}` : '/shop')
export const productHref = (product, colorId) => `/product/${product.slug}${colorId && colorId !== product.variants[0].id ? `?color=${colorId}` : ''}`
export const subcategoryHref = (categoryId, subId) => `${categoryHref(categoryId)}?style=${subId}`

/** Featured order: Important 1 → Important 2 → products/ → reference imagery (tier of the primary photograph), then `order`, then slug. */
export const featuredOrder = (a, b) => primaryTier(a) - primaryTier(b) || a.order - b.order || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'name-asc', label: 'Name: A to Z' },
  { id: 'name-desc', label: 'Name: Z to A' },
]

/** Apply category / sub-category / colour filters and a sort. (No price / size / stock filters: no verified data.) */
export function queryProducts({ category = null, categories = [], style = null, colors = [], sort = 'featured' } = {}) {
  const styleList = Array.isArray(style) ? style : style ? [style] : []
  let list = PRODUCT_LIST.filter((p) => (!category || p.category === category) && (!categories.length || categories.includes(p.category)) && (!styleList.length || styleList.includes(p.subcategory)))
  if (colors.length) list = list.filter((p) => p.variants.some((v) => colors.includes(v.family)))
  const sorted = [...list]
  if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name))
  else sorted.sort(featuredOrder)
  return sorted
}

/**
 * Listing cards: every colourway of a product is its own card (Core Polo with 24 colourways = 24 cards), in product order
 * then colourway order. With a colour filter only the colourways in the selected families become cards. Each card keeps the
 * product's full colour count (`colorCount`) for the "N colours" label; `first` marks a product's first card.
 */
export function listingCards(products, colors = []) {
  return products.flatMap((product) => {
    const variants = colors.length ? product.variants.filter((v) => colors.includes(v.family)) : product.variants
    return variants.map((variant, i) => ({ key: `${product.id}:${variant.id}`, product, variant, colorCount: product.variants.length, first: i === 0 }))
  })
}

/** Colour families present in a product list, with counts of colourways (= cards) for the filter panel. */
export function colorFacets(products) {
  return COLOR_FAMILIES.map((f) => ({ ...f, count: products.reduce((n, p) => n + p.variants.filter((v) => v.family === f.id).length, 0) })).filter((f) => f.count > 0)
}

/** Number of listing cards for a product list (one per colourway). */
export const cardCount = (products) => products.reduce((n, p) => n + p.variants.length, 0)

/**
 * A product may only be bought when its purchasable data is verified: real sizes, a verified price and stock.
 * Nothing in the prototype data qualifies, so Add to Bag is disabled everywhere (explicit preview state).
 */
export const isPurchasable = (product) => Boolean(product.sizes?.length && product.price?.status === 'verified' && product.stock)

/** One representative photograph per category (first product in Featured order) — used by category collection cards. */
export function categoryCover(categoryId) {
  const p = PRODUCT_LIST.filter((x) => x.category === categoryId).sort(featuredOrder)[0]
  return { product: p, image: primaryImage(p) }
}

/**
 * Free-text search over name, category, sub-category and colour names. Every word must match somewhere
 * (so "navy polo" finds navy polos); results keep Featured order.
 */
export function searchProducts(query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return PRODUCT_LIST.filter((p) => {
    const hay = [p.name, p.category, p.subcategoryLabel, getCategory(p.category)?.label, ...p.variants.map((v) => v.name)].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  }).sort(featuredOrder)
}
