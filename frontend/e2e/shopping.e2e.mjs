/**
 * End-to-end checks for the shopping flow: card swatches, product-page Back / breadcrumb, the shared wishlist and bag,
 * and the four header icons (search, account, wishlist, bag) on desktop and mobile.
 * Prerequisites: `npm run dev` running and Playwright. Run: node e2e/shopping.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = (process.env.BASE_URL || 'http://localhost:5173/').replace(/\/$/, '')
let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else { failures.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch()
const open = async (w, h, url) => {
  const touch = w < 1024
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  await page.goto(BASE + url)
  await page.waitForLoadState('networkidle')
  return { ctx, page, problems }
}
const label = (page, key) => page.locator(`[data-util=${key}]`).getAttribute('aria-label')

/* ── 1. Listing: every colourway is its own card; no swatches; "N colours" label ── */
const catalog = await (async () => {
  const { ctx, page } = await open(1440, 900, '/')
  const d = await page.evaluate(async () => (await import('/src/data/catalog.js')).PRODUCT_LIST.map((p) => [p.slug, p.category, p.variants.map((v) => [v.id, v.name, v.images[0].src.replace(/-sm\.webp$/, '').replace(/\.webp$/, '').replace(/-\d+$/, ''), v.family])]))
  await ctx.close()
  return Object.fromEntries(d.map(([slug, category, variants]) => [slug, { category, variants }]))
})()
const totalCards = Object.values(catalog).reduce((n, p) => n + p.variants.length, 0)
for (const [w, h] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568]]) {
  const tag = `@${w}`
  for (const path of ['/shop/polo', '/shop']) {
    const { ctx, page, problems } = await open(w, h, path)
    const m = await page.evaluate(() => [...document.querySelectorAll('.fervoro-plp-card')].map((c) => ({
      slug: c.dataset.product, variant: c.dataset.variant, label: c.querySelector('.fervoro-plp-colorcount')?.textContent, swatches: c.querySelectorAll('.fervoro-swatch, .fervoro-swatches, .fervoro-swatch-more').length,
      href: c.querySelector('.fervoro-plp-name a').getAttribute('href'), src: c.querySelector('.fervoro-plp-slide img').getAttribute('src'), text: c.querySelector('.fervoro-plp-info').textContent,
    })))
    const want = Object.entries(catalog).filter(([, p]) => path === '/shop' || p.category === 'polo').reduce((n, [, p]) => n + p.variants.length, 0)
    check(`${tag} ${path}: ${want} cards — one per colourway`, m.length === want, `${m.length}`)
    check(`${tag} ${path}: ${path === '/shop' ? totalCards : want} = sum of every product's colourways (nothing dropped)`, m.length === (path === '/shop' ? totalCards : want))
    check(`${tag} ${path}: every colourway of every product appears exactly once`, Object.entries(catalog).filter(([, p]) => path === '/shop' || p.category === 'polo').every(([slug, p]) => JSON.stringify(m.filter((x) => x.slug === slug).map((x) => x.variant)) === JSON.stringify(p.variants.map((v) => v[0]))))
    check(`${tag} ${path}: no swatches / "+N" on any card`, m.every((x) => x.swatches === 0 && !/\+\d/.test(x.text)))
    check(`${tag} ${path}: each card says "N colours" (or "1 colour") with its product's total`, m.every((x) => x.label === (catalog[x.slug].variants.length === 1 ? '1 colour' : `${catalog[x.slug].variants.length} colours`)))
    check(`${tag} ${path}: each card uses its own colourway's photograph and links to it`, m.every((x) => { const v = catalog[x.slug].variants.find((y) => y[0] === x.variant); return x.src.startsWith(v[2].replace(/\/\d+$/, '').replace(/\/(model|front|side|back|detail)$/, '')) || x.src.includes(v[2].split('/').slice(0, -1).join('/')) }) && m.every((x) => x.href === `/product/${x.slug}${x.variant === catalog[x.slug].variants[0][0] ? '' : `?color=${x.variant}`}`))
    check(`${tag} ${path}: distinct cards have distinct photographs (24 Core Polo cards = 24 different images)`, new Set(m.filter((x) => x.slug === 'core-polo' || path === '/shop').map((x) => x.slug + x.src)).size === m.filter((x) => x.slug === 'core-polo' || path === '/shop').length)
    if (path === '/shop/polo') {
      check(`${tag} Core Polo = 24 cards, Mandarin Collar Polo = 6, Classic White Polo = 1`, m.filter((x) => x.slug === 'core-polo').length === 24 && m.filter((x) => x.slug === 'mandarin-collar-polo').length === 6 && m.filter((x) => x.slug === 'classic-white-polo').length === 1)
      check(`${tag} Core Polo cards read "24 colours"`, m.filter((x) => x.slug === 'core-polo').every((x) => x.label === '24 colours'))
    }
    check(`${tag} ${path}: no horizontal overflow, no console errors`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) && problems.length === 0, problems.join(' | '))
    await ctx.close()
  }
}
{ // colour filter: only the matching colourways become cards
  const { ctx, page } = await open(1440, 900, '/shop/polo?color=navy')
  const m = await page.$$eval('.fervoro-plp-card', (c) => c.map((x) => [x.dataset.product, x.dataset.variant]))
  const want = Object.entries(catalog).filter(([, p]) => p.category === 'polo').flatMap(([slug, p]) => p.variants.filter((v) => v[3] === 'navy').map((v) => [slug, v[0]]))
  check('colour filter (Polo + Navy): one card per navy colourway, nothing else', JSON.stringify(m) === JSON.stringify(want) && m.length > 5, `${m.length}/${want.length}`)
  check('colour filter: count text = number of cards', (await page.locator('.fervoro-plp-count').textContent()) === `${m.length} products`)
  await ctx.close()
}
{ // wishlist is per product: every card of a product shares the heart
  const { ctx, page } = await open(1440, 900, '/shop/polo?style=core')
  await page.locator('[data-product="core-polo"][data-first] .fervoro-heart').click()
  const pressed = await page.$$eval('[data-product="core-polo"] .fervoro-heart', (b) => b.map((x) => x.getAttribute('aria-pressed')))
  check('wishlisting one Core Polo card marks all 24 Core Polo cards and counts as one saved item', pressed.length === 24 && pressed.every((v) => v === 'true') && (await page.locator('[data-util=wishlist]').getAttribute('aria-label')) === 'Wishlist, 1 saved item')
  await ctx.close()
}
{ // opening a colourway card lands on that colour
  const { ctx, page } = await open(1440, 900, '/shop/polo?style=core')
  await page.locator('[data-product="core-polo"][data-variant="' + catalog['core-polo'].variants[7][0] + '"] .fervoro-plp-name a').click()
  await page.waitForURL('**/product/core-polo?color=*')
  check('clicking the 8th Core Polo card opens the product page on that colour', (await page.locator('#pdp-color-label span').textContent()) === catalog['core-polo'].variants[7][1])
  await ctx.close()
}

/* ── 2. Product page: Back + breadcrumb ── */
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const tag = `@${w}`
  const { ctx, page } = await open(w, h, '/shop/polo?style=core')
  await page.locator('[data-product="mandarin-collar-polo"][data-first] .fervoro-plp-name a').click()
  await page.waitForURL('**/product/mandarin-collar-polo')
  const geo = await page.evaluate(() => {
    const t = document.querySelector('.fervoro-pdp-topbar').getBoundingClientRect(), g = document.querySelector('.fervoro-pdp-gallery').getBoundingClientRect(), h1 = document.querySelector('h1').getBoundingClientRect()
    const links = [...document.querySelectorAll('.fervoro-pdp-crumbs a, .fervoro-pdp-back')].map((a) => { const r = a.getBoundingClientRect(); return [r.height >= 40, r.top >= 0] })
    return { topAbove: t.bottom <= g.top + 1 && t.bottom <= h1.top, links, crumbs: [...document.querySelectorAll('.fervoro-pdp-crumbs a')].map((a) => [a.textContent, a.getAttribute('href')]) }
  })
  check(`${tag} Back + breadcrumb bar sits above the gallery and the title`, geo.topAbove)
  check(`${tag} breadcrumb: Home → /, Polo → /shop/polo, Core → /shop/polo?style=core`, JSON.stringify(geo.crumbs) === JSON.stringify([['Home', '/'], ['Polo', '/shop/polo'], ['Core', '/shop/polo?style=core']]), JSON.stringify(geo.crumbs))
  check(`${tag} Back and breadcrumb links are touch-sized (≥ 40px tall)`, geo.links.every(([tall]) => tall), JSON.stringify(geo.links))
  await page.locator('.fervoro-pdp-back').click()
  await page.waitForURL('**/shop/polo?style=core')
  check(`${tag} Back returns to the listing the user came from`, (await page.locator('.fervoro-plp-title').textContent()) === 'Polo' && (await page.locator('.fervoro-plp-tab[aria-current="page"]').textContent()) === 'Core')
  await page.locator('[data-product="mandarin-collar-polo"][data-first] .fervoro-plp-name a').click()
  await page.waitForURL('**/product/mandarin-collar-polo')
  await page.locator('.fervoro-pdp-crumbs a', { hasText: 'Polo' }).click()
  await page.waitForURL('**/shop/polo')
  check(`${tag} "Polo" crumb opens the polo listing`, (await page.locator('.fervoro-plp-title').textContent()) === 'Polo')
  await page.goBack(); await page.waitForURL('**/product/mandarin-collar-polo')
  await page.locator('.fervoro-pdp-crumbs a', { hasText: 'Core' }).click()
  await page.waitForURL('**/shop/polo?style=core')
  check(`${tag} "Core" crumb opens the Core sub-category`, (await page.locator('.fervoro-plp-count').textContent()) === '31 products')
  await page.goBack(); await page.waitForURL('**/product/mandarin-collar-polo')
  await page.locator('.fervoro-pdp-crumbs a', { hasText: 'Home' }).click()
  await page.waitForURL(BASE + '/')
  check(`${tag} "Home" crumb opens the homepage`, (await page.locator('.fervoro-hero').count()) === 1)
  await ctx.close()
  // deep link (no earlier in-app page): Back falls back to the category listing
  const d = await open(w, h, '/product/mandarin-collar-polo')
  await d.page.locator('.fervoro-pdp-back').click()
  await d.page.waitForURL('**/shop/polo')
  check(`${tag} Back on a directly opened product goes to its category listing`, (await d.page.locator('.fervoro-plp-title').textContent()) === 'Polo')
  await d.ctx.close()
}

/* ── 3-5. Wishlist, bag and header icons (desktop + mobile) ── */
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const tag = `@${w}`
  const desktop = w >= 1024
  const { ctx, page, problems } = await open(w, h, '/shop/polo?style=core')
  check(`${tag} header starts without counts`, (await label(page, 'wishlist')) === 'Wishlist' && (await label(page, 'bag')) === 'Shopping bag' && (await page.locator('.fervoro-util-badge').count()) === 0)
  // wishlist from the listing
  const heart = page.locator('[data-product="mandarin-collar-polo"][data-first] .fervoro-heart')
  await heart.click()
  check(`${tag} card heart updates the header live ("1 saved item")`, (await label(page, 'wishlist')) === 'Wishlist, 1 saved item' && (await page.locator('[data-util=wishlist] .fervoro-util-badge').textContent()) === '1')
  await page.locator('[data-product="classic-white-polo"][data-first] .fervoro-heart').click()
  check(`${tag} second heart → "2 saved items"`, (await label(page, 'wishlist')) === 'Wishlist, 2 saved items')
  // PDP reflects it, and toggling there syncs back
  await page.locator('[data-product="mandarin-collar-polo"][data-first] .fervoro-plp-name a').click()
  await page.waitForURL('**/product/mandarin-collar-polo')
  check(`${tag} product-page heart shows the saved state`, (await page.locator('.fervoro-pdp-heart').getAttribute('aria-pressed')) === 'true')
  await page.locator('.fervoro-pdp-heart').click()
  check(`${tag} un-saving on the product page updates the header`, (await page.locator('.fervoro-pdp-heart').getAttribute('aria-pressed')) === 'false' && (await label(page, 'wishlist')) === 'Wishlist, 1 saved item')
  await page.locator('.fervoro-pdp-heart').click()
  // add to bag
  await page.locator('.fervoro-pdp-add').click()
  check(`${tag} Add to Bag updates the header bag live`, (await label(page, 'bag')) === 'Shopping bag, 1 item' && (await page.locator('[data-util=bag] .fervoro-util-badge').textContent()) === '1')
  check(`${tag} Add to Bag confirms with a "View bag" link`, /Added/.test(await page.locator('.fervoro-pdp-add').textContent()) && (await page.locator('.fervoro-pdp-status a').getAttribute('href')) === '/bag')
  await page.locator('.fervoro-pdp-add').click()
  check(`${tag} adding the same colour again makes quantity 2`, (await label(page, 'bag')) === 'Shopping bag, 2 items')
  await page.locator('.fervoro-pdp .fervoro-swatch[aria-label="Black"]').click()
  await page.locator('.fervoro-pdp-add').click()
  check(`${tag} another colour is a separate line (3 items)`, (await label(page, 'bag')) === 'Shopping bag, 3 items')
  // wishlist page
  await page.locator('[data-util=wishlist]').click()
  await page.waitForURL('**/wishlist')
  const names = await page.$$eval('.fervoro-wish .fervoro-plp-name', (n) => n.map((x) => x.textContent))
  check(`${tag} wishlist icon opens /wishlist with the saved products (most recently saved last)`, JSON.stringify(names) === JSON.stringify(['Classic White Polo', 'Mandarin Collar Polo']), names.join()) // Mandarin was un-saved and saved again on its page
  check(`${tag} wishlist page hearts are filled`, (await page.locator('.fervoro-wish .fervoro-heart[aria-pressed="true"]').count()) === 2)
  await page.locator('.fervoro-wish [data-product="classic-white-polo"][data-first] .fervoro-heart').click()
  check(`${tag} removing from the wishlist page removes the card and updates the header`, (await page.locator('.fervoro-wish .fervoro-plp-card').count()) === 1 && (await label(page, 'wishlist')) === 'Wishlist, 1 saved item')
  await page.reload(); await page.waitForLoadState('networkidle')
  check(`${tag} wishlist and bag survive a reload`, (await label(page, 'wishlist')) === 'Wishlist, 1 saved item' && (await label(page, 'bag')) === 'Shopping bag, 3 items')
  // bag page
  await page.locator('[data-util=bag]').click()
  await page.waitForURL('**/bag')
  check(`${tag} bag icon opens /bag with two lines (Navy ×2, Black ×1)`, (await page.locator('.fervoro-bag-line').count()) === 2 && (await page.locator('.fervoro-bag-line output').allTextContents()).join() === '2,1', (await page.locator('.fervoro-bag-meta').allTextContents()).join())
  check(`${tag} bag shows "Price to be confirmed" for the subtotal and a disabled checkout`, (await page.locator('.fervoro-bag-total strong').textContent()) === 'Price to be confirmed' && (await page.locator('.fervoro-bag-summary .fervoro-pdp-add').isDisabled()))
  await page.locator('.fervoro-bag-line').first().getByRole('button', { name: 'Increase quantity' }).click()
  check(`${tag} quantity + updates the header`, (await label(page, 'bag')) === 'Shopping bag, 4 items')
  await page.locator('.fervoro-bag-line').first().getByRole('button', { name: 'Decrease quantity' }).click()
  await page.locator('.fervoro-bag-line').first().getByRole('button', { name: 'Decrease quantity' }).click()
  await page.locator('.fervoro-bag-line').first().getByRole('button', { name: 'Decrease quantity' }).click()
  check(`${tag} quantity − down to 0 removes the line`, (await page.locator('.fervoro-bag-line').count()) === 1 && (await label(page, 'bag')) === 'Shopping bag, 1 item')
  await page.locator('.fervoro-bag-remove').click()
  check(`${tag} Remove empties the bag, header badge disappears`, (await page.locator('.fervoro-bag-line').count()) === 0 && (await label(page, 'bag')) === 'Shopping bag' && /empty/i.test(await page.locator('.fervoro-page-sub').textContent()))
  // search + account
  if (desktop) {
    await page.locator('[data-util=search]').click()
  } else {
    await page.locator('.fervoro-burger').tap()
    await page.locator('#mobile-menu .fervoro-mobile-util', { hasText: 'Search' }).tap()
  }
  await page.waitForURL('**/search')
  check(`${tag} search icon opens /search with the input focused`, await page.evaluate(() => document.activeElement?.id === 'search-input'))
  await page.keyboard.type('navy polo')
  await page.waitForTimeout(400)
  const found = await page.$$eval('.fervoro-search .fervoro-plp-name', (n) => n.map((x) => x.textContent))
  check(`${tag} search "navy polo" finds only products with a navy colourway`, found.length > 3 && new URL(page.url()).searchParams.get('q') === 'navy polo' && found.includes('Mandarin Collar Polo'), `${found.length}`)
  await page.fill('#search-input', 'zzzz')
  await page.waitForTimeout(300)
  check(`${tag} search with no match shows an empty state`, (await page.locator('.fervoro-plp-empty').count()) === 1 && (await page.locator('.fervoro-search .fervoro-plp-card').count()) === 0)
  if (desktop) {
    await page.locator('[data-util=account]').click()
  } else {
    await page.locator('.fervoro-burger').tap()
    await page.locator('#mobile-menu .fervoro-mobile-util', { hasText: 'Account' }).tap()
  }
  await page.waitForURL('**/account')
  check(`${tag} account icon opens /account (honest "not available yet" page, links to wishlist and bag)`, /aren't available yet/.test(await page.locator('.fervoro-page-sub').textContent()) && (await page.locator('.fervoro-account-list a').count()) === 3)
  check(`${tag} header stays usable on every new page (no overflow)`, !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
  check(`${tag} no console errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

/* ── 6. Footer links wired ── */
{
  const { ctx, page } = await open(1440, 900, '/')
  const hrefs = await page.$$eval('.fervoro-footer-link[href]', (a) => a.map((x) => x.getAttribute('href')))
  check('footer My Account / Wishlist / Shopping Bag are real links', ['/account', '/wishlist', '/bag'].every((h) => hrefs.includes(h)), hrefs.join())
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1) }
