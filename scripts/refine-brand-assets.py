#!/usr/bin/env python3
"""Refine Trivense brand assets and generate Google Play Console graphics."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PLAY = ROOT / "store-assets" / "play"
FONTS = ASSETS / "fonts"

BRAND = (0, 61, 102)  # #003D66 — matches app.config.js
WHITE = (255, 255, 255)
TAGLINE = "Split Smarter. Travel Lighter"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    return ImageFont.truetype(str(path), size)


def extract_glyph(icon_path: Path) -> Image.Image:
    """Extract the white mark from icon.png as an RGBA glyph."""
    src = Image.open(icon_path).convert("RGBA")
    pixels = src.load()
    w, h = src.size
    glyph = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gp = glyph.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            # Keep bright foreground pixels (white icon strokes)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum > 170:
                gp[x, y] = (255, 255, 255, min(255, a))

    # Trim transparent padding
    bbox = glyph.getbbox()
    if not bbox:
        raise RuntimeError(f"Could not extract glyph from {icon_path}")
    return glyph.crop(bbox)


def fit_glyph(
    glyph: Image.Image,
    canvas_size: int,
    fill_ratio: float,
    color: tuple[int, int, int, int] = (255, 255, 255, 255),
) -> Image.Image:
    """Scale glyph to fit inside canvas with uniform padding."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    target = int(canvas_size * fill_ratio)
    g = glyph.copy()
    g.thumbnail((target, target), Image.LANCZOS)

    if color != (255, 255, 255, 255):
        colored = Image.new("RGBA", g.size, (0, 0, 0, 0))
        px = g.load()
        cp = colored.load()
        for y in range(g.size[1]):
            for x in range(g.size[0]):
                _, _, _, a = px[x, y]
                if a:
                    cp[x, y] = (*color[:3], a)
        g = colored

    ox = (canvas_size - g.size[0]) // 2
    oy = (canvas_size - g.size[1]) // 2
    canvas.paste(g, (ox, oy), g)
    return canvas


def make_app_icon(glyph: Image.Image, size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (*BRAND, 255))
    mark = fit_glyph(glyph, size, fill_ratio=0.58)
    img.paste(mark, (0, 0), mark)
    return img


def make_adaptive_foreground(glyph: Image.Image, size: int = 1024) -> Image.Image:
    # Android safe zone ≈ 66% diameter; keep mark inside ~52% of canvas
    return fit_glyph(glyph, size, fill_ratio=0.52)


def make_logo(glyph: Image.Image, size: int = 1024) -> Image.Image:
    return fit_glyph(glyph, size, fill_ratio=0.72, color=(*BRAND, 255))


def make_splash(glyph: Image.Image) -> Image.Image:
    """Transparent splash mark for expo-splash-screen (bg from app.config)."""
    w, h = 640, 880
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mark_size = 220
    mark = fit_glyph(glyph, mark_size, fill_ratio=0.88)
    mx = (w - mark_size) // 2
    my = 120
    canvas.paste(mark, (mx, my), mark)

    title_font = load_font("Poppins-Bold.ttf", 52)
    tag_font = load_font("Inter_Regular.ttf", 22)
    draw = ImageDraw.Draw(canvas)

    title = "Trivense"
    tb = draw.textbbox((0, 0), title, font=title_font)
    tw = tb[2] - tb[0]
    draw.text(((w - tw) // 2, my + mark_size + 36), title, fill=WHITE, font=title_font)

    tag_b = draw.textbbox((0, 0), TAGLINE, font=tag_font)
    tgw = tag_b[2] - tag_b[0]
    draw.text(((w - tgw) // 2, my + mark_size + 104), TAGLINE, fill=(220, 224, 240, 255), font=tag_font)
    return canvas


def rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def draw_phone_frame(canvas: Image.Image, screen: Image.Image, x: int, y: int, scale: float = 0.42):
    sw, sh = screen.size
    fw, fh = int(sw * scale), int(sh * scale)
    frame = screen.resize((fw, fh), Image.LANCZOS)
    bezel = 14
    outer = Image.new("RGBA", (fw + bezel * 2, fh + bezel * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(outer)
    rounded_rect(draw, (0, 0, fw + bezel * 2 - 1, fh + bezel * 2 - 1), 36, (18, 22, 48, 255))
    rounded_rect(draw, (bezel, bezel, fw + bezel - 1, fh + bezel - 1), 24, (0, 0, 0, 255))
    outer.paste(frame, (bezel, bezel))
    canvas.paste(outer, (x, y), outer)


def make_feature_graphic(glyph: Image.Image) -> Image.Image:
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), (*BRAND, 255))
    draw = ImageDraw.Draw(img)

    # Subtle accent shapes
    draw.ellipse((720, -120, 1120, 280), fill=(62, 68, 130, 120))
    draw.ellipse((-80, 260, 320, 660), fill=(38, 42, 92, 180))

    mark = fit_glyph(glyph, 200, fill_ratio=0.88)
    img.paste(mark, (72, 150), mark)

    title_font = load_font("Poppins-Bold.ttf", 64)
    tag_font = load_font("Inter_Medium.ttf", 26)
    draw.text((300, 155), "Trivense", fill=WHITE, font=title_font)
    draw.text((300, 235), TAGLINE, fill=(210, 214, 235, 255), font=tag_font)
    draw.text((300, 290), "Expense boards · Analytics · Split bills", fill=(160, 168, 210, 255), font=load_font("Inter_Regular.ttf", 20))
    return img


def make_phone_screen(glyph: Image.Image, title: str, subtitle: str, cards: list[tuple[str, str]]) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), (245, 247, 252, 255))
    draw = ImageDraw.Draw(img)

    # Header band
    rounded_rect(draw, (0, 0, w, 280), 0, (*BRAND, 255))
    mark = fit_glyph(glyph, 96, fill_ratio=0.88)
    img.paste(mark, (48, 72), mark)
    draw.text((160, 88), "Trivense", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 36))
    draw.text((160, 132), title, fill=(210, 214, 235, 255), font=load_font("Inter_Medium.ttf", 22))

    y = 320
    draw.text((48, y), subtitle, fill=BRAND, font=load_font("Poppins-Bold.ttf", 40))
    y += 72

    for label, value in cards:
        rounded_rect(draw, (48, y, w - 48, y + 148), 20, WHITE)
        draw.rounded_rectangle((48, y, w - 48, y + 148), radius=20, outline=(225, 228, 238, 255), width=2)
        draw.text((80, y + 28), label, fill=(110, 118, 145, 255), font=load_font("Inter_Medium.ttf", 20))
        draw.text((80, y + 64), value, fill=BRAND, font=load_font("Poppins-Bold.ttf", 36))
        y += 172

    return img


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".jpg":
        img.convert("RGB").save(path, "PNG" if path.suffix.lower() == ".png" else "JPEG", quality=92)
    else:
        img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(ROOT)}")


def main() -> None:
    print("Refining Trivense brand assets…\n")
    source_icon = ASSETS / "icon.png"
    glyph = extract_glyph(source_icon)

    icon = make_app_icon(glyph)
    logo = make_logo(glyph)
    splash = make_splash(glyph)
    adaptive = make_adaptive_foreground(glyph)

    save(icon, ASSETS / "icon.png")
    save(logo, ASSETS / "logo.png")
    save(splash, ASSETS / "splash_icon.png")
    save(adaptive, ASSETS / "adaptive_icon.png")
    save(logo, ROOT / "website" / "public" / "logo.png")

    print("\nGenerating Google Play graphics…\n")
    play_icon = icon.resize((512, 512), Image.LANCZOS)
    save(play_icon, PLAY / "app_icon_512.png")
    save(make_feature_graphic(glyph), PLAY / "feature_graphic_1024x500.png")

    screens = [
        (
            "Dashboard",
            "Your spending at a glance",
            [("This week", "₹12,450"), ("Active boards", "3"), ("Budget left", "₹8,200")],
        ),
        (
            "Expense boards",
            "Track every trip & group",
            [("Europe Trip 2025", "₹48,200"), ("Home & utilities", "₹9,840"), ("Office lunch", "₹2,150")],
        ),
        (
            "Analytics",
            "See where money goes",
            [("Top category", "Food · 32%"), ("vs last month", "↓ 12%"), ("Shared expenses", "₹24,600")],
        ),
        (
            "Split & share",
            "Everyone stays in sync",
            [("Invite by email", "1-tap share"), ("Who owes whom", "Settle up"), ("Real-time sync", "Always updated")],
        ),
    ]

    for i, spec in enumerate(screens, 1):
        save(make_phone_screen(glyph, *spec), PLAY / f"phone_screenshot_{i}.png")

    # Legacy filenames for compatibility
    save(play_icon, PLAY / "trivense_icon_512.png")
    save(Image.open(PLAY / "feature_graphic_1024x500.png"), PLAY / "trivense_feature_graphic.png")
    save(Image.open(PLAY / "phone_screenshot_1.png"), PLAY / "trivense_screenshot_1.png")
    save(Image.open(PLAY / "phone_screenshot_2.png"), PLAY / "trivense_screenshot_2.png")

    print("\nDone.")


if __name__ == "__main__":
    main()
