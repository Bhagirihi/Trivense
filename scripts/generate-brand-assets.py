#!/usr/bin/env python3
"""Generate Trivense launcher, splash, and in-app logo PNGs from UI/icon.png."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "UI" / "icon.png"
ASSETS = ROOT / "assets"
BRAND = (0, 61, 102)  # #003D66 — matches app.config.js
BG_TOLERANCE = 42


def remove_background(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (
                abs(r - bg[0]) <= BG_TOLERANCE
                and abs(g - bg[1]) <= BG_TOLERANCE
                and abs(b - bg[2]) <= BG_TOLERANCE
            ):
                px[x, y] = (r, g, b, 0)

    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def fit_on_canvas(
    mark: Image.Image,
    size: int,
    *,
    fill_ratio: float,
    background: tuple[int, int, int, int] | None = None,
) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    target = int(size * fill_ratio)
    scaled = mark.copy()
    scaled.thumbnail((target, target), Image.LANCZOS)
    ox = (size - scaled.size[0]) // 2
    oy = (size - scaled.size[1]) // 2
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(ROOT)}")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source icon: {SRC}")

    print("Generating Trivense brand assets…\n")
    source = Image.open(SRC)
    mark = remove_background(source)

    transparent = fit_on_canvas(mark, 1024, fill_ratio=0.78)
    splash = fit_on_canvas(mark, 1024, fill_ratio=0.42)
    # Android adaptive safe zone ≈ 66% diameter; keep mark smaller for breathing room
    adaptive = fit_on_canvas(mark, 1024, fill_ratio=0.40)
    icon = fit_on_canvas(mark, 1024, fill_ratio=0.50, background=(*BRAND, 255))

    outputs = {
        ASSETS / "icon_transparent.png": transparent,
        ASSETS / "logo_mark.png": transparent,
        ASSETS / "splash_icon.png": splash,
        ASSETS / "adaptive_icon.png": adaptive,
        ASSETS / "icon.png": icon,
        ASSETS / "logo.png": icon,
        ROOT / "UI" / "icon_transparent.png": transparent,
        ROOT / "UI" / "splash_icon.png": splash,
    }

    for path, img in outputs.items():
        save_png(img, path)

    print("\nDone.")


if __name__ == "__main__":
    main()
