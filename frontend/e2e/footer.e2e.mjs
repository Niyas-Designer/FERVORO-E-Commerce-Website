/**
 * End-to-end checks for the Phase 3 site footer.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/footer.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]

const COLUMNS = {
  'About FERVORO': ['About Us', 'Our Story', 'Our Collections', 'Contact Us', 'Privacy Policy', 'Terms & Conditions'],
  'My Account': ['My Account', 'My Orders', 'Track Order', 'Wishlist', 'Shopping Bag'],
  'Customer Service': ['Help & Support', 'Shipping Information', 'Returns & Exchanges', 'FAQs', 'Size Guide', 'Contact Support'],
}
const DESCRIPTION = 'Discover the latest collections, refined essentials, and exclusive updates from FERVORO.'
const PRIVACY = 'By subscribing, you agree to receive updates from FERVORO. You can unsubscribe at any time.'
const COPYRIGHT = '© 2026 FERVORO. All rights reserved.'

let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else {
    failures.push(`${name} ${detail}`)
    console.log(`  ✗ ${name} ${detail}`)
  }
}
const near = (a, b, t) => Math.abs(a - b) <= t

const browser = await chromium.launch()

async function open(w, { touch = w < 1024, height = w < 1024 ? 844 : 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const problems = []
  const requests = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && !/\.mp4$/.test(r.url()) && problems.push(`http ${r.status()}: ${r.url()}`))
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }))
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, problems, requests }
}

const geo = (page) =>
  page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top + scrollY, b: b.bottom + scrollY, w: b.width, h: b.height } }
    const footer = document.querySelector('footer')
    const cols = [...document.querySelectorAll('.fervoro-footer-col')].map((c) => ({ ...r(c), bl: getComputedStyle(c).borderLeftWidth, bt: getComputedStyle(c).borderTopWidth }))
    const band = r(document.querySelector('.fervoro-footer-band'))
    const bandCs = getComputedStyle(document.querySelector('.fervoro-footer-band'))
    const social = [...document.querySelectorAll('.fervoro-footer-social-item')].map((c) => r(c))
    const copy = document.querySelector('.fervoro-footer-copy')
    const range = document.createRange(); range.selectNodeContents(copy)
    const tb = range.getBoundingClientRect()
    return {
      footer: r(footer), cols, band, bandBorders: [bandCs.borderTopWidth, bandCs.borderBottomWidth], social, copyCenter: (tb.left + tb.right) / 2, copyFont: parseFloat(getComputedStyle(copy).fontSize),
      mainBottom: r(document.getElementById('main')).b, docH: document.documentElement.scrollHeight, ow: document.documentElement.scrollWidth - innerWidth, vw: innerWidth,
      lastIsFooter: document.body.querySelector('#root').lastElementChild === footer || [...document.querySelector('#root').children].at(-1) === footer,
    }
  })

for (const w of WIDTHS) {
  console.log(`footer @ ${w}px`)
  const { page, ctx, problems, requests } = await open(w)
  await page.locator('footer').scrollIntoViewIfNeeded()
  const g = await geo(page)
  const phone = w < 640, tablet = w >= 640 && w < 1024

  check(`${w}: footer follows main, is the last element, spans the full viewport`, g.lastIsFooter && g.footer.t >= g.mainBottom - 1 && near(g.footer.l, 0, 0.5) && near(g.footer.w, w, 0.5))
  check(`${w}: page ends exactly at the footer (no gap below)`, near(g.footer.b, g.docH, 1), `${g.footer.b} vs ${g.docH}`)
  check(`${w}: no horizontal overflow`, g.ow <= 0, String(g.ow))
  check(`${w}: footer background is warm ivory`, (await page.$eval('footer', (e) => getComputedStyle(e).backgroundColor)) === 'rgb(248, 248, 245)')

  // ── headings, links, content ─────────────────────────────────────────────
  const heads = (await page.locator('footer h2').allTextContents()).map((t) => t.trim())
  check(`${w}: section headings`, heads.join('|') === ['About FERVORO', 'My Account', 'Customer Service', 'Stay Connected'].join('|'), heads.join('|'))
  for (const [title, labels] of Object.entries(COLUMNS)) {
    const nav = page.locator(`footer nav[aria-label="${title}"]`)
    check(`${w}: "${title}" is a labelled nav landmark`, (await nav.count()) === 1)
    const got = (await nav.locator('li').allTextContents()).map((t) => t.replace(/\(coming soon\)/, '').trim())
    check(`${w}: "${title}" links`, got.join('|') === labels.join('|'), got.join('|'))
  }
  check(`${w}: uppercase heading style`, (await page.$eval('.fervoro-footer-title', (e) => getComputedStyle(e).textTransform)) === 'uppercase')

  // ── columns / layout ─────────────────────────────────────────────────────
  const cols = g.cols
  if (phone) {
    check(`${w}: columns stacked in one column`, cols.every((c) => near(c.l, 0, 1) && near(c.w, w, 1)) && cols.every((c, i) => i === 0 || c.t >= cols[i - 1].b - 1))
  } else if (tablet) {
    check(`${w}: two-column layout (2×2)`, near(cols[0].l, cols[2].l, 1) && near(cols[1].l, cols[3].l, 1) && cols[1].l > cols[0].l + 200 && cols[2].t > cols[0].b - 1 && near(cols[0].t, cols[1].t, 1))
    check(`${w}: hairline between columns and rows`, cols[1].bl === '1px' && cols[3].bl === '1px' && cols[2].bt === '1px')
  } else {
    check(`${w}: four columns on one row`, cols.length === 4 && cols.every((c) => near(c.t, cols[0].t, 1)) && cols.every((c, i) => i === 0 || c.l > cols[i - 1].l))
    const fr = cols.map((c) => c.l / w)
    // reference proportions: separators at 26.3% / 49.9% / 73.5% of the width
    check(`${w}: column proportions match the reference`, near(fr[1], 0.263, 0.005) && near(fr[2], 0.499, 0.005) && near(fr[3], 0.735, 0.005), fr.map((f) => f.toFixed(3)).join())
    check(`${w}: thin vertical separators between columns`, cols[0].bl === '0px' && cols.slice(1).every((c) => c.bl === '1px'))
    const sepH = cols.map((c) => c.h)
    check(`${w}: separators span a common height`, sepH.every((h) => near(h, sepH[0], 1)))
  }

  // ── newsletter ───────────────────────────────────────────────────────────
  check(`${w}: newsletter description is the specified copy`, (await page.locator('.fervoro-footer-news-text').textContent()).trim() === DESCRIPTION)
  check(`${w}: privacy statement is the specified copy`, (await page.locator('.fervoro-footer-privacy').textContent()).trim() === PRIVACY)
  const input = page.locator('footer input[type="email"]')
  check(`${w}: email field has an accessible name + autocomplete`, (await page.getByRole('textbox', { name: 'Email address' }).count()) === 1 && (await input.getAttribute('autocomplete')) === 'email')
  check(`${w}: submit button reads SUBSCRIBE (uppercase, dark green)`, await page.$eval('.fervoro-footer-submit', (b) => b.textContent.trim() === 'Subscribe' && getComputedStyle(b).textTransform === 'uppercase' && getComputedStyle(b).backgroundColor === 'rgb(17, 48, 42)'))
  const bt = await page.$eval('.fervoro-footer-submit', (b) => b.getBoundingClientRect().height)
  check(`${w}: field and button are comfortable to tap (>= 44px)`, bt >= 44 && (await input.evaluate((e) => e.getBoundingClientRect().height)) >= 44)
  check(`${w}: form fits its column`, await page.evaluate(() => { const f = document.querySelector('.fervoro-footer-form').getBoundingClientRect(), c = document.querySelector('.fervoro-footer-col-news').getBoundingClientRect(); return f.left >= c.left - 0.5 && f.right <= c.right + 0.5 }))

  const heightBefore = (await geo(page)).footer.h
  const submit = page.locator('.fervoro-footer-submit')
  const note = page.locator('.fervoro-footer-note')
  const nReq = requests.length
  await submit.click()
  check(`${w}: empty submit → error message, aria-invalid, focus returns to the field`, (await note.textContent()).includes('enter your email') && (await input.getAttribute('aria-invalid')) === 'true' && (await page.evaluate(() => document.activeElement?.type)) === 'email')
  for (const bad of ['abc', 'a@b', 'a b@c.com', '@x.com']) {
    await input.fill(bad); await submit.click()
    check(`${w}: "${bad}" rejected`, (await note.textContent()).includes('valid email') && (await input.getAttribute('aria-invalid')) === 'true')
  }
  await input.fill('visitor@example.com'); // typing clears the previous error
  check(`${w}: typing clears the error`, (await note.textContent()) === '' && (await input.getAttribute('aria-invalid')) === 'false')
  await input.press('Enter') // keyboard submit
  const msg = (await note.textContent()).trim()
  check(`${w}: valid address → honest preview message (nothing saved/sent)`, /opens soon/.test(msg) && /nothing has been saved or sent/i.test(msg) && !/thank|subscribed|success/i.test(msg), msg)
  check(`${w}: NO network request was made by submitting`, requests.slice(nReq).length === 0, JSON.stringify(requests.slice(nReq)))
  check(`${w}: no layout shift when messages appear`, near((await geo(page)).footer.h, heightBefore, 0.5), `${heightBefore} → ${(await geo(page)).footer.h}`)
  check(`${w}: status region is polite live region`, (await note.getAttribute('role')) === 'status' && (await note.getAttribute('aria-live')) === 'polite')

  // ── social band ──────────────────────────────────────────────────────────
  const s = g.social
  check(`${w}: four social icons on one row`, s.length === 4 && s.every((x) => near(x.t, s[0].t, 0.5)))
  const centre = (s[0].l + s[3].r) / 2
  check(`${w}: social icons centred in the viewport`, near(centre, w / 2, 1), String(centre))
  const gaps = s.slice(1).map((x, i) => x.l - s[i].r)
  check(`${w}: even spacing`, gaps.every((x) => near(x, gaps[0], 0.5)))
  check(`${w}: hairlines above and below the social band`, g.bandBorders[0] === '1px' && g.bandBorders[1] === '1px')
  check(`${w}: band sits below the columns and above the copyright`, g.band.t >= Math.max(...g.cols.map((c) => c.b)) - 1 && g.band.b <= g.footer.b)
  const social = await page.$$eval('.fervoro-footer-social-item', (els) => els.map((e) => ({ tag: e.tagName, href: e.getAttribute('href'), dis: e.getAttribute('aria-disabled'), name: e.getAttribute('aria-label') })))
  check(`${w}: platforms Instagram, Facebook, YouTube, Pinterest, each with an accessible name`, ['Instagram', 'Facebook', 'YouTube', 'Pinterest'].every((p, i) => social[i]?.name?.includes(p)))
  check(`${w}: unconfigured profiles are inert (no invented URLs)`, social.every((x) => x.tag === 'BUTTON' && x.href === null && x.dis === 'true' && /not available/.test(x.name)))
  check(`${w}: icons are >= 44px touch targets`, s.every((x) => x.w >= 44 && x.h >= 44))

  // ── copyright ────────────────────────────────────────────────────────────
  check(`${w}: copyright text`, (await page.locator('.fervoro-footer-copy').textContent()).trim() === COPYRIGHT)
  check(`${w}: copyright centred and small`, near(g.copyCenter, w / 2, 1.5) && g.copyFont <= 12)
  check(`${w}: no third-party brand text`, !/ralph|lauren/i.test(await page.locator('footer').innerText()))

  // ── links / buttons behave honestly ──────────────────────────────────────
  const anchors = await page.$$eval('footer a', (els) => els.map((a) => a.getAttribute('href')))
  check(`${w}: footer has no dead/placeholder anchors (#, javascript:, empty)`, anchors.every((h) => h && h !== '#' && !h.startsWith('javascript')), JSON.stringify(anchors))
  if (phone) await page.locator('.fervoro-footer-acc').first().click()
  const urlBefore = page.url()
  const pend = page.locator('footer .fervoro-footer-link.is-pending').first()
  await pend.click({ force: true })
  check(`${w}: pending link click does nothing (no navigation)`, page.url() === urlBefore && (await pend.getAttribute('aria-disabled')) === 'true' && (await pend.getAttribute('href')) === null)
  check(`${w}: pending links say "coming soon" to assistive tech`, (await pend.textContent()).includes('(coming soon)'))
  check(`${w}: no console / network errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

/* ───────────── phone accordion ───────────── */
{
  console.log('phone accordion')
  for (const w of [320, 390, 430]) {
    const { page, ctx } = await open(w)
    const trig = page.locator('.fervoro-footer-acc')
    check(`${w}: three accordion groups, collapsed by default`, (await trig.count()) === 3 && (await page.locator('.fervoro-footer-acc[aria-expanded="true"]').count()) === 0)
    check(`${w}: collapsed links are hidden from keyboard + AT`, await page.$$eval('.fervoro-footer-region', (els) => els.every((e) => e.inert && getComputedStyle(e).visibility === 'hidden')))
    await trig.nth(0).scrollIntoViewIfNeeded()
    const h0 = (await geo(page)).footer.h
    await trig.nth(0).click(); await page.waitForTimeout(450)
    check(`${w}: tapping opens the group (aria-expanded, links visible, footer grows)`, (await trig.nth(0).getAttribute('aria-expanded')) === 'true' && (await page.locator('footer .fervoro-footer-link').first().isVisible()) && (await geo(page)).footer.h > h0 + 100)
    check(`${w}: accordion buttons >= 44px tall`, (await trig.nth(0).evaluate((e) => e.getBoundingClientRect().height)) >= 44)
    await trig.nth(0).focus(); await page.keyboard.press('Space'); await page.waitForTimeout(450)
    check(`${w}: Space collapses it again`, (await trig.nth(0).getAttribute('aria-expanded')) === 'false')
    await trig.nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(450)
    check(`${w}: Enter opens another group`, (await trig.nth(1).getAttribute('aria-expanded')) === 'true')
    check(`${w}: no horizontal overflow when expanded`, (await geo(page)).ow <= 0)
    await ctx.close()
  }
  // from tablet up there is no accordion at all
  const { page, ctx } = await open(768)
  check('768: columns are plain (no accordion buttons), links visible', (await page.locator('.fervoro-footer-acc').count()) === 0 && (await page.locator('footer .fervoro-footer-link').first().isVisible()))
  await ctx.close()
}

/* ───────────── keyboard + focus + menu interplay ───────────── */
{
  console.log('keyboard / focus / interplay')
  const { page, ctx } = await open(1440)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.keyboard.press('Tab')
  const targets = ['footer .fervoro-footer-link.is-pending', '.fervoro-footer-input', '.fervoro-footer-submit', '.fervoro-footer-social-item']
  for (const sel of targets) {
    await page.locator(sel).first().focus()
    const o = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return [cs.outlineStyle, parseFloat(cs.outlineWidth)] })
    check(`focus ring visible on ${sel}`, o[0] !== 'none' && o[1] >= 2, o.join())
  }
  // Tab order inside the footer: links → email → subscribe → social
  await page.locator('footer .fervoro-footer-link').first().focus()
  const seen = []
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const k = await page.evaluate(() => document.activeElement?.closest('footer') ? (document.activeElement.className.match(/fervoro-footer-[a-z-]+/)?.[0] ?? '') : 'out'); seen.push(k); if (k === 'out') break }
  const iInput = seen.indexOf('fervoro-footer-input'), iBtn = seen.indexOf('fervoro-footer-submit'), iSoc = seen.indexOf('fervoro-footer-social-item')
  check('tab order: links → email → SUBSCRIBE → social icons', iInput > 0 && iBtn === iInput + 1 && iSoc === iBtn + 1, seen.join(','))
  await page.evaluate(() => document.querySelector('.fervoro-footer-link').focus())
  const hov = await page.$eval('.fervoro-footer-submit', (b) => b.getBoundingClientRect())
  await page.mouse.move(hov.x + 5, hov.y + 5); await page.waitForTimeout(300)
  check('SUBSCRIBE hover state changes colour', (await page.$eval('.fervoro-footer-submit', (b) => getComputedStyle(b).backgroundColor)) !== 'rgb(17, 48, 42)')
  await ctx.close()

  // mobile menu open → footer is removed from the tab order / a11y tree, restored on close
  const m = await open(390)
  await m.page.locator('.fervoro-burger').tap()
  check('mobile menu open: footer is inert (focus cannot reach it behind the overlay)', await m.page.evaluate(() => document.getElementById('site-footer').inert && document.getElementById('main').inert))
  await m.page.locator('.fervoro-burger').tap()
  check('mobile menu closed: footer interactive again', await m.page.evaluate(() => !document.getElementById('site-footer').inert && !document.getElementById('main').inert))
  await m.ctx.close()
}

/* ───────────── approved sections untouched ───────────── */
{
  console.log('approved sections still intact')
  const { page, ctx } = await open(1440)
  const r = await page.evaluate(() => {
    const h = document.querySelector('header').getBoundingClientRect(), hero = document.querySelector('.fervoro-hero').getBoundingClientRect(), bar = document.querySelector('.fervoro-announce, [class*="announce"]')?.getBoundingClientRect()
    return { headerBottom: h.bottom, heroTop: hero.top, heroH: hero.height, bar: !!bar, h1: document.querySelectorAll('h1').length }
  })
  check('header → hero still flush, single h1, announcement bar present', near(r.headerBottom, r.heroTop, 1) && r.h1 === 1 && r.bar, JSON.stringify(r))
  await ctx.close()
}

/* ───────────── reduced motion ───────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage(); await page.goto(BASE); await page.waitForLoadState('networkidle')
  check('reduced motion: accordion transitions effectively disabled', await page.$eval('.fervoro-footer-region', (e) => getComputedStyle(e).transitionDuration.split(',').every((d) => parseFloat(d) <= 0.0001)))
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'))
  process.exit(1)
}
