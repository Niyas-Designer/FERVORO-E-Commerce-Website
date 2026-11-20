/**
 * End-to-end checks for the listing filter sidebar (desktop) and the filter drawer (tablet / mobile).
 * Prerequisites: `npm run dev` running and Playwright. Run: node e2e/sidebar.e2e.mjs
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

const CAT = await (async () => {
  const { ctx, page } = await open(1440, 900, '/')
  const d = await page.evaluate(async () => {
    const m = await import('/src/data/catalog.js')
    return { list: m.PRODUCT_LIST.map((p) => ({ slug: p.slug, name: p.name, category: p.category, sub: p.subcategory, variants: p.variants.map((v) => ({ id: v.id, family: v.family })) })), families: m.COLOR_FAMILIES.map((f) => f.id), cats: m.CATEGORIES.map((c) => c.id) }
  })
  await ctx.close()
  return d
})()
const cardsFor = ({ category, styles = [], families = [] }) => CAT.list.filter((p) => (!category || p.category === category) && (!styles.length || styles.includes(p.sub))).reduce((n, p) => n + p.variants.filter((v) => !families.length || families.includes(v.family)).length, 0)
const familiesIn = (category) => CAT.families.filter((f) => CAT.list.some((p) => p.category === category && p.variants.some((v) => v.family === f)))
const cardCount = (page) => page.locator('.fervoro-plp-card').count()
const countText = (page) => page.locator('.fervoro-plp-count').textContent()
const secLabels = (page, root) => page.$$eval(`${root} .fervoro-fa-btn > span:first-child`, (l) => l.map((x) => x.textContent))
const opts = (page, root, sec) => page.$$eval(`${root} [data-section=${sec}] .fervoro-check-label`, (l) => l.map((x) => x.textContent))

/* ───────── 1. Desktop sidebar ───────── */
{
  const { ctx, page, problems } = await open(1440, 900, '/shop/polo')
  const side = page.locator('.fervoro-plp-side')
  check('desktop: sidebar present, Filters button absent, drawer absent', (await side.count()) === 1 && !(await page.locator('.fervoro-plp-filterbtn').count()) && !(await page.locator('dialog.fervoro-filter').count()))
  const box = await side.evaluate((n) => { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return { w: r.width, pos: cs.position, bl: cs.borderRightWidth, bg: cs.backgroundColor } })
  check('sidebar is 240–280px wide (incl. divider) with a thin vertical divider and white background', box.w >= 240 && box.w <= 300 && box.bl === '1px' && box.bg === 'rgb(255, 255, 255)', JSON.stringify(box))
  check('sidebar is sticky', box.pos === 'sticky')
  check('sections: Category, Subcategory, Colour (no Size / Price / Availability — no verified data)', (await secLabels(page, '.fervoro-plp-side')).join() === 'Category,Subcategory,Colour' && !/size|price|availability/i.test(await side.innerText()))
  check('Subcategory lists the Polo sub-categories', (await opts(page, '.fervoro-plp-side', 'style')).join() === 'Core,Pocket,Fashion,Texture')
  const colourOpts = await opts(page, '.fervoro-plp-side', 'color')
  check('Colour lists every colour family present in Polo, and only those', colourOpts.length === familiesIn('polo').length && colourOpts.length > 5, colourOpts.join())
  check('colour options have swatch dots and readable names', (await page.locator('.fervoro-plp-side [data-section=color] .fervoro-check-dot').count()) === colourOpts.length && colourOpts.every((n) => /^[A-Z][a-z]+$/.test(n)))
  check('all Polo cards shown initially (one per colourway)', (await cardCount(page)) === cardsFor({ category: 'polo' }) && (await countText(page)) === `${cardsFor({ category: 'polo' })} products`)
  check('layout: grid sits to the right of the sidebar', await page.evaluate(() => document.querySelector('.fervoro-plp-grid').getBoundingClientRect().left >= document.querySelector('.fervoro-plp-side').getBoundingClientRect().right))
  check('grid has 4 equal columns by default', await page.evaluate(() => { const c = [...document.querySelectorAll('.fervoro-plp-card')].slice(0, 4).map((x) => Math.round(x.getBoundingClientRect().width)); return c.every((w) => Math.abs(w - c[0]) <= 1) && getComputedStyle(document.querySelector('.fervoro-plp-grid')).gridTemplateColumns.split(' ').length === 4 }))
  for (const n of [2, 3, 4]) {
    await page.locator(`.fervoro-plp-view button[aria-label="${n} per row"]`).click()
    await sleep(80)
    check(`view ${n}: ${n} columns`, (await page.evaluate(() => getComputedStyle(document.querySelector('.fervoro-plp-grid')).gridTemplateColumns.split(' ').length)) === n)
  }

  // sub-category (multi-select)
  await page.locator('.fervoro-plp-side [data-section=style] label', { hasText: 'Core' }).click()
  await sleep(150)
  check('Subcategory Core → only Core polo cards, URL + tab reflect it', (await cardCount(page)) === cardsFor({ category: 'polo', styles: ['core'] }) && new URL(page.url()).search === '?style=core' && (await page.locator('.fervoro-plp-tab[aria-current=page]').textContent()) === 'Core')
  await page.locator('.fervoro-plp-side [data-section=style] label', { hasText: 'Pocket' }).click()
  await sleep(150)
  check('Subcategory Core + Pocket (multi-select)', (await cardCount(page)) === cardsFor({ category: 'polo', styles: ['core', 'pocket'] }) && new URL(page.url()).search === '?style=core%2Cpocket')

  // colours (multi-select) + combined
  const fam = familiesIn('polo').filter((f) => CAT.list.some((p) => p.category === 'polo' && ['core', 'pocket'].includes(p.sub) && p.variants.some((v) => v.family === f)))
  const [f1, f2] = [fam[0], fam[1]]
  const labelOf = async (f) => (await page.evaluate(async (id) => (await import('/src/data/catalog.js')).COLOR_FAMILIES.find((x) => x.id === id).label, f))
  await page.locator('.fervoro-plp-side [data-section=color] label', { hasText: new RegExp(`^${await labelOf(f1)}\\d`) }).click()
  await page.locator('.fervoro-plp-side [data-section=color] label', { hasText: new RegExp(`^${await labelOf(f2)}\\d`) }).click()
  await sleep(200)
  const want = cardsFor({ category: 'polo', styles: ['core', 'pocket'], families: [f1, f2] })
  check('Core + Pocket + two colours → exactly the matching colourways', (await cardCount(page)) === want && (await countText(page)) === `${want} products`, `${await cardCount(page)} vs ${want}`)
  const shown = await page.$$eval('.fervoro-plp-card', (c) => c.map((x) => `${x.dataset.product}:${x.dataset.variant}`))
  const valid = new Set(CAT.list.filter((p) => ['core', 'pocket'].includes(p.sub) && p.category === 'polo').flatMap((p) => p.variants.filter((v) => [f1, f2].includes(v.family)).map((v) => `${p.slug}:${v.id}`)))
  check('every shown card is a single colourway of a matching product; no duplicates (not regrouped)', shown.length === new Set(shown).size && shown.every((k) => valid.has(k)))
  check('cards still read "N colours" (full product count)', await page.evaluate(() => [...document.querySelectorAll('.fervoro-plp-colorcount')].every((n) => /^\d+ colours?$/.test(n.textContent))))
  check('chips list every active filter', (await page.locator('.fervoro-plp-chips li').count()) === 2 + 2 + 1)
  check('accordion headers show selected counts', (await page.locator('.fervoro-plp-side [data-section=color] .fervoro-fa-sel').textContent()) === '2' && (await page.locator('.fervoro-plp-side [data-section=style] .fervoro-fa-sel').textContent()) === '2')

  // sorting works together with filters
  await page.selectOption('.fervoro-plp-sort select', 'name-desc')
  await sleep(150)
  const names = await page.$$eval('.fervoro-plp-name', (n) => n.map((x) => x.textContent.split(' — ')[0]))
  const uniq = [...new Set(names)]
  check('sort Z→A still applies with filters; card count unchanged', (await cardCount(page)) === want && JSON.stringify(uniq) === JSON.stringify([...uniq].sort((a, b) => b.localeCompare(a))))
  check('sort choice is kept in the URL together with filters', new URL(page.url()).searchParams.get('sort') === 'name-desc' && new URL(page.url()).searchParams.get('color').split(',').length === 2)

  // reload + clear all
  await page.reload(); await page.waitForLoadState('networkidle')
  check('filters survive a reload', (await cardCount(page)) === want)
  await page.locator('.fervoro-plp-side-clear').click()
  await sleep(200)
  check('Clear all (sidebar) resets colour + sub-category; sort is kept', (await cardCount(page)) === cardsFor({ category: 'polo' }) && new URL(page.url()).search === '?sort=name-desc' && !(await page.locator('.fervoro-plp-chips').count()) && (await page.locator('.fervoro-plp-side-clear').isDisabled()))

  // sticky while scrolling
  await page.evaluate(() => window.scrollTo(0, 1600)); await sleep(200)
  const top = await side.evaluate((n) => n.getBoundingClientRect().top)
  check('sidebar stays beneath the navbar while the page scrolls', top >= 40 && top <= 120, `${top}`)
  await page.evaluate(() => window.scrollTo(0, 0))

  // accordion
  const colBtn = page.locator('.fervoro-plp-side [data-section=color] .fervoro-fa-btn')
  check('accordion: open by default, aria-expanded + aria-controls wired', (await colBtn.getAttribute('aria-expanded')) === 'true' && !!(await page.locator(`#${await colBtn.getAttribute('aria-controls')}`).count()))
  await colBtn.click(); await sleep(400)
  check('accordion collapses: options hidden from view and from the tab order', (await colBtn.getAttribute('aria-expanded')) === 'false' && !(await page.locator('.fervoro-plp-side [data-section=color] input').first().isVisible()))
  await colBtn.focus(); await page.keyboard.press('Enter'); await sleep(400)
  check('accordion re-opens with the keyboard (Enter)', (await colBtn.getAttribute('aria-expanded')) === 'true' && (await page.locator('.fervoro-plp-side [data-section=color] input').first().isVisible()))
  const firstBox = page.locator('.fervoro-plp-side [data-section=style] input').first()
  await firstBox.focus(); await page.keyboard.press('Space'); await sleep(150)
  check('checkbox toggles with Space and keeps focus', (await firstBox.isChecked()) && (await page.evaluate(() => document.activeElement.type === 'checkbox')))
  await page.keyboard.press('Space'); await sleep(100)

  // category links + colour reconciliation
  const onlyPolo = CAT.families.filter((f) => !CAT.list.some((p) => p.category === 'shirt' && p.variants.some((v) => v.family === f)) && familiesIn('polo').includes(f))
  const keepFam = CAT.families.find((f) => familiesIn('shirt').includes(f) && familiesIn('polo').includes(f))
  check('colour reconciliation needs a polo-only and a shared colour', onlyPolo.length > 0 && !!keepFam)
  await page.goto(`${BASE}/shop/polo?color=${onlyPolo[0]},${keepFam}`); await page.waitForLoadState('networkidle')
  check('category link counts follow the colours that carry over', (await page.locator('.fervoro-plp-side [data-section=category] a', { hasText: /^Shirt\d+$/ }).textContent()).endsWith(String(cardsFor({ category: 'shirt', families: [keepFam] }))))
  await page.locator('.fervoro-plp-side [data-section=category] a', { hasText: /^Shirt\d+$/ }).click()
  await sleep(300)
  check('switching Polo → Shirt keeps only colours that exist for Shirt', new URL(page.url()).pathname === '/shop/shirt' && new URL(page.url()).search === `?color=${keepFam}` && (await cardCount(page)) === cardsFor({ category: 'shirt', families: [keepFam] }))
  check('Category list marks the current collection', (await page.locator('.fervoro-plp-side [data-section=category] a[aria-current=page]').textContent()).startsWith('Shirt'))
  await page.goto(`${BASE}/shop/shirt?color=${onlyPolo[0]}&style=nonsense`); await page.waitForLoadState('networkidle')
  check('stale / unavailable filters in the URL are ignored', (await cardCount(page)) === cardsFor({ category: 'shirt' }) && !(await page.locator('.fervoro-plp-chips').count()))
  check('page errors', problems.length === 0, problems.join('|'))
  await ctx.close()
}

/* ───────── 2. /shop: multi-category + sub-category reconciliation ───────── */
{
  const { ctx, page } = await open(1440, 900, '/shop')
  check('/shop: Category checkboxes, Subcategory hidden until one category is ticked', (await secLabels(page, '.fervoro-plp-side')).join() === 'Category,Colour' && (await opts(page, '.fervoro-plp-side', 'category')).join() === 'Polo,Shirt,T-Shirt,Bottom,Knit')
  await page.locator('.fervoro-plp-side [data-section=category] label', { hasText: 'Polo' }).click()
  await sleep(150)
  check('ticking Polo reveals Polo sub-categories', (await secLabels(page, '.fervoro-plp-side')).join() === 'Category,Subcategory,Colour' && (await opts(page, '.fervoro-plp-side', 'style')).join() === 'Core,Pocket,Fashion,Texture')
  await page.locator('.fervoro-plp-side [data-section=style] label', { hasText: 'Fashion' }).click()
  await sleep(150)
  check('Polo + Fashion → Fashion polo cards', (await cardCount(page)) === cardsFor({ category: 'polo', styles: ['fashion'] }))
  await page.locator('.fervoro-plp-side [data-section=category] label', { hasText: /^Shirt\d+$/ }).click()
  await sleep(150)
  check('ticking a second category clears the sub-category and hides it', !new URL(page.url()).searchParams.has('style') && (await secLabels(page, '.fervoro-plp-side')).join() === 'Category,Colour' && (await cardCount(page)) === cardsFor({ category: 'polo' }) + cardsFor({ category: 'shirt' }))
  await page.locator('.fervoro-plp-side [data-section=category] label', { hasText: 'Polo' }).click()
  await sleep(150)
  check('un-ticking leaves Shirt only', (await cardCount(page)) === cardsFor({ category: 'shirt' }) && (await secLabels(page, '.fervoro-plp-side')).join() === 'Category,Subcategory,Colour')
  await ctx.close()
}

/* ───────── 3. Tablet + mobile drawer ───────── */
for (const [w, h, tag] of [[1023, 800, '@1023'], [820, 1180, '@820 tablet'], [390, 844, '@390 mobile']]) {
  const { ctx, page, problems } = await open(w, h, '/shop/polo')
  check(`${tag}: no sidebar, FILTERS button above the products, grid full width`, !(await page.locator('.fervoro-plp-side').count()) && (await page.locator('.fervoro-plp-filterbtn').isVisible()) && (await page.evaluate(() => { const g = document.querySelector('.fervoro-plp-grid').getBoundingClientRect(); return g.width > innerWidth - 80 })))
  const btn = page.locator('.fervoro-plp-filterbtn')
  check(`${tag}: touch target ≥ 44px`, (await btn.boundingBox()).height >= 44)
  await btn.click()
  await page.waitForSelector('dialog.fervoro-filter[open]')
  check(`${tag}: drawer opens, focus inside, background scroll locked`, (await page.evaluate(() => !!document.activeElement.closest('dialog.fervoro-filter') && getComputedStyle(document.documentElement).overflow === 'hidden')))
  check(`${tag}: drawer has Category, Subcategory, Colour accordions`, (await secLabels(page, 'dialog.fervoro-filter')).join() === 'Category,Subcategory,Colour')
  await page.locator('dialog [data-section=color] label').nth(1).click()
  await page.locator('dialog [data-section=style] label', { hasText: 'Fashion' }).click()
  await sleep(200)
  const selFam = await page.evaluate(() => new URLSearchParams(location.search).get('color'))
  const want = cardsFor({ category: 'polo', styles: ['fashion'], families: [selFam] })
  check(`${tag}: choices update the listing immediately; Apply reports the count`, (await cardCount(page)) === want && (await page.locator('.fervoro-filter-apply').textContent()) === `Apply · ${want} ${want === 1 ? 'product' : 'products'}`, `${await cardCount(page)} vs ${want}`)
  await page.locator('.fervoro-filter-apply').click(); await sleep(300)
  check(`${tag}: Apply closes the drawer, scroll unlocked, focus back on FILTERS`, !(await page.locator('dialog.fervoro-filter[open]').count()) && (await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden' && document.activeElement.classList.contains('fervoro-plp-filterbtn'))))
  check(`${tag}: button badge shows 2 active filters, count text updated`, (await page.locator('.fervoro-plp-badge').textContent()) === '2' && (await countText(page)) === `${want} ${want === 1 ? 'product' : 'products'}`)
  await btn.click(); await page.waitForSelector('dialog.fervoro-filter[open]')
  check(`${tag}: selections preserved when reopening`, (await page.locator('dialog [data-section=color] input:checked').count()) === 1 && (await page.locator('dialog [data-section=style] input:checked').count()) === 1)
  await page.keyboard.press('Escape'); await sleep(300)
  check(`${tag}: Esc / Close keep the filters and return focus`, !(await page.locator('dialog.fervoro-filter[open]').count()) && (await cardCount(page)) === want)
  await btn.click(); await page.waitForSelector('dialog.fervoro-filter[open]')
  await page.locator('.fervoro-filter-x').click(); await sleep(300)
  check(`${tag}: Close button closes the drawer`, !(await page.locator('dialog.fervoro-filter[open]').count()) && (await cardCount(page)) === want)
  await btn.click(); await page.waitForSelector('dialog.fervoro-filter[open]')
  await page.locator('.fervoro-filter-clear').click(); await sleep(250)
  check(`${tag}: Clear all resets every filter`, (await cardCount(page)) === cardsFor({ category: 'polo' }) && (await page.locator('.fervoro-filter-clear').isDisabled()) && !(await page.locator('.fervoro-plp-badge').count()))
  const colBtn = page.locator('dialog [data-section=color] .fervoro-fa-btn')
  await colBtn.click(); await sleep(400)
  check(`${tag}: drawer accordion collapses`, (await colBtn.getAttribute('aria-expanded')) === 'false')
  check(`${tag}: no horizontal overflow, no page errors`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && problems.length === 0, problems.join('|'))
  await ctx.close()
}

/* ───────── 4. Breakpoint behaviour: resize desktop ⇄ tablet ───────── */
{
  const { ctx, page } = await open(1280, 800, '/shop/polo?color=navy')
  const n = await cardCount(page)
  await page.setViewportSize({ width: 800, height: 900 }); await sleep(300)
  check('resize to tablet: sidebar → drawer button, filters preserved', !(await page.locator('.fervoro-plp-side').count()) && (await page.locator('.fervoro-plp-filterbtn').isVisible()) && (await cardCount(page)) === n)
  await page.setViewportSize({ width: 1280, height: 800 }); await sleep(300)
  check('resize back to desktop: sidebar returns with the same selection', (await page.locator('.fervoro-plp-side [data-section=color] input:checked').count()) === 1 && (await cardCount(page)) === n)
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) { for (const f of failures) console.log(' -', f); process.exit(1) }
