/**
 * End-to-end checks for the Phase 2 homepage hero.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/hero.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'

// [width, height, label]
const VIEWPORTS = [
  [2560, 1080, 'ultrawide'], [1920, 1080, 'desktop 1080p'], [1600, 900, 'laptop 16:9'], [1440, 900, 'laptop 16:10'],
  [1280, 720, 'small laptop'], [1024, 768, 'tablet landscape'], [768, 1024, 'tablet portrait'], [844, 390, 'phone landscape'],
  [430, 932, 'phone large'], [390, 844, 'phone'], [375, 667, 'phone small'], [320, 568, 'phone tiny'],
]

// Face boxes in the ORIGINAL 1672×941 photograph: [x0, y0, x1, y1]
const FACE_1 = [420, 100, 640, 255] // model in the green polo
const FACE_2 = [1000, 60, 1210, 300] // model in the tweed coat
const PORTRAIT_OFFSET_X = 700 // portrait crop = source x 700 → 1460

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

for (const [w, h, label] of VIEWPORTS) {
  console.log(`hero @ ${w}×${h} (${label})`)
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && !/\.mp4$/.test(r.url()) && problems.push(`http ${r.status()}: ${r.url()}`))
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2200) // let entrance animations finish

  const g = await page.evaluate(
    ({ f1, f2, off }) => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height } }
      const hero = document.querySelector('.fervoro-hero')
      const img = hero.querySelector('img')
      const hdr = document.querySelector('header').getBoundingClientRect()
      const cs = getComputedStyle(img)
      const portrait = img.currentSrc.includes('portrait')
      const iw = portrait ? 760 : 1672
      const ih = 941
      const hb = hero.getBoundingClientRect()
      const s = Math.max(hb.width / iw, hb.height / ih)
      const [px, py] = cs.objectPosition.split(' ').map((v) => parseFloat(v) / 100)
      const ox = (hb.width - iw * s) * px
      const oy = (hb.height - ih * s) * py
      const toScreen = (b) => {
        const dx = portrait ? off : 0
        return { l: hb.left + ox + (b[0] - dx) * s, t: hb.top + oy + b[1] * s, r: hb.left + ox + (b[2] - dx) * s, b: hb.top + oy + b[3] * s }
      }
      const inside = (b) => b.l >= hb.left - 0.5 && b.r <= hb.right + 0.5 && b.t >= hb.top - 0.5 && b.b <= hb.bottom + 0.5
      const faces = { f1: toScreen(f1), f2: toScreen(f2) }
      const cap = document.querySelector('.fervoro-hero-caption')
      const title = document.querySelector('.fervoro-hero-title')
      const cta = document.querySelector('.fervoro-hero-cta')
      return {
        portrait, currentSrc: img.currentSrc, natural: img.naturalWidth, complete: img.complete, fit: cs.objectFit,
        hero: r(hero), hdrBottom: hdr.bottom, innerH: innerHeight, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
        imgBox: r(img), imgCount: hero.querySelectorAll('img').length,
        cap: r(cap), title: r(title), cta: r(cta), capText: cap.textContent, titleText: title.textContent, ctaText: cta.textContent, ctaTag: cta.tagName,
        capTransform: getComputedStyle(cap).textTransform,
        f1Visible: inside(faces.f1), f2Visible: inside(faces.f2), f1Bottom: faces.f1.b, f2Bottom: faces.f2.b,
        cls: window.__cls, bodyText: document.body.innerText, h1Count: document.querySelectorAll('h1').length,
        titleFont: getComputedStyle(title).fontFamily, titleSize: parseFloat(getComputedStyle(title).fontSize),
      }
    },
    { f1: FACE_1, f2: FACE_2, off: PORTRAIT_OFFSET_X },
  )

  const expectPortrait = w <= 639 || w / h <= 1
  check(`${label}: placeholder removed`, !/later phase/i.test(g.bodyText))
  check(`${label}: hero sits directly beneath the navigation (no gap)`, near(g.hero.t, g.hdrBottom, 1), `(hero top ${g.hero.t}, header bottom ${g.hdrBottom})`)
  check(`${label}: hero is full viewport width`, near(g.hero.w, w, 0.5) && near(g.hero.l, 0, 0.5))
  const expectedH = Math.max(520, h - g.hdrBottom)
  check(`${label}: hero fills first screen exactly (or min 520px) — no gap below`, near(g.hero.h, Math.min(expectedH, 1200), 1.5), `(h ${g.hero.h}, expected ${expectedH})`)
  check(`${label}: no horizontal overflow`, g.scrollW <= g.innerW)
  check(`${label}: single hero image, loaded`, g.imgCount === 1 && g.complete && g.natural > 0)
  check(`${label}: picks ${expectPortrait ? 'portrait' : 'landscape'} variant`, g.portrait === expectPortrait, g.currentSrc)
  check(`${label}: image covers hero (object-fit: cover, no distortion)`, g.fit === 'cover' && near(g.imgBox.w, g.hero.w, 0.5) && near(g.imgBox.h, g.hero.h, 0.5))
  if (expectPortrait) check(`${label}: model's face fully visible (portrait crop)`, g.f2Visible)
  else check(`${label}: BOTH models' faces fully visible`, g.f1Visible && g.f2Visible, JSON.stringify({ f1: g.f1Visible, f2: g.f2Visible }))

  // Text
  check(`${label}: copy is exact`, g.capText === 'Autumn / Winter 2027' && g.capTransform === 'uppercase' && g.titleText === 'The Art of Modern Dressing.' && g.ctaText === 'Explore the Collection')
  check(`${label}: one h1, serif headline`, g.h1Count === 1 && /Playfair/i.test(g.titleFont))
  check(`${label}: text inside hero horizontally`, [g.cap, g.title, g.cta].every((b) => b.l >= 0 && b.r <= w))
  check(`${label}: order caption → headline → CTA, no overlap`, g.cap.b <= g.title.t + 1 && g.title.b <= g.cta.t + 1)
  check(`${label}: text block inside hero vertically`, g.cap.t >= g.hero.t && g.cta.b <= g.hero.b)
  const visibleFaceBottom = Math.max(...[g.f1Visible && !expectPortrait ? g.f1Bottom : 0, g.f2Visible ? g.f2Bottom : 0])
  check(`${label}: headline block clears the faces`, g.cap.t >= visibleFaceBottom + 4, `(caption top ${g.cap.t.toFixed(0)}, face bottom ${visibleFaceBottom.toFixed(0)})`)
  check(`${label}: headline size sensible`, g.titleSize >= 28 && g.titleSize <= 76.1, `(${g.titleSize}px)`)

  // Stability
  check(`${label}: cumulative layout shift ≈ 0`, g.cls < 0.01, `(CLS ${g.cls.toFixed(4)})`)

  // CTA is a real link to the collection landing page
  check(`${label}: CTA is a link to /collection`, g.ctaTag === 'A' && (await page.locator('.fervoro-hero-cta').getAttribute('href')) === '/collection')
  await page.locator('.fervoro-hero-cta').click()
  await page.waitForURL('**/collection')
  check(`${label}: CTA opens the collection page`, (await page.locator('.fervoro-cat').count()) === 5)
  check(`${label}: no console / network errors`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// Reduced motion
{
  console.log('reduced motion')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  const m = await page.evaluate(() => [...document.querySelectorAll('.fervoro-reveal, .fervoro-hero-img')].map((e) => [getComputedStyle(e).animationName, getComputedStyle(e).opacity]))
  check('reduced motion: hero animations disabled, content visible immediately', m.every(([a, o]) => a === 'none' && o === '1'), JSON.stringify(m))
  await ctx.close()
}

// Keyboard: CTA reachable via Tab after the navigation
{
  console.log('keyboard')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  let reached = false
  for (let i = 0; i < 12 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => document.activeElement?.classList.contains('fervoro-hero-cta')) }
  check('keyboard: CTA reachable with Tab', reached)
  await page.keyboard.press('Enter')
  await page.waitForURL('**/collection')
  check('keyboard: Enter on CTA opens the collection page', (await page.locator('.fervoro-cat').count()) === 5)
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'))
  process.exit(1)
}
