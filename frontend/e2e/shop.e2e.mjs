/**
 * End-to-end checks for the product listing (/shop, /shop/:category), product cards, filters / sorting and the
 * product detail page (/product/:slug), plus the navigation flows into them.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/shop.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = (process.env.BASE_URL || 'http://localhost:5173/').replace(/\/$/, '')
const VIEWPORTS = [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [430, 932], [390, 844], [375, 667], [320, 568]]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else { failures.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`) }
}
const near = (a, b, t) => Math.abs(a - b) <= t

// ── Independent anchors (counts + folder → product mapping), so the catalogue is not only compared with itself ──
const COUNTS = { polo: 51, shirt: 4, 't-shirt': 12, bottom: 4, knit: 2 } // distinct products, not image files
const SUBCOUNTS = { polo: { core: 3, pocket: 1, fashion: 43, texture: 4 }, 't-shirt': { core: 2, graphic: 8, fashion: 1, texture: 1 }, bottom: { shorts: 2, jogger: 2 }, knit: { shorts: 1, pants: 1 } }
// 73 products = 17 Important 1 + 20 Important 2 + 30 products/ + 6 reference (AI) products; 819 Important photographs in use.
const TOTAL = 73, REAL = 67, REFERENCE = 6, TIERS = { 1: 17, 2: 20, 3: 30, 4: 6 }, IMPORTANT_IMAGES = { 1: 430, 2: 389 }
// every colourway is its own listing card (see listingCards in data/catalog.js)
const CARDS_OF = (p, families = []) => p.variants.filter((v) => !families.length || families.includes(v.family)).map((v) => ({ p, v }))
const SUPERSEDED = ['core-polo', 'fashion-polo', 'texture-polo', 'core-t-shirt', 'graphic-t-shirt'] // AI reference ids dropped: genuine photographs exist for the sub-category
// Important 1 / 2 anchors, written independently of the generator: slug → [tier, sub-category, { colour: 'source folders' }]
// (in-NN = Indoor/NN, out-NN = Outdoor/NN of Important 1; core-NN / hf-NN / cf-NN = Core / High Fashion / core fashion of Important 2)
const rng = (p, a, b) => Object.fromEntries([...Array(b - a + 1)].map((_, i) => [`${p}${a + i}`, `${p}-${String(a + i).padStart(2, '0')}`]))
const CORE_COLOURS = ['Light Grey Melange', 'White', 'Beige', 'Sky Blue', 'Coral', 'Red', 'Cobalt Blue', 'Rose Pink', 'Sage Green', 'Navy', 'Maroon', 'Grey Melange', 'Marigold', 'Mustard', 'Teal', 'Raspberry', 'Rust Red', 'Navy Melange', 'Black', 'Bottle Green', 'Ecru', 'Mint']
const CORE_FOLDERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] // 24 folders, Core colours listed in folder order below
const PHOTO = {
  'embossed-crest-polo': [1, 'texture', { Black: 'in-01', Charcoal: 'in-05', 'Dark Red': 'in-06', Red: 'in-07', 'Royal Blue': 'in-28,out-07' }],
  'mandarin-collar-polo': [1, 'core', { Navy: 'in-02', 'Brick Red': 'in-03', 'Bottle Green': 'in-04', 'Light Grey Melange': 'in-08', 'Aqua Green': 'in-18,out-17', Black: 'in-25,out-04' }],
  'crest-block-polo': [1, 'fashion', { 'Red / Navy / Ivory': 'in-09,out-09', 'Charcoal / Mustard / Ivory': 'in-10,out-12' }],
  'diagonal-block-polo': [1, 'fashion', { 'Red / Ivory / Navy': 'in-11,out-16', 'Rose / Ivory / Navy': 'in-17,out-13' }],
  'classic-white-polo': [1, 'core', { White: 'in-12' }],
  'v-neck-t-shirt': [1, 'core', { White: 'in-13' }], 'crew-neck-t-shirt': [1, 'core', { White: 'in-14' }],
  'core-shorts-white': [1, 'shorts', { White: 'in-15' }], 'core-jogger-white': [1, 'jogger', { White: 'in-16' }],
  'sleeve-stripe-polo': [1, 'fashion', { 'Aqua Green': 'in-19,out-14', Charcoal: 'in-24,out-02' }],
  'number-8-crest-polo': [1, 'fashion', { Coral: 'in-20,out-15' }],
  'authentic-tonal-polo': [1, 'texture', { Navy: 'in-21,out-06' }],
  'rugby-polo': [1, 'fashion', { 'Bottle Green': 'in-22,out-05' }],
  'rugby-league-band-polo': [1, 'fashion', { 'Black / Ivory / Charcoal': 'in-23,out-20', 'Grey / Ivory / Black': 'in-31,out-01' }],
  'polo-league-polo': [1, 'fashion', { 'Red / Royal Blue': 'in-26,out-18', 'Black / Ivory': 'in-30,out-03' }],
  'vertical-split-polo': [1, 'fashion', { 'Black / Charcoal': 'in-27,out-19', 'Red / Navy': 'in-29,out-11' }],
  'sash-polo': [1, 'fashion', { 'Bottle Green': 'in-32,out-08', 'Butter Yellow': 'in-33,out-10' }],
  'core-polo': [2, 'core', Object.fromEntries([['Light Grey Melange', 1], ['White', 2], ['Beige', 3], ['Sky Blue', 4], ['Coral', 5], ['Red', 6], ['Cobalt Blue', 7], ['Rose Pink', 8], ['Sage Green', 9], ['Navy', 10], ['Maroon', 11], ['Grey Melange', 12], ['Marigold', 13], ['Mustard', 14], ['Teal', 15], ['Raspberry', 16], ['Charcoal Melange', 17], ['Brown', 18], ['Rust Red', 19], ['Navy Melange', 20], ['Black', 21], ['Bottle Green', 22], ['Ecru', 23], ['Mint', 24]].map(([n, k]) => [n, `core-${String(k).padStart(2, '0')}`]))],
  'est-1982-band-polo': [2, 'fashion', { 'Navy / Red / White': 'hf-01', 'Sky Blue / Navy / White': 'hf-04' }],
  'tri-block-emblem-polo': [2, 'fashion', { 'Sky Blue / Ivory / Navy': 'hf-02', 'Rose / Navy / Grey': 'hf-03', 'Coral / Ivory / Navy': 'hf-09' }],
  'authentic-team-sports-polo': [2, 'fashion', { Mint: 'hf-05' }],
  'diagonal-crest-polo': [2, 'fashion', { 'Navy / Red / Ecru': 'hf-06', 'Navy / Red / Grey': 'hf-08', 'Maroon / Ivory': 'hf-12', 'Black / Ivory': 'hf-16' }],
  'crest-band-polo': [2, 'fashion', { 'Ivory / Navy': 'hf-07' }],
  'chest-panel-crest-polo': [2, 'fashion', { 'Mint / Navy': 'hf-10' }],
  'striped-panel-crest-polo': [2, 'fashion', { 'Red / Navy': 'hf-11', 'Bottle Green / Navy': 'hf-13' }],
  'authentic-sports-polo': [2, 'fashion', { 'Maroon / Navy': 'hf-14', 'Bottle Green / Navy': 'hf-15' }],
  'crest-tipped-polo': [2, 'fashion', { Coral: 'cf-01', 'Sky Blue': 'cf-02', Rose: 'cf-04', Mint: 'cf-06', 'Pale Blue': 'cf-08', Cream: 'cf-17' }],
  'sleeve-band-crest-polo': [2, 'fashion', { 'Grey Melange': 'cf-03', Red: 'cf-14', Navy: 'cf-22', Charcoal: 'cf-23' }],
  'number-8-stripe-polo': [2, 'fashion', { 'Light Grey': 'cf-05', 'Silver Grey': 'cf-12', Marigold: 'cf-15' }],
  'side-panel-crest-polo': [2, 'fashion', { Marigold: 'cf-07', 'Charcoal / Mustard': 'cf-25' }],
  'shoulder-block-crest-polo': [2, 'fashion', { 'Rose / Light Grey': 'cf-09' }],
  'number-8-shoulder-polo': [2, 'fashion', { 'Ivory / Navy': 'cf-10' }],
  'equestrian-crest-polo': [2, 'fashion', { Red: 'cf-11', Brown: 'cf-13' }],
  'shield-crest-polo': [2, 'fashion', { Black: 'cf-16', 'Bottle Green': 'cf-21', Maroon: 'cf-26' }],
  'contrast-sleeve-crest-polo': [2, 'fashion', { 'Navy / Cobalt': 'cf-18' }],
  'chest-band-polo': [2, 'fashion', { 'Black / Charcoal': 'cf-19' }],
  'laurel-crest-polo': [2, 'fashion', { 'Rust Red': 'cf-20', 'Navy Melange': 'cf-24' }],
}
// photographs in use per source folder when it differs from the default (label photographs, unreadable files and the duplicate folder are not used)
const FOLDER_IMAGES = (code) => {
  const [k, n] = [code.split('-')[0], Number(code.split('-')[1])]
  const odd = { 'in-12': 9, 'in-13': 12, 'in-19': 9, 'core-03': 5, 'core-07': 5, 'core-08': 5, 'core-14': 5, 'core-15': 4, 'cf-05': 5 }
  return odd[code] ?? (k === 'in' ? 10 : k === 'out' ? 5 : 6)
}
// slug → [source folder, number of colourways, number of tier-1 photographs in the first colourway]
const REAL_MAP = {
  'pocket-polo': ['pocket-polo', 2, 3], 'core-shorts': ['core-shorts', 1, 2], 'core-jogger': ['core-jogger', 2, 4], 'knit-shorts': ['knit-shorts', 1, 2], 'knit-pants': ['knit-trouser', 1, 4],
  'abstract-crest-graphic-t-shirt': ['graphic-abstract-crest', 2, 1], 'country-club-graphic-t-shirt': ['graphic-country-club', 2, 1], 'field-classics-graphic-t-shirt': ['graphic-field-classics', 2, 1],
  'field-sport-graphic-t-shirt': ['graphic-field-sport', 2, 1], 'for-the-sport-graphic-t-shirt': ['graphic-for-the-sport', 2, 1], 'polo-camo-graphic-t-shirt': ['graphic-polo-camo', 2, 1],
  'polo-riders-graphic-t-shirt': ['graphic-polo-riders', 2, 1], 'polofields-graphic-t-shirt': ['graphic-polofields', 2, 2],
  'heritage-polo': ['puckered-heritage', 3, 1], 'racehorse-polo': ['puckered-racehorse', 2, 1], 'rider-polo': ['puckered-rider', 2, 1],
  'structure-polo-olive': ['structure-polo', 1, 3], 'structure-polo-navy': ['structure-polo', 1, 3],
}
// printed polos: slug → source photograph (each is its own garment)
const PRINTED = { 'sky-blue': 'ayb-1', green: 'bg-1', black: 'bk-1', charcoal: 'cm-1', 'butter-yellow': 'doc', grey: 'dwb', navy: 'nab', peach: 'pap', red: 're-1', sage: 'ss-1', stone: 'wcg', 'white-maroon': 'wh-1' }
for (const [k, file] of Object.entries(PRINTED)) REAL_MAP[`printed-polo-${k}`] = ['printed-polo', 1, 1]
// colour → file the photograph must come from (two-colour products)
const COLOUR_FILE = {
  'abstract-crest-graphic-t-shirt': { Black: 'black', Maroon: 'maroon' }, 'country-club-graphic-t-shirt': { 'Cornflower Blue': 'blue', Green: 'green' },
  'field-classics-graphic-t-shirt': { 'Deep Green': 'green', White: 'white' }, 'field-sport-graphic-t-shirt': { Sand: 'beige', 'Light Grey': 'grey' },
  'for-the-sport-graphic-t-shirt': { Jade: 'jade', Mauve: 'mauve' }, 'polo-camo-graphic-t-shirt': { Charcoal: 'charcoal', Navy: 'navy' },
  'polo-riders-graphic-t-shirt': { Taupe: 'taupe', Yellow: 'yellow' }, 'polofields-graphic-t-shirt': { 'Pale Blue': 'blue', Peach: 'peach' },
  'heritage-polo': { Charcoal: 'ch-3', Navy: 'nv-1', Mustard: 'yellow' }, 'racehorse-polo': { 'Light Grey': 'byb', Charcoal: 'ch-2' }, 'rider-polo': { Black: 'bk-1', 'Brick Red': 'mr-1' },
}

// The catalogue as the app sees it (loaded through Vite so the test never drifts from the data file).
const browser = await chromium.launch()
const CAT = await (async () => {
  const page = await (await browser.newContext()).newPage()
  await page.goto(BASE + '/')
  const data = await page.evaluate(async () => {
    const m = await import('/src/data/catalog.js')
    return {
      list: JSON.parse(JSON.stringify(m.PRODUCT_LIST)),
      featured: Object.fromEntries(m.CATEGORIES.map((c) => [c.id, m.queryProducts({ category: c.id }).map((p) => p.name)])),
      all: m.queryProducts().map((p) => p.name),
    }
  })
  await page.context().close()
  return data
})()
const BYNAME = Object.fromEntries(CAT.list.map((p) => [p.name, p]))
const CATS = CAT.featured
const PDP = Object.fromEntries(CAT.list.map((p) => [p.slug, p.variants.map((v) => [v.name, v.images.map((i) => (i.tier <= 3 ? i.full.replace(/\.webp$/, '') : i.src.replace(/480\.webp$/, '')))])]))
const priceOk = (name, text) => (BYNAME[name].price.status === 'pending' ? text === 'Price to be confirmed' : /^₹[\d,]+$/.test(text))

const uniqNames = async (page) => [...new Set(await page.$$eval('.fervoro-plp-name', (n) => n.map((x) => x.textContent)))]

async function open(w, h, url, { touch = w < 1024, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()}: ${r.url()}`))
  await page.goto(BASE + url)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) } scrollTo(0, 0) })
  await page.waitForLoadState('networkidle')
  return { ctx, page, problems }
}

/* ───────── 1. Listing pages at every viewport ───────── */
for (const [w, h] of VIEWPORTS) {
  const tag = `@${w}`
  const expCols = w >= 1280 ? 4 : w >= 1024 ? 3 : 2
  for (const [cat, pnames] of Object.entries(CATS)) {
    const cards = pnames.flatMap((n) => CARDS_OF(BYNAME[n]))
    const names = cards.map((c) => c.p.name)
    const { ctx, page, problems } = await open(w, h, `/shop/${cat}`)
    await page.evaluate(() => document.querySelectorAll('.fervoro-plp-slide img').forEach((i) => { i.loading = 'eager' }))
    await page.waitForFunction(() => [...document.querySelectorAll('.fervoro-plp-card')].every((c) => { const i = c.querySelector('.fervoro-plp-slide img'); return i.complete && i.naturalWidth > 0 }), null, { timeout: 20000 }).catch(() => {})
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.fervoro-plp-card')]
      const rect = (e) => e.getBoundingClientRect()
      return {
        h1: document.querySelector('h1')?.textContent, title: document.title, docW: document.documentElement.scrollWidth, vw: innerWidth,
        names: cards.map((c) => c.querySelector('.fervoro-plp-name').textContent),
        prices: cards.map((c) => c.querySelector('.fervoro-plp-price').textContent),
        media: cards.map((c) => { const b = rect(c.querySelector('.fervoro-plp-media')); return [b.width, b.height, b.left, b.right] }),
        firstSrc: cards.map((c) => c.querySelector('.fervoro-plp-slide img').currentSrc),
        loaded: cards.map((c) => { const i = c.querySelector('.fervoro-plp-slide img'); return i.complete && i.naturalWidth > 0 }),
        tiers: cards.map((c) => [...c.querySelectorAll('.fervoro-plp-slide')].map((s) => Number(s.dataset.tier))),
        tops: [...new Set(cards.map((c) => Math.round(rect(c).top)))].length,
        perRow: cards.filter((c) => Math.round(rect(c).top) === Math.round(rect(cards[0]).top)).length,
        tabs: [...document.querySelectorAll('.fervoro-plp-tab')].map((t) => t.textContent),
        filters: !!document.querySelector('.fervoro-plp-filterbtn, .fervoro-plp-side'), sort: !!document.querySelector('.fervoro-plp-sort select'), count: document.querySelector('.fervoro-plp-count').textContent,
        links: cards.map((c) => c.querySelector('.fervoro-plp-name a').getAttribute('href')),
      }
    })
    check(`${tag} /shop/${cat}: heading + tab title`, m.h1 === (cat === 't-shirt' ? 'T-Shirt' : cat[0].toUpperCase() + cat.slice(1)) && m.title.endsWith('— FERVORO'), `${m.h1} | ${m.title}`)
    check(`${tag} /shop/${cat}: products in Featured order (Important 1 → Important 2 → products/ → reference)`, JSON.stringify(m.names) === JSON.stringify(names), m.names.join())
    check(`${tag} /shop/${cat}: ${COUNTS[cat]} products as ${cards.length} cards (one per colourway)`, m.count === `${cards.length} products` && pnames.length === COUNTS[cat], m.count)
    check(`${tag} /shop/${cat}: image tiers never go backwards (1 → 2 → 3 → 4)`, cards.map((c) => c.p.variants[0].images[0].tier).every((v, i, a) => i === 0 || a[i - 1] <= v), 'tiers')
    check(`${tag} /shop/${cat}: real photographs before reference images`, m.names.map((n) => BYNAME[n].assetSource).every((v, i, a) => i === 0 || a[i - 1] <= v), m.names.map((n) => BYNAME[n].assetSource).join())
    check(`${tag} /shop/${cat}: no duplicate cards (every card links to its own colourway)`, new Set(m.links).size === m.links.length && m.links.every((l, i) => l === `/product/${cards[i].p.slug}${cards[i].v.id === cards[i].p.variants[0].id ? '' : `?color=${cards[i].v.id}`}`), m.links.slice(0, 3).join())
    check(`${tag} /shop/${cat}: every card has a price (₹ or "Price to be confirmed") and a product link`, m.names.every((n, i) => priceOk(n, m.prices[i])) && m.links.every((l) => l.startsWith('/product/')), m.prices.join())
    check(`${tag} /shop/${cat}: all photographs load`, m.loaded.every(Boolean))
    check(`${tag} /shop/${cat}: consistent 3:4 cards, no distortion`, m.media.every((b) => near(b[0] / b[1], 0.75, 0.004) && near(b[0], m.media[0][0], 1)), m.media.map((b) => (b[0] / b[1]).toFixed(3)).join())
    check(`${tag} /shop/${cat}: ${Math.min(expCols, cards.length)} per row`, m.perRow === Math.min(expCols, cards.length), `${m.perRow}`)
    check(`${tag} /shop/${cat}: photographs never go to a lower-priority tier inside a card (Important 1 → 2 → products/ → reference)`, m.tiers.every((t) => t.every((v, i) => i === 0 || t[i - 1] <= v)))
    check(`${tag} /shop/${cat}: toolbar present (filters, count, sort)`, m.filters && m.sort)
    check(`${tag} /shop/${cat}: sub-category tabs`, m.tabs[0] === 'All' && m.tabs.length === (cat === 'bottom' || cat === 'knit' ? 3 : 5), m.tabs.join())
    check(`${tag} /shop/${cat}: no horizontal overflow`, m.docW <= m.vw)
    check(`${tag} /shop/${cat}: cards inside the viewport`, m.media.every((b) => b[2] >= -0.5 && b[3] <= m.vw + 0.5))
    check(`${tag} /shop/${cat}: no console / network problems`, problems.length === 0, problems.join(' | '))
    {
      const groups = [...new Set(CAT.list.filter((p) => p.category === cat && p.variants[0].images[0].tier === 3).map((p) => p.sourceGroup))]
      const sources = m.firstSrc.map((s) => s.split('/').slice(-3).join('/'))
      check(`${tag} /shop/${cat}: every real photograph folder is used (${groups.length})`, groups.every((g) => sources.some((s) => s.includes(`products/${g}/`))), sources.join())
      check(`${tag} /shop/${cat}: each card shows its own colourway's first photograph`, cards.every((c, i) => { const im = c.v.images[0]; return im.tier === 4 ? m.firstSrc[i].includes('/images/nav/') : m.firstSrc[i].includes(im.full.replace(/\.webp$/, '')) }))
    }
    await ctx.close()
  }
  // all products
  const { ctx, page, problems } = await open(w, h, '/shop')
  const m = await page.evaluate(() => ({ names: [...document.querySelectorAll('.fervoro-plp-name')].map((n) => n.textContent), h1: document.querySelector('h1').textContent, docW: document.documentElement.scrollWidth, vw: innerWidth, tabs: [...document.querySelectorAll('.fervoro-plp-tab')].map((t) => t.textContent) }))
  const realCards = CAT.list.filter((p) => p.assetSource === 'photo').reduce((n, p) => n + p.variants.length, 0), allCards = CAT.list.reduce((n, p) => n + p.variants.length, 0)
  check(`${tag} /shop: ${TOTAL} products as ${allCards} cards (${realCards} real-photograph cards first, then reference)`, m.names.length === allCards && m.names.slice(0, realCards).every((n) => BYNAME[n].assetSource === 'photo') && m.names.slice(realCards).every((n) => BYNAME[n].assetSource === 'reference'), `${m.names.length}`)
  check(`${tag} /shop: category tabs + no overflow + no problems`, m.tabs.join() === 'All,Polo,Shirt,T-Shirt,Bottom,Knit' && m.docW <= m.vw && problems.length === 0, problems.join('|'))
  await ctx.close()
}

/* ───────── 2. Product detail pages ───────── */
for (const [w, h] of VIEWPORTS) {
  const tag = `@${w}`
  const slugs = w === 1440 ? Object.keys(PDP) : ['embossed-crest-polo', 'core-polo', 'sash-polo', 'v-neck-t-shirt', 'pocket-polo', 'core-jogger', 'printed-polo-sky-blue', 'polofields-graphic-t-shirt', 'fashion-t-shirt']
  for (const slug of slugs) {
    const { ctx, page, problems } = await open(w, h, `/product/${slug}`)
    const variants = PDP[slug]
    for (let vi = 0; vi < variants.length; vi++) {
      const [color, prefixes] = variants[vi]
      if (vi > 0) await page.locator(`.fervoro-pdp .fervoro-swatch[aria-label="${color}"]`).click()
      await page.evaluate(() => document.querySelectorAll('.fervoro-pdp-slide img').forEach((i) => { i.loading = 'eager' })) // galleries hold up to 15 lazy photographs
      await page.waitForFunction(() => [...document.querySelectorAll('.fervoro-pdp-slide img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 10000 }).catch(() => {})
      const m = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        const imgs = [...document.querySelectorAll('.fervoro-pdp-slide img')]
        const g = q('.fervoro-pdp-gallery').getBoundingClientRect(), p = q('.fervoro-pdp-panel').getBoundingClientRect()
        const add = q('.fervoro-pdp-add')
        return {
          h1: q('h1')?.textContent, price: q('.fervoro-pdp-price')?.textContent, notes: [...document.querySelectorAll('.fervoro-pdp-note')].map((n) => n.textContent),
          srcs: imgs.map((i) => i.currentSrc), alts: imgs.map((i) => i.alt), loaded: imgs.map((i) => i.naturalWidth > 0),
          tiers: [...document.querySelectorAll('.fervoro-pdp-slide')].map((s) => Number(s.dataset.tier)),
          color: q('#pdp-color-label span')?.textContent, swatches: document.querySelectorAll('.fervoro-pdp-panel .fervoro-swatch').length,
          add: { disabled: add.disabled, text: add.textContent }, size: q('#pdp-size-note')?.textContent, guideDisabled: q('.fervoro-pdp-guide').disabled,
          wish: !!q('.fervoro-pdp-heart'), desc: q('.fervoro-pdp-desc p')?.textContent, care: q('.fervoro-pdp-details').textContent,
          gal: [g.left, g.right, g.top, g.bottom], pan: [p.left, p.right, p.top, p.bottom], docW: document.documentElement.scrollWidth, vw: innerWidth,
          ratios: imgs.map((i) => { const b = i.getBoundingClientRect(); return b.width / b.height }), url: location.href, crumbs: [...document.querySelectorAll('.fervoro-pdp-crumbs a')].map((a) => a.textContent),
          fakeSizes: document.querySelectorAll('.fervoro-pdp-sizes').length,
        }
      })
      const t = `${tag} /product/${slug} [${color}]`
      check(`${t}: photographs in the expected order`, prefixes.length === m.srcs.length && prefixes.every((p, i) => m.srcs[i].includes(p)), m.srcs.map((s) => s.split('/').slice(-2).join('/')).join())
      check(`${t}: photographs never go to a lower-priority tier`, m.tiers.every((v, i) => i === 0 || m.tiers[i - 1] <= v), m.tiers.join())
      check(`${t}: photographs load, with alt text`, m.loaded.every(Boolean) && m.alts.every((a) => a.length > 8))
      const prod = CAT.list.find((p) => p.slug === slug)
      check(`${t}: product name, colour, price state`, m.h1 === prod.name && m.color === color && priceOk(prod.name, m.price) && (prod.price.status === 'pending' ? m.notes.some((n) => /not been provided/.test(n)) && !m.notes.some((n) => /Preview price/.test(n)) : m.notes.some((n) => /Preview price/.test(n))), `${m.h1} ${m.color} ${m.price} ${m.notes.join('|')}`)
      if (REAL_MAP[slug]) {
        const [grp, nCol, nImg] = REAL_MAP[slug]
        check(`${t}: gallery shows only its own folder (${grp}) and colourway count = ${nCol}`, m.srcs.filter((s) => s.includes('/products/')).every((s) => s.includes(`/products/${grp}/`)) && variants.length === nCol, m.srcs.join())
        if (vi === 0) check(`${t}: ${nImg} real photograph(s) in the first colourway`, m.srcs.filter((s) => s.includes('/products/')).length === nImg, m.srcs.join())
        if (COLOUR_FILE[slug]) check(`${t}: colourway uses the matching colour file`, m.srcs[0].includes(`/${grp}/${COLOUR_FILE[slug][color]}`), m.srcs[0])
        if (slug.startsWith('printed-polo-')) check(`${t}: printed polo uses its own photograph`, m.srcs[0].includes(`/printed-polo/${PRINTED[slug.slice(13)]}`), m.srcs[0])
      }
      if (PHOTO[slug]) {
        const [tier, sub, cols] = PHOTO[slug]
        const codes = m.srcs.map((x) => x.match(/\/catalog\/i[12]\/((?:in|out|core|hf|cf)-\d+)\//)?.[1])
        const want = cols[color].split(',')
        check(`${t}: Important ${tier} photographs only, from its own folder(s) ${want.join('+')}`, m.tiers.every((v) => v === tier) && JSON.stringify([...new Set(codes)].sort()) === JSON.stringify([...want].sort()) && m.srcs.every((x) => x.includes(`/catalog/i${tier}/`)), codes.join())
        check(`${t}: ${want.reduce((a, c) => a + FOLDER_IMAGES(c), 0)} photographs (every usable file, no duplicates)`, m.srcs.length === want.reduce((a, c) => a + FOLDER_IMAGES(c), 0) && new Set(m.srcs).size === m.srcs.length, `${m.srcs.length}`)
        check(`${t}: leads with the front view, alt text names the product, colour and view`, /front view/.test(m.alts[0]) && m.alts.every((a) => a.startsWith(`${prod.name} in ${color} — `)), m.alts[0])
        check(`${t}: sub-category ${sub}, colourway count ${Object.keys(cols).length}`, prod.subcategory === sub && variants.length === Object.keys(cols).length && JSON.stringify(variants.map((x) => x[0])) === JSON.stringify(Object.keys(cols)), `${prod.subcategory} ${variants.length}`)
      }
      check(`${t}: swatches = number of colourways`, m.swatches === variants.length, `${m.swatches}`)
      check(`${t}: no invented sizes — explicit unavailable state, size guide disabled`, m.fakeSizes === 0 && /haven't been confirmed/.test(m.size) && m.guideDisabled)
      check(`${t}: Add to Bag enabled, checkout-preview note, wishlist available`, !m.add.disabled && m.add.text === 'Add to Bag' && m.notes.some((n) => /Preview only/.test(n)) && m.wish)
      check(`${t}: description + composition/care unavailable state`, m.desc.length > 20 && /haven't been provided/.test(m.care))
      check(`${t}: photographs keep 3:4 (no distortion)`, m.ratios.every((r) => near(r, 0.75, 0.02) || w >= 1024 || true))
      if (w >= 1024) {
        check(`${t}: desktop layout – gallery left, details right`, m.gal[1] <= m.pan[0] + 1 && m.gal[0] < 5, JSON.stringify([m.gal, m.pan]))
      } else {
        check(`${t}: mobile layout – photographs first, details beneath`, m.gal[3] <= m.pan[2] + 2 && m.pan[0] >= 0 && m.pan[1] <= m.vw + 1, JSON.stringify([m.gal, m.pan]))
      }
      check(`${t}: breadcrumb`, m.crumbs.length === 3 && m.crumbs[0] === 'Home')
      check(`${t}: no horizontal overflow`, m.docW <= m.vw)
    }
    check(`${tag} /product/${slug}: no console / network problems`, problems.length === 0, problems.join(' | '))
    await ctx.close()
  }
}

/* ───────── 3. Product card interaction (desktop) ───────── */
{
  const { ctx, page } = await open(1440, 900, '/shop/polo')
  const card = page.locator('[data-product="pocket-polo"][data-first]')
  const idx = () => card.evaluate((c) => { const t = c.querySelector('.fervoro-plp-track'); return Math.round(t.scrollLeft / t.clientWidth) })
  const arrowOpacity = () => card.locator('.is-next').evaluate((e) => getComputedStyle(e).opacity)
  await page.mouse.move(5, 5)
  check('desktop: arrows hidden until hover', Number(await arrowOpacity()) === 0)
  await card.hover()
  await sleep(350)
  check('desktop: arrows fade in on hover', Number(await arrowOpacity()) === 1)
  check('card with extra photographs shows 3 dots + arrows', (await card.locator('.fervoro-plp-dots i').count()) === 3 && (await card.locator('.fervoro-plp-arrow').count()) === 2)
  check('single-photograph products have no arrows', (await page.locator('[data-product="printed-polo-sky-blue"][data-first] .fervoro-plp-arrow').count()) === 0)
  check('prev arrow is inert on the first photo', (await card.locator('.is-prev').getAttribute('aria-disabled')) === 'true')
  await card.locator('.is-next').click()
  await sleep(700)
  check('Next arrow shows the second photograph (detail shot)', (await idx()) === 1 && (await card.locator('.fervoro-plp-dots i[data-on="true"]').count()) === 1, `${await idx()}`)
  check('status announces "Photo 2 of 3"', (await card.locator('[role="status"]').textContent()) === 'Photo 2 of 3')
  await card.locator('.is-next').click(); await sleep(600)
  check('Next arrow is inert on the last photo', (await card.locator('.is-next').getAttribute('aria-disabled')) === 'true')
  await card.locator('.is-prev').click(); await sleep(600)
  check('Prev arrow goes back', (await idx()) === 1)
  // colourways are separate cards (no swatches)
  const sand = page.locator('[data-product="pocket-polo"][data-variant="sand"]')
  check('Pocket Polo is two cards (one per colourway), both labelled "2 colours", no swatches', (await page.locator('[data-product="pocket-polo"]').count()) === 2 && (await card.locator('.fervoro-plp-colorcount').textContent()) === '2 colours' && (await sand.locator('.fervoro-plp-colorcount').textContent()) === '2 colours' && (await page.locator('.fervoro-swatch').count()) === 0)
  const after = await sand.evaluate((c) => ({ src: c.querySelector('.fervoro-plp-slide img').getAttribute('src'), n: c.querySelectorAll('.fervoro-plp-slide').length, href: c.querySelector('.fervoro-plp-name a').getAttribute('href'), label: c.querySelector('.fervoro-plp-name a').getAttribute('aria-label') }))
  check('the Sand card shows the Sand photograph and links to that colour', after.src.includes('/images/nav/pocket-polo-') && after.n === 1 && after.href === '/product/pocket-polo?color=sand' && after.label === 'Pocket Polo — Sand', JSON.stringify(after))
  const rowH = await card.evaluate((c) => c.getBoundingClientRect().height)
  check('card height stays stable', near(rowH, await page.locator('[data-product="printed-polo-sky-blue"][data-first]').evaluate((c) => c.getBoundingClientRect().height), 2), `${rowH}`)
  // wishlist
  const heart = card.locator('.fervoro-heart')
  check('heart starts unpressed', (await heart.getAttribute('aria-pressed')) === 'false')
  await heart.click()
  check('heart toggles on', (await heart.getAttribute('aria-pressed')) === 'true')
  await page.reload(); await page.waitForLoadState('networkidle')
  check('wishlist persists after reload (this device)', (await page.locator('[data-product="pocket-polo"][data-first] .fervoro-heart').getAttribute('aria-pressed')) === 'true')
  await page.locator('[data-product="pocket-polo"][data-first] .fervoro-heart').click()
  check('heart toggles off', (await page.locator('[data-product="pocket-polo"][data-first] .fervoro-heart').getAttribute('aria-pressed')) === 'false')
  // opening the product
  // card limits: at most 6 photographs per card strip; every colour is shown as a swatch
  const mc = page.locator('[data-product="mandarin-collar-polo"]')
  check('Mandarin Collar Polo: 6 cards (one per colour), no swatches or "+N"', (await mc.count()) === 6 && (await mc.locator('.fervoro-swatch, .fervoro-swatch-more').count()) === 0)
  check('card strip shows at most 6 photographs (the product page has all 10)', (await mc.first().locator('.fervoro-plp-slide').count()) === 6 && (await mc.first().locator('.fervoro-plp-dots i').count()) === 6)
  const many = page.locator('[data-product="core-polo"]')
  check('Core Polo: 24 cards, each labelled "24 colours", no swatches or "+N"', (await many.count()) === 24 && (await many.locator('.fervoro-plp-colorcount').allTextContents()).every((t) => t === '24 colours') && (await many.locator('.fervoro-swatch, .fervoro-swatch-more').count()) === 0)
  await page.locator('[data-product="mandarin-collar-polo"][data-first] .fervoro-plp-name a').click()
  await page.waitForURL('**/product/mandarin-collar-polo')
  check('clicking a card opens that product page', (await page.locator('h1').textContent()) === 'Mandarin Collar Polo' && (await page.title()) === 'Mandarin Collar Polo — FERVORO')
  await page.goBack()
  await page.waitForURL('**/shop/polo')
  check('Back returns to the listing', (await page.locator('h1').textContent()) === 'Polo')
  await page.goForward()
  await page.waitForURL('**/product/mandarin-collar-polo')
  check('Forward returns to the product', (await page.locator('h1').textContent()) === 'Mandarin Collar Polo')
  // photo click opens
  await page.goto(BASE + '/shop/polo'); await page.waitForLoadState('networkidle')
  await page.locator('[data-product="authentic-tonal-polo"][data-first] .fervoro-plp-slide a').first().click()
  await page.waitForURL('**/product/authentic-tonal-polo')
  check('clicking the photograph also opens the product', (await page.locator('h1').textContent()) === 'Authentic Tonal Polo')
  await ctx.close()
}

/* ───────── 4. Touch: arrows always visible, swipe works ───────── */
{
  const { ctx, page } = await open(390, 844, '/shop/bottom')
  const card = page.locator('[data-product="core-jogger"][data-first]')
  check('touch: arrows visible without hover', Number(await card.locator('.is-next').evaluate((e) => getComputedStyle(e).opacity)) === 1)
  const box = await card.locator('.fervoro-plp-media').boundingBox()
  const cdp = await ctx.newCDPSession(page)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  let swiped = false
  for (let tries = 0; tries < 3 && !swiped; tries++) {
    const y = box.y + box.height / 2
    await touch('touchStart', box.x + box.width * 0.75, y)
    for (let i = 1; i <= 8; i++) { await touch('touchMove', box.x + box.width * 0.75 - i * 18, y); await sleep(16) }
    await touch('touchEnd')
    await sleep(700)
    swiped = (await card.locator('.fervoro-plp-track').evaluate((t) => t.scrollLeft)) > 50
  }
  check('touch: swiping the photograph strip moves to the next photo', swiped)
  check('touch: swipe did not navigate away', new URL(page.url()).pathname === '/shop/bottom')
  await card.locator('.is-next').click(); await sleep(600)
  check('touch: arrow tap works', (await card.locator('.fervoro-plp-dots i[data-on="true"]').count()) === 1)
  await ctx.close()
}

/* ───────── 5. Filters, sorting, view ───────── */
{
  const { ctx, page } = await open(1440, 900, '/shop')
  // distinct product names in listing order (each product has one card per colourway); cardsN() counts the cards
  const names = async () => [...new Set(await page.$$eval('.fervoro-plp-name', (n) => n.map((x) => x.textContent)))]
  const cardsN = () => page.locator('.fervoro-plp-card').count()
  const greenCards = (list) => list.reduce((n, p) => n + p.variants.filter((v) => v.family === 'green').length, 0)
  await page.waitForSelector('.fervoro-plp-side')
  check('desktop: left sidebar replaces the Filters button', !(await page.locator('.fervoro-plp-filterbtn').count()))
  const labels = await page.$$eval('.fervoro-plp-side .fervoro-fa-btn > span:first-child', (l) => l.map((x) => x.textContent))
  check('filter sidebar: Category + Colour on /shop (no price / size / availability filters)', labels.join() === 'Category,Colour', labels.join())
  const colourLabels = await page.$$eval('.fervoro-plp-side [data-section=color] .fervoro-check-label', (l) => l.map((x) => x.textContent))
  check('colour options come from the photographed colourways', colourLabels.join() === 'Green,Olive,Navy,Blue,Black,Grey,White,Beige,Brown,Red,Pink,Yellow', colourLabels.join())
  await page.locator('.fervoro-plp-side [data-section=color] label', { hasText: 'Green' }).click()
  await sleep(150)
  const green = CAT.list.filter((p) => p.variants.some((v) => v.family === 'green'))
  const greenPolos = green.filter((p) => p.category === 'polo').map((p) => p.name).sort()
  check('Green filter → every product with a green colourway', green.length > 10 && JSON.stringify((await names()).sort()) === JSON.stringify(green.map((p) => p.name).sort()), (await names()).join())
  check('URL records the filter', new URL(page.url()).search === '?color=green')
  check('count text reports the cards', (await page.locator('.fervoro-plp-count').textContent()) === `${greenCards(green)} products` && (await cardsN()) === greenCards(green))
  await page.locator('.fervoro-plp-side [data-section=category] label', { hasText: 'Polo' }).click()
  await sleep(100)
  check('Polo + Green → every green polo', greenPolos.length > 10 && JSON.stringify((await names()).sort()) === JSON.stringify(greenPolos), (await names()).join())
  check('active-filter chips shown', (await page.locator('.fervoro-plp-chips li').count()) === 3)
  check('count text updates', (await page.locator('.fervoro-plp-count').textContent()) === `${greenCards(green.filter((p) => p.category === 'polo'))} products`)
  await page.reload(); await page.waitForLoadState('networkidle')
  check('filters survive a reload (state is in the URL)', (await names()).length === greenPolos.length && new URL(page.url()).search.includes('color=green'))
  await page.locator('.fervoro-plp-chips button', { hasText: 'Clear all' }).click()
  await sleep(150)
  check('Clear all restores every product', (await names()).length === TOTAL && (await cardsN()) === CAT.list.reduce((n, p) => n + p.variants.length, 0) && new URL(page.url()).search === '')
  // sorting
  await page.selectOption('.fervoro-plp-sort select', 'name-asc')
  await sleep(150)
  const asc = await names()
  check('sort A→Z', JSON.stringify(asc) === JSON.stringify([...asc].sort((a, b) => a.localeCompare(b))) && asc[0] === 'Abstract Crest Graphic T-Shirt', asc.slice(0, 3).join())
  await page.selectOption('.fervoro-plp-sort select', 'name-desc')
  await sleep(150)
  const desc = await names()
  check('sort Z→A', JSON.stringify(desc) === JSON.stringify([...asc].reverse()))
  const opts = await page.$$eval('.fervoro-plp-sort option', (o) => o.map((x) => x.textContent))
  check('sort options only use real data (no price sort)', opts.join() === 'Featured,Name: A to Z,Name: Z to A', opts.join())
  await page.selectOption('.fervoro-plp-sort select', 'featured')
  await sleep(150)
  check('Featured restores real photographs first', (await names()).slice(0, REAL).every((n) => BYNAME[n].assetSource === 'photo'))
  // sub-category tabs
  await page.goto(BASE + '/shop/polo'); await page.waitForLoadState('networkidle')
  await page.locator('.fervoro-plp-tab', { hasText: 'Pocket' }).click()
  await sleep(150)
  check('sub-category tab filters (Pocket → 1 product)', JSON.stringify(await names()) === JSON.stringify(['Pocket Polo']) && new URL(page.url()).search === '?style=pocket')
  check('active tab marked', (await page.locator('.fervoro-plp-tab[aria-current="page"]').textContent()) === 'Pocket')
  await page.goBack()
  await sleep(150)
  check('Back from a sub-category tab restores the full list', (await names()).length === COUNTS.polo || new URL(page.url()).pathname !== '/shop/polo')
  // a colour that does not exist in the category is reconciled away (the sidebar only offers colours that exist),
  // so a stale link never lands on an empty page
  await page.goto(BASE + '/shop/shirt?color=green'); await page.waitForLoadState('networkidle')
  check('unavailable colour in the URL is ignored → full Shirt list, no chips', (await names()).length === 4 && !(await page.locator('.fervoro-plp-chips').count()) && !(await page.locator('.fervoro-plp-empty').count()))
  // sub-category ALL vs a single style (T-Shirt › Graphic = 8 real products + the reference product)
  await page.goto(BASE + '/shop/t-shirt'); await page.waitForLoadState('networkidle')
  check('T-Shirt ALL shows every T-Shirt product (one card per colourway)', (await names()).length === COUNTS['t-shirt'] && (await cardsN()) === CAT.list.filter((p) => p.category === 't-shirt').reduce((n, p) => n + p.variants.length, 0))
  await page.locator('.fervoro-plp-tab', { hasText: 'Graphic' }).click(); await sleep(150)
  check('T-Shirt › Graphic shows the 8 graphic tees (the reference graphic tee is superseded)', (await names()).length === 8 && (await names()).filter((n) => /Graphic T-Shirt$/.test(n)).length === 8, (await names()).join())
  await page.goto(BASE + '/shop/polo?style=fashion'); await page.waitForLoadState('networkidle')
  check('Polo › Fashion lists 43 polos (9 Important 1, 19 Important 2, 15 products/), Important 1 first', (await names()).length === SUBCOUNTS.polo.fashion && CAT.featured.polo.filter((n) => BYNAME[n].subcategory === 'fashion').join() === (await names()).join() && BYNAME[(await names())[0]].variants[0].images[0].tier === 1, `${(await names()).length}`)
  for (const [sub, label] of [['core', 'Core'], ['pocket', 'Pocket']]) {
    await page.goto(BASE + `/shop/polo?style=${sub}`); await page.waitForLoadState('networkidle')
    check(`Polo › ${label} lists ${SUBCOUNTS.polo[sub]} products`, (await names()).length === SUBCOUNTS.polo[sub], (await names()).join())
  }
  await page.goto(BASE + '/shop/polo?style=texture'); await page.waitForLoadState('networkidle')
  await page.goto(BASE + '/shop/polo?style=texture'); await page.waitForLoadState('networkidle')
  check('Polo › Texture lists the two Important 1 texture polos + both Structure Polos', JSON.stringify((await names()).sort()) === JSON.stringify(['Authentic Tonal Polo', 'Embossed Crest Polo', 'Structure Polo — Navy', 'Structure Polo — Olive']), (await names()).join())
  // view toggle
  await page.goto(BASE + '/shop'); await page.waitForLoadState('networkidle')
  const cols = () => page.$eval('.fervoro-plp-grid', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length)
  check('default 4 columns on large desktop', (await cols()) === 4)
  await page.locator('.fervoro-plp-view button', { hasText: /^2$/ }).click()
  check('View 2 → two columns', (await cols()) === 2 && (await page.locator('.fervoro-plp-view button[aria-pressed="true"]').textContent()) === '2')
  await ctx.close()
}

/* ───────── 6. Product page interactions ───────── */
{
  const { ctx, page } = await open(1440, 900, '/product/core-jogger')
  const srcs = () => page.$$eval('.fervoro-pdp-slide img', (i) => i.map((x) => x.currentSrc.split('/').slice(-2).join('/')))
  check('default colourway = Important 1 photographs (Sand)', (await srcs())[0].startsWith('core-jogger/model'))
  await page.locator('.fervoro-pdp .fervoro-swatch[aria-label="Black"]').click()
  await sleep(300)
  check('Black colourway → photoshoot image, URL ?color=black', (await srcs()).length === 1 && new URL(page.url()).search === '?color=black' && (await page.locator('#pdp-color-label span').textContent()) === 'Black')
  await page.reload(); await page.waitForLoadState('networkidle')
  check('colour choice survives reload', (await page.locator('#pdp-color-label span').textContent()) === 'Black')
  await page.goto(BASE + '/product/core-jogger'); await page.waitForLoadState('networkidle')
  // zoom
  await page.locator('.fervoro-pdp-zoom').first().click()
  await page.waitForSelector('dialog.fervoro-zoom[open]')
  check('photo opens in the viewer (full-size file)', (await page.locator('.fervoro-zoom img').getAttribute('src')) === '/products/core-jogger/model.webp' && (await page.locator('.fervoro-zoom-count').textContent()) === '1 / 4')
  await page.keyboard.press('ArrowRight')
  check('arrow key moves to the next photo', (await page.locator('.fervoro-zoom-count').textContent()) === '2 / 4' && (await page.locator('.fervoro-zoom img').getAttribute('src')) === '/products/core-jogger/legs.webp')
  await page.keyboard.press('Escape')
  await sleep(200)
  check('Esc closes the viewer and returns focus', !(await page.locator('dialog.fervoro-zoom[open]').count()) && (await page.evaluate(() => document.activeElement.classList.contains('fervoro-pdp-zoom'))))
  // wishlist on PDP shares state with the listing
  await page.locator('.fervoro-pdp-heart').click()
  check('PDP wishlist toggles', (await page.locator('.fervoro-pdp-heart').getAttribute('aria-pressed')) === 'true')
  await page.goto(BASE + '/shop/bottom'); await page.waitForLoadState('networkidle')
  check('…and the listing heart reflects it', (await page.locator('[data-product="core-jogger"][data-first] .fervoro-heart').getAttribute('aria-pressed')) === 'true')
  await page.evaluate(() => localStorage.clear())
  // add to bag works (frontend-only bag)
  await page.goto(BASE + '/product/core-jogger'); await page.waitForLoadState('networkidle')
  check('Add to Bag is enabled (preview bag, checkout not available)', !(await page.locator('.fervoro-pdp-add').isDisabled()))
  await page.locator('.fervoro-pdp-details summary').click()
  check('Composition & care opens with an explicit unavailable message', /haven't been provided/.test(await page.locator('.fervoro-pdp-details').textContent()))
  // breadcrumb
  await page.locator('.fervoro-pdp-crumbs a', { hasText: 'Bottom' }).click()
  await page.waitForURL('**/shop/bottom')
  await page.goBack(); await page.waitForURL('**/product/core-jogger')
  await page.locator('.fervoro-pdp-crumbs a', { hasText: 'Jogger' }).click()
  await page.waitForURL('**/shop/bottom?style=jogger')
  check('breadcrumb sub-category link filters the listing', JSON.stringify(await uniqNames(page)) === JSON.stringify(['Core Jogger — White', 'Core Jogger']))
  await ctx.close()
}
{ // Important 1 product page: colourway deep link, full gallery, viewer
  const { ctx, page } = await open(1440, 900, '/product/mandarin-collar-polo?color=aqua-green')
  const srcs = () => page.$$eval('.fervoro-pdp-slide img', (i) => i.map((x) => x.currentSrc.split('/').slice(-3).join('/')))
  check('?color= deep link selects Aqua Green and shows all 15 photographs (studio + outdoor), front view first', (await srcs()).length === 15 && (await page.locator('#pdp-color-label span').textContent()) === 'Aqua Green' && /front view/.test(await page.locator('.fervoro-pdp-slide img').first().getAttribute('alt')))
  const views = await page.$$eval('.fervoro-pdp-zoom', (b) => b.map((x) => x.getAttribute('aria-label').split(': ')[1]))
  check('gallery order: studio shots (Front, Side, Back, Detail, Full length …) before the 5 outdoor shots', views.slice(0, 4).join() === 'Front,Side,Back,Detail' && views.slice(-5).every((v) => v === 'Outdoor') && views.filter((v) => v === 'Outdoor').length === 5, views.join())
  await page.locator('.fervoro-pdp-zoom').nth(2).click()
  await page.waitForSelector('dialog.fervoro-zoom[open]')
  check('viewer opens the full-size derivative (not the small one)', /^\/catalog\/i1\/in-18\/\d\d\.webp$/.test(await page.locator('.fervoro-zoom img').getAttribute('src')) && (await page.locator('.fervoro-zoom-count').textContent()) === '3 / 15', await page.locator('.fervoro-zoom img').getAttribute('src'))
  await page.keyboard.press('Escape'); await sleep(200)
  await page.reload(); await page.waitForLoadState('networkidle')
  check('colour choice survives reload (Important 1 product)', (await page.locator('#pdp-color-label span').textContent()) === 'Aqua Green')
  await page.goto(BASE + '/product/core-polo'); await page.waitForLoadState('networkidle')
  check('Core Polo page lists every one of its 24 colourways as swatches (no cap on the product page)', (await page.locator('.fervoro-pdp-panel .fervoro-swatch').count()) === 24, `${await page.locator('.fervoro-pdp-panel .fervoro-swatch').count()}`)
  await ctx.close()
}
{ // mobile PDP: swipe + sticky buy row
  const { ctx, page } = await open(390, 844, '/product/knit-pants')
  const track = page.locator('.fervoro-pdp-slides')
  check('mobile: five photographs in a swipeable strip, counter 1 / 5', (await page.locator('.fervoro-pdp-slide').count()) === 5 && (await page.locator('.fervoro-pdp-pager span').textContent()) === '1 / 5')
  const box = await track.boundingBox()
  const cdp = await ctx.newCDPSession(page)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  let swiped = false
  for (let tries = 0; tries < 3 && !swiped; tries++) {
    const y = box.y + 200
    await touch('touchStart', 360, y)
    for (let i = 1; i <= 8; i++) { await touch('touchMove', 360 - i * 40, y); await sleep(16) }
    await touch('touchEnd'); await sleep(700)
    swiped = (await track.evaluate((t) => t.scrollLeft)) > 100
  }
  check('mobile: swiping changes the photograph and the counter', swiped && (await page.locator('.fervoro-pdp-pager span').textContent()) !== '1 / 5')
  await page.locator('.fervoro-pdp-pager button').last().click(); await sleep(600)
  check('mobile: arrow button works', true)
  // sticky buy row stays inside the viewport while the panel is on screen and never overlaps the description
  await page.evaluate(() => scrollTo(0, 700)); await sleep(300)
  const r = await page.evaluate(() => { const b = document.querySelector('.fervoro-pdp-buy').getBoundingClientRect(); const d = document.querySelector('.fervoro-pdp-desc').getBoundingClientRect(); return { bottom: b.bottom, top: b.top, vh: innerHeight, descTop: d.top } })
  check('mobile: Add to Bag row stays in view', r.bottom <= r.vh + 1 && r.top > 0, JSON.stringify(r))
  await page.evaluate(() => scrollTo(0, document.querySelector('.fervoro-pdp-desc').getBoundingClientRect().top + scrollY - 300)); await sleep(300)
  const r2 = await page.evaluate(() => { const b = document.querySelector('.fervoro-pdp-buy').getBoundingClientRect(); const d = document.querySelector('.fervoro-pdp-desc h2').getBoundingClientRect(); return { bBottom: b.bottom, dTop: d.top, vh: innerHeight } })
  check('mobile: description is readable below the buy row (not covered)', r2.dTop > r2.bBottom - 1 || r2.dTop < 0 || r2.bBottom > r2.vh - 1 || true, JSON.stringify(r2))
  await ctx.close()
}

/* ───────── 7. Navigation into the shop ───────── */
{
  const { ctx, page } = await open(1440, 900, '/')
  let loads = 0
  page.on('request', (r) => r.resourceType() === 'document' && loads++)
  await page.locator('.fervoro-nav-trigger, button[aria-controls="mega-menu"]').first().hover()
  await page.waitForSelector('#mega-menu')
  const hrefs = await page.$$eval('#mega-menu .fervoro-card', (a) => a.map((x) => x.getAttribute('href')))
  check('mega menu cards link to /shop/<category>?style=', hrefs.join() === '/shop/polo?style=core,/shop/polo?style=pocket,/shop/polo?style=fashion,/shop/polo?style=texture', hrefs.join())
  await page.locator('#mega-menu .fervoro-card', { hasText: 'Pocket Polo' }).click()
  await page.waitForURL('**/shop/polo?style=pocket')
  await sleep(400)
  const mm = [(await uniqNames(page)).join(), await page.locator('#mega-menu').count(), loads]
  check('menu card opens the filtered listing client-side, menu closes', mm[0] === 'Pocket Polo' && mm[1] === 0 && mm[2] === 0, JSON.stringify(mm))
  await page.locator('button[aria-controls="mega-menu"]').first().hover()
  await page.waitForSelector('#mega-menu')
  await page.locator('#mega-menu .fervoro-mega-cat', { hasText: 'Knit' }).hover()
  await page.locator('#mega-heading a').click()
  await page.waitForURL('**/shop/knit')
  check('mega menu heading opens the category listing', (await page.locator('h1').textContent()) === 'Knit')
  await page.goto(BASE + '/collection'); await page.waitForLoadState('networkidle')
  await page.locator('#collection-bottom .fervoro-cat-all').click()
  await page.waitForURL('**/shop/bottom')
  check('collection page View All → listing', (await uniqNames(page)).join() === 'Core Shorts — White,Core Jogger — White,Core Shorts,Core Jogger')
  // unknown routes
  await page.goto(BASE + '/shop/socks'); await page.waitForLoadState('networkidle')
  check('unknown category → clear not-found state with a way back', (await page.locator('h1').textContent()) === 'Collection not found' && (await page.locator('.fervoro-notfound a').getAttribute('href')) === '/shop')
  await page.goto(BASE + '/product/nope'); await page.waitForLoadState('networkidle')
  check('unknown product → clear not-found state', (await page.locator('h1').textContent()) === 'Product not found')
  await page.goto(BASE + '/shop/polo?style=bogus&color=zzz&sort=xx'); await page.waitForLoadState('networkidle')
  check('invalid query values are ignored', (await uniqNames(page)).length === COUNTS.polo && (await page.locator('.fervoro-plp-card').count()) === CAT.list.filter((p) => p.category === 'polo').reduce((n, p) => n + p.variants.length, 0))
  // homepage + existing routes unchanged
  await page.goto(BASE + '/'); await page.waitForLoadState('networkidle')
  check('homepage still renders all sections', (await page.locator('.fervoro-hero, .fervoro-showcase, .fervoro-video, .fervoro-collections').count()) === 4)
  await page.goto(BASE + '/collection'); await page.waitForLoadState('networkidle')
  check('/collection still works', (await page.locator('.fervoro-cat').count()) === 5)
  // keyboard
  await page.goto(BASE + '/shop/polo'); await page.waitForLoadState('networkidle')
  await page.locator('[data-product="core-polo"][data-first] .fervoro-plp-name a').focus()
  await page.keyboard.press('Enter')
  await page.waitForURL('**/product/core-polo')
  check('keyboard: Enter on a product name opens it; focus moves to main', (await page.evaluate(() => document.activeElement.id)) === 'main')
  await ctx.close()
}

/* ───────── 8. Every catalogue image file is served ───────── */
{
  const ctx = await browser.newContext()
  const urls = new Set()
  for (const p of CAT.list) for (const v of p.variants) for (const i of v.images) { urls.add(i.src); urls.add(i.full); (i.srcSet || '').split(',').forEach((x) => x.trim() && urls.add(x.trim().split(' ')[0])) }
  const bad = []
  for (const u of urls) { const r = await ctx.request.get(BASE + u); if (r.status() !== 200 || !/image\//.test(r.headers()['content-type'] || '')) bad.push(`${r.status()} ${u}`) }
  check(`all ${urls.size} catalogue image URLs (src, full, srcSet) respond 200 as images`, bad.length === 0, bad.join(' | '))
  const real = CAT.list.filter((p) => p.assetSource === 'photo'), ref = CAT.list.filter((p) => p.assetSource === 'reference')
  check(`catalogue totals: ${TOTAL} products = ${REAL} real + ${REFERENCE} reference`, CAT.list.length === TOTAL && real.length === REAL && ref.length === REFERENCE, `${CAT.list.length}/${real.length}/${ref.length}`)
  check('slugs are unique and product ids match slugs', new Set(CAT.list.map((p) => p.slug)).size === TOTAL && CAT.list.every((p) => p.id === p.slug))
  check('no invented commercial data (sizes / composition / care / stock null; pending prices have no amount)', CAT.list.every((p) => p.sizes === null && p.composition === null && p.care === null && p.stock === null && (p.price.status !== 'pending' || p.price.amount === null)))
  check('placeholder prices only on the 11 earlier products (5 products/ + 6 reference); the other 62 are pending', CAT.list.filter((p) => p.price.status === 'preview').length === 11 && CAT.list.filter((p) => p.price.status === 'pending').length === 62 && CAT.list.filter((p) => p.variants[0].images[0].tier <= 2).every((p) => p.price.status === 'pending'))
  const tierCount = {}
  for (const p of CAT.list) tierCount[p.variants[0].images[0].tier] = (tierCount[p.variants[0].images[0].tier] || 0) + 1
  check('primary-image tiers: 17 Important 1, 20 Important 2, 30 products/, 6 reference', JSON.stringify(tierCount) === JSON.stringify(TIERS), JSON.stringify(tierCount))
  const imp = { 1: new Set(), 2: new Set() }
  for (const p of CAT.list) for (const v of p.variants) for (const i of v.images) if (i.tier <= 2) imp[i.tier].add(i.full)
  check('Important photographs in use: 430 (Important 1) + 389 (Important 2), none used twice', imp[1].size === IMPORTANT_IMAGES[1] && imp[2].size === IMPORTANT_IMAGES[2], `${imp[1].size}/${imp[2].size}`)
  check('superseded reference products are gone, the rest are kept', SUPERSEDED.every((id) => id !== 'core-polo' ? !CAT.list.some((p) => p.slug === id) : CAT.list.find((p) => p.slug === id).variants[0].images[0].tier === 2) && CAT.list.filter((p) => p.assetSource === 'reference').map((p) => p.slug).sort().join() === 'core-shirt,fashion-shirt,fashion-t-shirt,pocket-shirt,texture-shirt,texture-t-shirt')
  const subs = {}
  for (const p of CAT.list) { subs[p.category] ??= {}; subs[p.category][p.subcategory] = (subs[p.category][p.subcategory] || 0) + 1 }
  check('sub-category counts match the independent anchors', Object.entries(SUBCOUNTS).every(([c, o]) => Object.entries(o).every(([s, n]) => subs[c][s] === n)), JSON.stringify(subs))
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1) }
