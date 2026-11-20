/**
 * End-to-end checks for the homepage video gallery: seamless, edge-to-edge strip of local 9:16 clips.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/motion.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'
const VIEWPORTS = [[2560, 1080], [1920, 1080], [1440, 900], [1280, 720], [1024, 768], [1023, 768], [820, 1180], [768, 1024], [640, 900], [639, 900], [430, 932], [390, 844], [375, 667], [320, 568]]
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

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
for (const [w, h] of VIEWPORTS) {
  const tag = `@${w}x${h}`
  const touch = w < 1024
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const problems = []
  const external = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`)) // media range requests are aborted when a clip pauses
  page.on('request', (r) => { if (!r.url().startsWith(new URL(BASE).origin) && !r.url().startsWith('data:')) external.push(r.url()) })
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const sec = q('.fervoro-gallery'), r = sec.getBoundingClientRect(), main = q('#main').getBoundingClientRect()
    const show = q('.fervoro-showcase').getBoundingClientRect(), foot = q('.fervoro-collections').getBoundingClientRect()
    const probe = document.createElement('div')
    probe.style.cssText = 'height:var(--section-gap);position:absolute;visibility:hidden'
    document.body.append(probe)
    const gap = probe.getBoundingClientRect().height
    probe.remove()
    const cs = getComputedStyle(sec), track = q('.fervoro-gallery-track')
    const panels = [...document.querySelectorAll('.fervoro-gallery-media')].map((e) => e.getBoundingClientRect())
    const vids = [...document.querySelectorAll('.fervoro-gallery video')]
    return {
      bg: cs.backgroundColor, pad: cs.padding, mt: parseFloat(cs.marginTop), mrest: [cs.marginRight, cs.marginBottom, cs.marginLeft].join(),
      x: r.left, right: r.right, w: r.width, h: r.height, mainW: main.width, vw: innerWidth, docW: document.documentElement.scrollWidth,
      gapAbove: r.top - show.bottom, gapBelow: foot.top - r.bottom, gap, trackH: track.getBoundingClientRect().height,
      panels: panels.map((p) => [p.left, p.right, p.width, p.height]), n: panels.length,
      order: [...q('#main').children].map((c) => c.className.split(' ')[0]).join(','),
      text: sec.innerText.trim(), headings: sec.querySelectorAll('h1,h2,h3,h4,p,figcaption,ol').length, iframes: document.querySelectorAll('iframe').length,
      page: document.body.innerText, h1: document.querySelectorAll('h1').length,
      fit: getComputedStyle(q('.fervoro-gallery-video')).objectFit, gapCss: getComputedStyle(track).columnGap,
      vattr: vids.map((v) => [v.muted, v.loop, v.hasAttribute('playsinline'), v.controls, v.autoplay]),
      arrows: [...document.querySelectorAll('.fervoro-gallery-arrow')].map((a) => getComputedStyle(a).opacity),
      scrollW: track.scrollWidth, clientW: track.clientWidth,
    }
  })
  const cols = w >= 1024 ? 5 : w >= 640 ? 3 : 0
  check(`${tag} white background, no padding / side margins, full browser width`, m.bg === 'rgb(255, 255, 255)' && m.pad === '0px' && m.mrest === '0px,0px,0px' && near(m.x, 0, 0.6) && near(m.right, m.vw, 1) && near(m.w, m.mainW, 0.6), `${m.bg} ${m.pad}`)
  check(`${tag} zero gap: panels touch edge to edge, no column gap`, m.panels.every((p, i) => i === 0 ? near(p[0], 0, 0.6) : near(p[0], m.panels[i - 1][1], 0.6)) && (m.gapCss === 'normal' || m.gapCss === '0px'), JSON.stringify(m.panels.slice(0, 3)))
  check(`${tag} all panels exactly 9:16`, m.panels.every((p) => near(p[2] / p[3], 9 / 16, 0.005)))
  check(`${tag} no extra whitespace: section height == panel height`, near(m.h, m.panels[0][3], 1) && near(m.trackH, m.h, 1), `${m.h} vs ${m.panels[0][3]}`)
  if (cols) check(`${tag} ${cols} panels fill the width exactly`, near(m.panels[0][2] * cols, m.vw, 1.5), `${m.panels[0][2]}`)
  else check(`${tag} phone: large panel (≈72% wide) with the next one peeking`, near(m.panels[0][2] / m.vw, 0.72, 0.01) && m.panels[1][0] < m.vw, `${m.panels[0][2]}`)
  check(`${tag} six local clips, scrollable`, m.n === 6 && m.scrollW > m.clientW, `n=${m.n}`)
  check(`${tag} no heading, caption, number, text or iframe; no YouTube`, m.text === '' || /^(Pause|Play) videos$/i.test(m.text), `"${m.text}"`)
  check(`${tag} no text/iframe leftovers (YouTube, old titles)`, m.headings === 0 && m.iframes === 0 && !/FERVORO IN MOTION|Moving Expression|U\.S\. Polo|YouTube video/i.test(m.page.replace(/YouTube$/gim, '')), '')
  check(`${tag} after Men/Boys, before the collection slider`, m.order === 'fervoro-hero,fervoro-showcase,fervoro-video,fervoro-collections', m.order)
  check(`${tag} approved spacing: --section-gap above and below`, near(m.gapAbove, m.gap, 0.6) && near(m.gapBelow, m.gap, 0.6), `${m.gapAbove} / ${m.gapBelow} vs ${m.gap}`)
  check(`${tag} no horizontal page overflow`, m.docW <= m.vw)
  check(`${tag} object-fit: cover; muted + loop + playsinline, no native controls`, m.fit === 'cover' && m.vattr.every(([mu, lo, pi, co, ap]) => mu && lo && pi && !co && ap), JSON.stringify(m.vattr[0]))
  check(`${tag} arrows hidden initially`, m.arrows.every((o) => o === '0'), m.arrows.join())
  check(`${tag} single page h1 unaffected`, m.h1 === 1)

  // play only what is visible
  await page.evaluate(() => document.querySelector('.fervoro-gallery').scrollIntoView({ block: 'center' }))
  await sleep(3500)
  const pl = await page.evaluate(() => {
    const vr = innerWidth
    return [...document.querySelectorAll('.fervoro-gallery video')].map((v) => {
      const r = v.getBoundingClientRect()
      const vis = Math.min(r.right, vr) - Math.max(r.left, 0)
      return { playing: !v.paused && v.currentTime > 0, mostly: vis / r.width >= 0.5, any: vis > 0, src: v.getAttribute('src') }
    })
  })
  check(`${tag} visible clips play; off-screen clips are paused`, pl.every((v) => (v.mostly ? v.playing : !v.playing)) && pl.some((v) => v.playing), JSON.stringify(pl.map((v) => [v.mostly, v.playing])))
  const used = await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery video')].map((v) => v.getAttribute('src')).filter(Boolean))
  check(`${tag} video sources are local /videos-web files only`, used.length > 0 && used.every((s) => /^\/videos-web\/a\d+-(540|720)\.mp4$/.test(s)), used.join())
  check(`${tag} no external requests`, external.length === 0, external.join(' | '))

  if (touch) {
    const hov = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)
    check(`${tag} touch device: arrows never shown`, !hov && (await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery-arrow')].every((a) => getComputedStyle(a).display === 'none'))))
    const cdp = await ctx.newCDPSession(page)
    const box = await page.locator('.fervoro-gallery-track').boundingBox()
    const before = await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollLeft)
    const y = Math.round(box.y + box.height / 2), x0 = Math.round(box.x + box.width * 0.8)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
    for (let x = x0; x >= x0 - Math.round(box.width * 0.6); x -= 16) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
      await sleep(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(900)
    const after = await page.evaluate(() => ({ s: document.querySelector('.fervoro-gallery-track').scrollLeft, d: document.documentElement.scrollWidth - innerWidth }))
    check(`${tag} touch swipe scrolls the strip, page does not overflow`, after.s > before + 10 && after.d <= 0, `${before} -> ${after.s}`)
  } else {
    await page.mouse.move(w / 2, 10)
    await sleep(100)
    check(`${tag} arrows still hidden when the pointer is elsewhere`, (await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery-arrow')].every((a) => getComputedStyle(a).opacity === '0'))))
    const box = await page.locator('.fervoro-gallery').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await sleep(500)
    const st = await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery-arrow')].map((a) => ({ o: getComputedStyle(a).opacity, v: getComputedStyle(a).visibility, cls: a.className })))
    check(`${tag} on hover: next arrow appears, prev hidden at the start`, st.find((a) => a.cls.includes('is-next')).o === '1' && st.find((a) => a.cls.includes('is-prev')).v === 'hidden', JSON.stringify(st))
    const ab = await page.locator('.fervoro-gallery-arrow.is-next').boundingBox()
    check(`${tag} arrow is overlaid on the videos (inside the strip, no extra space)`, ab.x + ab.width <= box.x + box.width && ab.y >= box.y && ab.y + ab.height <= box.y + box.height && near((await page.evaluate(() => document.querySelector('.fervoro-gallery').getBoundingClientRect().height)), box.height, 0.5))
    const s0 = await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollLeft)
    await page.locator('.fervoro-gallery-arrow.is-next').click()
    await sleep(1000)
    const s1 = await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollLeft)
    const pw = m.panels[0][2]
    check(`${tag} next arrow scrolls by one panel (smooth, snapped)`, near(s1 - s0, pw, 3), `${s0} -> ${s1} (panel ${pw})`)
    await page.mouse.move(w / 2, 5)
    await sleep(500)
    const prevOp = await page.evaluate(() => getComputedStyle(document.querySelector('.fervoro-gallery-arrow.is-prev')).opacity)
    check(`${tag} arrows fade out again after hover`, prevOp === '0', prevOp)
    await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollTo({ left: 0 }))
    await sleep(300)
    await page.keyboard.press('Tab')
    await page.evaluate(() => document.querySelector('.fervoro-gallery-pause').focus())
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await sleep(450)
    const foc = await page.evaluate(() => ({ cls: document.activeElement.className, o: getComputedStyle(document.activeElement).opacity }))
    check(`${tag} keyboard focus reveals the arrow`, foc.cls.includes('fervoro-gallery-arrow') && foc.o === '1', JSON.stringify(foc))
    const box2 = await page.locator('.fervoro-gallery').boundingBox()
    await page.mouse.move(box2.x + 50, box2.y + 50)
    await page.mouse.wheel(600, 0)
    await sleep(700)
    check(`${tag} trackpad horizontal scroll moves the strip`, (await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollLeft)) > 100)
  }
  // click toggles a panel; pause button
  await page.evaluate(() => document.querySelector('.fervoro-gallery-track').scrollTo({ left: 0 }))
  await sleep(800)
  const first = page.locator('.fervoro-gallery-media').first()
  await first.click({ position: { x: 20, y: 200 } }).catch(() => {})
  await sleep(300)
  const pausedAfterTap = await page.evaluate(() => document.querySelector('.fervoro-gallery video').paused)
  check(`${tag} tapping a panel pauses it`, pausedAfterTap === true)
  check(`${tag} no console / network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// reduced motion + data saver + hidden tab (desktop)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.evaluate(() => document.querySelector('.fervoro-gallery').scrollIntoView({ block: 'center' }))
  await sleep(2500)
  check('reduced motion: nothing autoplays (posters only)', await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery video')].every((v) => v.paused)))
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.evaluate(() => document.querySelector('.fervoro-gallery').scrollIntoView({ block: 'center' }))
  await sleep(2500)
  check('hidden tab: playing before', await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery video')].some((v) => !v.paused)))
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  await sleep(500)
  check('hidden tab: every clip pauses', await page.evaluate(() => [...document.querySelectorAll('.fervoro-gallery video')].every((v) => v.paused)))
  await ctx.close()
}
await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ' - ' + f).join('\n'))
  process.exit(1)
}
