/**
 * End-to-end checks for the responsive navigation (Phase 1).
 *
 * Prerequisites:  npm run dev   (frontend on :5173)   and   Playwright with Chromium:
 *   npm i -D playwright && npx playwright install chromium
 * Run:            npm run test:e2e -w frontend       (BASE_URL=... to override)
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'

const WIDTHS = [320, 375, 390, 430, 768, 1023, 1024, 1280, 1440, 1600, 1920]
const EXPECTED = {
  polo: ['Core Polo', 'Pocket Polo', 'Fashion Polo', 'Texture Polo'],
  shirt: ['Core Shirt', 'Pocket Shirt', 'Fashion Shirt', 'Texture Shirt'],
  't-shirt': ['Core T-Shirt', 'Graphic T-Shirt', 'Fashion T-Shirt', 'Texture T-Shirt'],
  bottom: ['Core Shorts', 'Core Jogger'],
  knit: ['Knit Shorts', 'Knit Pants'],
}
const CAT_LABELS = ['Polo', 'Shirt', 'T-Shirt', 'Bottom', 'Knit']

let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else {
    failures.push(`${name} ${detail}`)
    console.log(`  ✗ ${name} ${detail}`)
  }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

const browser = await chromium.launch()

async function newPage(width, { touch = false, height = 844 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && !/\.mp4$/.test(r.url()) && problems.push(`http ${r.status()}: ${r.url()}`))
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, problems }
}

const rect = (page, sel) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect()
    return r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }, sel)

/* ───────────── 1. Header layout at every width ───────────── */
for (const w of WIDTHS) {
  console.log(`header @ ${w}px`)
  const isDesktop = w >= 1024
  const { page, ctx, problems } = await newPage(w, { touch: !isDesktop })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(`${w}: no horizontal page overflow`, overflow <= 0, `(+${overflow}px)`)

  const mark = await rect(page, '.fervoro-wordmark')
  check(`${w}: wordmark centred in viewport`, near((mark.left + mark.right) / 2, w / 2, 0.75), `(centre ${(mark.left + mark.right) / 2})`)

  const utils = await page.evaluate(() => [...document.querySelectorAll('.fervoro-util-btn')].map((e) => {
    const r = e.getBoundingClientRect()
    return { label: e.getAttribute('aria-label'), left: r.left, right: r.right, width: r.width, height: r.height }
  }))
  const last = utils.at(-1)
  check(`${w}: icons right of wordmark, inside viewport, no overlap`, utils[0].left - mark.right >= 6 && last.right <= w, `(gap ${utils[0].left - mark.right})`)
  if (isDesktop) {
    check(`${w}: desktop header keeps all four icons in order`, utils.map((u) => u.label).join() === 'Search,Account,Wishlist,Shopping bag')
    check(`${w}: icon targets >= 24px`, utils.every((u) => u.width >= 24 && u.height >= 24))
  } else {
    check(`${w}: compact header shows ONLY wishlist + shopping bag on the right`, utils.map((u) => u.label).join() === 'Wishlist,Shopping bag', JSON.stringify(utils.map((u) => u.label)))
    check(`${w}: bag is far-right with a >=44px touch target`, last.width >= 44 && last.height >= 44 && w - last.right <= 8, JSON.stringify(last))
    const els = await page.$$eval('header button, header a, header [role="button"]', (e) => e.map((x) => x.getAttribute('aria-label')))
    check(`${w}: header has exactly four controls (hamburger, wordmark, wishlist, bag)`, els.join() === 'Open menu,FERVORO ITALY — home,Wishlist,Shopping bag', els.join())
    check(`${w}: Search/Account absent from the compact header (they live in the menu)`, (await page.locator('header [aria-label="Search"], header [aria-label="Account"]').count()) === 0)
  }

  if (isDesktop) {
    check(`${w}: desktop shows MEN trigger, no hamburger`, (await page.locator('.fervoro-men-trigger').count()) === 1 && (await page.locator('.fervoro-burger').count()) === 0)
    const men = await rect(page, '.fervoro-men-trigger')
    check(`${w}: MEN left of wordmark`, men.right < mark.left)
  } else {
    check(`${w}: mobile shows hamburger, no MEN trigger`, (await page.locator('.fervoro-burger').count()) === 1 && (await page.locator('.fervoro-men-trigger').count()) === 0)
    const burger = await rect(page, '.fervoro-burger')
    check(`${w}: hamburger left-aligned, target >= 44px`, burger.left < 16 && burger.width >= 44 && burger.right < mark.left - 6)
  }
  check(`${w}: no console/network errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

/* ───────────── 2. Mobile / tablet accordion + carousel ───────────── */
for (const w of [320, 375, 390, 430, 768, 1023]) {
  console.log(`mobile nav @ ${w}px`)
  const { page, ctx, problems } = await newPage(w, { touch: true })
  const burger = page.locator('.fervoro-burger')
  const cdp = await ctx.newCDPSession(page)
  const touchDrag = async (fromX, dx, y, dy = 0) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] })
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fromX + (dx * i) / 8, y: y + (dy * i) / 8 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(650)
  }

  await burger.tap()
  const panel = page.locator('#mobile-menu')
  check(`${w}: panel opens`, await panel.isVisible())
  check(`${w}: burger announces expanded + "Close menu"`, (await burger.getAttribute('aria-expanded')) === 'true' && (await burger.getAttribute('aria-label')) === 'Close menu')
  const hdr = await page.evaluate(() => document.querySelector('header').getBoundingClientRect().bottom)
  const pr = await rect(page, '#mobile-menu')
  check(`${w}: panel fills viewport below header`, near(pr.top, hdr, 1) && near(pr.bottom, await page.evaluate(() => innerHeight), 1) && pr.width === w, JSON.stringify(pr))
  check(`${w}: page scroll locked, #main inert`, (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) === 'hidden' && (await page.evaluate(() => document.getElementById('main').inert)))
  const labels = await page.locator('.fervoro-acc-label').allTextContents()
  check(`${w}: categories`, labels.join() === CAT_LABELS.join(), labels.join())
  check(`${w}: all collapsed initially`, (await page.locator('.fervoro-acc-trigger[aria-expanded="true"]').count()) === 0)

  // Utilities live in the menu, below the categories
  const utilLabels = await page.locator('#mobile-menu .fervoro-mobile-util').allTextContents()
  check(`${w}: menu has Search, Account, Wishlist`, utilLabels.join() === 'Search,Account,Wishlist', utilLabels.join())
  const geo = await page.evaluate(() => {
    const knit = document.querySelector('#acc-btn-knit').closest('li').getBoundingClientRect()
    const u = [...document.querySelectorAll('.fervoro-mobile-util')].map((e) => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height } })
    const p = document.querySelector('#mobile-menu').getBoundingClientRect()
    return { knitBottom: knit.bottom, u, pBottom: p.bottom, pw: p.width }
  })
  check(`${w}: utilities sit below the category list, in one row`, geo.u.every((x) => x.t >= geo.knitBottom - 1 && Math.abs(x.t - geo.u[0].t) < 1) && geo.u[0].l < geo.u[1].l && geo.u[1].l < geo.u[2].l, JSON.stringify(geo))
  check(`${w}: utility targets >= 44px and within viewport`, geo.u.every((x) => x.w >= 44 && x.h >= 44 && x.r <= w + 0.5 && x.b <= geo.pBottom))
  const UTIL_PATHS = { Search: '/search', Account: '/account', Wishlist: '/wishlist' }
  let utilOk = true
  for (const [label, path] of Object.entries(UTIL_PATHS)) {
    await page.locator('#mobile-menu .fervoro-mobile-util', { hasText: label }).tap()
    await page.waitForTimeout(300)
    utilOk = utilOk && new URL(page.url()).pathname === path && !(await page.locator('#mobile-menu').count())
    await page.goBack()
    await page.waitForTimeout(300)
    await burger.tap()
    await page.waitForTimeout(500)
  }
  check(`${w}: each menu utility is a link that opens its page (/search, /account, /wishlist) and closes the menu`, utilOk && (await page.locator('#mobile-menu').isVisible()) && new URL(page.url()).pathname === '/')

  for (const [id, names] of Object.entries(EXPECTED)) {
    const trigger = page.locator(`#acc-btn-${id}`)
    await trigger.tap()
    await page.waitForTimeout(700)

    const expandedIds = await page.$$eval('.fervoro-acc-trigger[aria-expanded="true"]', (els) => els.map((e) => e.id))
    check(`${w}/${id}: only this category expanded`, expandedIds.join() === `acc-btn-${id}`, expandedIds.join())

    const region = page.locator(`#acc-region-${id}`)
    const cards = region.locator('.fervoro-card-title')
    check(`${w}/${id}: card labels`, (await cards.allTextContents()).join() === names.join(), (await cards.allTextContents()).join())

    const tr = await rect(page, `#acc-btn-${id}`)
    const rr = await rect(page, `#acc-region-${id}`)
    check(`${w}/${id}: content directly beneath its row`, near(rr.top, tr.bottom, 2), `(row bottom ${tr.bottom}, content top ${rr.top})`)

    // Next rows remain visible beneath the expanded block
    const order = await page.$$eval('.fervoro-acc-trigger', (els) => els.map((e) => ({ id: e.id, top: e.getBoundingClientRect().top })))
    const idx = order.findIndex((o) => o.id === `acc-btn-${id}`)
    check(`${w}/${id}: other rows keep their order`, order.every((o, i) => i === 0 || o.top > order[i - 1].top))
    if (idx < order.length - 1) check(`${w}/${id}: following row sits below content`, order[idx + 1].top >= rr.bottom - 1)

    // Assets
    await page.waitForFunction((rid) => [...document.querySelectorAll(`#${rid} img`)].every((i) => i.complete && i.naturalWidth > 0), `acc-region-${id}`, { timeout: 5000 }).catch(() => {})
    const loaded = await region.locator('img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0))
    check(`${w}/${id}: images loaded`, loaded)

    // Carousel behaviour
    const car = await page.evaluate((rid) => {
      const el = document.querySelector(`#${rid} .fervoro-carousel`)
      const lis = [...el.children].filter((c) => c.tagName === 'LI')
      const first = lis[0].getBoundingClientRect(); const lastR = lis.at(-1).getBoundingClientRect()
      return { scrollable: el.scrollWidth > el.clientWidth + 1, snap: getComputedStyle(el).scrollSnapType, count: lis.length, cardW: first.width, cardH: first.height, partial: lis.some((l) => { const r = l.getBoundingClientRect(); return r.left < innerWidth - 8 && r.right > innerWidth + 8 }), docOverflow: document.documentElement.scrollWidth - innerWidth, lastRight: lastR.right }
    }, `acc-region-${id}`)
    check(`${w}/${id}: scroll-snap enabled`, car.snap.startsWith('x'))
    check(`${w}/${id}: card proportion ~3:4`, near(car.cardH / car.cardW, 636 / 480, 0.02), `(${(car.cardH / car.cardW).toFixed(3)})`)
    check(`${w}/${id}: no page-level horizontal overflow`, car.docOverflow <= 0)
    if (names.length === 4 && w <= 820) check(`${w}/${id}: next card peeks in`, car.partial)
    if (names.length === 4 && w <= 430) check(`${w}/${id}: carousel scrolls horizontally`, car.scrollable)

    // Reach every card with real touch drags, both directions
    if (car.scrollable) {
      const cbox = await page.locator(`#acc-region-${id} .fervoro-carousel`).boundingBox()
      const y = cbox.y + 120
      let prev = -1
      for (let i = 0; i < 8; i++) {
        await touchDrag(w - 30, -(w - 80), y)
        const cur = await page.$eval(`#acc-region-${id} .fervoro-carousel`, (e) => e.scrollLeft)
        if (cur === prev) break
        prev = cur
      }
      const end = await page.$eval(`#acc-region-${id} .fervoro-carousel`, (e) => { const lis = [...e.children].filter((c) => c.tagName === 'LI'); const r = lis.at(-1).getBoundingClientRect(); return { left: e.scrollLeft, lastRight: r.right, lastLeft: r.left } })
      check(`${w}/${id}: touch-swiping left reaches the LAST card (${names.at(-1)})`, end.left > 0 && end.lastLeft >= 0 && end.lastRight <= w + 0.5, JSON.stringify(end))
      for (let i = 0; i < 8; i++) {
        await touchDrag(30, w - 80, y)
        if ((await page.$eval(`#acc-region-${id} .fervoro-carousel`, (e) => e.scrollLeft)) <= 1) break
      }
      check(`${w}/${id}: touch-swiping right returns to the FIRST card`, (await page.$eval(`#acc-region-${id} .fervoro-carousel`, (e) => e.scrollLeft)) <= 1)
      check(`${w}/${id}: swiping did not move the page or close the menu`, (await page.evaluate(() => scrollX)) === 0 && (await page.locator('#mobile-menu').isVisible()) && (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)
    }
  }

  // Re-open Polo for the swipe / collapse checks
  await page.locator('#acc-btn-polo').tap()
  await page.waitForTimeout(700)

  // Swipe (touch gesture via CDP) on Polo, then verify snap + movement
  if (w <= 430) {
    const box = await page.locator('#acc-region-polo .fervoro-carousel').boundingBox()
    const cdp = await ctx.newCDPSession(page)
    const drag = async (fromX, dx, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] })
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fromX + (dx * i) / 10, y }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(800)
    }
    await drag(box.x + box.width - 40, -110, box.y + 150)
    const sl = await page.$eval('#acc-region-polo .fervoro-carousel', (el) => ({ left: el.scrollLeft, offs: [...el.children].filter((c) => c.tagName === 'LI').map((c) => c.offsetLeft - 20) }))
    check(`${w}: swipe left moves carousel and snaps to a card`, sl.left > 20 && sl.offs.some((o) => near(o, sl.left, 2)), JSON.stringify(sl))
    await drag(box.x + 40, 600, box.y + 150)
    check(`${w}: swipe right returns to start`, (await page.$eval('#acc-region-polo .fervoro-carousel', (el) => el.scrollLeft)) <= 2)
    check(`${w}: swiping did not scroll the page sideways`, (await page.evaluate(() => scrollX)) === 0)
  }

  // With Knit (last category) open, utilities stay below its carousel (never overlapping it)
  await page.locator('#acc-btn-knit').tap(); await page.waitForTimeout(700)
  const ov = await page.evaluate(() => { const r = document.querySelector('#acc-region-knit').getBoundingClientRect(); const u = document.querySelector('.fervoro-mobile-util').getBoundingClientRect(); return { regionBottom: r.bottom, utilTop: u.top } })
  check(`${w}: utilities don't overlap an expanded carousel`, ov.utilTop >= ov.regionBottom - 1, JSON.stringify(ov))
  await page.locator('#acc-btn-polo').tap(); await page.waitForTimeout(700) // back to Polo for the collapse check

  // Collapse by tapping again
  await page.locator('#acc-btn-polo').tap()
  await page.waitForTimeout(600)
  check(`${w}: tapping expanded category collapses it`, (await page.locator('#acc-btn-polo').getAttribute('aria-expanded')) === 'false' && (await page.locator('.fervoro-acc-trigger[aria-expanded="true"]').count()) === 0)
  const hiddenInert = await page.$eval('#acc-region-polo', (el) => el.inert && getComputedStyle(el).visibility === 'hidden')
  check(`${w}: collapsed content inert/hidden from keyboard + AT`, hiddenInert)

  // Switching: Shirt -> T-Shirt (previous collapses, panel stays open)
  await page.locator('#acc-btn-shirt').tap(); await page.waitForTimeout(600)
  await page.locator('#acc-btn-t-shirt').tap(); await page.waitForTimeout(700)
  check(`${w}: switching keeps panel open & swaps expansion`, (await panel.isVisible()) && (await page.locator('#acc-btn-shirt').getAttribute('aria-expanded')) === 'false' && (await page.locator('#acc-btn-t-shirt').getAttribute('aria-expanded')) === 'true')
  const tVis = await page.evaluate(() => { const r = document.querySelector('#acc-btn-t-shirt').getBoundingClientRect(); const p = document.querySelector('#mobile-menu').getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom })
  check(`${w}: selected row stays in view after switch`, tVis)

  // Escape closes, focus returns, scroll unlocked, reopen is clean
  await page.keyboard.press('Escape')
  check(`${w}: Escape closes panel`, !(await panel.isVisible()))
  check(`${w}: focus returns to hamburger`, await page.evaluate(() => document.activeElement?.classList.contains('fervoro-burger')))
  check(`${w}: scroll lock released`, (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== 'hidden' && !(await page.evaluate(() => document.getElementById('main').inert)))
  await burger.tap()
  check(`${w}: reopens cleanly (all collapsed)`, (await panel.isVisible()) && (await page.locator('.fervoro-acc-trigger[aria-expanded="true"]').count()) === 0)
  await burger.tap()
  check(`${w}: close control closes`, !(await panel.isVisible()) && (await burger.getAttribute('aria-label')) === 'Open menu')

  check(`${w}: no console/network errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

/* ───────────── 3. Mobile: short viewport scrolls inside the menu, not the page ───────────── */
{
  console.log('mobile short viewport / scroll containment')
  const { page, ctx } = await newPage(390, { touch: true, height: 520 })
  await page.evaluate(() => { document.getElementById('main').style.minHeight = '3000px' })
  await page.evaluate(() => scrollTo(0, 20))
  await page.locator('.fervoro-burger').tap()
  await page.locator('#acc-btn-polo').tap(); await page.waitForTimeout(700)
  await page.locator('#acc-btn-knit').tap(); await page.waitForTimeout(700)
  const m = await page.$eval('#mobile-menu .fervoro-mobile-scroll', (el) => ({ sh: el.scrollHeight, ch: el.clientHeight }))
  check('short viewport: menu content is vertically scrollable', m.sh > m.ch, JSON.stringify(m))
  const before = await page.evaluate(() => scrollY)
  await page.$eval('#mobile-menu .fervoro-mobile-scroll', (el) => { el.scrollTop = 9999 })
  check('short viewport: menu scrolls', (await page.$eval('#mobile-menu .fervoro-mobile-scroll', (el) => el.scrollTop)) > 0)
  const ur = await page.evaluate(() => { const p = document.querySelector('#mobile-menu').getBoundingClientRect(); return [...document.querySelectorAll('.fervoro-mobile-util')].map((e) => { const r = e.getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1 }) })
  check('short viewport: Search/Account/Wishlist reachable by scrolling the menu', ur.length === 3 && ur.every(Boolean), JSON.stringify(ur))
  check('short viewport: page behind did not scroll', (await page.evaluate(() => scrollY)) === before)
  const hdrBottom = await page.evaluate(() => document.querySelector('header').getBoundingClientRect().bottom)
  check('short viewport: panel still flush under header when page was scrolled', near((await rect(page, '#mobile-menu')).top, hdrBottom, 1))
  await ctx.close()
}

/* ───────────── 3b. Vertical menu scroll and horizontal carousel scroll are independent (touch) ───────────── */
{
  console.log('independent vertical / horizontal scrolling')
  const { page, ctx } = await newPage(390, { touch: true, height: 520 })
  const cdp = await ctx.newCDPSession(page)
  const drag = async (x, y, dx, dy) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(700)
  }
  await page.locator('.fervoro-burger').tap()
  await page.locator('#acc-btn-polo').tap(); await page.waitForTimeout(800)
  const car = '#acc-region-polo .fervoro-carousel'
  let box = await page.locator(car).boundingBox()
  const y0 = Math.min(box.y + 100, 400)
  // vertical swipe that STARTS on the carousel scrolls the menu, not the carousel
  await drag(200, y0, 0, -160)
  const v = await page.evaluate((c) => ({ top: document.querySelector('#mobile-menu .fervoro-mobile-scroll').scrollTop, left: document.querySelector(c).scrollLeft, page: scrollY }), car)
  check('vertical swipe on the carousel scrolls the menu only', v.top > 20 && v.left === 0 && v.page === 0, JSON.stringify(v))
  // horizontal swipe scrolls the carousel, not the menu
  box = await page.locator(car).boundingBox()
  const topBefore = await page.$eval('#mobile-menu .fervoro-mobile-scroll', (e) => e.scrollTop)
  const vis = await page.evaluate((c) => { const r = document.querySelector(c).getBoundingClientRect(); const p = document.querySelector('#mobile-menu').getBoundingClientRect(); return (Math.max(r.top, p.top) + Math.min(r.bottom, innerHeight)) / 2 }, car)
  await drag(340, vis, -240, 0)
  const h = await page.evaluate((c) => ({ top: document.querySelector('#mobile-menu .fervoro-mobile-scroll').scrollTop, left: document.querySelector(c).scrollLeft }), car)
  check('horizontal swipe scrolls the carousel only', h.left > 20 && Math.abs(h.top - topBefore) <= 2, JSON.stringify({ ...h, topBefore }))
  await ctx.close()
}

/* ───────────── 3c. Mouse users (desktop browser resized to phone width) ───────────── */
for (const w of [353, 390]) {
  console.log(`mouse drag @ ${w}px`)
  const { page, ctx } = await newPage(w, { touch: false, height: 700 })
  await page.setViewportSize({ width: w, height: 700 })
  await page.locator('.fervoro-burger').click()
  await page.locator('#acc-btn-polo').click(); await page.waitForTimeout(800)
  const car = '#acc-region-polo .fervoro-carousel'
  const box = await page.locator(car).boundingBox()
  const read = () => page.$eval(car, (e) => ({ left: e.scrollLeft, max: e.scrollWidth - e.clientWidth, offs: [...e.children].filter((c) => c.tagName === 'LI').map((c) => c.offsetLeft - 20), bar: e.offsetHeight - e.clientHeight }))
  const before = await read()
  // Headless Chromium uses overlay scrollbars (zero layout height), so assert the CSS that requests a visible thin bar.
  const sbw = await page.$eval(car, (e) => getComputedStyle(e).scrollbarWidth + '|' + getComputedStyle(e).cursor)
  check(`mouse ${w}: fine pointers get a thin scrollbar + grab cursor`, sbw === 'thin|grab', sbw)
  const mdrag = async (x1, x2) => { await page.mouse.move(x1, box.y + 150); await page.mouse.down(); await page.mouse.move(x2, box.y + 150, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(700) }
  await mdrag(w - 40, 40)
  let r = await read()
  check(`mouse ${w}: dragging left scrolls the carousel and snaps to a card`, r.left > 20 && r.offs.some((o) => near(o, r.left, 2)), JSON.stringify(r))
  check(`mouse ${w}: drag does not click a card / close the menu`, await page.locator('#mobile-menu').isVisible())
  for (let i = 0; i < 6 && (await read()).left < (await read()).max - 2; i++) await mdrag(w - 40, 40)
  const endR = await page.$eval(car, (e) => { const r = [...e.children].filter((c) => c.tagName === 'LI').at(-1).getBoundingClientRect(); return r.right })
  check(`mouse ${w}: can drag all the way to the last card (Texture Polo)`, endR <= w + 0.5, `(last right ${endR})`)
  for (let i = 0; i < 6 && (await read()).left > 2; i++) await mdrag(40, w - 40)
  check(`mouse ${w}: dragging right returns to the first card`, (await read()).left <= 2)
  await page.mouse.move(w / 2, box.y + 150); await page.mouse.wheel(150, 0); await page.waitForTimeout(400)
  check(`mouse ${w}: horizontal wheel / trackpad swipe also scrolls`, (await read()).left > 0)
  check(`mouse ${w}: no page-level horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)
  // a plain click (no drag) still activates the card
  await page.locator('#acc-region-polo .fervoro-card').first().click()
  check(`mouse ${w}: plain click still activates a card (menu closes)`, !(await page.locator('#mobile-menu').isVisible()))
  await ctx.close()
}

/* ───────────── 3d. Utility bar is anchored to the bottom of the panel ───────────── */
{
  console.log('bottom-anchored utility bar')
  const geom = (page) => page.evaluate(() => {
    const panel = document.querySelector('#mobile-menu').getBoundingClientRect()
    const scroller = document.querySelector('#mobile-menu .fervoro-mobile-scroll')
    const sc = scroller.getBoundingClientRect()
    const bar = document.querySelector('.fervoro-mobile-utils').getBoundingClientRect()
    const items = [...document.querySelectorAll('.fervoro-mobile-util')].map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, c: (r.left + r.right) / 2 } })
    const labels = [...document.querySelectorAll('.fervoro-mobile-util span')].map((e) => e.getBoundingClientRect().top)
    const icons = [...document.querySelectorAll('.fervoro-mobile-util-icon')].map((e) => e.getBoundingClientRect().bottom)
    const cs = getComputedStyle(document.querySelector('.fervoro-mobile-utils'))
    return {
      panelTop: panel.top, panelBottom: panel.bottom, panelScrolls: document.querySelector('#mobile-menu').scrollHeight - document.querySelector('#mobile-menu').clientHeight,
      scTop: sc.top, scBottom: sc.bottom, scMax: scroller.scrollHeight - scroller.clientHeight, scTopPos: scroller.scrollTop,
      barTop: bar.top, barBottom: bar.bottom, items, labels, icons, borderTop: cs.borderTopWidth, padBottom: parseFloat(cs.paddingBottom), vh: innerHeight,
      pageOverflowX: document.documentElement.scrollWidth - innerWidth,
    }
  })
  const lastVisibleCardBottom = (page, id) => page.evaluate((i) => { const li = [...document.querySelectorAll(`#acc-region-${i} .fervoro-card, #acc-region-${i} a, #acc-region-${i} button`)]; return Math.max(...li.map((e) => e.getBoundingClientRect().bottom)) }, id)

  for (const [w, h] of [[320, 568], [390, 844], [430, 932], [768, 1024], [1023, 768], [390, 520]]) {
    const { page, ctx } = await newPage(w, { touch: true, height: h })
    await page.locator('.fervoro-burger').tap(); await page.waitForTimeout(300)
    const tag = `${w}x${h}`
    const g0 = await geom(page)
    check(`${tag}: utility bar sits flush at the bottom of the panel`, Math.abs(g0.barBottom - g0.panelBottom) <= 1 && Math.abs(g0.panelBottom - g0.vh) <= 1, JSON.stringify([g0.barBottom, g0.panelBottom, g0.vh]))
    check(`${tag}: three items on one row, evenly distributed`, g0.items.length === 3 && g0.items.every((x) => Math.abs(x.t - g0.items[0].t) < 1) && Math.abs((g0.items[1].c - g0.items[0].c) - (g0.items[2].c - g0.items[1].c)) < 1.5, JSON.stringify(g0.items))
    check(`${tag}: labels below icons`, g0.labels.every((t, i) => t >= g0.icons[i] - 0.5))
    check(`${tag}: divider above the bar + safe-area padding present`, g0.borderTop === '1px' && g0.padBottom >= 8, `${g0.borderTop} ${g0.padBottom}`)
    check(`${tag}: panel itself does not scroll; only the category region does`, g0.panelScrolls <= 0 && g0.scBottom <= g0.barTop + 1, JSON.stringify([g0.panelScrolls, g0.scBottom, g0.barTop]))

    for (const id of ['polo', 'knit']) {
      await page.locator(`#acc-btn-${id}`).tap(); await page.waitForTimeout(750)
      const g = await geom(page)
      check(`${tag}/${id}: bar did not move when expanded`, Math.abs(g.barTop - g0.barTop) <= 1 && Math.abs(g.barBottom - g0.barBottom) <= 1, `${g.barTop} vs ${g0.barTop}`)
      await page.$eval('#mobile-menu .fervoro-mobile-scroll', (el) => { el.scrollTop = el.scrollHeight })
      await page.waitForTimeout(150)
      const g2 = await geom(page)
      check(`${tag}/${id}: bar still anchored after scrolling the list to the end`, Math.abs(g2.barTop - g0.barTop) <= 1 && Math.abs(g2.barBottom - g2.panelBottom) <= 1)
      const cardBottom = await lastVisibleCardBottom(page, id)
      check(`${tag}/${id}: end of expanded images clears the utility bar`, cardBottom <= g2.barTop + 0.5, `${cardBottom} vs ${g2.barTop}`)
      const hit = await page.evaluate(() => { const r = document.querySelector('.fervoro-mobile-util').getBoundingClientRect(); const e = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!e?.closest('.fervoro-mobile-util') })
      check(`${tag}/${id}: utility buttons receive taps (nothing overlaps them)`, hit)
      check(`${tag}/${id}: no horizontal page overflow`, g2.pageOverflowX <= 0)
    }
    await ctx.close()
  }

  // expanding a tall category on a short screen: the list scrolls, the bar never moves
  const { page, ctx } = await newPage(390, { touch: true, height: 520 })
  await page.locator('.fervoro-burger').tap()
  const a = await geom(page)
  await page.locator('#acc-btn-shirt').tap(); await page.waitForTimeout(750)
  const b = await geom(page)
  check('short screen: list becomes scrollable, bar stays put', b.scMax > 0 && Math.abs(b.barTop - a.barTop) <= 1 && b.panelScrolls <= 0, JSON.stringify([b.scMax, a.barTop, b.barTop]))
  // keyboard focus moving through the list never lands behind the bar
  await page.locator('#acc-btn-knit').focus(); await page.waitForTimeout(150)
  const f = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); const bar = document.querySelector('.fervoro-mobile-utils').getBoundingClientRect(); return r.bottom <= bar.top + 1 })
  check('short screen: focused last category is not hidden behind the bar', f)
  await ctx.close()

  // desktop untouched: no mobile panel/bar at 1024
  const d = await newPage(1024, { height: 768 })
  check('1024: desktop shows no mobile utility bar', (await d.page.locator('.fervoro-mobile-utils').count()) === 0)
  await d.ctx.close()
}

/* ───────────── 4. Keyboard accessibility (mobile) ───────────── */
{
  console.log('mobile keyboard')
  const { page, ctx } = await newPage(390, { touch: false })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.focus('.fervoro-burger')
  await page.keyboard.press('Enter')
  check('keyboard: Enter on hamburger opens', await page.locator('#mobile-menu').isVisible())
  await page.keyboard.press('Escape')
  check('keyboard: Escape closes', !(await page.locator('#mobile-menu').isVisible()))
  await page.keyboard.press('Space')
  check('keyboard: Space on hamburger reopens', await page.locator('#mobile-menu').isVisible())
  // Tab order: hamburger → (its menu) first category trigger
  await page.keyboard.press('Tab')
  check('keyboard: Tab reaches first category', await page.evaluate(() => document.activeElement?.id === 'acc-btn-polo'), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)))
  await page.keyboard.press('Enter'); await page.waitForTimeout(600)
  check('keyboard: Enter expands category', (await page.locator('#acc-btn-polo').getAttribute('aria-expanded')) === 'true')
  await page.keyboard.press('Tab')
  check('keyboard: Tab then enters expanded carousel cards', await page.evaluate(() => !!document.activeElement?.closest('#acc-region-polo')))
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  check('keyboard: collapsed regions skipped (next stop is Shirt trigger)', await page.evaluate(() => document.activeElement?.id === 'acc-btn-shirt'), await page.evaluate(() => document.activeElement?.id))
  await page.keyboard.press('Space'); await page.waitForTimeout(600)
  check('keyboard: Space switches category', (await page.locator('#acc-btn-shirt').getAttribute('aria-expanded')) === 'true' && (await page.locator('#acc-btn-polo').getAttribute('aria-expanded')) === 'false')
  // Utilities are reachable by keyboard after the last category
  await page.focus('#acc-btn-knit')
  await page.keyboard.press('Tab')
  check('keyboard: Tab from Knit reaches Search', await page.evaluate(() => document.activeElement?.textContent === 'Search'), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 70)))
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab')
  check('keyboard: Account then Wishlist follow', await page.evaluate(() => document.activeElement?.textContent === 'Wishlist'))
  await ctx.close()
}

/* ───────────── 5. Desktop mega menu ───────────── */
for (const w of [1024, 1280, 1440, 1600, 1920]) {
  console.log(`desktop nav @ ${w}px`)
  const { page, ctx, problems } = await newPage(w, { height: w >= 1600 ? 1080 : 900 })
  let poloCardW = 0
  const trigger = page.locator('.fervoro-men-trigger')
  check(`${w}: mega menu closed initially`, (await page.locator('#mega-menu').count()) === 0 && (await trigger.getAttribute('aria-expanded')) === 'false')
  const docHBefore = await page.evaluate(() => document.documentElement.scrollHeight)
  await trigger.click()
  await page.waitForTimeout(350)
  check(`${w}: click MEN opens mega menu`, await page.locator('#mega-menu').isVisible() && (await trigger.getAttribute('aria-expanded')) === 'true')
  const hdrBottom = await page.evaluate(() => document.querySelector('header').getBoundingClientRect().bottom)
  const mr = await rect(page, '#mega-menu')
  check(`${w}: mega menu spans full width directly under header`, near(mr.top, hdrBottom, 1) && mr.width === w)
  check(`${w}: open menu adds no extra page height`, (await page.evaluate(() => document.documentElement.scrollHeight)) - docHBefore <= 0)
  check(`${w}: announcement bar + header not dimmed (scrim only below header)`, await page.evaluate(() => { const h = document.querySelector('.fervoro-header-grid'); const r = h.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 200, r.top + 30); return !!el && !el.classList.contains('fervoro-scrim') }))
  check(`${w}: page scroll NOT locked on desktop`, (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== 'hidden')
  const cats = await page.locator('.fervoro-mega-cat').allTextContents()
  check(`${w}: category list`, cats.join() === CAT_LABELS.join())

  // Full-bleed surfaces (no grey gutters, no max-width cap)
  const fb = await page.evaluate(() => {
    const h = document.querySelector('header').getBoundingClientRect()
    const mid = h.top + h.height / 2
    const pt = (x) => document.elementFromPoint(x, mid)?.className?.toString() ?? ''
    const g = document.querySelector('.fervoro-mega-grid').getBoundingClientRect()
    const list = document.querySelector('.fervoro-mega-list').getBoundingClientRect()
    const men = document.querySelector('.fervoro-men-trigger').getBoundingClientRect()
    const cat = document.querySelector('.fervoro-mega-cat').getBoundingClientRect()
    return { hw: h.width, before: getComputedStyle(document.querySelector('header'), '::before').backgroundColor, left: pt(2), right: pt(innerWidth - 3), gl: g.left, gr: g.right, listW: list.width, menL: men.left, catL: cat.left }
  })
  check(`${w}: header spans full viewport, white, not covered by scrim`, fb.hw === w && fb.before === 'rgb(255, 255, 255)' && !fb.left.includes('scrim') && !fb.right.includes('scrim'), JSON.stringify(fb))
  check(`${w}: mega menu grid is full-bleed (0 → ${w})`, near(fb.gl, 0, 0.5) && near(fb.gr, w, 0.5), `(${fb.gl}→${fb.gr})`)
  check(`${w}: sidebar ≈ 22.9% of viewport`, near(fb.listW / w, 0.229, 0.012) || fb.listW === 200, `(${(fb.listW / w).toFixed(3)})`)
  check(`${w}: MEN aligns with sidebar list`, near(fb.menL, fb.catL, 1), `(${fb.menL} vs ${fb.catL})`)

  for (const [id, names] of Object.entries(EXPECTED)) {
    const label = CAT_LABELS[Object.keys(EXPECTED).indexOf(id)]
    await page.locator('.fervoro-mega-cat', { hasText: new RegExp(`^${label}$`) }).hover()
    await page.waitForTimeout(150)
    const titles = await page.locator('.fervoro-mega-panel .fervoro-card-title').allTextContents()
    check(`${w}/${id}: hover shows its cards`, titles.join() === names.join(), titles.join())
    check(`${w}/${id}: heading`, (await page.locator('#mega-heading').textContent()).toLowerCase() === `men's ${label}`.toLowerCase())
    await page.waitForFunction(() => [...document.querySelectorAll('.fervoro-mega-panel img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 }).catch(() => {})
    check(`${w}/${id}: images loaded`, await page.locator('.fervoro-mega-panel img').evaluateAll((a) => a.every((i) => i.complete && i.naturalWidth > 0)))
    const cr = await page.$$eval('.fervoro-mega-panel .fervoro-card', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width, h: r.height } }))
    check(`${w}/${id}: card proportion ~3:4 and inside viewport`, cr.every((c) => near(c.h / c.w, 636 / 480, 0.02) && c.r <= w))
    const hl = await rect(page, '.fervoro-hairline')
    const gaps = cr.slice(1).map((c, i) => c.l - cr[i].r)
    check(`${w}/${id}: equal card widths and equal gaps`, cr.every((c) => near(c.w, cr[0].w, 0.5)) && gaps.every((g) => near(g, gaps[0], 0.5)), JSON.stringify({ w: cr.map((c) => c.w), gaps }))
    if (names.length === 4) {
      poloCardW = poloCardW || cr[0].w
      check(`${w}/${id}: four cards fill the divider width exactly`, near(cr[0].l, hl.left, 1) && near(cr.at(-1).r, hl.right, 1), `(cards ${cr[0].l}→${cr.at(-1).r}, divider ${hl.left}→${hl.right})`)
    } else {
      check(`${w}/${id}: pair keeps the same card size as 4-up categories`, near(cr[0].w, poloCardW, 1), `(${cr[0].w} vs ${poloCardW})`)
      check(`${w}/${id}: pair starts at the left edge of the content area (aligned with 4-up rows)`, near(cr[0].l, hl.left, 1), `(card ${cr[0].l}, divider ${hl.left})`)
    }
    const dist = await page.$$eval('.fervoro-mega-panel img', (imgs) => imgs.map((i) => { const b = i.getBoundingClientRect(); return Math.abs(b.width / b.height - i.naturalWidth / i.naturalHeight) }))
    check(`${w}/${id}: no image distortion/cropping (box ratio = natural ratio)`, dist.every((d) => d < 0.01), JSON.stringify(dist))
    if (id === 'polo') check(`${w}: 4 cards one row`, cr.length === 4 && cr.every((c) => c.l >= 0) && new Set(await page.$$eval('.fervoro-mega-panel .fervoro-card', (e) => e.map((x) => Math.round(x.getBoundingClientRect().top)))).size === 1)
  }
  check(`${w}: no horizontal overflow with menu open`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)

  await page.keyboard.press('Escape')
  check(`${w}: Escape closes + returns focus to MEN`, (await page.locator('#mega-menu').count()) === 0 && (await page.evaluate(() => document.activeElement?.classList.contains('fervoro-men-trigger'))))

  // Keyboard open
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250)
  check(`${w}: ArrowDown opens and focuses first category`, await page.evaluate(() => document.activeElement?.textContent === 'Polo'))
  await page.keyboard.press('ArrowDown')
  check(`${w}: ArrowDown moves between categories & swaps panel`, (await page.locator('.fervoro-mega-panel .fervoro-card-title').first().textContent()) === 'Core Shirt')
  await page.keyboard.press('Escape')

  // Scrim click closes
  await trigger.click(); await page.waitForTimeout(250)
  await page.mouse.click(w / 2, 880)
  check(`${w}: clicking outside (scrim) closes`, (await page.locator('#mega-menu').count()) === 0)

  // Hover-intent open / leave close
  await page.mouse.move(5, 400); await trigger.hover(); await page.waitForTimeout(350)
  check(`${w}: hover opens`, await page.locator('#mega-menu').isVisible())
  await page.mouse.move(w / 2, 800); await page.waitForTimeout(500)
  check(`${w}: leaving closes hover-opened menu`, (await page.locator('#mega-menu').count()) === 0)

  // Card activation opens the category listing (client-side) filtered to that sub-category and closes the menu
  await trigger.click(); await page.waitForTimeout(250)
  await page.locator('.fervoro-mega-panel .fervoro-card').first().click()
  await page.waitForURL(/\/shop\/[a-z-]+\?style=core$/) // whichever category panel was active
  check(`${w}: card click opens the filtered listing and closes the menu`, /^\/shop\/[a-z-]+$/.test(new URL(page.url()).pathname) && (await page.locator('#mega-menu').count()) === 0)
  check(`${w}: no console/network errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

/* ───────────── 5b. Desktop category selection: large active label, 50% inactive, smooth 300–400ms transition ───────────── */
{
  console.log('desktop category selection animation')
  for (const w of [1024, 1280, 1440, 1920]) {
    const { page, ctx } = await newPage(w, { height: w >= 1440 ? 1000 : 768 })
    await page.locator('.fervoro-men-trigger').click(); await page.waitForTimeout(450)
    const snap = () => page.evaluate(() => {
      const rows = [...document.querySelectorAll('.fervoro-mega-cat')].map((c) => {
        const cs = getComputedStyle(c); const r = c.getBoundingClientRect()
        return { t: c.textContent, fs: parseFloat(cs.fontSize), op: parseFloat(cs.opacity), top: r.top, bottom: r.bottom, left: r.left, right: r.right, bar: new DOMMatrixReadOnly(getComputedStyle(c, '::after').transform).a, dur: parseFloat(cs.transitionDuration.split(',')[0]) }
      })
      const list = document.querySelector('.fervoro-mega-list').getBoundingClientRect(), panel = document.querySelector('.fervoro-mega-panel').getBoundingClientRect(), g = document.querySelector('.fervoro-mega-grid').getBoundingClientRect()
      return { rows, listH: list.height, listR: list.right, panelH: panel.height, gridH: g.height, ow: document.documentElement.scrollWidth - innerWidth, doc: document.documentElement.scrollHeight }
    })
    const order = ['Polo', 'Shirt', 'T-Shirt', 'Bottom', 'Knit', 'Polo']
    for (let i = 1; i < order.length; i++) {
      const from = order[i - 1], to = order[i]
      // record every animation frame for 600ms after the click
      const trace = await page.evaluate(async (label) => {
        const btn = [...document.querySelectorAll('.fervoro-mega-cat')].find((b) => b.textContent.toLowerCase() === label.toLowerCase())
        const frames = []
        const read = () => {
          const rows = [...document.querySelectorAll('.fervoro-mega-cat')].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent, fs: parseFloat(getComputedStyle(c).fontSize), top: r.top, bottom: r.bottom, right: r.right } })
          frames.push({ ms: performance.now(), rows, listH: document.querySelector('.fervoro-mega-list').getBoundingClientRect().height, panelH: document.querySelector('.fervoro-mega-panel').getBoundingClientRect().height })
        }
        read(); const t0 = frames[0].ms
        btn.click()
        await new Promise((res) => { const step = () => { read(); frames[frames.length - 1].ms - t0 < 650 ? requestAnimationFrame(step) : res() }; requestAnimationFrame(step) })
        return frames.map((f) => ({ ...f, ms: f.ms - t0 }))
      }, to)
      const fin = await snap()
      const act = fin.rows.find((r) => r.t === to), others = fin.rows.filter((r) => r.t !== to)
      const tag = `${w}: ${from} → ${to}`
      // Subtle by design: clearly larger than inactive (>= 1.5x) yet understated (<= 3.2x), and never the old oversized look.
      check(`${tag}: active label is slightly larger, not oversized (1.5x–3.2x)`, others.every((o) => act.fs / o.fs >= 1.5 && act.fs / o.fs <= 3.2) && act.fs <= 52.5, `${act.fs} vs ${others[0].fs}`)
      check(`${tag}: inactive size unchanged (clamp 15–18px)`, others.every((o) => o.fs >= 14.9 && o.fs <= 18.1), String(others[0].fs))
      check(`${tag}: active opacity 1, inactive ~50%`, act.op === 1 && others.every((o) => Math.abs(o.op - 0.5) < 0.01), JSON.stringify(fin.rows.map((r) => r.op)))
      check(`${tag}: only the active label has the underline bar`, near(act.bar, 1, 0.01) && others.every((o) => o.bar < 0.01))
      check(`${tag}: transition duration is 300–400ms`, act.dur >= 0.3 && act.dur <= 0.4, String(act.dur))
      const mid = trace.filter((f) => f.ms > 40 && f.ms < 300)
      const from0 = trace[0].rows.find((r) => r.t === from).fs
      check(`${tag}: animates smoothly (intermediate sizes, no jump)`, mid.some((f) => { const x = f.rows.find((r) => r.t === to).fs; return x > fin.rows.find((r) => r.t === to).fs * 0.15 && x < act.fs * 0.95 }) && trace.length > 12, `${trace.length} frames`)
      check(`${tag}: outgoing label shrinks back (${from0.toFixed(0)}px → ${others.find((o) => o.t === from).fs.toFixed(0)}px)`, Math.abs(others.find((o) => o.t === from).fs - others[0].fs) < 0.5 && from0 > others.find((o) => o.t === from).fs * 1.5)
      const overlap = trace.some((f) => f.rows.some((r, k) => k > 0 && r.top < f.rows[k - 1].bottom - 0.5))
      check(`${tag}: labels never overlap during the transition`, !overlap)
      const lh = trace.map((f) => f.listH), ph = trace.map((f) => f.panelH)
      check(`${tag}: no layout jump (list/panel height steady)`, Math.max(...lh) - Math.min(...lh) <= 2 && Math.max(...ph) - Math.min(...ph) <= 2, `${Math.min(...lh)}–${Math.max(...lh)} / ${Math.min(...ph)}–${Math.max(...ph)}`)
      check(`${tag}: labels stay inside the sidebar, no page overflow`, fin.rows.every((r) => r.right <= fin.listR - 8) && fin.ow <= 0, `${Math.max(...fin.rows.map((r) => r.right))} vs ${fin.listR}`)
      const heading = await page.locator('#mega-heading').textContent()
      check(`${tag}: right panel switched`, heading.toLowerCase().includes(to.toLowerCase().replace('-', '')) || heading.toLowerCase().includes(to.toLowerCase()), heading)
    }
    // right-hand grid untouched: 4 equal 3:4 cards, same size for every category
    const dims = []
    for (const id of ['Polo', 'Knit']) {
      await page.locator('.fervoro-mega-cat', { hasText: new RegExp(`^${id}$`) }).click(); await page.waitForTimeout(600)
      dims.push(await page.evaluate(() => { const r = document.querySelector('.fervoro-mega-cards .fervoro-card').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }))
    }
    check(`${w}: card size identical across categories (image grid preserved)`, dims[0].join() === dims[1].join(), JSON.stringify(dims))
    await ctx.close()
  }
  // keyboard: arrow keys move + activate with the same animation, Escape closes
  const { page, ctx } = await newPage(1280, { height: 800 })
  await page.locator('.fervoro-men-trigger').focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(600)
  check('desktop keyboard: ArrowDown activates the next category (enlarged label)', await page.evaluate(() => { const a = document.querySelector('.fervoro-mega-cat[aria-current="true"]'); return a?.textContent === 'Shirt' && parseFloat(getComputedStyle(a).fontSize) > 30 }))
  await ctx.close()
  // reduced motion: instant swap
  const rm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const rp = await rm.newPage(); await rp.goto(BASE); await rp.waitForLoadState('networkidle')
  await rp.locator('.fervoro-men-trigger').click(); await rp.waitForTimeout(300)
  check('reduced motion: category transition disabled', await rp.evaluate(() => getComputedStyle(document.querySelector('.fervoro-mega-cat')).transitionDuration.split(',').every((d) => parseFloat(d) <= 0.0001)))
  await rm.close()
}

/* ───────────── 6. Crossing the breakpoint with the mobile menu open ───────────── */
{
  console.log('breakpoint crossing')
  const { page, ctx } = await newPage(768, { touch: false, height: 900 })
  await page.locator('.fervoro-burger').click()
  await page.locator('#acc-btn-knit').click()
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(300)
  check('resize to desktop: mobile panel gone, page unlocked, desktop nav shown', (await page.locator('#mobile-menu').count()) === 0 && (await page.locator('.fervoro-men-trigger').count()) === 1 && (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== 'hidden' && !(await page.evaluate(() => document.getElementById('main').inert)))
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300)
  await page.locator('.fervoro-burger').click()
  check('resize back to mobile: menu opens cleanly', await page.locator('#mobile-menu').isVisible())
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'))
  process.exit(1)
}
