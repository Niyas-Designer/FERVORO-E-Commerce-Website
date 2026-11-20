#!/usr/bin/env python3
"""Responsive WebP derivatives for the homepage Men's / Boys' category panels.

Reads the originals (never modified, still referenced as the <img> fallback):
  frontend/public/Mens Banner.png   (1122×1402)
  frontend/public/Boys Banner.png   (1122×1402)
Writes frontend/public/images/categories/{men,boys}-{480,760,1122}.webp (same aspect ratio, no cropping).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "frontend" / "public"
OUT = ROOT / "images" / "categories"
SOURCES = {"men": "Mens Banner.png", "boys": "Boys Banner.png"}
WIDTHS = (480, 760, 1122)

OUT.mkdir(parents=True, exist_ok=True)
for slug, name in SOURCES.items():
    img = Image.open(ROOT / name).convert("RGB")
    assert img.size == (1122, 1402), f"{name}: unexpected size {img.size}"
    for w in WIDTHS:
        h = round(img.height * w / img.width)
        out = img if w == img.width else img.resize((w, h), Image.LANCZOS)
        path = OUT / f"{slug}-{w}.webp"
        out.save(path, "WEBP", quality=82, method=6)
        print(f"{path.relative_to(ROOT.parent.parent)}  {w}x{h}  {path.stat().st_size // 1024} KB")
