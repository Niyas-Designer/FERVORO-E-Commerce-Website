/**
 * End-to-end checks for the homepage FERVORO Collections slider (five photographic category cards).
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/collections.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'
// [width, height, fully visible cards expected]
const VIEWPORTS = [[2560, 1080, 3], [1920, 1080, 3], [1600, 900, 3], [1440, 900, 3], [1280, 720, 3], [1024, 768, 3], [1023, 768, 2], [768, 1024, 2], [700, 900, 2], [640, 900, 2], [639, 900, 1], [430, 932, 1], [390, 844, 1], [375, 667, 1], [320, 568, 1]]

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)
const lum = (c) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const browser = await chromium.launch()
async function open(w, h, opts = {}) {
  const touch = w < 1024
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const problems = []
  const urls = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => { urls.push(r.url()); if (r.status() >= 400 && !/\.mp4$/.test(r.url())) problems.push(`http ${r.status()}: ${r.url()}`) })
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, problems, urls }
}
const track = (page) => page.evaluate(() => { const t = document.querySelector('.fervoro-collections-track'); const c = t.children; return { sl: t.scrollLeft, max: t.scrollWidth - t.clientWidth, step: c[1].offsetLeft - c[0].offsetLeft, prev: document.querySelector('[aria-label="Previous collections"]').getAttribute('aria-disabled'), next: document.querySelector('[aria-label="Next collections"]').getAttribute('aria-disabled') } })
const toSection = (page) => page.evaluate(() => document.querySelector('.fervoro-collections').scrollIntoView({ block: 'center' }))

console.log('Layout / spacing')
for (const [w, h, full] of VIEWPORTS) {
  const tag = `@${w}x${h}`
  const { page, ctx, problems, urls } = await open(w, h)
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const sec = q('.fervoro-collections'), r = sec.getBoundingClientRect()
    const prev = q('.fervoro-video').getBoundingClientRect(), foot = q('#site-footer').getBoundingClientRect()
    const probe = document.createElement('div')
    probe.style.cssText = 'height:var(--section-gap);position:absolute;visibility:hidden'
    document.body.append(probe)
    const gap = probe.getBoundingClientRect().height
    probe.remove()
    const tr = q('.fervoro-collections-track').getBoundingClientRect()
    const cards = [...document.querySelectorAll('.fervoro-collections-card')].map((c) => { const b = c.getBoundingClientRect(), im = c.querySelector('img'), ib = im.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width, h: b.height, text: c.querySelector('h3')?.textContent.trim(), h3s: c.querySelectorAll('h3').length, extra: c.querySelectorAll('video,picture,svg,input,a a,a button,button a,button button').length, ctrls: c.querySelectorAll('a,button').length, imgs: c.querySelectorAll('img').length, fit: getComputedStyle(im).objectFit, imgW: ib.width, imgH: ib.height, imgL: ib.left - b.left, imgT: ib.top - b.top, nat: im.naturalWidth / (im.naturalHeight || 1) || 0, alt: im.alt, lazy: im.loading, shade: getComputedStyle(c.querySelector('.fervoro-collections-shade')).backgroundImage, focusable: c.tabIndex >= 0 } })
    const title = q('.fervoro-collections-title'), desc = q('.fervoro-collections-desc'), nav = q('.fervoro-collections-nav'), tb = title.getBoundingClientRect(), db = desc.getBoundingClientRect(), nb = nav.getBoundingClientRect()
    const ct = q('.fervoro-collections-card-title'), cts = getComputedStyle(ct), cardR = q('.fervoro-collections-card').getBoundingClientRect(), ctr = ct.getBoundingClientRect()
    const btns = [...nav.querySelectorAll('button')].map((b) => { const x = b.getBoundingClientRect(); return [x.width, x.height] })
    return {
      order: [...q('#main').children].map((c) => c.className.split(' ')[0]).join(), gapAbove: r.top - prev.bottom, gapBelow: foot.top - r.bottom, gap,
      cards, full: cards.filter((c) => c.l >= tr.left - 1 && c.r <= tr.right + 1).length, peek: cards.some((c) => c.l < tr.right - 2 && c.r > tr.right + 2),
      trW: tr.width, vw: innerWidth, docW: document.documentElement.scrollWidth, pad: (() => { const p = document.createElement('div'); p.style.cssText = 'width:var(--coll-pad);position:absolute;visibility:hidden'; sec.append(p); const v = p.getBoundingClientRect().width; p.remove(); return v })(),
      titleText: title.textContent, tag: title.tagName, labelled: sec.getAttribute('aria-labelledby'), tid: title.id, tfont: getComputedStyle(title).fontFamily, tcolor: getComputedStyle(title).color,
      navRight: nb.right, titleRight: tb.right, descRight: db.right, descTop: db.top, descBottom: db.bottom, titleTop: tb.top, navBottom: nb.bottom, descText: desc.textContent, descFont: getComputedStyle(desc).fontFamily, descColor: getComputedStyle(desc).color, descSize: parseFloat(getComputedStyle(desc).fontSize), descLines: Math.round(db.height / parseFloat(getComputedStyle(desc).lineHeight)), navLeft: nb.left, navTop: nb.top, titleCy: (tb.top + tb.bottom) / 2, navCy: (nb.top + nb.bottom) / 2, btns,
      ctColor: cts.color, ctFont: cts.fontFamily, ctLeftInset: ctr.left - cardR.left, ctBottomInset: cardR.bottom - ctr.bottom, ctSize: parseFloat(cts.fontSize),
      lists: q('.fervoro-collections-track').tagName,
    }
  })
  check(`${tag} placed after the video, before the footer`, m.order === 'fervoro-hero,fervoro-showcase,fervoro-video,fervoro-collections', m.order)
  check(`${tag} gap above = --section-gap`, near(m.gapAbove, m.gap, 0.6), `${m.gapAbove} vs ${m.gap}`)
  check(`${tag} gap below (to footer) = --section-gap`, near(m.gapBelow, m.gap, 0.6), `${m.gapBelow} vs ${m.gap}`)
  const ORDER = ['Polo', 'Shirt', 'T-Shirt', 'Bottom', 'Knit']
  check(`${tag} exactly five cards: Polo, Shirt, T-Shirt, Bottom, Knit (in order)`, m.cards.map((c) => c.text).join() === ORDER.join(), m.cards.map((c) => c.text).join())
  check(`${tag} each card = one photograph + one heading, no nested controls`, m.cards.every((c) => c.imgs === 1 && c.h3s === 1 && c.extra === 0))
  check(`${tag} photographs fill the card edge to edge`, m.cards.every((c) => near(c.imgW, c.w, 0.6) && near(c.imgH, c.h, 0.6) && near(c.imgL, 0, 0.6) && near(c.imgT, 0, 0.6) && c.fit === 'cover'))
  // lazy images that have not loaded yet are verified in the loading section below
  check(`${tag} photographs are not distorted (card ratio = photo ratio)`, m.cards.filter((c) => c.nat > 0).every((c) => near(c.w / c.h, c.nat, 0.012)) , m.cards.map((c) => `${(c.w / c.h).toFixed(4)}/${c.nat.toFixed(4)}`).join())
  check(`${tag} images have alt text and lazy loading`, m.cards.every((c) => c.alt.length > 10 && c.lazy === 'lazy'))
  check(`${tag} dark gradient at the base of every image`, m.cards.every((c) => /linear-gradient/.test(c.shade) && /to top|0deg/.test(c.shade)), m.cards[0].shade)
  check(`${tag} exactly one control per card (Shop Now); the card itself is not a tab stop`, m.cards.every((c) => !c.focusable && c.ctrls === 1))
  check(`${tag} no Women / Kids / Accessories / extra category`, !/women|kids|boys|accessor/i.test(m.cards.map((c) => c.text).join()))
  check(`${tag} cards are 900:1192 (≈3:4)`, m.cards.every((c) => near(c.w / c.h, 900 / 1192, 0.004)), m.cards.map((c) => (c.w / c.h).toFixed(3)).join())
  check(`${tag} cards identical size`, m.cards.every((c) => near(c.w, m.cards[0].w, 0.6) && near(c.h, m.cards[0].h, 0.6)))
  check(`${tag} card width ≤ 720`, m.cards[0].w <= 720.5, `${m.cards[0].w}`)
  check(`${tag} card gap = --section-gap`, m.cards.slice(1).every((c, i) => near(c.l - m.cards[i].r, m.gap, 0.6)))
  check(`${tag} first card flush to the left edge`, near(m.cards[0].l, 0, 0.6))
  check(`${tag} ${full} full card(s) visible`, m.full === full, `${m.full}`)
  check(`${tag} next card peeks in (reads as scrollable)`, m.peek)
  check(`${tag} heading is an h2, labelled carousel, serif, forest green`, m.tag === 'H2' && m.labelled === m.tid && /Playfair/.test(m.tfont) && JSON.stringify(rgb(m.tcolor)) === '[17,48,42]', `${m.tfont}`)
  check(`${tag} heading text`, m.titleText === 'FERVORO Collections')
  check(`${tag} description text is exact`, m.descText === 'Discover the FERVORO menswear collection — a refined expression of everyday essentials, contemporary design, and timeless style.', m.descText)
  check(`${tag} description: serif, forest green, readable size, ≤ 4 lines`, /Playfair/.test(m.descFont) && JSON.stringify(rgb(m.descColor)) === '[17,48,42]' && m.descSize >= 15 && m.descLines <= 4, `${m.descFont} ${m.descSize}px ${m.descLines} lines`)
  check(`${tag} description sits directly below the heading`, m.descTop >= m.titleTop && m.descTop > m.titleTop + 10)
  check(`${tag} description does not run under the arrows`, w < 640 ? m.descTop >= m.navBottom - 1 : m.descRight <= m.navLeft - 8, `${m.descRight} / ${m.navLeft}`)
  check(`${tag} nav pill aligned to the right padding`, near(m.navRight, m.vw - m.pad, 1.2), `${m.navRight} vs ${m.vw - m.pad}`)
  check(`${tag} heading and arrows do not collide`, m.titleRight <= m.navLeft - 8, `${m.titleRight} / ${m.navLeft}`)
  check(`${tag} arrows at the upper right (${w < 640 ? 'level with the heading' : 'centred on heading + description'})`, w < 640 ? near(m.navTop, m.titleTop, 14) : near(m.navCy, (m.titleTop + m.descBottom) / 2, 4), `${m.navCy} / ${(m.titleTop + m.descBottom) / 2}`)
  check(`${tag} arrow targets ≥ 44px`, m.btns.every(([bw, bh]) => bw >= 44 && bh >= 44), JSON.stringify(m.btns))
  check(`${tag} card title white, serif`, JSON.stringify(rgb(m.ctColor)) === '[255,255,255]' && /Playfair/.test(m.ctFont))
  check(`${tag} card title sits bottom-left with the page padding`, near(m.ctLeftInset, m.pad, 1.5) && m.ctBottomInset >= 20, `${m.ctLeftInset} / ${m.ctBottomInset}`)
  check(`${tag} no horizontal page overflow`, m.docW <= m.vw)
  const T = await page.evaluate(() => [...document.querySelectorAll('.fervoro-collections-card')].map((c) => {
    const cr = c.getBoundingClientRect(), L = c.querySelector('.fervoro-collections-label'), H = c.querySelector('h3'), C = c.querySelector('.fervoro-collections-cta')
    const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left - cr.left, r: b.right - cr.left, t: b.top - cr.top, b: b.bottom - cr.top } }
    const rg = document.createRange(); rg.selectNodeContents(H); const hw = rg.getBoundingClientRect().width
    const ls = getComputedStyle(L), hs = getComputedStyle(H), cs = getComputedStyle(C)
    return { cw: cr.width, ch: cr.height, L: r(L), H: r(H), C: r(C), hw, lText: L.innerText, cText: C.innerText, lFont: ls.fontFamily, lWeight: +ls.fontWeight, lSize: parseFloat(ls.fontSize), lLs: parseFloat(ls.letterSpacing), lColor: ls.color, hFont: hs.fontFamily, hSize: parseFloat(hs.fontSize), hColor: hs.color, cSize: parseFloat(cs.fontSize), cWeight: +cs.fontWeight, cLs: parseFloat(cs.letterSpacing), cBorder: `${cs.borderBottomWidth} ${cs.borderBottomStyle}`, cColor: cs.color, cTag: C.tagName, cLabel: C.getAttribute('aria-label') }
  }))
  check(`${tag} level 1: label "FERVORO MENSWEAR" — small uppercase sans, medium weight, tracked`, T.every((t) => t.lText === 'FERVORO MENSWEAR' && !/Playfair/.test(t.lFont) && t.lWeight >= 500 && t.lLs >= 1.5 && t.lSize >= 10.4 && t.lSize <= 14), `${T[0].lText} ${T[0].lFont} ${T[0].lWeight} ${T[0].lLs} ${T[0].lSize}`)
  check(`${tag} level 2: heading is a prominent serif (≥ 2× the label)`, T.every((t) => /Playfair/.test(t.hFont) && t.hSize >= 24 && t.hSize >= t.lSize * 2), `${T[0].hSize} vs ${T[0].lSize}`)
  check(`${tag} level 3: "SHOP NOW" small uppercase with a thin underline`, T.every((t) => t.cText === 'SHOP NOW' && t.cSize >= 10.9 && t.cSize <= 14 && t.cWeight >= 500 && t.cBorder === '1px solid'), `${T[0].cText} ${T[0].cSize} ${T[0].cBorder}`)
  check(`${tag} text is white / ivory`, T.every((t) => [t.lColor, t.hColor, t.cColor].every((c) => rgb(c).every((v) => v >= 245))))
  check(`${tag} order top → bottom: label, heading, Shop Now with balanced gaps`, T.every((t) => t.L.b <= t.H.t + 1 && t.H.b + 8 <= t.C.t && t.H.t - t.L.b >= 4 && t.H.t - t.L.b <= 24 && t.C.t - t.H.b >= 8 && t.C.t - t.H.b <= 40), JSON.stringify(T[0]))
  check(`${tag} all three share one left edge = page padding`, T.every((t) => near(t.L.l, m.pad, 1) && near(t.H.l, m.pad, 1) && near(t.C.l, m.pad, 1)), `${T[0].L.l}/${T[0].H.l}/${T[0].C.l} vs ${m.pad}`)
  check(`${tag} identical text position on all five cards`, T.every((t) => near(t.L.t, T[0].L.t, 1) && near(t.H.t, T[0].H.t, 1) && near(t.C.t, T[0].C.t, 1) && near(t.ch - t.C.b, T[0].ch - T[0].C.b, 1)))
  check(`${tag} text block stays in the lower part of the card (≤ 42% of its height)`, T.every((t) => (t.ch - t.L.t) / t.ch <= 0.42), `${((T[0].ch - T[0].L.t) / T[0].ch).toFixed(3)}`)
  check(`${tag} no clipping: heading + label inside the card padding`, T.every((t) => t.hw <= t.cw - m.pad * 1.4 && t.H.r <= t.cw && t.L.r <= t.cw - m.pad * 0.5 && t.C.r <= t.cw - m.pad * 0.5), `${T[0].hw} / ${T[0].cw}`)
  check(`${tag} Shop Now named for assistive tech ("Shop Now: <category>")`, T.every((t, i) => t.cLabel === `Shop Now: ${ORDER[i]}` && t.cTag === 'A'), T.map((t) => t.cLabel).join('|'))
  check(`${tag} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

console.log('Slider behaviour (1440x900)')
{
  const { page, ctx, problems } = await open(1440, 900)
  await toSection(page)
  let s = await track(page)
  check('start: Previous disabled, Next enabled', s.prev === 'true' && s.next === 'false' && s.sl === 0, JSON.stringify(s))
  await page.click('[aria-label="Next collections"]')
  await page.waitForFunction(() => document.querySelector('.fervoro-collections-track').scrollLeft > 0 && !document.querySelector('[aria-label="Previous collections"]').getAttribute('aria-disabled').includes('true'))
  await sleep(700)
  s = await track(page)
  check('Next moves exactly one card and snaps', near(s.sl, s.step, 1.5), `${s.sl} vs ${s.step}`)
  check('Previous becomes enabled', s.prev === 'false')
  for (let i = 0; i < 12 && (await track(page)).next === 'false'; i++) { await page.click('[aria-label="Next collections"]'); await sleep(650) }
  s = await track(page)
  check('end reached: Next disabled', s.next === 'true' && near(s.sl, s.max, 1.5), JSON.stringify(s))
  check('last card is fully in view at the end', await page.evaluate(() => { const t = document.querySelector('.fervoro-collections-track').getBoundingClientRect(), c = [...document.querySelectorAll('.fervoro-collections-card')].pop().getBoundingClientRect(); return c.right <= t.right + 1 && c.left >= t.left }))
  await page.click('[aria-label="Next collections"]', { force: true })
  await sleep(400)
  check('disabled Next does nothing', near((await track(page)).sl, s.sl, 1))
  // keyboard: Tab order + Enter/Space + visible focus
  await page.focus('[aria-label="Previous collections"]')
  await page.keyboard.press('Enter')
  await sleep(700)
  check('Previous works from the keyboard (Enter)', (await track(page)).sl < s.sl)
  await page.keyboard.press('Tab')
  const ring = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { label: e.getAttribute('aria-label'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) } })
  check('Tab moves Previous → Next with a visible focus ring', ring.label === 'Next collections' && ring.style !== 'none' && ring.width >= 2, JSON.stringify(ring))
  const before = (await track(page)).sl
  await page.keyboard.press('Space')
  await sleep(700)
  check('Next works from the keyboard (Space)', (await track(page)).sl > before)
  check('arrow buttons are real buttons with labels', await page.evaluate(() => [...document.querySelectorAll('.fervoro-collections-nav button')].every((b) => b.tagName === 'BUTTON' && b.type === 'button' && b.getAttribute('aria-label'))))
  check('cards are not focusable (nothing to activate yet)', await page.evaluate(() => ![...document.querySelectorAll('.fervoro-collections-card, .fervoro-collections-track')].some((e) => e.tabIndex >= 0)))
  check('no console/network problems', problems.length === 0, problems.join(' | '))
  await ctx.close()
}

console.log('Touch swipe (390x844, 768x1024)')
for (const [w, h] of [[390, 844], [768, 1024]]) {
  const { page, ctx, problems } = await open(w, h)
  await toSection(page)
  await sleep(500)
  const cdp = await ctx.newCDPSession(page)
  const y = await page.evaluate(() => { const r = document.querySelector('.fervoro-collections-track').getBoundingClientRect(); return Math.min(Math.max(r.top + r.height / 2, 100), innerHeight - 100) })
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w * 0.8, y }] })
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: w * 0.8 - i * w * 0.05, y }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(900)
    if ((await track(page)).sl > 0) break
    console.log(`  (touch gesture retry ${attempt} @${w})`)
  }
  const s = await track(page)
  check(`@${w} swipe scrolls the slider and snaps to a card`, s.sl > 0 && (near(s.sl % s.step, 0, 1.5) || near(s.sl % s.step, s.step, 1.5) || near(s.sl, s.max, 1.5)), JSON.stringify(s))
  check(`@${w} Previous enabled after swiping`, s.prev === 'false')
  check(`@${w} swipe did not scroll the page sideways`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  check(`@${w} swiping does not trigger Shop Now`, (await page.$$eval('.fervoro-collections-note', (n) => n.every((x) => x.textContent === ''))))
  check(`@${w} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

console.log('Photographs load, are undistorted and keep the title legible')
// Tier-1 photographs (public/products, "Important 1") lead where a category has them; otherwise the approved photoshoot image.
const SLUGS = ['/catalog/i1/in-01/00', '/images/nav/core-shirt-', '/catalog/i1/in-13/00', '/catalog/i1/in-15/00', '/products/knit-shorts/model']
for (const [w, h] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844]]) {
  const tag = `@${w}`
  const { page, ctx, problems, urls } = await open(w, h)
  await toSection(page)
  // visit every card so the lazy images are requested
  for (let i = 0; i < 5; i++) {
    await page.evaluate((i) => document.querySelectorAll('.fervoro-collections-card')[i].scrollIntoView({ inline: 'center', block: 'nearest' }), i)
    await sleep(350)
  }
  await page.waitForFunction(() => [...document.querySelectorAll('.fervoro-collections-img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {})
  const imgs = await page.evaluate(() => [...document.querySelectorAll('.fervoro-collections-img')].map((i) => ({ ok: i.complete && i.naturalWidth > 0, src: i.currentSrc, nw: i.naturalWidth, nh: i.naturalHeight, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height })))
  check(`${tag} all five photographs load`, imgs.length === 5 && imgs.every((i) => i.ok), JSON.stringify(imgs.map((i) => i.ok)))
  check(`${tag} correct photographs, in order (${SLUGS.join(', ')})`, imgs.every((i, k) => i.src.includes(SLUGS[k])), imgs.map((i) => i.src.split('/').pop()).join())
  check(`${tag} resolution is sufficient (≥ 1x for the card)`, imgs.every((i) => i.nw >= i.w - 1), imgs.map((i) => `${i.nw}/${Math.round(i.w)}`).join())
  check(`${tag} no distortion (rendered ratio = natural ratio)`, imgs.every((i) => near(i.w / i.h, i.nw / i.nh, 0.01)), imgs.map((i) => `${(i.w / i.h).toFixed(3)}/${(i.nw / i.nh).toFixed(3)}`).join())
  const bad = urls.filter((u) => /\/images\/nav\/|\/products\/|\/catalog\//.test(u))
  check(`${tag} image requests succeeded (no 404)`, bad.length >= 5 && !problems.some((x) => /http 4|http 5/.test(x)), problems.join(' | '))
  // legibility: with the text hidden, the pixels behind label + heading + Shop Now must contrast ≥ 4.5:1 with white
  const worst = []
  for (let i = 0; i < 5; i++) {
    await page.evaluate((i) => document.querySelectorAll('.fervoro-collections-card')[i].scrollIntoView({ inline: 'center', block: 'nearest' }), i)
    await sleep(300)
    const box = await page.evaluate((i) => {
      const c = document.querySelectorAll('.fervoro-collections-card')[i]
      const els = [c.querySelector('.fervoro-collections-label'), c.querySelector('h3'), c.querySelector('.fervoro-collections-cta')]
      const rs = els.map((e) => { const rr = document.createRange(); rr.selectNodeContents(e); return rr.getBoundingClientRect() })
      els.forEach((e) => { e.style.visibility = 'hidden' })
      const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r = Math.max(...rs.map((x) => x.right)), b = Math.max(...rs.map((x) => x.bottom))
      return { x: l, y: t, w: r - l, h: b - t }
    }, i)
    const buf = await page.screenshot({ clip: { x: Math.max(0, box.x), y: box.y, width: Math.min(box.w, w - box.x), height: box.h } })
    const maxL = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, c.width, c.height).data; let m = 0
      for (let k = 0; k < d.length; k += 4) { const l = [d[k], d[k + 1], d[k + 2]].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); m = Math.max(m, 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]) }
      return m
    }, buf.toString('base64'))
    await page.evaluate((i) => { document.querySelectorAll('.fervoro-collections-card')[i].querySelectorAll('.fervoro-collections-label, h3, .fervoro-collections-cta').forEach((e) => { e.style.visibility = '' }) }, i)
    worst.push(1.05 / (maxL + 0.05))
  }
  check(`${tag} white text (label, heading, Shop Now) stays legible on every photograph (min contrast ${Math.min(...worst).toFixed(1)}:1 ≥ 4.5)`, worst.every((x) => x >= 4.5), worst.map((x) => x.toFixed(1)).join())
  check(`${tag} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

console.log('Shop Now interaction (1440x900)')
{
  const { page, ctx, problems } = await open(1440, 900)
  await toSection(page)
  await sleep(600)
  // Cards link to /collection by default (covered by collection-page.e2e.mjs). Clear the hrefs to exercise the
  // no-destination fallback (button + live-region message) that is used for categories without a page.
  await page.evaluate(async () => { const m = await import('/src/data/collections.js'); m.COLLECTIONS.forEach((c) => { c.href = null }) })
  await page.emulateMedia({ reducedMotion: 'reduce' }) // forces a React re-render through the existing media-query subscription
  await sleep(500)
  const snap = () => page.evaluate(() => { const c = document.querySelector('.fervoro-collections-card'); const g = (s) => { const b = c.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10).join() }; return { card: (() => { const b = c.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10).join() })(), l: g('.fervoro-collections-label'), h: g('h3'), c: g('.fervoro-collections-cta'), page: document.documentElement.scrollHeight } })
  const c0 = await page.evaluate(() => { const b = document.querySelector('.fervoro-collections-card').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 3 } })
  await page.mouse.move(c0.x, c0.y) // hover state (Shop Now letter-spacing eases open) settles before measuring
  await sleep(600)
  const before = await snap()
  const hit = await page.evaluate(() => [...document.querySelectorAll('.fervoro-collections-card')].slice(0, 3).map((c) => { const b = c.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 3); return e?.classList.contains('fervoro-collections-cta') })).catch(() => [])
  check('whole card is the hit area of its single Shop Now control', hit.length === 3 && hit.every(Boolean), JSON.stringify(hit))
  await page.mouse.click(c0.x, c0.y)
  await sleep(600)
  const msgs = await page.$$eval('.fervoro-collections-note', (n) => n.map((x) => x.textContent))
  check('clicking the card announces "The collection opens soon." on that card only', msgs[0] === 'The collection opens soon.' && msgs.slice(1).every((m) => m === ''), JSON.stringify(msgs))
  const during = await snap()
  check('preview message does not shift anything (card, label, heading, CTA, page height)', JSON.stringify(before) === JSON.stringify(during), JSON.stringify([before, during]))
  check('message is inside the card and the viewport', await page.evaluate(() => { const c = document.querySelector('.fervoro-collections-card').getBoundingClientRect(), n = document.querySelector('.fervoro-collections-note').getBoundingClientRect(); return n.left >= c.left && n.right <= c.right && n.bottom <= c.bottom && n.top >= c.top })) 
  check('message region is a polite status linked to the button', await page.evaluate(() => { const b = document.querySelector('.fervoro-collections-cta'), n = document.getElementById(b.getAttribute('aria-describedby')); return n.getAttribute('role') === 'status' && n.getAttribute('aria-live') === 'polite' }))
  await sleep(4300)
  check('message clears itself after ~4 s', (await page.$$eval('.fervoro-collections-note', (n) => n.every((x) => x.textContent === ''))))
  // keyboard
  await page.focus('[aria-label="Next collections"]')
  await page.keyboard.press('Tab')
  const f1 = await page.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return { label: e.getAttribute('aria-label'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor } })
  check('Tab from the arrows reaches the first Shop Now, with a visible white focus ring', f1.label === 'Shop Now: Polo' && f1.style !== 'none' && f1.width >= 2 && rgb(f1.color).every((v) => v >= 245), JSON.stringify(f1))
  await page.keyboard.press('Enter')
  await sleep(200)
  check('Enter on Shop Now works (message announced)', (await page.$$eval('.fervoro-collections-note', (n) => n[0].textContent)) === 'The collection opens soon.')
  await page.mouse.move(5, 5)
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
  await sleep(1000)
  const f4 = await page.evaluate(() => { const e = document.activeElement, c = e.closest('.fervoro-collections-card').getBoundingClientRect(), t = document.querySelector('.fervoro-collections-track').getBoundingClientRect(); return { label: e.getAttribute('aria-label'), inView: c.left >= t.left - 1 && c.right <= t.right + 1 } })
  check('Tab reaches Shop Now on the 4th card and scrolls it fully into view', f4.label === 'Shop Now: Bottom' && f4.inView, JSON.stringify(f4))
  check('exactly five Shop Now controls, labels in order', JSON.stringify(await page.$$eval('.fervoro-collections-cta', (b) => b.map((x) => x.getAttribute('aria-label')))) === JSON.stringify(['Shop Now: Polo', 'Shop Now: Shirt', 'Shop Now: T-Shirt', 'Shop Now: Bottom', 'Shop Now: Knit']))
  // when a category page exists (href set) Shop Now must become one plain link — no button, no nesting
  await page.evaluate(async () => { const m = await import('/src/data/collections.js'); m.COLLECTIONS[0].href = '/men/polo' })
  await page.emulateMedia({ reducedMotion: 'no-preference' }) // forces a React re-render through the existing media-query subscription
  await sleep(500)
  await page.evaluate(() => { document.querySelector('.fervoro-collections-track').scrollLeft = 0; document.querySelector('.fervoro-collections').scrollIntoView({ block: 'center' }) }) // the Tab test above left the track scrolled
  await sleep(500)
  const lk = await page.evaluate(() => { const c = document.querySelector('.fervoro-collections-card'), a = c.querySelector('a.fervoro-collections-cta'), b = c.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 3); return { href: a?.getAttribute('href'), label: a?.getAttribute('aria-label'), buttons: c.querySelectorAll('button').length, ctrls: c.querySelectorAll('a,button').length, hit: e === a, nested: c.querySelectorAll('a a, a button, button a').length, note: !!c.querySelector('.fervoro-collections-note'), others: document.querySelectorAll('.fervoro-collections-card button.fervoro-collections-cta').length } })
  check('with href set: Shop Now is a single plain link covering the card (no button, no nesting, no preview note)', lk.href === '/men/polo' && lk.label === 'Shop Now: Polo' && lk.buttons === 0 && lk.ctrls === 1 && lk.hit && lk.nested === 0 && !lk.note, JSON.stringify(lk))
  check('with href set: other cards are unchanged', lk.others === 4)
  check('no console/network problems', problems.length === 0, problems.join(' | '))
  await ctx.close()
}

console.log('Reduced motion')
{
  const { page, ctx } = await open(1440, 900, { reduced: true })
  await toSection(page)
  const step = (await track(page)).step
  await page.click('[aria-label="Next collections"]')
  await sleep(150)
  check('reduced motion: scroll is instant (no smooth animation)', near((await track(page)).sl, step, 1.5), `${(await track(page)).sl}`)
  check('reduced motion: nav transition disabled', await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.fervoro-collections-nav button')).transitionDuration) < 0.001))
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ' - ' + f).join('\n'))
  process.exit(1)
}
