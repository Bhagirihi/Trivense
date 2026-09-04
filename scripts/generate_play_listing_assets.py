#!/usr/bin/env python3
"""Generate premium Google Play feature graphic + phone screenshots (9/10 ASO quality)."""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PLAY = ROOT / "store-assets" / "play"
UI = ROOT / "UI"
ASSETS = ROOT / "assets"
FONTS = ASSETS / "fonts"

# Load screen builders from generate-promo-banners.py
_promo_path = ROOT / "scripts" / "generate-promo-banners.py"
_spec = importlib.util.spec_from_file_location("promo_banners", _promo_path)
promo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(promo)

BRAND = promo.BRAND
BRAND_LIGHT = promo.BRAND_LIGHT
BRAND_DARK = promo.BRAND_DARK
WHITE = promo.WHITE
CREAM = promo.CREAM
TEXT_DARK = promo.TEXT_DARK
ACCENT = promo.ACCENT
ACCENT_LIGHT = promo.ACCENT_LIGHT
MUTED = promo.MUTED
GOLD = (212, 175, 95)
TAGLINE = "Split Smarter. Travel Lighter."
SUBTAG = "Expense boards · Analytics · Settle up"

PHONE_W, PHONE_H = 1080, 1920
HEADLINE_H = 360


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def rounded_rect(draw, xy, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_phone_shadow(canvas: Image.Image, x: int, y: int, w: int, h: int):
    shadow = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((40, 40, w + 40, h + 40), radius=48, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.paste(shadow, (x - 40, y - 10), shadow)


def paste_phone(canvas: Image.Image, screen: Image.Image, x: int, y: int, scale: float = 0.88):
    sw, sh = screen.size
    fw, fh = int(sw * scale), int(sh * scale)
    frame_img = screen.resize((fw, fh), Image.LANCZOS)
    bezel = 16
    outer_w, outer_h = fw + bezel * 2, fh + bezel * 2
    draw_phone_shadow(canvas, x, y, outer_w, outer_h)
    outer = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(outer)
    rounded_rect(d, (0, 0, outer_w - 1, outer_h - 1), 44, (12, 16, 36, 255))
    rounded_rect(d, (bezel, bezel, fw + bezel - 1, fh + bezel - 1), 32, (8, 10, 22, 255))
    d.rounded_rectangle(
        (fw // 2 - 42 + bezel, bezel + 10, fw // 2 + 42 + bezel, bezel + 30),
        radius=12,
        fill=(22, 24, 32, 255),
    )
    outer.paste(frame_img, (bezel, bezel))
    canvas.paste(outer, (x, y), outer)
    return outer_w, outer_h


def draw_headline_band(
    img: Image.Image,
    *,
    headline: str,
    subhead: str,
    badge: str | None = None,
) -> ImageDraw.ImageDraw:
    draw = ImageDraw.Draw(img)
    for y in range(HEADLINE_H):
        t = y / HEADLINE_H
        r = int(BRAND_DARK[0] + (BRAND[0] - BRAND_DARK[0]) * (1 - t * 0.4))
        g = int(BRAND_DARK[1] + (BRAND[1] - BRAND_DARK[1]) * (1 - t * 0.4))
        b = int(BRAND_DARK[2] + (BRAND[2] - BRAND_DARK[2]) * (1 - t * 0.4))
        draw.line((0, y, PHONE_W, y), fill=(r, g, b, 255))

    draw.ellipse((PHONE_W - 220, -80, PHONE_W + 60, 200), fill=(*BRAND_LIGHT, 80))
    draw.ellipse((-100, 120, 180, 400), fill=(*GOLD, 35))

    if badge:
        rounded_rect(draw, (48, 48, 48 + 168, 84), 14, ACCENT)
        draw.text((64, 56), badge, fill=WHITE, font=load_font("Inter_Medium.ttf", 16))

    headline_font = load_font("Poppins-Bold.ttf", 52)
    sub_font = load_font("Inter_Medium.ttf", 24)
    hy = 108 if badge else 72
    draw.text((48, hy), headline, fill=WHITE, font=headline_font)
    draw.text((48, hy + 68), subhead, fill=(210, 214, 235, 255), font=sub_font)

    gold_w = 72
    draw.rounded_rectangle((48, hy + 118, 48 + gold_w, hy + 122), radius=2, fill=GOLD)
    return draw


def make_listing_screenshot(
    screen: Image.Image,
    *,
    headline: str,
    subhead: str,
    badge: str | None = None,
) -> Image.Image:
    canvas = Image.new("RGBA", (PHONE_W, PHONE_H), CREAM)
    draw_headline_band(canvas, headline=headline, subhead=subhead, badge=badge)

    phone_w = int(PHONE_W * 0.88)
    scale = phone_w / screen.size[0]
    phone_h = int(screen.size[1] * scale)
    x = (PHONE_W - phone_w) // 2 - 8
    y = HEADLINE_H + 24
    if y + phone_h + 40 > PHONE_H:
        scale = (PHONE_H - HEADLINE_H - 64) / screen.size[1]
        phone_w = int(screen.size[0] * scale)
        phone_h = int(screen.size[1] * scale)
        x = (PHONE_W - phone_w) // 2 - 8
    paste_phone(canvas, screen, x, y, scale=scale)
    return canvas


def load_brand_icon(size: int) -> Image.Image:
    """Use premium 3D icon from UI/icon.png when available."""
    icon_path = UI / "icon.png" if (UI / "icon.png").exists() else ASSETS / "icon.png"
    icon = Image.open(icon_path).convert("RGBA")
    icon.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - icon.size[0]) // 2
    oy = (size - icon.size[1]) // 2
    canvas.paste(icon, (ox, oy), icon)
    return canvas


def make_feature_graphic(glyph, screens: dict[str, Image.Image]) -> Image.Image:
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), (*BRAND, 255))
    draw = ImageDraw.Draw(img)

    # Background depth
    draw.ellipse((640, -140, 1100, 320), fill=(*BRAND_LIGHT, 100))
    draw.ellipse((-120, 180, 280, 580), fill=(*BRAND_DARK, 200))
    for i in range(6):
        cx = 780 + i * 38
        cy = 380 + int(math.sin(i) * 12)
        draw.ellipse((cx, cy, cx + 8, cy + 8), fill=(*GOLD, 120))

    # Left: brand lockup from UI/Trivense.png if present
    lockup_path = UI / "Trivense.png"
    if lockup_path.exists():
        lockup = Image.open(lockup_path).convert("RGBA")
        target_h = 380
        ratio = target_h / lockup.size[1]
        lockup = lockup.resize((int(lockup.size[0] * ratio), target_h), Image.LANCZOS)
        img.paste(lockup, (36, 60), lockup)
    else:
        mark = load_brand_icon(160)
        img.paste(mark, (48, 120), mark)
        draw.text((230, 140), "Trivense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 58))
        draw.text((230, 210), TAGLINE, fill=(220, 224, 240, 255), font=load_font("Inter_Medium.ttf", 22))
        draw.text((230, 252), SUBTAG, fill=MUTED, font=load_font("Inter_Regular.ttf", 18))

    # Right: phone with dashboard
    dashboard = screens["dashboard"]
    paste_phone(img, dashboard, 620, 20, scale=0.24)

    # Trust pills
    pills = ["Free to start", "Multi-currency", "Real-time sync"]
    px = 48
    py = 420
    for pill in pills:
        tw, _ = text_size(draw, pill, load_font("Inter_Medium.ttf", 14))
        rounded_rect(draw, (px, py, px + tw + 28, py + 34), 16, (*BRAND_LIGHT, 220))
        draw.text((px + 14, py + 8), pill, fill=WHITE, font=load_font("Inter_Medium.ttf", 14))
        px += tw + 44

    return img


def make_app_icon_512() -> Image.Image:
    icon = load_brand_icon(512)
    return icon


LISTING_SCREENS = [
    {
        "file": "phone_screenshot_1.png",
        "headline": "Never wonder",
        "subhead": "who owes what after a trip",
        "badge": "FREE TO START",
        "screen_key": "dashboard",
    },
    {
        "file": "phone_screenshot_2.png",
        "headline": "Track every trip",
        "subhead": "Organize spending on expense boards",
        "badge": "EXPENSE BOARDS",
        "screen_key": "boards",
    },
    {
        "file": "phone_screenshot_3.png",
        "headline": "See where money goes",
        "subhead": "Category breakdowns & smart analytics",
        "badge": "ANALYTICS",
        "screen_key": "analytics",
    },
    {
        "file": "phone_screenshot_4.png",
        "headline": "Everyone stays in sync",
        "subhead": "Split bills & track group balances",
        "badge": "SPLIT & SHARE",
        "screen_key": "split",
    },
    {
        "file": "phone_screenshot_5.png",
        "headline": "Settle up in seconds",
        "subhead": "Clear balances — who owes whom",
        "badge": "SETTLE UP",
        "screen_key": "settle",
    },
    {
        "file": "phone_screenshot_6.png",
        "headline": "Find any expense fast",
        "subhead": "Search, filter & track in real time",
        "badge": "SMART SEARCH",
        "screen_key": "search",
    },
    {
        "file": "phone_screenshot_7.png",
        "headline": "₹ $ € £ and more",
        "subhead": "Multi-currency for every trip",
        "badge": "MULTI-CURRENCY",
        "screen_key": "currency",
    },
    {
        "file": "phone_screenshot_8.png",
        "headline": "Invite in one tap",
        "subhead": "Share boards with friends & family",
        "badge": "INVITE & SHARE",
        "screen_key": "invite",
    },
    {
        "file": "phone_screenshot_9.png",
        "headline": "Works offline",
        "subhead": "Syncs when you're back online",
        "badge": "REAL-TIME SYNC",
        "screen_key": "sync",
    },
]


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(ROOT)} ({img.size[0]}×{img.size[1]})")


def main() -> None:
    print("Generating premium Play listing assets…\n")
    glyph = promo.extract_glyph(ASSETS / "icon.png")
    screens = {
        "dashboard": promo.make_dashboard_screen(glyph),
        "boards": promo.make_boards_screen(glyph),
        "analytics": promo.make_analytics_screen(glyph),
        "split": promo.make_split_screen(glyph),
        "settle": promo.make_settle_screen(glyph),
        "search": promo.make_search_screen(glyph),
        "currency": promo.make_currency_screen(glyph),
        "invite": promo.make_invite_screen(glyph),
        "sync": promo.make_sync_screen(glyph),
    }

    save(make_app_icon_512(), PLAY / "app_icon_512.png")
    save(make_feature_graphic(glyph, screens), PLAY / "feature_graphic_1024x500.png")

    for spec in LISTING_SCREENS:
        img = make_listing_screenshot(
            screens[spec["screen_key"]],
            headline=spec["headline"],
            subhead=spec["subhead"],
            badge=spec["badge"],
        )
        save(img, PLAY / spec["file"])

    # Legacy aliases
    save(Image.open(PLAY / "app_icon_512.png"), PLAY / "trivense_icon_512.png")
    save(Image.open(PLAY / "feature_graphic_1024x500.png"), PLAY / "trivense_feature_graphic.png")
    save(Image.open(PLAY / "phone_screenshot_1.png"), PLAY / "trivense_screenshot_1.png")
    save(Image.open(PLAY / "phone_screenshot_2.png"), PLAY / "trivense_screenshot_2.png")

    print(f"\nDone — {len(LISTING_SCREENS) + 2} Play assets in {PLAY.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
