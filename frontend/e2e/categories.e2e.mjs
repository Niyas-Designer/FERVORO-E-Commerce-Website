/**
 * End-to-end checks for the homepage Men / Boys category section.
 * Prerequisites: `npm run dev` running and Playwright (see nav.e2e.mjs). Run: node e2e/categories.e2e.mjs
 */
import { createRequire } from 'node:module'
import process from 'node:process'

const { chromium } = createRequire(import.meta.url)('playwright')
const BASE = process.env.BASE_URL || 'http://localhost:5173/'

// [width, height]
const VIEWPORTS = [[2560, 1080], [1920, 1080], [1600, 900], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [700, 900], [640, 900], [639, 900], [430, 932], [390, 844], [375, 667], [320, 568]]
// Head + hair boxes in the 1122×1402 originals: [x0, y0, x1, y1]
const FACE = { men: [365, 35, 655, 400], boys: [370, 85, 700, 440] }
const TEXT = {
  men: { label: 'FERVORO MENSWEAR', heading: "The Men's Collection", desc: 'Refined essentials for the modern gentleman.', action: 'SHOP NOW' },
  boys: { label: 'FERVORO BOYS', heading: "The Boys' Collection", desc: 'A new generation of timeless style.', action: 'COMING SOON' },
}

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

async function open(w, h) {
  const touch = w < 1024
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const problems = []
  const responses = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => !/\.mp4$/.test(r.url()) && problems.push(`requestfailed: ${r.url()}`))
  page.on('response', (r) => { responses.push({ url: r.url(), status: r.status() }); if (r.status() >= 400 && !/\.mp4$/.test(r.url())) problems.push(`http ${r.status()}: ${r.url()}`) })
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { page, ctx, problems, responses }
}

const measure = (page) =>
  page.evaluate(() => {
    const rel = (el, panel) => { const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect(); return { l: r.left - p.left, r: r.right - p.left, t: r.top - p.top, b: r.bottom - p.top, w: r.width, h: r.height } }
    const section = document.querySelector('.fervoro-showcase').getBoundingClientRect()
    const hero = document.querySelector('.fervoro-hero').getBoundingClientRect()
    const panels = [...document.querySelectorAll('.fervoro-showcase-panel')].map((p) => {
      const r = p.getBoundingClientRect()
      const img = p.querySelector('img')
      const ic = img.getBoundingClientRect()
      const cs = getComputedStyle(img)
      const q = (s) => p.querySelector(s)
      const action = q('.fervoro-showcase-cta, .fervoro-showcase-status')
      return {
        id: p.dataset.panel, status: p.dataset.status, l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height,
        img: { nw: img.naturalWidth, nh: img.naturalHeight, complete: img.complete, src: img.currentSrc, fit: cs.objectFit, pos: cs.objectPosition, w: ic.width, h: ic.height, l: ic.left - r.left, t: ic.top - r.top },
        label: rel(q('.fervoro-showcase-label'), p), heading: rel(q('.fervoro-showcase-title'), p), desc: rel(q('.fervoro-showcase-desc'), p), action: rel(action, p), row: rel(q('.fervoro-showcase-action'), p),
        text: { label: q('.fervoro-showcase-label').textContent, labelTT: getComputedStyle(q('.fervoro-showcase-label')).textTransform, heading: q('.fervoro-showcase-title').textContent, desc: q('.fervoro-showcase-desc').textContent, action: action.textContent, actionTT: getComputedStyle(action).textTransform, actionTag: action.tagName },
        fonts: { heading: getComputedStyle(q('.fervoro-showcase-title')).fontFamily, headingSize: parseFloat(getComputedStyle(q('.fervoro-showcase-title')).fontSize) },
      }
    })
    return { sectionTop: section.top + scrollY, sectionW: section.width, sectionL: section.left, heroBottom: hero.bottom + scrollY, panels, ow: document.documentElement.scrollWidth - innerWidth }
  })

for (const [w, h] of VIEWPORTS) {
  console.log(`showcase @ ${w}×${h}`)
  const { page, ctx, problems, responses } = await open(w, h)
  await page.locator('.fervoro-showcase').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const m = await measure(page)
  const [men, boys] = m.panels
  const two = w >= 640

  const tokenGap = await page.evaluate(() => { const d = document.createElement('div'); d.style.width = 'var(--section-gap)'; document.body.append(d); const v = d.getBoundingClientRect().width; d.remove(); return v })
  check(`${w}: section sits below the hero (one standard gap), full width`, near(m.sectionTop, m.heroBottom + tokenGap, 1) && near(m.sectionL, 0, 0.5) && near(m.sectionW, w, 0.5), `${m.sectionTop} vs ${m.heroBottom} + ${tokenGap}`)
  check(`${w}: no horizontal overflow`, m.ow <= 0, String(m.ow))
  check(`${w}: Men first, Boys second`, men.id === 'men' && boys.id === 'boys')
  if (two) {
    check(`${w}: Men LEFT, Boys RIGHT, same row`, men.l < boys.l && near(men.t, boys.t, 1) && near(men.l, 0, 0.5) && near(boys.r, w, 0.5))
    check(`${w}: panels exactly equal in width and height`, near(men.w, boys.w, 0.5) && near(men.h, boys.h, 0.5), `${men.w}×${men.h} vs ${boys.w}×${boys.h}`)
    const gap = boys.l - men.r
    check(`${w}: narrow divider (${gap.toFixed(1)}px)`, gap >= 7.5 && gap <= 21.5)
  } else {
    check(`${w}: stacked full width, Men above Boys, equal size`, near(men.w, w, 0.5) && near(boys.w, w, 0.5) && boys.t > men.b - 0.5 && boys.t - men.b <= 9 && near(men.h, boys.h, 0.5))
  }
  const expectedH = w >= 1024 ? Math.min(Math.max(480, 0.45 * w), 1100) : men.w * 1.25
  check(`${w}: panel height follows the design (${Math.round(expectedH)}px)`, near(men.h, expectedH, 1.5), String(men.h))

  for (const p of m.panels) {
    const T = TEXT[p.id]
    const tag = `${w}/${p.id}`
    // ── imagery ─────────────────────────────────────────────────────────────
    check(`${tag}: image loaded (natural ${p.img.nw}×${p.img.nh})`, p.img.complete && p.img.nw > 0 && p.img.nh > 0)
    check(`${tag}: served the WebP derivative`, /\/images\/categories\/(men|boys)-\d+\.webp$/.test(p.img.src), p.img.src)
    check(`${tag}: image fills the panel, object-fit cover (no distortion)`, p.img.fit === 'cover' && near(p.img.w, p.w, 0.5) && near(p.img.h, p.h, 0.5) && near(p.img.l, 0, 0.5) && near(p.img.t, 0, 0.5))
    // faces: map the source box through object-fit: cover + object-position (50% 2%)
    const s = Math.max(p.w / 1122, p.h / 1402)
    const dw = 1122 * s, dh = 1402 * s
    const ox = (p.w - dw) * 0.5, oy = (p.h - dh) * 0.02
    const fb = FACE[p.id], face = { l: fb[0] * s + ox, t: fb[1] * s + oy, r: fb[2] * s + ox, b: fb[3] * s + oy }
    check(`${tag}: whole head visible (not cropped)`, face.l >= 0 && face.t >= 0 && face.r <= p.w && face.b <= p.h, JSON.stringify(face))
    check(`${tag}: image never upscaled by more than ${Math.round((s - 1) * 100)}% beyond native resolution`, s <= 1.6, String(s))
    // ── copy ────────────────────────────────────────────────────────────────
    check(`${tag}: label "${T.label}"`, p.text.label.toUpperCase() === T.label && p.text.labelTT === 'uppercase', p.text.label)
    check(`${tag}: heading "${T.heading}" in serif`, p.text.heading === T.heading && /Playfair|serif/.test(p.fonts.heading))
    check(`${tag}: description`, p.text.desc === T.desc, p.text.desc)
    check(`${tag}: action "${T.action}" (uppercase)`, p.text.action.toUpperCase() === T.action && p.text.actionTT === 'uppercase', p.text.action)
    // ── composition ─────────────────────────────────────────────────────────
    const items = [p.label, p.heading, p.desc, p.action]
    check(`${tag}: text in the lower-left, left edges aligned`, items.every((i) => near(i.l, p.label.l, 1.5)) && p.label.l >= 18 && p.label.l <= p.w * 0.12 && p.label.t > p.h * 0.45)
    check(`${tag}: stacked in order, no overlap`, items.every((it, i) => i === 0 || it.t >= items[i - 1].b - 1), JSON.stringify(items.map((i) => [Math.round(i.t), Math.round(i.b)])))
    check(`${tag}: text inside the panel with padding`, items.every((i) => i.r <= p.w - 16 && i.b <= p.h - 20), `${Math.max(...items.map((i) => i.r))} / ${p.w}`)
    check(`${tag}: text starts below the head (does not cover the face)`, p.label.t > face.b + 6, `${p.label.t} vs ${face.b}`)
  }
  // identical text rhythm in both panels
  const gapsOf = (p) => [p.heading.t - p.label.b, p.desc.t - p.heading.b, p.row.t - p.desc.b].map((x) => Math.round(x))
  check(`${w}: same vertical spacing between label / heading / description / action in both panels`, gapsOf(men).every((g, i) => near(g, gapsOf(boys)[i], 1.5)), `${gapsOf(men)} vs ${gapsOf(boys)}`)
  check(`${w}: same left padding and heading size in both panels`, near(men.label.l, boys.label.l, 1) && near(men.fonts.headingSize, boys.fonts.headingSize, 0.1))
  if (two) check(`${w}: text blocks share the same baselines across the two panels`, near(men.heading.t, boys.heading.t, 2) && near(men.row.t, boys.row.t, 1) && near(men.action.b, boys.action.b, 1.5) && near(men.label.t, boys.label.t, 2), `${men.heading.t} vs ${boys.heading.t}`)

  // ── legibility: white text against the *actual rendered photo + gradient* (text hidden while sampling) ──
  for (const p of m.panels) {
    const panelEl = page.locator(`.fervoro-showcase-panel[data-panel="${p.id}"]`)
    await panelEl.evaluate((el) => el.querySelector('.fervoro-showcase-content').style.setProperty('visibility', 'hidden'))
    const shot = (await panelEl.screenshot()).toString('base64')
    await panelEl.evaluate((el) => el.querySelector('.fervoro-showcase-content').style.removeProperty('visibility'))
    const res = await page.evaluate(async ({ shot, boxes }) => {
      const img = new Image(); img.src = `data:image/png;base64,${shot}`; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
      const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
      return Object.fromEntries(Object.entries(boxes).map(([k, b]) => {
        const x = Math.max(0, Math.floor(b.l)), y = Math.max(0, Math.floor(b.t)), w = Math.max(1, Math.min(img.width - x, Math.ceil(b.w))), h = Math.max(1, Math.min(img.height - y, Math.ceil(b.h)))
        const d = ctx.getImageData(x, y, w, h).data; const L = []
        for (let i = 0; i < d.length; i += 4) L.push(lum(d[i], d[i + 1], d[i + 2]))
        L.sort((a, b) => a - b)
        const p90 = L[Math.floor(L.length * 0.9)]
        return [k, 1.05 / (p90 + 0.05)]
      }))
    }, { shot, boxes: { label: p.label, heading: p.heading, desc: p.desc, action: p.action } })
    check(`${w}/${p.id}: contrast vs white text — label ${res.label.toFixed(1)}, heading ${res.heading.toFixed(1)}, description ${res.desc.toFixed(1)}, action ${res.action.toFixed(1)} (small text ≥ 4.5, heading ≥ 3)`,
      res.label >= 4.5 && res.desc >= 4.5 && res.action >= 4.5 && res.heading >= 3)
  }

  // ── behaviour: Men CTA is honest, Boys has no action ─────────────────────
  const anchors = await page.$$eval('.fervoro-showcase a', (els) => els.length)
  check(`${w}: no links in the section (no destination page exists yet)`, anchors === 0)
  const menCta = page.locator('.fervoro-showcase-panel[data-panel="men"] .fervoro-showcase-cta')
  const boysPanel = page.locator('.fervoro-showcase-panel[data-panel="boys"]')
  check(`${w}: Men CTA is a real button`, men.text.actionTag === 'BUTTON' && (await menCta.getAttribute('href')) === null)
  const url0 = page.url()
  const hBefore = (await measure(page)).panels[0].h
  const before = await measure(page)
  await menCta.click()
  const note = page.locator('#showcase-men-note')
  check(`${w}: Shop Now shows the preview message, no navigation, no fake page`, (await note.textContent()).includes('opens soon') && page.url() === url0 && (await page.locator('.fervoro-showcase-panel[data-panel="men"] .fervoro-showcase-note').getAttribute('role')) === 'status')
  const after = await measure(page)
  check(`${w}: preview message causes no layout shift`, after.panels.every((p, i) => near(p.h, before.panels[i].h, 0.5) && near(p.action.t, before.panels[i].action.t, 0.5) && near(p.heading.t, before.panels[i].heading.t, 0.5)) && near(hBefore, after.panels[0].h, 0.5))
  const noteBox = await note.evaluate((e) => { const r = e.getBoundingClientRect(), p = e.closest('.fervoro-showcase-panel').getBoundingClientRect(); return r.bottom <= p.bottom - 4 && r.right <= p.right })
  check(`${w}: preview message stays inside the panel`, noteBox)
  check(`${w}: Boys has no link, button or focusable control`, (await boysPanel.locator('a, button, input, select, textarea, [tabindex], [role="button"], [role="link"]').count()) === 0)
  const st = await boysPanel.locator('.fervoro-showcase-status').evaluate((e) => { const cs = getComputedStyle(e); return { cursor: cs.cursor, tag: e.tagName, border: cs.borderTopWidth, under: cs.textDecorationLine } })
  const cta = await menCta.evaluate((e) => { const cs = getComputedStyle(e); return { cursor: cs.cursor, border: cs.borderBottomWidth, borderTop: cs.borderTopWidth } })
  check(`${w}: Coming Soon is a static label, visually distinct from Shop Now`, st.tag === 'P' && st.cursor === 'default' && st.border === '1px' && cta.borderTop === '0px' && cta.cursor === 'pointer' && cta.border === '1px')
  await boysPanel.locator('.fervoro-showcase-status').click({ force: true })
  check(`${w}: clicking Coming Soon does nothing`, page.url() === url0)
  check(`${w}: no console / network errors`, problems.length === 0, problems.join(' | '))
  check(`${w}: both originals still deliverable (fallback src exists)`, (await page.$$eval('.fervoro-showcase-img', (els) => els.map((e) => e.getAttribute('src')))).join() === '/Mens%20Banner.png,/Boys%20Banner.png')
  await ctx.close()
}

/* ───────────── standard section spacing (one token, horizontal + vertical) ───────────── */
{
  console.log('section spacing token')
  for (const [w, h] of [[2560, 1080], [1920, 1080], [1600, 900], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [700, 900], [640, 900], [639, 900], [430, 932], [390, 844], [375, 667], [320, 568]]) {
    const { page, ctx } = await open(w, h)
    const r = await page.evaluate(() => {
      const px = (v) => { const d = document.createElement('div'); d.style.width = v; document.body.append(d); const x = d.getBoundingClientRect().width; d.remove(); return x }
      const top = (e) => e.getBoundingClientRect().top + scrollY, bot = (e) => e.getBoundingClientRect().bottom + scrollY
      const hero = document.querySelector('.fervoro-hero'), sec = document.querySelector('.fervoro-showcase'), main = document.getElementById('main'), foot = document.querySelector('.fervoro-video')
      const [a, b] = [...document.querySelectorAll('.fervoro-showcase-panel')]
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      const stacked = Math.abs(ra.left - rb.left) < 1
      const panelGap = stacked ? rb.top - ra.bottom : rb.left - ra.right
      const sample = (x, y) => { const e = document.elementFromPoint(x, y); return e ? [e.tagName, e.className.toString().split(' ')[0], getComputedStyle(e).backgroundColor] : null }
      const midX = innerWidth / 2
      return {
        token: px('var(--section-gap)'), tokenRaw: getComputedStyle(document.documentElement).getPropertyValue('--section-gap').trim(),
        panelGap, stacked, heroGap: top(sec) - bot(hero), bottomGap: top(foot) - bot(sec), mainPad: parseFloat(getComputedStyle(main).paddingBottom),
        mainBg: getComputedStyle(main).backgroundColor, secBg: getComputedStyle(sec).backgroundColor,
        vis: { gapY: [innerHeight, 0], secBottom: bot(sec), heroBottom: bot(hero) },
        decor: [hero, sec, main].map((e) => { const cs = getComputedStyle(e); return [cs.borderTopWidth, cs.borderBottomWidth, cs.boxShadow, cs.outlineStyle] }),
        divider: stacked ? [midX, (ra.bottom + rb.top) / 2] : [(ra.right + rb.left) / 2, ra.top + ra.height / 2],
        mainKids: [...main.children].map((c) => c.className.split(' ')[0]),
        rule: [...main.children].slice(1).map((c) => parseFloat(getComputedStyle(c).marginTop)),
      }
    })
    check(`${w}: token --section-gap defined (${r.tokenRaw}) = ${r.token.toFixed(1)}px`, r.token >= 8 && r.token <= 21.01 && /clamp/.test(r.tokenRaw))
    check(`${w}: panel divider = token (${r.panelGap.toFixed(1)}px)`, near(r.panelGap, r.token, 0.6))
    check(`${w}: hero → section gap = same token (${r.heroGap.toFixed(1)}px)`, near(r.heroGap, r.token, 0.6))
    check(`${w}: section → next section gap = same token (${r.bottomGap.toFixed(1)}px)`, near(r.bottomGap, r.token, 0.6), `${r.bottomGap} / pad ${r.mainPad}`)
    check(`${w}: all three gaps identical`, near(r.panelGap, r.heroGap, 0.6) && near(r.heroGap, r.bottomGap, 0.6))
    check(`${w}: gaps are clean white (main + section background #fff)`, r.mainBg === 'rgb(255, 255, 255)' && r.secBg === 'rgb(255, 255, 255)')
    check(`${w}: no borders / shadows / outlines added around the gaps`, r.decor.every((d) => d[0] === '0px' && d[1] === '0px' && d[2] === 'none' && d[3] === 'none'), JSON.stringify(r.decor))
    check(`${w}: future sections inherit the rule (every later child gets margin-top = token)`, r.rule.every((m) => near(m, r.token, 0.05)), JSON.stringify(r.rule))
    // pixel check: the actual rendered gap strips are pure white
    const strips = await page.evaluate(() => {
      const hero = document.querySelector('.fervoro-hero'), sec = document.querySelector('.fervoro-showcase'), foot = document.querySelector('.fervoro-video')
      const [a, b] = [...document.querySelectorAll('.fervoro-showcase-panel')]
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), stacked = Math.abs(ra.left - rb.left) < 1
      return { heroB: hero.getBoundingClientRect().bottom + scrollY, secT: sec.getBoundingClientRect().top + scrollY, secB: sec.getBoundingClientRect().bottom + scrollY, footT: foot.getBoundingClientRect().top + scrollY, stacked,
        div: stacked ? { y: ra.bottom + scrollY, h: rb.top - ra.bottom } : { x: ra.right, w: rb.left - ra.right, y: ra.top + scrollY, h: ra.height } }
    })
    const readStrip = async (y0, y1) => {
      await page.evaluate((y) => scrollTo(0, y), Math.max(0, y0 - 300)); await page.waitForTimeout(250) // keep the strip well clear of the sticky header
      const vy = y0 - (await page.evaluate(() => scrollY))
      const buf = await page.screenshot({ clip: { x: 0, y: Math.max(0, vy), width: w, height: Math.max(1, Math.round(y1 - y0)) } })
      return page.evaluate(async (b64) => { const i = new Image(); i.src = `data:image/png;base64,${b64}`; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let bad = 0; for (let k = 0; k < d.length; k += 4) if (d[k] < 254 || d[k + 1] < 254 || d[k + 2] < 254) bad++; return { px: d.length / 4, bad } }, buf.toString('base64'))
    }
    const hs = await readStrip(Math.ceil(strips.heroB), Math.floor(strips.secT)) // whole pixel rows strictly inside the gap
    check(`${w}: hero → section strip is pure white (${hs.px} px sampled)`, hs.px > 0 && hs.bad === 0, `${hs.bad} non-white`)
    const fs = await readStrip(Math.ceil(strips.secB), Math.floor(strips.footT))
    check(`${w}: section → next section strip is pure white (${fs.px} px sampled)`, fs.px > 0 && fs.bad === 0, `${fs.bad} non-white`)
    await ctx.close()
  }
}

/* ───────────── fallback originals are really there and untouched ───────────── */
{
  console.log('originals + assets')
  const { page, ctx } = await open(1440, 900)
  for (const [name, bytes] of [['Mens%20Banner.png', 2445537], ['Boys%20Banner.png', 2508914]]) {
    const r = await page.request.get(`${BASE}${name}`)
    const body = await r.body()
    check(`original ${decodeURIComponent(name)} served unmodified (${bytes} bytes)`, r.status() === 200 && body.length === bytes, `${r.status()} ${body.length}`)
  }
  for (const slug of ['men', 'boys']) for (const wd of [480, 760, 1122]) {
    const r = await page.request.get(`${BASE}images/categories/${slug}-${wd}.webp`)
    check(`derivative ${slug}-${wd}.webp served (200, image/webp)`, r.status() === 200 && (r.headers()['content-type'] || '').includes('webp'))
  }
  await ctx.close()
}

/* ───────────── lazy loading, keyboard, interplay with approved sections ───────────── */
{
  console.log('loading / keyboard / approved sections')
  const { page, ctx, responses } = await open(1440, 900)
  check('below-the-fold images are lazy (not fetched until near the viewport)', (await page.$$eval('.fervoro-showcase-img', (e) => e.every((i) => i.loading === 'lazy'))) )
  check('hero is still eager and first', await page.$eval('.fervoro-hero-img', (i) => i.loading === 'eager'))
  await page.locator('.fervoro-showcase').scrollIntoViewIfNeeded()
  await page.locator('.fervoro-showcase-cta').focus()
  const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return [cs.outlineStyle, parseFloat(cs.outlineWidth)] })
  check('Shop Now has a visible focus ring', ring[0] !== 'none' && ring[1] >= 2, ring.join())
  await page.keyboard.press('Enter')
  check('Shop Now works from the keyboard (message announced)', (await page.locator('#showcase-men-note').textContent()).includes('opens soon'))
  // tab order: Shop Now is the only control in the section; the next stop is the gallery's (focus-only) pause button, then its arrow, then the collection slider
  await page.keyboard.press('Tab')
  check('Tab leaves the section to the video gallery (its pause button), not to a Boys control', await page.evaluate(() => !!document.activeElement.closest('.fervoro-gallery')))
  for (let n = 0; n < 4 && !(await page.evaluate(() => !!document.activeElement.closest('.fervoro-collections'))); n++) await page.keyboard.press('Tab')
  check('Tab then reaches the collection slider', await page.evaluate(() => !!document.activeElement.closest('.fervoro-collections')))
  const r = await page.evaluate(() => ({ h1: document.querySelectorAll('h1').length, h2: [...document.querySelectorAll('.fervoro-showcase h2')].map((h) => h.textContent), landmark: document.querySelector('.fervoro-showcase').getAttribute('aria-label'), sections: [...document.getElementById('main').children].map((c) => c.className.split(' ')[0]) }))
  check('single h1 (hero); two h2 headings for the panels; labelled region', r.h1 === 1 && r.h2.join('|') === "The Men's Collection|The Boys' Collection" && r.landmark === 'Shop by category')
  check('main contains hero, Men/Boys, the homepage video and the collection slider only (no extra sections)', r.sections.join() === 'fervoro-hero,fervoro-showcase,fervoro-video,fervoro-collections', r.sections.join())
  await ctx.close()

  // mobile menu open → section is inert behind the overlay (it lives in #main)
  const m = await open(390, 844)
  await m.page.locator('.fervoro-burger').tap()
  check('mobile menu open: new section unreachable (inert)', await m.page.evaluate(() => document.getElementById('main').inert))
  await m.ctx.close()
}

await browser.close()
console.log(`\n${passed} checks passed, ${failures.length} failed`)
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'))
  process.exit(1)
}
