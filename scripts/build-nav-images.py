#!/usr/bin/env python3
"""Generate responsive WebP derivatives of the approved navigation photographs.

Originals in `Fervoro Ecomerce Wedsite/Public/NavBar Prodects Ref Images/` are only READ,
never modified or moved. Output goes to `frontend/public/images/nav/<slug>-<width>.webp`.

Usage:  npm run images            (or)  python3 scripts/build-nav-images.py [source_dir]
Requires: Pillow
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "Fervoro Ecomerce Wedsite/Public/NavBar Prodects Ref Images"
OUT = ROOT / "frontend/public/images/nav"
WIDTHS = (480, 900)

# ImageAsset N  ->  subcategory slug (mapping verified visually against the approved reference)
MAP = {
    1: "core-polo", 2: "pocket-polo", 3: "fashion-polo", 4: "texture-polo",
    5: "core-shirt", 6: "pocket-shirt", 7: "fashion-shirt", 8: "texture-shirt",
    9: "core-t-shirt", 10: "graphic-t-shirt", 11: "fashion-t-shirt", 12: "texture-t-shirt",
    13: "core-shorts", 14: "core-jogger", 15: "knit-shorts", 16: "knit-pants",
}

OUT.mkdir(parents=True, exist_ok=True)
for n, slug in MAP.items():
    src = SRC / f"ImageAsset {n}@300x.png"
    with Image.open(src) as im:
        im = im.convert("RGB")
        for w in WIDTHS:
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(OUT / f"{slug}-{w}.webp", "WEBP", quality=82, method=6)
    print(f"ImageAsset {n} -> {slug}")
