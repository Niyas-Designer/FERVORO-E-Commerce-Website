# FERVORO E-Commerce Website

Full-stack monorepo — **Phase 1: responsive navigation** (desktop mega menu + mobile/tablet accordion-carousel).

| Layer    | Stack |
|----------|-------|
| Frontend | React 19 · JavaScript · Vite · Tailwind CSS v4 (self-hosted Playfair Display + Inter) |
| Backend  | Node.js · Express 5 (`GET /api/health`) |

## Quick start

Requires Node.js ≥ 20.19 (tested on 22).

```bash
npm install          # installs both workspaces from the repo root
npm run dev          # starts API (http://localhost:4000) and web (http://localhost:5173)
```

Other commands (run from the repo root):

| Command | What it does |
|---|---|
| `npm run build` | Production build of the frontend → `frontend/dist` |
| `npm run lint` | ESLint (frontend) |
| `npm test` | Backend tests (`node --test`) |
| `npm run start` | Start the API only (production style) |
| `npm run images` | Regenerate responsive WebP navigation images from the original PNGs (needs Python + Pillow) |
| `npm run test:e2e -w frontend` | Navigation end-to-end checks (needs `npm i -D playwright && npx playwright install chromium`, with `npm run dev` running) |
| `npm run test:e2e:hero -w frontend` | Homepage hero checks (same prerequisites) |
| `npm run test:e2e:footer -w frontend` | Footer checks (same prerequisites) |
| `npm run test:e2e:categories -w frontend` | Men / Boys category section checks (same prerequisites) |
| `npm run test:e2e:motion -w frontend` | Homepage video section checks (same prerequisites) |
| `npm run test:e2e:collections -w frontend` | Collection slider placeholder checks (same prerequisites) |
| `npm run test:e2e:collection-page -w frontend` | Collection landing page (`/collection`) and the hero / Shop Now flow into it (same prerequisites) |
| `npm run test:e2e:sidebar -w frontend` | Listing filter sidebar (desktop) and filter drawer (tablet / mobile) (same prerequisites) |
| `npm run test:e2e:shop -w frontend` | Product listing, product cards, filters / sorting, product detail pages and the navigation into them (same prerequisites) |
| `npm run videos:motion` | Rebuild the web-delivery videos + posters in `public/videos-web/` from the masters in `public/Videos/` (needs ffmpeg + Pillow; `--dry-run`, `--force`, `--src DIR` supported) |
| `npm run images:categories` | Rebuild the responsive WebP derivatives of `public/Mens Banner.png` and `public/Boys Banner.png` |

Health check: `curl http://localhost:4000/api/health` (also reachable through the Vite proxy at `http://localhost:5173/api/health`).

> Port 4000 is used for the API because port 5000 is taken by AirPlay Receiver on macOS.

## Environment

Defaults work with no configuration. To customise, copy the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Only `VITE_*` variables reach the browser — never put secrets in the frontend env.

## Structure

```
FERVORO E-Commerce Website/
├── Fervoro Ecomerce Wedsite/Public/NavBar Prodects Ref Images/   ← ORIGINAL 16 photos (untouched)
├── NavBar & Search Box.jpg, Layouts.ai                            ← original design references (untouched)
├── package.json            npm workspaces + root scripts (dev/build/start/lint/test)
├── scripts/build-nav-images.py     originals → frontend/public/images/nav/*.webp (480w + 900w)
├── backend/
│   ├── src/app.js · server.js      Express app, /api/health, JSON 404, CORS
│   └── test/health.test.js
└── frontend/
    ├── public/images/nav/          optimised WebP derivatives
    ├── e2e/nav.e2e.mjs            Playwright navigation checks
    └── src/
        ├── data/categories.js      ★ single source of truth: categories, subcategories, images, breakpoint
        ├── hooks/                  useMediaQuery · usePageLock (scroll lock + inert)
        ├── components/header/      SiteHeader · DesktopNav (mega menu) · MobileNav (accordion + carousel)
        │                           CategoryCard · Wordmark · UtilityIcons · icons
        └── index.css               design tokens (forest / ivory / serif) + component styles
```

## Image mapping (ImageAsset → subcategory)

1–4 Polo (Core, Pocket, Fashion, Texture) · 5–8 Shirt (Core, Pocket, Fashion, Texture) ·
9–12 T-Shirt (Core, Graphic, Fashion, Texture) · 13–14 Bottom (Core Shorts, Core Jogger) · 15–16 Knit (Knit Shorts, Knit Pants).

## Navigation behaviour

* **≥ 1024px** — dark-green announcement bar, centred wordmark, `MEN` trigger, four utility icons and the mega menu (hover or click; arrow keys; Esc closes).
* **< 1024px** — hamburger (left) · wordmark (exact centre via a `1fr auto 1fr` grid) · Search / Account / Wishlist / Bag (right). The hamburger opens a full-screen panel below the header with a one-at-a-time accordion; each category expands in place into a scroll-snapping image carousel. Esc or the close (✕) control dismisses it; page scroll is locked and `#main` is `inert` while open.

## Men / Boys category section
`frontend/src/components/categories/` + content in `frontend/src/data/categories-showcase.js`, directly below the hero. Two equal
edge-to-edge panels (Men left, Boys right; stacked on phones) built from the original photographs, which are never modified. Men's
Shop Now has no destination yet, so it shows a short preview message instead of navigating (set `href` when a collection page exists).
Boys is "Coming Soon": a non-interactive label with no action.

## Homepage video gallery

Directly below the Men / Boys section (`components/motion/MotionSection.jsx` + `GalleryPanel.jsx`): one continuous, edge-to-edge strip of 9:16 clips on a white band — zero gaps, no outer margins, no headings, captions, numbers or visible controls. Desktop shows 5 panels across, tablet 3, phones one large panel plus a peek of the next; the rest is reached by trackpad / swipe scrolling. Spacing above and below comes from `--section-gap` like every other section. There is no auto-scroll.

- **Videos:** local files only — the six clips in `public/videos-web/` (ids `a8, a4, a7, a21, a22, a23` in `data/motion.js`), derived from the masters `public/Videos/A8, A4, A7, A21, A22, A23.mp4`. No YouTube or other external video. To change the set, edit `MOTION_CLIPS` (`npm run videos:motion` rebuilds the web renditions).
- **Playback:** muted, looping, `playsinline`, no native controls. A clip's file is requested only when it is near the visible area, plays only while on screen and the tab is visible, and pauses otherwise. Reduced-motion / data-saver visitors get still posters until they tap a panel. Tapping a panel pauses / resumes it. Browsers decide whether muted autoplay is allowed; if blocked, the poster stays visible.
- **Navigation:** left / right arrows are overlaid on the videos and appear only while hovering the gallery on desktop (mouse devices) or when they receive keyboard focus; they are never shown on touch devices. A "Pause videos" button is visible only when focused (keyboard / screen-reader users).
- **Parked work**: the approved six-clip portrait carousel is kept in `MotionGallery.jsx` / `MotionSlide.jsx` (not rendered), with its tests in `frontend/e2e/parked/` and its web-delivery videos/posters in `public/videos-web/` (`npm run videos:motion` rebuilds them).

## FERVORO ITALY Collections slider

Below the video: heading "FERVORO Collections", a short description and previous/next buttons (upper right), then a full-bleed horizontal scroll-snap row of five photographic cards — Polo, Shirt, T-Shirt, Bottom, Knit — with a soft dark gradient at the base and a three-level text block lower-left in white: small uppercase label ("FERVORO MENSWEAR"), serif category name and an underlined "SHOP NOW". The next card peeks in (3.3 cards visible on desktop, 2.3 on tablet, 1.15 on phones); swipe or use the arrows. Card gaps and the spacing above/below use `--section-gap`.

- **Photographs**: the approved navigation photoshoot images already in `public/images/nav/` (`core-polo`, `core-shirt`, `fashion-t-shirt`, `core-jogger`, `knit-shorts`; 480/900 px WebP). Cards use their native 900:1192 ratio, so nothing is cropped or distorted. Change a photo by editing its `slug` in `frontend/src/data/collections.js`.
- **Shop Now**: the card's only control (a stretched hit area makes the whole card clickable, so nothing is nested). Each card has `href: null` (no category pages exist yet), so Shop Now is a button that just announces "The collection opens soon." — no dead link or fake page. Set `href` in the same file and it becomes a plain link automatically (`CollectionCard.jsx`). Label/CTA/message text lives in `COLLECTIONS_COPY`.
- **Content**: heading, description and cards are all in `frontend/src/data/collections.js`.

## Footer (Phase 3)
`frontend/src/components/footer/` + content in `frontend/src/data/footer.js`. Four columns on desktop (reference proportions, hairline
separators), two on tablet, accordion groups on phones. Links with `href: null` are planned pages that do not exist yet: they render as
inert, aria-disabled controls (set `href` to activate). Social icons stay inert until official URLs are set in `SOCIAL_LINKS`.
The newsletter form validates the address but is a **preview**: no API exists and no data-handling approach has been approved, so nothing
is sent or stored and the form says so.

## Scope notes

Search, Account, Wishlist and Bag buttons, and the product cards, are presentational in Phase 1 — no cart, search, auth or product pages exist yet. The wordmark is typeset in Playfair Display; swap in the official SVG inside `Wordmark.jsx` when available.

## Collection landing page (`/collection`)

Opened by the hero's **Explore the Collection** and every collection card's **Shop Now** (client-side navigation via the small History-API router in `frontend/src/router/`, no extra dependency; unknown paths still show the homepage).

Page structure: hero (same campaign photo, own headline, no CTA) → short "About FERVORO" intro → one section per category (Polo, Shirt, T-Shirt, Bottom, Knit) with product image, name and price → **View All** per category.

- Content lives in `frontend/src/data/collection-page.js`. Product names/images come from `data/categories.js` (same source as the mega menu).
- Product rows come from the central catalogue (`data/catalog.js`); prices are placeholders or "Price to be confirmed" (see below).
- **View All** has no destination yet: it is a button that announces "<Category> opens soon." Set a section's `href` (e.g. `/collection/polo`) and it becomes a normal link; add the route in `App.jsx`.
- Production hosting must serve `index.html` for unknown paths (SPA fallback), e.g. a Vercel rewrite or Firebase Hosting `rewrites`, otherwise a direct visit to `/collection` returns 404. The Vite dev server already does this.

## Shop: product listing & product pages

Routes (client-side, `frontend/src/router/`): `/shop` (all) · `/shop/:category` (`polo`, `shirt`, `t-shirt`, `bottom`, `knit`; `?style=` sub-category, `?color=`, `?category=` on `/shop`, `?sort=`) · `/product/:slug` (`?color=`). Mega-menu cards open `/shop/<category>?style=<sub-category>`, the mega-menu heading opens `/shop/<category>`, the collection page's **View All** opens `/shop/<category>` and its product cards open `/product/<slug>`.

**Single source of truth: `frontend/src/data/catalog.js`** (navigation, collection page, listings and product pages all read it). It is **prototype data** — the backend has no product API yet (only `/api/health`).

| Data | Status |
|---|---|
| Names, categories, sub-categories | Real (approved structure) |
| Photographs | Real project files in a strict **4-tier priority**: **1 = `public/Important 1/`**, **2 = `public/Important 2/`**, **3 = `public/products/`** (supplement, only products not already represented), **4 = `public/images/nav/`** (AI reference, only where no genuine photograph exists). *Featured* order and every card/gallery follow it. Original files are never renamed, overwritten or moved; web copies are generated into `public/catalog/` |
| Colour | The colourway visible in the photograph (name + swatch chosen from the picture, not from a SKU) |
| Price | The 11 earlier `products/` + reference products carry a **placeholder** (INR, `status: 'preview'`, "Preview price" note). The 62 other products have **no price** (`status: 'pending'`, `amount: null`) and show "Price to be confirmed". No price sort / filter |
| Sizes, size guide, stock, composition, care | **Not provided** (`null`) → explicit "not available yet" states; **Add to Bag stays disabled** until a product has verified purchasable data (`isPurchasable()`) |
| Wishlist | Frontend foundation only (`src/state/wishlist.js`): ids in this browser's `localStorage`, no account / server |

### Asset mapping (4-tier priority)

Catalogue: **73 distinct products** — Polo 51 · Shirt 4 · T-Shirt 12 · Bottom 4 · Knit 2. By primary image tier: **17 Important 1 · 20 Important 2 · 30 `products/` · 6 AI reference**. 819 Important photographs are in use (430 + 389).

- **Important 1** (`Indoor/NN` studio folders + `Outdoor/NN`): each numbered folder is one garment in one colour; every `Outdoor` folder was matched to its `Indoor` garment and merged into the same colourway (20 merges), so there are no duplicate cards. Design families (same style, different colours) are one product with colour swatches.
- **Important 2** (`Core`, `High Fashion`, `core fashion`): `Core` = *Core Polo* (24 colours); the other folders are grouped into 19 fashion polos by design.
- **Duplicates**: `Important 2/Core/19-1` is byte-identical to `Core/23` (6 files, excluded); two product-label photographs are excluded; two zero-byte unreadable files are skipped.
- **Superseded placeholders** (removed because genuine photographs exist for that sub-category): Core / Fashion / Texture Polo, Core / Graphic T-Shirt (`SUPERSEDED_REFERENCE` in `catalog.js`). **Still AI-reference (6)**: Core / Pocket / Fashion / Texture Shirt, Fashion / Texture T-Shirt.
- Gallery order: Front, Side, Back, Detail, Full length, others, Outdoor. Cards show at most 6 photographs per colour (the product page shows all).

Regenerating the web images and `src/data/photo-catalog.js` (needs Python + Pillow; originals are only read):

```bash
python3 frontend/scripts/build-catalog-photos.py --dry-run   # report only
python3 frontend/scripts/build-catalog-photos.py             # writes public/catalog/**, photo-catalog.js, scripts/catalog-report.json
python3 frontend/scripts/build-catalog-photos.py --emit      # data module only (skip image conversion)
```

**Needs your review**: grouping/style codes and the descriptive product names are provisional; Texture vs Fashion classification; colour names and swatch hex values are read from the photographs; the label photographs may carry official names / MRP; `public/products/` imagery looks AI-rendered; prices, sizes, composition and stock are all unset. Production hosting needs an SPA fallback so `/shop/*` and `/product/*` resolve to `index.html`.

The landing page (`/collection`) previews at most 8 products per category (`PREVIEW_LIMIT` in `data/collection-page.js`); **View All** and the `/shop/*` pages show every product. The homepage hero, Men / Boys banners and the homepage video are the owner's approved content and were not replaced; the collections slider covers (Polo, T-Shirt, Bottom, Knit) now use the first Featured product's photograph (Important 1 where available); the Shirt cover stays on the AI reference image.

### Shopping flow: wishlist, bag, header icons

- **Routes:** `/wishlist`, `/bag`, `/search?q=`, `/account` (plus the existing shop routes). Header icons are real links (desktop: search · account · wishlist · bag; mobile header: wishlist · bag, with search / account in the menu). Wishlist and bag icons show a live count badge. Footer "My Account / Wishlist / Shopping Bag" link to the same pages.
- **State:** `state/wishlist.js` and `state/bag.js` are global stores (`useSyncExternalStore`) persisted in this browser's `localStorage`; listing cards, product page, header and the pages stay in sync. There is no account or server yet, so both are per-device.
- **Add to Bag** works on every product (colour = the selected colourway; a size is required only once sizes exist in the data). The bag page supports quantity (max 10) and remove. A subtotal appears only when every line has a verified price; otherwise "Price to be confirmed". **Checkout is disabled** ("Preview only") — no payment, shipping or stock logic exists.
- **Account** is an honest entry page ("sign-in isn't available yet") with links to wishlist / bag — no fake login form.
- **Product page navigation:** a top bar with **Back** (steps back through in-app history, or goes to the category listing when the page was opened directly) and a clickable breadcrumb (Home / Category / Sub-category).
- **Listing cards = one per colourway:** `/shop`, `/shop/:category` and `/search` render every colourway of a product as its own card (`listingCards()` in `data/catalog.js`; Core Polo's 24 colourways = 24 cards, 149 cards for the 73 products), each with that colour's own photographs and a link to the product page on that colour. Cards show no swatches — only a plain "N colours" label (the product's total). With a colour filter only the matching colourways become cards. The wishlist is per product, so all cards of one product share a heart. The product page keeps the colour swatches; the `/collection` landing rows still preview one card per product.
- Tests: `node e2e/shopping.e2e.mjs` (needs `npm run dev`).

### Listing filters: sidebar + drawer

- **Desktop (≥ 1024px):** a sticky left sidebar (240–280px, white, thin vertical divider) beside the product grid. **Below 1024px** (tablet and mobile) the same accordion panel opens from a **Filters** button as a slide-in drawer (modal dialog: focus trap, Esc, scroll lock, Apply · N products / Clear all / Close). Shared component: `components/shop/FilterPanel.jsx`.
- **Sections** (only attributes that exist in the data): **Category** (checkboxes on `/shop`; a link list on `/shop/:category`, keeping the colours that also exist in the target category), **Subcategory** (for the current category, or the single ticked category on `/shop`; multi-select), **Colour** (swatch + name + count, multi-select, only colours present in the current scope). Size, Price and Availability are intentionally absent: sizes and stock are not provided and no price is verified (`price.status` is `pending` / `preview`). Add them when real data exists.
- **State** lives in the URL (`?category=`, `?style=`, `?color=`, comma-separated, plus `?sort=`), so filters survive reload, sharing and Back. Unavailable values are ignored, and switching category reconciles the colours. Filters apply to the one-card-per-colourway listing without regrouping; the count, chips, sorting and 2 / 3 / 4 view controls work together with them.
- Tests: `node e2e/sidebar.e2e.mjs` (needs `npm run dev`).

Not built (out of scope for this phase): cart, checkout, payments, shipping, accounts, a wishlist page.
# FERVORO-E-Commerce-Website
