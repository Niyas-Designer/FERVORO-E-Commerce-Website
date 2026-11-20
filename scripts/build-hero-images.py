#!/usr/bin/env python3
"""Generate responsive WebP derivatives of the approved hero campaign photograph.

The original `frontend/public/Hero Banner.png` is only READ — never modified or moved.
Output: `frontend/public/images/hero/`
  • hero-{960,1440,1672}.webp   full frame (landscape: desktop / laptop / landscape tablet)
  • hero-portrait-{480,760}.webp  controlled portrait crop of the SAME photograph, framed on the
                                  second model (no new content is created, only cropped) for phones / portrait tablets

Usage: npm run images:hero        Requires: Pillow
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend/public/Hero Banner.png"
OUT = ROOT / "frontend/public/images/hero"
OUT.mkdir(parents=True, exist_ok=True)

# Portrait crop (source pixels): full height, x 700 → 1460 keeps the second model's face, scarf and coat.
PORTRAIT_BOX = (700, 0, 1460, 941)

with Image.open(SRC) as im:
    im = im.convert("RGB")
    assert im.size == (1672, 941), f"unexpected hero size {im.size}"

    for w in (960, 1440, 1672):
        h = round(im.height * w / im.width)
        out = im if w == im.width else im.resize((w, h), Image.LANCZOS)
        out.save(OUT / f"hero-{w}.webp", "WEBP", quality=82, method=6)

    crop = im.crop(PORTRAIT_BOX)
    for w in (480, 760):
        h = round(crop.height * w / crop.width)
        out = crop if w == crop.width else crop.resize((w, h), Image.LANCZOS)
        out.save(OUT / f"hero-portrait-{w}.webp", "WEBP", quality=84, method=6)

for f in sorted(OUT.iterdir()):
    print(f.name, Image.open(f).size, f"{f.stat().st_size // 1024} KB")
