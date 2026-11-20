#!/usr/bin/env python3
"""
Build the photograph catalogue from the original shoot folders (originals are only READ, never changed):

  public/Important 1/{Indoor,Outdoor}/<n>/*.JPG      tier 1  (highest priority)
  public/Important 2/{Core,High Fashion,core fashion}/<n>/*.jpg   tier 2

Outputs
  public/catalog/<set>/<folder>/<nn>.webp (+ <nn>-sm.webp)   web derivatives (full ≤1200×1600, small = half size)
  src/data/photo-catalog.js                                  generated data module consumed by src/data/catalog.js
  scripts/catalog-report.json                                counts / exclusions for the integration report

Usage (needs Pillow with WebP):  python3 scripts/build-catalog-photos.py [--dry-run]
  Large runs can be split:  --shard=0/8 … --shard=7/8 (convert only), then  --emit  (swatches + data module).
Each numbered source folder = ONE garment in ONE colour. Folders are grouped into products (design families) below.
View codes per file (in sorted order): F front · T side / three-quarter · B back · D close-up detail · L full length ·
A alternate / styled · O outdoor lifestyle · X excluded (product-label photograph).
"""
import json, os, sys
from multiprocessing import Pool
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
FE = os.path.dirname(HERE)
PUB = os.path.join(FE, 'public')
OUT = os.path.join(PUB, 'catalog')
DRY = '--dry-run' in sys.argv
EMIT_ONLY = '--emit' in sys.argv  # derivatives already exist: only sample swatch colours + write the data module
SHARD = next((tuple(int(x) for x in a.split('=')[1].split('/')) for a in sys.argv if a.startswith('--shard=')), None)  # --shard=i/N converts every N-th image only

# ───────────────────────── view codes per source folder ─────────────────────────
I1_IN = {
 1: 'FATBDALLLL', 2: 'TFABADAAAL', 3: 'TFTBADDALA', 4: 'XFTTBDDLLLL', 5: 'FATBDDLAAA', 6: 'TAFDDAAALL',
 7: 'FATBDDALLA', 8: 'XFTTBDDLLLL', 9: 'FATBDDLLLA', 10: 'FATDABLAAA', 11: 'AAAAFTTDDB', 12: 'FABTDALLL',
 13: 'FAAFBDDALLAA', 14: 'ATFBDDAAAA', 15: 'FTTBDDLLLL', 16: 'FTTBBDDLLA', 17: 'ATTBDFAAAA', 18: 'TAFBDDLLAL',
 19: 'TFBDDALLL', 20: 'TFTBDDALLL', 21: 'FATBDDAALL', 22: 'FATBDDAAAA', 23: 'FATBDDAAAA', 24: 'FATBDDAALL',
 25: 'FATBDDAALL', 26: 'FATBDDLLAL', 27: 'FATBDDAAAA', 28: 'FATBDDAAAA', 29: 'FATBDDLLLL', 30: 'TFBTDDAALL',
 31: 'FATBDDLLLL', 32: 'FATDTBLLAA', 33: 'AALTFTTDDB',
}
I1_OUT_TO_IN = {1: 31, 2: 24, 3: 30, 4: 25, 5: 22, 6: 21, 7: 28, 8: 32, 9: 9, 10: 33, 11: 29, 12: 10, 13: 17, 14: 19, 15: 20, 16: 11, 17: 18, 18: 26, 19: 27, 20: 23}
DEF = 'BFTDLA'
I2_CORE = {n: DEF for n in range(1, 25)}
I2_CORE.update({3: 'TBFDL', 7: 'BFTDL', 8: 'LAFTD', 9: 'BLDFTA', 13: 'FBTDLA', 14: 'BFTLA', 15: 'TDLF', 16: 'ABFTDL', 19: 'ALFTDB'})
I2_HF = {n: DEF for n in range(1, 17)}
I2_HF.update({15: 'LAFTDB'})
I2_CF = {n: DEF for n in range(1, 27)}
I2_CF.update({1: 'LAFTDB', 3: 'BFTDAL', 5: 'BFTDA', 7: 'LAFTDB', 21: 'BFTDAL', 26: 'FBTDLA'})
EXCLUDED_DUPLICATE_FOLDERS = {('Important 2', 'Core', '19-1'): 'byte-identical copy of Important 2/Core/23'}

# ───────────────────────── products ─────────────────────────
# variant = (name, colour family, [source folders], optional hex override)
def I1(n): return ('Important 1', 'Indoor', str(n))
def O1(n): return ('Important 1', 'Outdoor', str(n))
def I1o(n, out): return [I1(n), O1(out)]
def C(n): return [('Important 2', 'Core', str(n))]
def H(n): return [('Important 2', 'High Fashion', str(n))]
def K(n): return [('Important 2', 'core fashion', str(n))]

P = []
def prod(slug, name, cat, sub, tier, order, desc, variants, review=None):
    P.append(dict(slug=slug, name=name, category=cat, sub=sub, tier=tier, order=order, description=desc, review=review, variants=variants))

# ── Important 1 (tier 1) ──
prod('embossed-crest-polo', 'Embossed Crest Polo', 'polo', 'texture', 1, 1,
     'A short-sleeve polo with a classic collar, a button placket and a tone-on-tone embossed crest on the chest.',
     [('Black', 'black', [I1(1)]), ('Charcoal', 'grey', [I1(5)]), ('Dark Red', 'red', [I1(6)]), ('Red', 'red', [I1(7)]), ('Royal Blue', 'blue', [I1(28)] + [O1(7)])],
     'Five colourways grouped as one product because the collar, placket and tonal embossed crest are identical; confirm they share a style code. Filed under Texture Polo (tonal embossed detail).')
prod('mandarin-collar-polo', 'Mandarin Collar Polo', 'polo', 'core', 1, 2,
     'A short-sleeve polo with a mandarin (band) collar, a button placket and a small shield emblem on the chest.',
     [('Navy', 'navy', [I1(2)]), ('Brick Red', 'red', [I1(3)]), ('Bottle Green', 'green', [I1(4)]), ('Light Grey Melange', 'grey', [I1(8)]), ('Aqua Green', 'green', I1o(18, 17)), ('Black', 'black', I1o(25, 4))],
     'Six colourways grouped by identical collar, placket and emblem. The product-label photographs in Indoor/4 and Indoor/8 were left out of the galleries; they may carry the official product name and MRP — please confirm.')
prod('crest-block-polo', 'Crest Block Polo', 'polo', 'fashion', 1, 9,
     'A short-sleeve polo with a colour-blocked chest in contrasting panels and an embroidered crest.',
     [('Red / Navy / Ivory', 'red', I1o(9, 9)), ('Charcoal / Mustard / Ivory', 'grey', I1o(10, 12))])
prod('diagonal-block-polo', 'Diagonal Block Polo', 'polo', 'fashion', 1, 11,
     'A short-sleeve polo with a bold diagonal colour block, a contrast collar and an embroidered crest.',
     [('Red / Ivory / Navy', 'red', I1o(11, 16)), ('Rose / Ivory / Navy', 'pink', I1o(17, 13))])
prod('classic-white-polo', 'Classic White Polo', 'polo', 'core', 1, 12,
     'A plain short-sleeve polo with a classic collar and a button placket.',
     [('White', 'white', [I1(12)])])
prod('v-neck-t-shirt', 'V-Neck T-Shirt', 't-shirt', 'core', 1, 13,
     'A plain short-sleeve t-shirt with a V-neck.',
     [('White', 'white', [I1(13)])])
prod('crew-neck-t-shirt', 'Crew Neck T-Shirt', 't-shirt', 'core', 1, 14,
     'A plain short-sleeve t-shirt with a crew neck.',
     [('White', 'white', [I1(14)])])
prod('core-shorts-white', 'Core Shorts — White', 'bottom', 'shorts', 1, 15,
     'Plain drawstring shorts with an elasticated waistband and side pockets.',
     [('White', 'white', [I1(15)])],
     'Kept separate from the existing beige "Core Shorts": no proof both are the same style. Merge them as colourways if they share a style code.')
prod('core-jogger-white', 'Core Jogger — White', 'bottom', 'jogger', 1, 16,
     'Plain drawstring joggers with side pockets and tapered, ribbed cuffs.',
     [('White', 'white', [I1(16)])],
     'Kept separate from the existing beige "Core Jogger": the beige pair carries a small chest-height emblem that this pair does not. Merge if they share a style code.')
prod('sleeve-stripe-polo', 'Sleeve Stripe Polo', 'polo', 'fashion', 1, 19,
     'A short-sleeve polo with a contrast collar, striped sleeve bands and crossed-mallet embroidery on the chest.',
     [('Aqua Green', 'green', I1o(19, 14)), ('Charcoal', 'grey', I1o(24, 2))])
prod('number-8-crest-polo', 'Number 8 Crest Polo', 'polo', 'fashion', 1, 20,
     'A short-sleeve polo with a large number-8 graphic, an embroidered crest and striped sleeve bands.',
     [('Coral', 'red', I1o(20, 15))])
prod('authentic-tonal-polo', 'Authentic Tonal Polo', 'polo', 'texture', 1, 21,
     'A short-sleeve polo with a tone-on-tone "Authentic" print and crest across the chest.',
     [('Navy', 'navy', I1o(21, 6))],
     'Filed under Texture Polo (tone-on-tone print); move to Fashion Polo if you prefer.')
prod('rugby-polo', 'Rugby Polo', 'polo', 'fashion', 1, 22,
     'A short-sleeve polo with a contrast collar, a "Rugby" chest print, a crest patch and a sleeve numeral.',
     [('Bottle Green', 'green', I1o(22, 5))])
prod('rugby-league-band-polo', 'Rugby League Band Polo', 'polo', 'fashion', 1, 23,
     'A short-sleeve polo with a wide contrast chest band, a "Rugby League" print and an embroidered crest.',
     [('Black / Ivory / Charcoal', 'black', I1o(23, 20)), ('Grey / Ivory / Black', 'grey', I1o(31, 1))])
prod('polo-league-polo', 'Polo League Polo', 'polo', 'fashion', 1, 26,
     'A short-sleeve polo with contrast shoulder panels, a "Polo League" chest print and crossed-mallet embroidery.',
     [('Red / Royal Blue', 'red', I1o(26, 18)), ('Black / Ivory', 'black', I1o(30, 3))])
prod('vertical-split-polo', 'Vertical Split Polo', 'polo', 'fashion', 1, 27,
     'A short-sleeve polo with a vertical colour split, a contrast stripe and an embroidered crest.',
     [('Black / Charcoal', 'black', I1o(27, 19)), ('Red / Navy', 'red', I1o(29, 11))])
prod('sash-polo', 'Sash Polo', 'polo', 'fashion', 1, 32,
     'A short-sleeve polo with a diagonal sash stripe across the chest, a contrast collar and an embroidered crest.',
     [('Bottle Green', 'green', I1o(32, 8)), ('Butter Yellow', 'yellow', I1o(33, 10))])

# ── Important 2 (tier 2) ──
CORE_COLOURS = {1: ('Light Grey Melange', 'grey'), 2: ('White', 'white'), 3: ('Beige', 'beige'), 4: ('Sky Blue', 'blue'), 5: ('Coral', 'red'), 6: ('Red', 'red'),
    7: ('Cobalt Blue', 'blue'), 8: ('Rose Pink', 'pink'), 9: ('Sage Green', 'green'), 10: ('Navy', 'navy'), 11: ('Maroon', 'red'), 12: ('Grey Melange', 'grey'),
    13: ('Marigold', 'yellow'), 14: ('Mustard', 'yellow'), 15: ('Teal', 'blue'), 16: ('Raspberry', 'red'), 17: ('Charcoal Melange', 'grey'), 18: ('Brown', 'brown'),
    19: ('Rust Red', 'red'), 20: ('Navy Melange', 'navy'), 21: ('Black', 'black'), 22: ('Bottle Green', 'green'), 23: ('Ecru', 'white'), 24: ('Mint', 'green')}
prod('core-polo', 'Core Polo', 'polo', 'core', 2, 100,
     'A short-sleeve polo with a classic collar, a two-button placket and a small shield emblem on the chest.',
     [(CORE_COLOURS[n][0], CORE_COLOURS[n][1], C(n)) for n in range(1, 25)],
     'Twenty-three colourways grouped as one product (same collar, placket and emblem). Core/19-1 is a byte-identical copy of Core/23 and was excluded. Core/1 vs Core/12 and Core/2 vs Core/23 are the same shoot in different shades (kept as separate colours).')
prod('est-1982-band-polo', 'Est. 1982 Band Polo', 'polo', 'fashion', 2, 110.01,
     'A short-sleeve polo with an "Est. 1982" chest print over a contrast band.',
     [('Navy / Red / White', 'navy', H(1)), ('Sky Blue / Navy / White', 'blue', H(4))])
prod('tri-block-emblem-polo', 'Tri-Block Emblem Polo', 'polo', 'fashion', 2, 110.02,
     'A short-sleeve polo in three colour blocks with a number-8 graphic and a polo-club emblem.',
     [('Sky Blue / Ivory / Navy', 'blue', H(2)), ('Rose / Navy / Grey', 'pink', H(3)), ('Coral / Ivory / Navy', 'red', H(9))])
prod('authentic-team-sports-polo', 'Authentic Team Sports Polo', 'polo', 'fashion', 2, 110.05,
     'A short-sleeve polo with an "Authentic" chest print, a team-sports mark and a contrast placket.',
     [('Mint', 'green', H(5))])
prod('diagonal-crest-polo', 'Diagonal Crest Polo', 'polo', 'fashion', 2, 110.06,
     'A short-sleeve polo with a diagonal colour block and a large embroidered crest on the chest.',
     [('Navy / Red / Ecru', 'navy', H(6)), ('Navy / Red / Grey', 'navy', H(8)), ('Maroon / Ivory', 'red', H(12)), ('Black / Ivory', 'black', H(16))],
     'Four colourways grouped by the shared diagonal block and crest; the two navy/red versions differ only in the third panel (ecru vs grey).')
prod('crest-band-polo', 'Crest Band Polo', 'polo', 'fashion', 2, 110.07,
     'A short-sleeve polo with a navy chest band, contrast sleeves and a round embroidered crest.',
     [('Ivory / Navy', 'white', H(7))])
prod('chest-panel-crest-polo', 'Chest Panel Crest Polo', 'polo', 'fashion', 2, 110.1,
     'A short-sleeve polo with a navy chest panel and a small embroidered emblem.',
     [('Mint / Navy', 'green', H(10))])
prod('striped-panel-crest-polo', 'Striped Panel Crest Polo', 'polo', 'fashion', 2, 110.11,
     'A short-sleeve polo with a navy chest panel, a white stripe and an embroidered crest.',
     [('Red / Navy', 'red', H(11)), ('Bottle Green / Navy', 'green', H(13))])
prod('authentic-sports-polo', 'Authentic Sports Polo', 'polo', 'fashion', 2, 110.14,
     'A short-sleeve polo with a navy chest band and a striped chest badge.',
     [('Maroon / Navy', 'red', H(14)), ('Bottle Green / Navy', 'green', H(15))])
prod('crest-tipped-polo', 'Crest Tipped Polo', 'polo', 'fashion', 2, 120.01,
     'A short-sleeve polo with a tipped collar and sleeve cuffs and an embroidered crest on the chest.',
     [('Coral', 'red', K(1)), ('Sky Blue', 'blue', K(2)), ('Rose', 'pink', K(4)), ('Mint', 'green', K(6)), ('Pale Blue', 'blue', K(8)), ('Cream', 'beige', K(17))])
prod('sleeve-band-crest-polo', 'Sleeve Band Crest Polo', 'polo', 'fashion', 2, 120.03,
     'A short-sleeve polo with contrast bands on the sleeves and an embroidered crest on the chest.',
     [('Grey Melange', 'grey', K(3)), ('Red', 'red', K(14)), ('Navy', 'navy', K(22)), ('Charcoal', 'grey', K(23))])
prod('number-8-stripe-polo', 'Number 8 Stripe Polo', 'polo', 'fashion', 2, 120.05,
     'A short-sleeve polo with a number-8 graphic on the chest and striped sleeve bands.',
     [('Light Grey', 'grey', K(5)), ('Silver Grey', 'grey', K(12)), ('Marigold', 'yellow', K(15))])
prod('side-panel-crest-polo', 'Side Panel Crest Polo', 'polo', 'fashion', 2, 120.07,
     'A short-sleeve polo with contrast side panels and an embroidered crest on the chest.',
     [('Marigold', 'yellow', K(7)), ('Charcoal / Mustard', 'grey', K(25))])
prod('shoulder-block-crest-polo', 'Shoulder Block Crest Polo', 'polo', 'fashion', 2, 120.09,
     'A short-sleeve polo with a contrast shoulder yoke and an embroidered crest on the chest.',
     [('Rose / Light Grey', 'pink', K(9))])
prod('number-8-shoulder-polo', 'Number 8 Shoulder Polo', 'polo', 'fashion', 2, 120.1,
     'A short-sleeve polo with a number-8 graphic, navy shoulder panels and striped collar tipping.',
     [('Ivory / Navy', 'white', K(10))])
prod('equestrian-crest-polo', 'Equestrian Crest Polo', 'polo', 'fashion', 2, 120.11,
     'A short-sleeve polo with an embroidered equestrian crest on the chest.',
     [('Red', 'red', K(11)), ('Brown', 'brown', K(13))])
prod('shield-crest-polo', 'Shield Crest Polo', 'polo', 'fashion', 2, 120.16,
     'A short-sleeve polo with an embroidered shield crest on the chest and a sleeve patch.',
     [('Black', 'black', K(16)), ('Bottle Green', 'green', K(21)), ('Maroon', 'red', K(26))])
prod('contrast-sleeve-crest-polo', 'Contrast Sleeve Crest Polo', 'polo', 'fashion', 2, 120.18,
     'A short-sleeve polo with contrast cobalt sleeves, striped collar tipping and an embroidered crest.',
     [('Navy / Cobalt', 'navy', K(18))])
prod('chest-band-polo', 'Chest Band Polo', 'polo', 'fashion', 2, 120.19,
     'A short-sleeve polo with a charcoal chest band and a small round emblem.',
     [('Black / Charcoal', 'black', K(19))])
prod('laurel-crest-polo', 'Laurel Crest Polo', 'polo', 'fashion', 2, 120.2,
     'A short-sleeve polo with an embroidered laurel crest on the chest and a sleeve patch.',
     [('Rust Red', 'red', K(20)), ('Navy Melange', 'navy', K(24))])


# Swatch colours: representative garment colour, chosen from the photographs (auto-sampling is only the fallback because
# studio backgrounds tint white garments). Colour-blocked designs show their dominant / body tone.
HEX = {
 ('mandarin-collar-polo', 'Brick Red'): '#a81a1f', ('mandarin-collar-polo', 'Bottle Green'): '#14523d', ('mandarin-collar-polo', 'Aqua Green'): '#4fd1b4',
 ('diagonal-block-polo', 'Red / Ivory / Navy'): '#b8202c', ('diagonal-block-polo', 'Rose / Ivory / Navy'): '#cfa3a3',
 ('classic-white-polo', 'White'): '#f1f0ec', ('v-neck-t-shirt', 'White'): '#f1f0ec', ('crew-neck-t-shirt', 'White'): '#f1f0ec',
 ('core-shorts-white', 'White'): '#f1f0ec', ('core-jogger-white', 'White'): '#f1f0ec',
 ('sleeve-stripe-polo', 'Aqua Green'): '#4fd1b4', ('rugby-polo', 'Bottle Green'): '#14523d',
 ('vertical-split-polo', 'Red / Navy'): '#c4202d', ('sash-polo', 'Bottle Green'): '#14523d', ('sash-polo', 'Butter Yellow'): '#f1e0a0',
 ('core-polo', 'Light Grey Melange'): '#d6d7d5', ('core-polo', 'White'): '#f2f2f0', ('core-polo', 'Sky Blue'): '#a9d5ea', ('core-polo', 'Cobalt Blue'): '#3f5aa6',
 ('core-polo', 'Rose Pink'): '#d98f92', ('core-polo', 'Sage Green'): '#a1ac72', ('core-polo', 'Navy'): '#1d2238', ('core-polo', 'Maroon'): '#5a1620',
 ('core-polo', 'Marigold'): '#f2b73f', ('core-polo', 'Mustard'): '#c9a84e', ('core-polo', 'Raspberry'): '#c4314f', ('core-polo', 'Navy Melange'): '#3a4160',
 ('core-polo', 'Bottle Green'): '#14452f', ('core-polo', 'Mint'): '#a8dcd0',
 ('est-1982-band-polo', 'Navy / Red / White'): '#1c2038', ('tri-block-emblem-polo', 'Sky Blue / Ivory / Navy'): '#a9c4e6', ('tri-block-emblem-polo', 'Rose / Navy / Grey'): '#cfa8a6',
 ('authentic-team-sports-polo', 'Mint'): '#a8dcd0', ('diagonal-crest-polo', 'Navy / Red / Ecru'): '#b3202b', ('diagonal-crest-polo', 'Navy / Red / Grey'): '#1c2038',
 ('diagonal-crest-polo', 'Maroon / Ivory'): '#5a1620', ('diagonal-crest-polo', 'Black / Ivory'): '#18181b', ('crest-band-polo', 'Ivory / Navy'): '#f1eee0',
 ('chest-panel-crest-polo', 'Mint / Navy'): '#a8dcd0', ('striped-panel-crest-polo', 'Red / Navy'): '#c4202d', ('striped-panel-crest-polo', 'Bottle Green / Navy'): '#14523d',
 ('authentic-sports-polo', 'Maroon / Navy'): '#5a1620', ('authentic-sports-polo', 'Bottle Green / Navy'): '#14523d',
 ('crest-tipped-polo', 'Sky Blue'): '#a9d5ea', ('crest-tipped-polo', 'Mint'): '#a8dcd0', ('crest-tipped-polo', 'Pale Blue'): '#b4c8ea',
 ('sleeve-band-crest-polo', 'Navy'): '#1d2238', ('number-8-stripe-polo', 'Light Grey'): '#d0d1d3', ('number-8-stripe-polo', 'Silver Grey'): '#cfd0d2', ('number-8-stripe-polo', 'Marigold'): '#f2b73f',
 ('side-panel-crest-polo', 'Marigold'): '#f2b73f', ('shoulder-block-crest-polo', 'Rose / Light Grey'): '#d6a7a6', ('number-8-shoulder-polo', 'Ivory / Navy'): '#f1eee0',
 ('equestrian-crest-polo', 'Red'): '#c8283a', ('shield-crest-polo', 'Bottle Green'): '#14452f', ('contrast-sleeve-crest-polo', 'Navy / Cobalt'): '#1d2238',
 ('laurel-crest-polo', 'Navy Melange'): '#3a4160',
}

# ───────────────────────── helpers ─────────────────────────
def code_of(f):
    s, kind, n = f
    if s == 'Important 1': return 'i1/%s-%02d' % ('in' if kind == 'Indoor' else 'out', int(n))
    return 'i2/%s-%02d' % ({'Core': 'core', 'High Fashion': 'hf', 'core fashion': 'cf'}[kind], int(n))

def views_of(f):
    s, kind, n = f
    if s == 'Important 1': return I1_IN[int(n)] if kind == 'Indoor' else None
    return {'Core': I2_CORE, 'High Fashion': I2_HF, 'core fashion': I2_CF}[kind][int(n)]

def list_files(f):
    d = os.path.join(PUB, *f)
    out, bad = [], []
    for name in sorted(os.listdir(d)):
        if name.startswith('.') or os.path.splitext(name)[1].lower() not in ('.jpg', '.jpeg', '.png'): continue
        p = os.path.join(d, name)
        try:
            with Image.open(p) as im: im.load()
            out.append(p)
        except Exception as e:  # zero-byte / corrupt
            bad.append((os.path.relpath(p, PUB), type(e).__name__))
    return out, bad

def fit(w, h):
    s = min(1600 / max(w, h), 1200 / min(w, h), 1.0)
    return max(1, round(w * s)), max(1, round(h * s))

def convert(job):
    src, dst, w, h = job
    try:
        im = Image.open(src)
        im.draft('RGB', (w * 2, h * 2)) if src.lower().endswith(('.jpg', '.jpeg')) else None
        im = ImageOps.exif_transpose(im).convert('RGB')
        full = im.resize((w, h), Image.LANCZOS)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        full.save(dst + '.webp', 'WEBP', quality=80, method=4)
        sm = full.resize((max(1, round(w / 2)), max(1, round(h / 2))), Image.LANCZOS)
        sm.save(dst + '-sm.webp', 'WEBP', quality=78, method=4)
        return dst, None
    except Exception as e:
        return dst, repr(e)

def median_hex(path, box):
    import statistics
    im = Image.open(path).convert('RGB'); W, H = im.size
    c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    px = [p for p in (c.get_flattened_data() if hasattr(c, 'get_flattened_data') else c.getdata()) if not (min(p) > 238) and not (max(p) - min(p) < 6 and min(p) > 225)]
    if not px: px = list(c.get_flattened_data() if hasattr(c, 'get_flattened_data') else c.getdata())
    m = [int(statistics.median(ch)) for ch in zip(*px)]
    return '#%02x%02x%02x' % tuple(m)

ORDER_LABEL = {'F': 'Front', 'T': 'Side', 'B': 'Back', 'D': 'Detail', 'L': 'Full length', 'A': 'Styled', 'O': 'Outdoor'}

def main():
    report = dict(folders={}, excluded=[], unreadable=[], duplicate_folders=[], jobs=0)
    for k, why in EXCLUDED_DUPLICATE_FOLDERS.items(): report['duplicate_folders'].append(['/'.join(k), why])
    jobs, used_codes, seen = [], set(), set()
    out_products = []
    for pr in P:
        variants = []
        for (vname, fam, folders, *rest) in pr['variants']:
            imgs = []
            front_for_hex = detail_for_hex = None
            ordered = []
            for f in folders:
                files, bad = list_files(f)
                for b in bad:
                    if b not in report['unreadable']: report['unreadable'].append(b)
                if code_of(f) in seen: raise SystemExit('folder used twice: %s' % (f,))
                seen.add(code_of(f))
                vs = views_of(f)
                if vs is None: vs = 'O' * len(files)
                assert len(vs) == len(files), (f, len(vs), len(files))
                report['folders'][code_of(f)] = dict(src='/'.join(f), files=len(files), product=pr['slug'], colour=vname)
                items = []
                for i, (p, v) in enumerate(zip(files, vs)):
                    if v == 'X':
                        report['excluded'].append([os.path.relpath(p, PUB), 'product-label photograph']); continue
                    with Image.open(p) as im: im = ImageOps.exif_transpose(im); w0, h0 = im.size
                    w, h = fit(w0, h0)
                    items.append((i, v, p, '%s/%02d' % (code_of(f), i), w, h))
                # first F/T/D/L and every B are canonical; later F become 'Styled'
                first = {}
                labelled = []
                for it in items:
                    i, v, p, name, w, h = it
                    canon = v
                    if v in 'FTDL':
                        if v in first and v == 'F': canon = 'A'
                        first.setdefault(v, name)
                    labelled.append((i, canon, v, p, name, w, h))
                ordered.append(labelled)
            # gallery order: indoor/studio first (F, T, B, D, L, rest), outdoor after
            gallery = []
            for labelled in ordered:
                rank = {'F': 0, 'T': 1, 'B': 2, 'D': 3, 'L': 4}
                seen_first = {}
                def key(t):
                    i, canon, v, p, name, w, h = t
                    if canon == 'A' or canon == 'O': return (9, i)
                    if v in 'TDLB' and v in seen_first: pass
                    return (rank.get(canon, 9), i)
                gallery += sorted(labelled, key=key)
            imgs = []
            for (i, canon, v, p, name, w, h) in gallery:
                jobs.append((p, os.path.join(OUT, name), w, h))
                imgs.append([name, ORDER_LABEL[canon], w, h])
                if canon == 'F' and front_for_hex is None: front_for_hex = name
                if canon == 'D' and detail_for_hex is None: detail_for_hex = name
            variants.append(dict(name=vname, family=fam, hexSource=(detail_for_hex, front_for_hex), images=imgs, sources=['/'.join(f) for f in folders]))
        out_products.append(dict(pr, variants=variants))
    report['jobs'] = len(jobs)
    if DRY:
        print(json.dumps(dict(products=len(out_products), images=len(jobs), unreadable=report['unreadable'], excluded=report['excluded']), indent=1)); return
    os.makedirs(OUT, exist_ok=True)
    failed = []
    todo = [] if EMIT_ONLY else ([j for n, j in enumerate(jobs) if n % SHARD[1] == SHARD[0]] if SHARD else jobs)
    with Pool(4) as pool:
        for n, (dst, err) in enumerate(pool.imap_unordered(convert, todo, chunksize=4), 1):
            if err: failed.append((dst, err))
            if n % 50 == 0: print('converted', n, '/', len(todo), flush=True)
    if failed: raise SystemExit('FAILED: %r' % failed[:5])
    if SHARD:
        print('SHARD DONE', SHARD, len(todo)); return
    missing = [j[1] for j in jobs if not (os.path.exists(j[1] + '.webp') and os.path.exists(j[1] + '-sm.webp'))]
    if missing: raise SystemExit('missing derivatives: %d (e.g. %s)' % (len(missing), missing[:2]))
    # swatch colours sampled from the photographs (close-up preferred)
    for pr in out_products:
        for v in pr['variants']:
            d, f = v.pop('hexSource')
            if (pr['slug'], v['name']) in HEX: v['hex'] = HEX[(pr['slug'], v['name'])]
            elif d: v['hex'] = median_hex(os.path.join(OUT, d + '-sm.webp'), (0.25, 0.55, 0.75, 0.95))
            elif f: v['hex'] = median_hex(os.path.join(OUT, f + '-sm.webp'), (0.4, 0.42, 0.6, 0.55))
            else: v['hex'] = '#888888'
    js = ['/* GENERATED by scripts/build-catalog-photos.py — do not edit by hand. */',
          '/* Photograph catalogue: Important 1 (tier 1) and Important 2 (tier 2). Image tuple: [file, view, width, height]. */',
          'export const PHOTO_PRODUCTS = ' + json.dumps(out_products, ensure_ascii=False, indent=1) + '\n']
    open(os.path.join(FE, 'src', 'data', 'photo-catalog.js'), 'w').write('\n'.join(js))
    json.dump(report, open(os.path.join(HERE, 'catalog-report.json'), 'w'), indent=1)
    print('DONE products=%d images=%d' % (len(out_products), len(jobs)))

if __name__ == '__main__':
    main()
