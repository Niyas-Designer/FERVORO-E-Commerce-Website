/**
 * End-to-end checks for the collection landing page (/collection) and the flow into it.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/collection-page.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = (process.env.BASE_URL || 'http://localhost:5173/').replace(/\/$/, '')
const VIEWPORTS = [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [640, 900], [430, 932], [390, 844], [320, 568]]
// Landing-page rows preview at most 8 products (Featured order); View All opens the full listing (51 / 4 / 12 / 4 / 2 products).
const SECTIONS = { polo: 8, shirt: 4, 't-shirt': 8, bottom: 4, knit: 2 }
const TOTALS = { polo: 51, shirt: 4, 't-shirt': 12, bottom: 4, knit: 2 }

let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else { failures.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`) }
}
const near = (a, b, t) => Math.abs(a - b) <= t

const browser = await chromium.launch()

// ── Layout at every viewport (direct load) ──
for (const [w, h] of VIEWPORTS) {
  const tag = `@${w}x${h}`
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()} ${r.url()}`))
  await page.goto(`${BASE}/collection`)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) } scrollTo(0, 0) })
  await page.waitForLoadState('networkidle')
  const m = await page.evaluate(() => {
    const main = document.querySelector('#main')
    const kids = [...main.children].map((c) => c.className.split(' ')[0])
    const secs = [...document.querySelectorAll('.fervoro-cat')].map((s) => {
      const cards = [...s.querySelectorAll('.fervoro-pcard')]
      const r = s.getBoundingClientRect()
      return {
        id: s.id, title: s.querySelector('h2')?.textContent, n: cards.length, short: s.classList.contains('is-short'),
        cards: cards.map((c) => { const b = c.getBoundingClientRect(); const i = c.querySelector('img'); const im = i.getBoundingClientRect(); return { w: b.width, left: b.left, right: b.right, top: b.top, name: c.querySelector('.fervoro-pcard-name')?.textContent, price: c.querySelector('.fervoro-pcard-price')?.textContent, loaded: i.complete && i.naturalWidth > 0, ratio: im.width / im.height, alt: i.alt } }),
        all: s.querySelector('.fervoro-cat-all')?.getBoundingClientRect().toJSON(), left: r.left, right: r.right,
      }
    })
    return { kids, secs, h1: document.querySelectorAll('h1').length, h1t: document.querySelector('h1')?.textContent, cta: document.querySelectorAll('.fervoro-hero-cta').length, intro: document.querySelector('.fervoro-intro-text')?.textContent.length, docW: document.documentElement.scrollWidth, vw: innerWidth, title: document.title, heroH: document.querySelector('.fervoro-hero').getBoundingClientRect().height }
  })
  check(`${tag} order: hero, intro, 5 categories`, m.kids.join() === 'fervoro-hero,fervoro-intro,fervoro-cat,fervoro-cat,fervoro-cat,fervoro-cat,fervoro-cat', m.kids.join())
  check(`${tag} hero first, single h1, no CTA`, m.h1 === 1 && m.h1t === 'The FERVORO Collection.' && m.cta === 0)
  check(`${tag} intro is short (<500 chars)`, m.intro > 100 && m.intro < 500, `${m.intro}`)
  check(`${tag} sections in order Polo..Knit`, m.secs.map((s) => s.title).join() === 'Polo,Shirt,T-Shirt,Bottom,Knit', m.secs.map((s) => s.title).join())
  check(`${tag} document title`, m.title === 'The FERVORO Collection — FERVORO', m.title)
  for (const s of m.secs) {
    const exp = SECTIONS[s.id.replace('collection-', '')]
    check(`${tag} ${s.title}: ${exp} preview products (of ${TOTALS[s.id.replace('collection-', '')]})`, s.n === exp, `${s.n}`)
    check(`${tag} ${s.title}: every card has name, ₹ price, loaded image, alt`, s.cards.every((c) => c.name && (/^₹[\d,]+$/.test(c.price) || c.price === 'Price to be confirmed') && c.loaded && c.alt), JSON.stringify(s.cards.map((c) => [c.name, c.price, c.loaded])))
    check(`${tag} ${s.title}: images share one card ratio (cropped to fit)`, s.cards.every((c) => near(c.ratio, s.cards[0].ratio, 0.01)))
    check(`${tag} ${s.title}: cards inside viewport`, s.cards.every((c) => c.left >= -0.5 && c.right <= m.vw + 0.5))
    check(`${tag} ${s.title}: View All visible`, s.all && s.all.width > 40 && s.all.right <= m.vw)
    const cols = w >= 1024 ? 4 : 2
    const ref = s.cards[0].w
    check(`${tag} ${s.title}: equal card widths (${cols}-col grid)`, s.cards.every((c) => near(c.w, ref, 1)) && (w < 1024 || near(ref, (m.vw - 2 * Math.min(Math.max(16, 0.038 * m.vw), 72) - 3 * Math.min(Math.max(8, 0.011 * m.vw), 21)) / 4, 2)), `${ref}`)
    if (w >= 1024 && s.short) check(`${tag} ${s.title}: split layout – cards on right half`, s.cards[0].left > m.vw / 2 - 5)
  }
  check(`${tag} no horizontal overflow`, m.docW <= m.vw)
  check(`${tag} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// ── Flow: hero CTA + every Shop Now → /collection ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(e.message))
  let docLoads = 0
  page.on('request', (r) => r.resourceType() === 'document' && docLoads++)
  await page.goto(`${BASE}/`)
  await page.waitForLoadState('networkidle')
  const cta = page.locator('a.fervoro-hero-cta')
  check('hero CTA is a link to /collection', (await cta.count()) === 1 && (await cta.getAttribute('href')) === '/collection')
  await cta.click()
  await page.waitForURL('**/collection')
  check('hero CTA opens /collection client-side (no reload)', docLoads === 1)
  check('collection page rendered', (await page.locator('.fervoro-cat').count()) === 5 && (await page.title()).startsWith('The FERVORO Collection'))
  check('scrolled to top + focus on main', (await page.evaluate(() => scrollY)) === 0 && (await page.evaluate(() => document.activeElement?.id)) === 'main')
  await page.goBack()
  await page.waitForSelector('.fervoro-collections')
  check('back returns to the homepage', new URL(page.url()).pathname === '/' && (await page.locator('.fervoro-category-showcase, .fervoro-showcase').count()) === 1 && (await page.title()).startsWith('FERVORO — Where'))
  await page.goForward()
  check('forward returns to the collection page', (await page.locator('.fervoro-cat').count()) === 5)
  await page.goBack()

  const links = page.locator('.fervoro-collections-card a.fervoro-collections-cta')
  check('five Shop Now links', (await links.count()) === 5)
  for (let i = 0; i < 5; i++) {
    await page.goto(`${BASE}/`)
    await page.waitForSelector('.fervoro-collections-card')
    const link = page.locator('.fervoro-collections-card a.fervoro-collections-cta').nth(i)
    const label = await link.getAttribute('aria-label')
    check(`Shop Now #${i + 1} (${label}) href /collection`, (await link.getAttribute('href')) === '/collection')
    await link.locator('xpath=ancestor::li').click({ position: { x: 60, y: 80 } }) // whole card is the hit area (scrolls the track if needed)
    await page.waitForURL('**/collection', { timeout: 4000 }).catch(() => {})
    check(`Shop Now #${i + 1} opens the collection page`, new URL(page.url()).pathname === '/collection' && (await page.locator('.fervoro-cat').count()) === 5)
  }
  // modified click keeps native behaviour (new tab)
  await page.goto(`${BASE}/`)
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.locator('a.fervoro-hero-cta').click({ modifiers: ['Control'] })])
  await popup.waitForURL('**/collection', { timeout: 8000 }).catch(() => {}) // the new tab starts at about:blank
  check('ctrl-click opens a new tab on /collection', new URL(popup.url()).pathname === '/collection')
  // wordmark returns home client-side
  await page.goto(`${BASE}/collection`)
  await page.locator('a.fervoro-wordmark').click()
  await page.waitForSelector('.fervoro-collections')
  check('wordmark returns home', new URL(page.url()).pathname === '/')
  // unknown path keeps the homepage
  await page.goto(`${BASE}/men/core-polo`)
  check('unknown path still shows the homepage', (await page.locator('.fervoro-hero-cta').count()) === 1)
  check('no page errors during flow', problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// ── View All → category listing ──
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/collection`)
  await page.waitForLoadState('networkidle')
  const links = page.locator('a.fervoro-cat-all')
  check('five View All links (no buttons)', (await links.count()) === 5 && (await page.locator('button.fervoro-cat-all').count()) === 0)
  const hrefs = []
  for (let i = 0; i < 5; i++) hrefs.push(await links.nth(i).getAttribute('href'))
  check('View All links go to /shop/<category>', hrefs.join() === '/shop/polo,/shop/shirt,/shop/t-shirt,/shop/bottom,/shop/knit', hrefs.join())
  const names = []
  for (let i = 0; i < 5; i++) names.push(await links.nth(i).getAttribute('aria-label'))
  check('View All names include the category', names.join() === 'View All Polo,View All Shirt,View All T-Shirt,View All Bottom,View All Knit', names.join())
  await links.nth(1).click()
  await page.waitForURL('**/shop/shirt')
  check('View All Shirt opens the Shirt listing', (await page.locator('h1').textContent()) === 'Shirt')
  // product card → product page
  await page.goto(`${BASE}/collection`)
  await page.locator('#collection-polo .fervoro-pcard-link').first().click()
  await page.waitForURL('**/product/embossed-crest-polo')
  check('a collection product card opens its product page (first Featured polo = Important 1)', (await page.locator('h1').textContent()) === 'Embossed Crest Polo')
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1) }
