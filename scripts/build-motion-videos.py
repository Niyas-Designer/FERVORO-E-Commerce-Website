#!/usr/bin/env python3
"""
Build web-delivery copies + posters for the "FERVORO IN MOTION" section.

Source masters  : frontend/public/Videos/A*.mp4   (1080x1920, ~11 Mbps; NEVER modified or moved)
Output directory: frontend/public/videos-web/     (generated; safe to delete and rebuild)

For every selected clip it writes (audio stripped - the section is muted):
  a8-720.mp4 / a8-540.mp4   H.264 High, yuv420p, 24 fps, faststart, CRF-capped bitrate, 9:16 preserved
  a8-720.webp / a8-540.webp poster frame
and a manifest.json that records source filename, poster time and the produced file sizes.

Usage:
  python3 scripts/build-motion-videos.py              # build (skips files that are already up to date)
  python3 scripts/build-motion-videos.py --dry-run    # print the plan, write nothing
  python3 scripts/build-motion-videos.py --force      # rebuild everything
  python3 scripts/build-motion-videos.py --src DIR    # read masters from another folder

Requires: ffmpeg (with libx264) on PATH, Pillow.
"""
import argparse
import json
import logging
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "frontend" / "public" / "Videos"
OUT = ROOT / "frontend" / "public" / "videos-web"

# id -> (source file, poster time in seconds). Order here is the order in the gallery.
CLIPS = {
    "a8": ("A8.mp4", 6.0),
    "a4": ("A4.mp4", 1.0),
    "a7": ("A7.mp4", 1.0),
    "a21": ("A21.mp4", 1.0),
    "a22": ("A22.mp4", 5.0),
    "a23": ("A23.mp4", 5.0),
}
# width -> height (strict 9:16)
SIZES = {720: 1280, 540: 960}
CRF = "27"
MAXRATE = {720: "2800k", 540: "1800k"}
POSTER_QUALITY = 80
TIMEOUT = 600

log = logging.getLogger("motion-videos")


def run(cmd):
    log.debug("run: %s", " ".join(map(str, cmd)))
    subprocess.run(cmd, check=True, timeout=TIMEOUT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def fresh(out: Path, src: Path, force: bool) -> bool:
    return not force and out.exists() and out.stat().st_mtime >= src.stat().st_mtime and out.stat().st_size > 0


def encode(src: Path, out: Path, w: int, h: int):
    tmp = out.with_suffix(".tmp.mp4")
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(src), "-an",
        "-vf", f"scale={w}:{h}:flags=lanczos,setsar=1",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", CRF,
        "-maxrate", MAXRATE[w], "-bufsize", str(int(MAXRATE[w][:-1]) * 2) + "k",
        "-pix_fmt", "yuv420p", "-r", "24", "-g", "48", "-movflags", "+faststart", str(tmp),
    ])
    tmp.replace(out)  # atomic: never leaves a half-written file behind


def poster(src: Path, t: float, out_dir: Path, cid: str):
    with tempfile.TemporaryDirectory() as td:
        png = Path(td) / "f.png"
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(src), "-frames:v", "1", str(png)])
        img = Image.open(png).convert("RGB")
        for w, h in SIZES.items():
            img.resize((w, h), Image.LANCZOS).save(out_dir / f"{cid}-{w}.webp", "WEBP", quality=POSTER_QUALITY, method=6)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    if not shutil.which("ffmpeg"):
        log.error("ffmpeg not found on PATH (macOS: brew install ffmpeg)")
        return 1
    missing = [f for f, _ in CLIPS.values() if not (args.src / f).is_file()]
    if missing:
        log.error("source videos not found in %s: %s", args.src, ", ".join(missing))
        return 1

    if not args.dry_run:
        OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"crf": int(CRF), "audio": False, "clips": {}}
    for cid, (fname, t) in CLIPS.items():
        src = args.src / fname
        entry = {"source": fname, "posterTime": t, "files": {}}
        for w, h in SIZES.items():
            out = OUT / f"{cid}-{w}.mp4"
            if args.dry_run:
                log.info("[dry-run] %s -> %s (%dx%d)", fname, out.name, w, h)
            elif fresh(out, src, args.force):
                log.info("up to date: %s", out.name)
            else:
                log.info("encoding %s -> %s", fname, out.name)
                encode(src, out, w, h)
            if out.exists():
                entry["files"][out.name] = out.stat().st_size
        if args.dry_run:
            log.info("[dry-run] %s poster @ %ss -> %s-720.webp / %s-540.webp", fname, t, cid, cid)
        else:
            if not all((OUT / f"{cid}-{w}.webp").exists() for w in SIZES) or args.force:
                poster(src, t, OUT, cid)
            for w in SIZES:
                entry["files"][f"{cid}-{w}.webp"] = (OUT / f"{cid}-{w}.webp").stat().st_size
        manifest["clips"][cid] = entry
    if not args.dry_run:
        (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        total = sum(s for c in manifest["clips"].values() for s in c["files"].values())
        log.info("done: %d files, %.1f MB total", sum(len(c["files"]) for c in manifest["clips"].values()), total / 1e6)
    return 0


if __name__ == "__main__":
    sys.exit(main())
