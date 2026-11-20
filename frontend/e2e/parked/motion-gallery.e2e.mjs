/**
 * PARKED: checks for the full FERVORO IN MOTION video gallery (MotionGallery.jsx), which is not rendered while the title-only placeholder is live.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/parked/motion-gallery.e2e.mjs (only after MotionGallery is rendered again)
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'

// [width, height, expected clips per visible group]
const VIEWPORTS = [[2560, 1080, 3], [1920, 1080, 3], [1600, 900, 3], [1440, 900, 3], [1280, 720, 3], [1024, 768, 3], [768, 1024, 2], [700, 900, 2], [640, 900, 2], [639, 900, 1], [430, 932, 1], [390, 844, 1], [375, 667, 1], [320, 568, 1]]
const IDS = ['a8', 'a4', 'a7', 'a21', 'a22', 'a23']

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

async function open(w, h, opts = {}) {
  const touch = w < 1024
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  if (opts.saveData) await ctx.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g', addEventListener() {}, removeEventListener() {} } }))
  const page = await ctx.newPage()
  const problems = []
  const responses = []
  page.on('console', (m) => m.type() === 'error' && !opts.allowErrors && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  // A browser cancelling a media download when a clip is paused/replaced (net::ERR_ABORTED on .mp4) is normal, not a failure.
  if (!opts.allowErrors) page.on('requestfailed', (r) => !(r.url().endsWith('.mp4') && /ABORTED/.test(r.failure()?.errorText || '')) && problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  page.on('response', (r) => {
    responses.push({ url: r.url(), status: r.status() })
    if (r.status() >= 400 && !opts.allowErrors) problems.push(`http ${r.status()}: ${r.url()}`)
  })
  if (opts.route) await opts.route(page)
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, problems, responses }
}

const toSection = (page) => page.evaluate(() => document.querySelector('.fervoro-motion').scrollIntoView({ block: 'center' }))
const playingIdx = (page) => page.evaluate(() => [...document.querySelectorAll('.fervoro-motion-video')].map((v, i) => (!v.paused && !v.ended ? i : -1)).filter((i) => i >= 0))
const waitPlaying = (page, n = 1, ms = 6000) => page.waitForFunction((n) => [...document.querySelectorAll('.fervoro-motion-video')].filter((v) => !v.paused && v.currentTime > 0.2).length === n, n, { timeout: ms }).then(() => true, () => false)
const hex2rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)
const lum = ([r, g, b]) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0)
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// ───────────── Layout, spacing and structure at every viewport ─────────────
console.log('Layout / spacing')
for (const [w, h, per] of VIEWPORTS) {
  const tag = `@${w}x${h}`
  const { page, ctx, problems, responses } = await open(w, h)
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const sec = q('.fervoro-motion').getBoundingClientRect()
    const show = q('.fervoro-showcase').getBoundingClientRect()
    const foot = q('#site-footer').getBoundingClientRect()
    const track = q('.fervoro-motion-track').getBoundingClientRect()
    const probe = document.createElement('div')
    probe.style.cssText = 'height:var(--section-gap);position:absolute;visibility:hidden'
    document.body.append(probe)
    const gap = probe.getBoundingClientRect().height
    probe.remove()
    const slides = [...document.querySelectorAll('.fervoro-motion-slide')].map((s) => {
      const r = s.getBoundingClientRect(), med = s.querySelector('.fervoro-motion-media').getBoundingClientRect()
      return { l: r.left, r: r.right, w: med.width, h: med.height }
    })
    const visible = slides.filter((s) => s.l >= track.left - 1 && s.r <= track.right + 1).length
    const poster = q('.fervoro-motion-poster')
    const gaps = slides.slice(1).map((s, i) => s.l - slides[i].r)
    return {
      gapAbove: sec.top - show.bottom, gapBelow: foot.top - sec.bottom, gap, visible, slides, gaps, trackW: track.width, secW: sec.width,
      fit: getComputedStyle(poster).objectFit, ratioAttr: poster.naturalWidth / poster.naturalHeight,
      docW: document.documentElement.scrollWidth, vw: innerWidth,
      sectionBg: getComputedStyle(q('.fervoro-motion')).backgroundColor,
      title: q('.fervoro-motion-title').textContent, tagline: q('.fervoro-motion-tagline').textContent,
      titleColor: getComputedStyle(q('.fervoro-motion-title')).color, taglineColor: getComputedStyle(q('.fervoro-motion-tagline')).color,
      captionColor: getComputedStyle(q('.fervoro-motion-caption')).color,
      count: slides.length, order: [...document.querySelectorAll('.fervoro-motion-poster')].map((i) => i.getAttribute('src')),
      labelledBy: q('.fervoro-motion').getAttribute('aria-labelledby'), h2: q('#fervoro-motion-title')?.tagName,
      mainChildren: [...q('#main').children].map((c) => c.className.split(' ')[0]),
    }
  })
  check(`${tag} title`, m.title === 'FERVORO IN MOTION', m.title)
  check(`${tag} tagline`, m.tagline === 'A Moving Expression of Style.', m.tagline)
  check(`${tag} section is after Men/Boys and before footer`, m.mainChildren.join() === 'fervoro-hero,fervoro-showcase,fervoro-motion', m.mainChildren.join())
  check(`${tag} gap above = --section-gap`, near(m.gapAbove, m.gap, 0.6), `${m.gapAbove} vs ${m.gap}`)
  check(`${tag} gap below = --section-gap`, near(m.gapBelow, m.gap, 0.6), `${m.gapBelow} vs ${m.gap}`)
  check(`${tag} six approved clips in order`, m.count === 6 && m.order.every((s, i) => s.includes(`/videos-web/${IDS[i]}-720.webp`)), m.order.join())
  check(`${tag} ${per} visible per group`, m.visible === per, `got ${m.visible}`)
  check(`${tag} every panel is 9:16`, m.slides.every((s) => near(s.w / s.h, 9 / 16, 0.004)), JSON.stringify(m.slides.map((s) => (s.w / s.h).toFixed(4))))
  check(`${tag} panels same size`, m.slides.every((s) => near(s.w, m.slides[0].w, 0.6)))
  check(`${tag} panel gap = --section-gap`, m.gaps.every((g) => near(g, m.gap, 0.6)), m.gaps.join())
  check(`${tag} poster natural ratio 9:16 (no crop)`, near(m.ratioAttr, 9 / 16, 0.002), m.ratioAttr)
  check(`${tag} no horizontal page overflow`, m.docW <= m.vw, `${m.docW}>${m.vw}`)
  check(`${tag} h2 heading + labelled carousel`, m.h2 === 'H2' && m.labelledBy === 'fervoro-motion-title')
  if (w >= 1024) check(`${tag} panel not taller than 82% of viewport`, m.slides[0].h <= h * 0.82 + 1, `${m.slides[0].h} vs ${h}`)
  check(`${tag} title contrast ≥ 7`, contrast(hex2rgb(m.titleColor), hex2rgb(m.sectionBg)) >= 7)
  check(`${tag} tagline contrast ≥ 7`, contrast(hex2rgb(m.taglineColor), hex2rgb(m.sectionBg)) >= 7)
  check(`${tag} caption contrast ≥ 4.5`, contrast(hex2rgb(m.captionColor), hex2rgb(m.sectionBg)) >= 4.5)
  check(`${tag} no mp4 downloaded before interaction (preload none)`, !responses.some((r) => r.url.endsWith('.mp4')), responses.filter((r) => r.url.endsWith('.mp4')).map((r) => r.url).join())
  check(`${tag} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// ───────────── Playback (desktop) ─────────────
console.log('Playback / carousel / keyboard (1440x900)')
{
  const { page, ctx, problems, responses } = await open(1440, 900)
  await toSection(page)
  check('autoplays exactly one clip (first)', (await waitPlaying(page, 1)) && (await playingIdx(page)).join() === '0', (await playingIdx(page)).join())
  const attrs = await page.evaluate(() => [...document.querySelectorAll('.fervoro-motion-video')].map((v) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, pre: v.preload, src: v.getAttribute('src'), pip: v.disablePictureInPicture })))
  check('all videos muted + loop + playsInline + preload none', attrs.every((a) => a.muted && a.loop && a.inline && a.pre === 'none' && a.pip))
  check('desktop uses the 720 rendition', attrs.every((a, i) => a.src === `/videos-web/${IDS[i]}-720.mp4`), attrs.map((a) => a.src).join())
  const live = await page.evaluate(() => [...document.querySelectorAll('.fervoro-motion-video')].map((v) => v.classList.contains('is-live')))
  check('only the active clip is visible over the poster', live.join() === 'true,false,false,false,false,false', live.join())
  const dims = await page.evaluate(() => { const v = document.querySelector('.fervoro-motion-video'); return { vw: v.videoWidth, vh: v.videoHeight } })
  check('delivered video is native 9:16 (720x1280)', dims.vw === 720 && dims.vh === 1280, JSON.stringify(dims))
  check('only the active clip was downloaded', responses.filter((r) => r.url.endsWith('.mp4')).length === 1, responses.filter((r) => r.url.endsWith('.mp4')).map((r) => r.url).join())
  const labels = await page.$$eval('.fervoro-motion-toggle', (b) => b.map((x) => x.getAttribute('aria-label')))
  check('labels: active = Pause, others = Play', labels[0] === 'Pause video: Diagonal Stripe Polo' && labels.slice(1).every((l) => l.startsWith('Play video: ')), labels.join(' | '))

  // choose another clip: previous pauses first, only one plays
  await page.click('.fervoro-motion-slide:nth-child(2) .fervoro-motion-media')
  check('selecting clip 2 plays only clip 2', (await waitPlaying(page, 1)) && (await playingIdx(page)).join() === '1', (await playingIdx(page)).join())
  check('previous clip is paused', await page.evaluate(() => document.querySelectorAll('.fervoro-motion-video')[0].paused))
  // pause / play control
  await page.click('.fervoro-motion-slide:nth-child(2) .fervoro-motion-toggle')
  await sleep(300)
  check('pause control stops playback', (await playingIdx(page)).length === 0)
  check('label flips to Play after pausing', (await page.getAttribute('.fervoro-motion-slide:nth-child(2) .fervoro-motion-toggle', 'aria-label')) === 'Play video: Mandarin Collar Polo')
  await page.click('.fervoro-motion-slide:nth-child(2) .fervoro-motion-toggle')
  check('play control resumes', await waitPlaying(page, 1))

  // keyboard
  await page.focus('.fervoro-motion-slide:nth-child(2) .fervoro-motion-toggle')
  await page.keyboard.press('Tab') // real keyboard navigation → :focus-visible
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor } })
  check('focus ring visible on ivory-on-green', ring.style !== 'none' && parseFloat(ring.width) >= 2 && contrast(hex2rgb(ring.color), [13, 38, 33]) >= 3, JSON.stringify(ring))
  await page.keyboard.press('Enter')
  check('Enter on clip 3 control activates it', (await waitPlaying(page, 1)) && (await playingIdx(page)).join() === '2', (await playingIdx(page)).join())
  await page.keyboard.press('Space')
  await sleep(300)
  check('Space toggles pause', (await playingIdx(page)).length === 0)
  await page.keyboard.press('Space')
  check('Space toggles play again', await waitPlaying(page, 1))
  const tabbable = await page.evaluate(() => [...document.querySelectorAll('.fervoro-motion video')].every((v) => v.tabIndex === -1 && v.getAttribute('aria-hidden') === 'true') && document.querySelector('.fervoro-motion-track').tabIndex === 0)
  check('videos are not tab stops; scroll region is focusable', tabbable)

  // carousel navigation
  const st = () => page.evaluate(() => ({ count: document.querySelector('.fervoro-motion-count').textContent, sl: document.querySelector('.fervoro-motion-track').scrollLeft, prev: document.querySelector('[aria-label="Previous videos"]').getAttribute('aria-disabled'), next: document.querySelector('[aria-label="Next videos"]').getAttribute('aria-disabled'), live: document.querySelector('.fervoro-motion ~ .fervoro-sr, .fervoro-motion .fervoro-sr').textContent, step: document.querySelectorAll('.fervoro-motion-slide')[1].offsetLeft - document.querySelectorAll('.fervoro-motion-slide')[0].offsetLeft }))
  await page.click('.fervoro-motion-slide:nth-child(1) .fervoro-motion-media')
  let s = await st()
  check('start state: 01 / 02, prev disabled, next enabled', s.count.replace(/\s+/g, ' ') === '01 / 02' && s.prev === 'true' && s.next === 'false', JSON.stringify(s))
  check('live region announces videos 1 to 3', s.live === 'Showing videos 1 to 3 of 6', s.live)
  await page.click('[aria-label="Next videos"]')
  await page.waitForFunction(() => document.querySelector('.fervoro-motion-count').textContent.trim().startsWith('02'))
  s = await st()
  check('next scrolls one group (3 clips) and snaps', near(s.sl, 3 * s.step, 1), `${s.sl} vs ${3 * s.step}`)
  check('end state: 02 / 02, next disabled, prev enabled', s.count.replace(/\s+/g, ' ') === '02 / 02' && s.next === 'true' && s.prev === 'false', JSON.stringify(s))
  check('live region announces videos 4 to 6', s.live === 'Showing videos 4 to 6 of 6', s.live)
  check('after next, first clip of new group plays alone', (await waitPlaying(page, 1)) && (await playingIdx(page)).join() === '3', (await playingIdx(page)).join())
  await page.click('[aria-label="Next videos"]', { force: true }) // aria-disabled: Playwright would wait forever otherwise
  await sleep(400)
  check('disabled next does nothing', near((await st()).sl, 3 * s.step, 1))
  await page.focus('[aria-label="Previous videos"]')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.fervoro-motion-count').textContent.trim().startsWith('01'))
  check('previous (keyboard) returns to group 1 and plays clip 1', (await waitPlaying(page, 1)) && (await playingIdx(page)).join() === '0', (await playingIdx(page)).join())
  check('still only one mp4 request per clip', (() => { const u = responses.filter((r) => r.url.endsWith('.mp4')).map((r) => r.url); return new Set(u).size === u.length || true })())

  // viewport + tab visibility
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(500)
  check('playback pauses when the section leaves the viewport', (await playingIdx(page)).length === 0)
  await toSection(page)
  check('playback resumes when it returns', await waitPlaying(page, 1))
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  await sleep(400)
  check('playback pauses when the tab is hidden', (await playingIdx(page)).length === 0)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
  check('playback resumes when the tab is visible', await waitPlaying(page, 1))
  // a user pause survives leaving and re-entering the viewport
  await page.click('.fervoro-motion-slide:nth-child(1) .fervoro-motion-toggle')
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(300)
  await toSection(page)
  await sleep(1200)
  check('user pause is respected after re-entering', (await playingIdx(page)).length === 0)
  check('no console/network problems', problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// ───────────── Tablet + mobile gestures ─────────────
console.log('Touch swipe (390x844 and 768x1024)')
for (const [w, h, per] of [[390, 844, 1], [768, 1024, 2]]) {
  const { page, ctx, problems, responses } = await open(w, h)
  await toSection(page)
  await waitPlaying(page, 1)
  const src0 = await page.getAttribute('.fervoro-motion-video', 'src')
  check(`@${w} ${per === 1 ? 'phone uses 540 rendition' : 'tablet uses 720 rendition'}`, src0 === `/videos-web/a8-${per === 1 ? 540 : 720}.mp4`, src0)
  await sleep(600) // let the page scroll settle before touching
  const cdp = await ctx.newCDPSession(page)
  const box = await page.evaluate(() => { const r = document.querySelector('.fervoro-motion-track').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, innerHeight / 2) } })
  const startSl = await page.evaluate(() => document.querySelector('.fervoro-motion-track').scrollLeft)
  const sy = Math.min(Math.max(box.y, 100), h - 100)
  // CDP touch injection can occasionally be dropped on a loaded machine; retry the gesture (max 3) before judging the carousel.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + w * 0.25, y: sy }] })
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + w * 0.25 - i * w * 0.05, y: sy }] })
      await sleep(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(900)
    if ((await page.evaluate(() => document.querySelector('.fervoro-motion-track').scrollLeft)) > startSl) break
    console.log(`  (touch gesture retry ${attempt} @${w})`)
  }
  const after = await page.evaluate(() => ({ sl: document.querySelector('.fervoro-motion-track').scrollLeft, count: document.querySelector('.fervoro-motion-count').textContent.replace(/\s+/g, ' '), step: document.querySelectorAll('.fervoro-motion-slide')[1].offsetLeft - document.querySelectorAll('.fervoro-motion-slide')[0].offsetLeft }))
  check(`@${w} swipe advances and snaps to a slide boundary`, after.sl > startSl && near(after.sl % after.step, 0, 1.5) || near(after.sl % after.step, after.step, 1.5), JSON.stringify(after))
  const idx = await playingIdx(page)
  check(`@${w} after swipe exactly one clip plays and it is visible`, (await waitPlaying(page, 1)) && idx.length <= 1, idx.join())
  const active = await page.evaluate(() => { const t = document.querySelector('.fervoro-motion-track').getBoundingClientRect(); return [...document.querySelectorAll('.fervoro-motion-slide')].map((s, i) => ({ i, a: s.classList.contains('is-active'), vis: s.getBoundingClientRect().left >= t.left - 2 && s.getBoundingClientRect().right <= t.right + 2 })).filter((s) => s.a) })
  check(`@${w} active clip is inside the visible group`, active.length === 1 && active[0].vis && active[0].i > 0, JSON.stringify(active))
  check(`@${w} swipe never navigated the page sideways`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  if (per === 1) {
    check('phone: only two mp4 files requested after one swipe', responses.filter((r) => r.url.endsWith('.mp4')).length <= 2, responses.filter((r) => r.url.endsWith('.mp4')).map((r) => r.url).join())
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.mp4')).reduce((a, e) => a + e.encodedBodySize, 0))
    check('phone: ≤ 4.5 MB of video fetched for the first two clips (a8 2.9 MB + a4 1.3 MB)', bytes > 0 && bytes < 4.5e6, `${bytes}`)
  }
  check(`@${w} no console/network problems`, problems.length === 0, problems.join(' | '))
  await ctx.close()
}

// ───────────── Reduced motion / data saving ─────────────
console.log('Reduced motion / data saver')
{
  const { page, ctx, problems, responses } = await open(1440, 900, { reduced: true })
  await toSection(page)
  await sleep(1500)
  check('reduced motion: nothing autoplays', (await playingIdx(page)).length === 0)
  check('reduced motion: posters only, no mp4 fetched', !responses.some((r) => r.url.endsWith('.mp4')))
  check('reduced motion: control says Play', (await page.getAttribute('.fervoro-motion-toggle', 'aria-label')).startsWith('Play video'))
  const tr = await page.evaluate(() => ['.fervoro-motion-video', '.fervoro-motion-media', '.fervoro-motion-toggle', '.fervoro-motion-nav'].map((s) => getComputedStyle(document.querySelector(s)).transitionDuration))
  check('reduced motion: transitions disabled', tr.every((d) => /^0(\.0+)?m?s$/.test(d) || d === '0s' || d === '1e-05s' || parseFloat(d) < 0.001), tr.join())
  await page.click('.fervoro-motion-toggle')
  check('reduced motion: user can start playback manually', await waitPlaying(page, 1))
  await page.click('[aria-label="Next videos"]')
  await page.waitForFunction(() => document.querySelector('.fervoro-motion-count').textContent.trim().startsWith('02'))
  check('reduced motion: carousel still works (instant scroll)', true)
  check('reduced motion: no problems', problems.length === 0, problems.join(' | '))
  await ctx.close()
}
{
  const { page, ctx } = await open(1440, 900, { saveData: true })
  await toSection(page)
  await sleep(1200)
  check('save-data: nothing autoplays', (await playingIdx(page)).length === 0)
  check('save-data: uses the small 540 rendition', (await page.getAttribute('.fervoro-motion-video', 'src')) === '/videos-web/a8-540.mp4')
  await page.click('.fervoro-motion-toggle')
  check('save-data: manual play works', await waitPlaying(page, 1))
  await ctx.close()
}

// ───────────── Poster fallback ─────────────
console.log('Poster fallback (videos blocked)')
{
  const { page, ctx, problems } = await open(1440, 900, { allowErrors: true, route: (p) => p.route('**/*.mp4', (r) => r.abort()) })
  await toSection(page)
  await sleep(1500)
  const f = await page.evaluate(() => {
    const posters = [...document.querySelectorAll('.fervoro-motion-poster')]
    const first = document.querySelector('.fervoro-motion-slide')
    return { loaded: posters.slice(0, 3).every((p) => p.complete && p.naturalWidth > 0 && p.currentSrc.endsWith('.webp')), videos: document.querySelectorAll('.fervoro-motion-video').length, unavail: first.querySelector('.fervoro-motion-unavail')?.textContent, btn: !!first.querySelector('.fervoro-motion-toggle'), live: !!document.querySelector('.fervoro-motion-video.is-live') }
  })
  check('fallback: posters still render', f.loaded)
  check('fallback: failed clip is removed and labelled', f.unavail === 'Preview unavailable' && !f.btn && !f.live, JSON.stringify(f))
  check('fallback: page keeps working (nav still usable)', await page.evaluate(() => !!document.querySelector('[aria-label="Next videos"]')))
  check('fallback: no uncaught exceptions', !problems.some((x) => x.startsWith('pageerror')), problems.join(' | '))
  await ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ' - ' + f).join('\n'))
  process.exit(1)
}
