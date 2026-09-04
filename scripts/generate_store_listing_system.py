#!/usr/bin/env python3
"""Generate complete Trivense Play Store / App Store listing image system."""

from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LISTING = ROOT / "store-assets" / "listing"
SOURCE = LISTING / "source"
PLAY_LEGACY = ROOT / "store-assets" / "play"
UI = ROOT / "UI"
ASSETS = ROOT / "assets"
FONTS = ASSETS / "fonts"

# Brand palette — user spec
NAVY = (0, 61, 102)          # #003D66
DARK_NAVY = (0, 40, 71)      # #002847
HEADER = (0, 0, 0)           # #000000
WHITE = (255, 255, 255)
BG = (255, 255, 255)
MUTED = (136, 136, 136)      # #888888
GOLD = (201, 162, 78)        # logo-inspired gold
GOLD_LIGHT = (230, 198, 120)
CREAM = (248, 250, 252)
TEXT_DARK = (15, 23, 42)
ACCENT = (0, 122, 94)        # subtle teal for success states
SUCCESS = (16, 185, 129)

TAGLINE = "Split expenses, made easy."

# Load promo screen builders and patch palette
_promo_path = ROOT / "scripts" / "generate-promo-banners.py"
_spec = importlib.util.spec_from_file_location("promo_banners", _promo_path)
promo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(promo)
for key, val in [
    ("BRAND", NAVY),
    ("BRAND_LIGHT", (0, 82, 128)),
    ("BRAND_DARK", DARK_NAVY),
    ("CREAM", CREAM),
    ("WHITE", WHITE),
    ("TEXT_DARK", TEXT_DARK),
    ("ACCENT", ACCENT),
    ("ACCENT_LIGHT", (20, 160, 130)),
    ("MUTED", (160, 170, 190)),
    ("TAGLINE", TAGLINE),
]:
    setattr(promo, key, val)

ANDROID_W, ANDROID_H = 1080, 1920
IOS_W, IOS_H = 1290, 2796
TABLET_W, TABLET_H = 1600, 2560
HEADLINE_RATIO = 0.19


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def rounded_rect(draw, xy, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def load_logo() -> Image.Image:
    for path in (SOURCE / "logo.png", UI / "icon.png", ASSETS / "icon.png"):
        if path.exists():
            return Image.open(path).convert("RGBA")
    raise FileNotFoundError("No logo source found")


def fit_logo(logo: Image.Image, size: int, fill_ratio: float = 0.82) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = int(size * fill_ratio)
    mark = logo.copy()
    mark.thumbnail((target, target), Image.LANCZOS)
    ox = (size - mark.size[0]) // 2
    oy = (size - mark.size[1]) // 2
    canvas.paste(mark, (ox, oy), mark)
    return canvas


def make_app_icon_512(logo: Image.Image) -> Image.Image:
    """512×512 — resize logo directly (logo already includes navy background)."""
    return logo.resize((512, 512), Image.LANCZOS)


def draw_phone_shadow(canvas: Image.Image, x: int, y: int, w: int, h: int):
    shadow = Image.new("RGBA", (w + 80, h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((40, 40, w + 40, h + 40), radius=48, fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    canvas.paste(shadow, (x - 40, y - 10), shadow)


def paste_phone(canvas: Image.Image, screen: Image.Image, x: int, y: int, scale: float):
    sw, sh = screen.size
    fw, fh = int(sw * scale), int(sh * scale)
    frame_img = screen.resize((fw, fh), Image.LANCZOS)
    bezel = 14
    outer_w, outer_h = fw + bezel * 2, fh + bezel * 2
    draw_phone_shadow(canvas, x, y, outer_w, outer_h)
    outer = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(outer)
    rounded_rect(d, (0, 0, outer_w - 1, outer_h - 1), 44, (18, 22, 36, 255))
    rounded_rect(d, (bezel, bezel, fw + bezel - 1, fh + bezel - 1), 32, (8, 10, 22, 255))
    d.rounded_rectangle(
        (fw // 2 - 42 + bezel, bezel + 10, fw // 2 + 42 + bezel, bezel + 30),
        radius=12,
        fill=(22, 24, 32, 255),
    )
    outer.paste(frame_img, (bezel, bezel))
    canvas.paste(outer, (x, y), outer)
    return outer_w, outer_h


def draw_flat_illustration(draw: ImageDraw.ImageDraw, theme: str, x: int, y: int, size: int = 120):
    """Minimal flat illustration accents matching listing spec themes."""
    if theme == "team":
        colors = [(0, 82, 128), (0, 61, 102), (201, 162, 78), (20, 160, 130)]
        for i, (cx, cy) in enumerate([(x + 8, y + 36), (x + 36, y + 20), (x + 64, y + 36), (x + 92, y + 20)]):
            draw.ellipse((cx, cy, cx + 24, cy + 24), fill=colors[i % len(colors)])
            draw.rounded_rectangle((cx + 2, cy + 26, cx + 22, cy + 52), 6, colors[i % len(colors)])
        rounded_rect(draw, (x + 28, y + size - 38, x + size - 28, y + size - 18), 8, GOLD)
        for i, h in enumerate((8, 14, 20, 28)):
            bx = x + 34 + i * 14
            rounded_rect(draw, (bx, y + size - 18 - h, bx + 8, y + size - 18), 3, GOLD if i == 3 else NAVY)
    elif theme == "categories":
        icons = [("☕", x + 10, y + 8), ("🚕", x + 50, y + 24), ("🛒", x + 80, y + 4)]
        for emoji, ix, iy in icons:
            rounded_rect(draw, (ix, iy, ix + 36, iy + 36), 10, WHITE, outline=(*NAVY, 80), width=2)
            draw.text((ix + 8, iy + 6), emoji, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 16))
        rounded_rect(draw, (x + 24, y + 52, x + size - 16, y + size - 8), 14, (*NAVY, 40))
    elif theme == "travel":
        for ix, emoji in [(x + 8, "✈"), (x + 44, "🏠"), (x + 80, "⚙")]:
            rounded_rect(draw, (ix, y + 20, ix + 32, y + 52), 8, (*GOLD_LIGHT, 200))
            draw.text((ix + 8, y + 26), emoji, fill=NAVY, font=load_font("Inter_Medium.ttf", 14))
    elif theme == "budget":
        rounded_rect(draw, (x + 24, y + 28, x + size - 24, y + size - 20), 16, GOLD)
        draw.ellipse((x + size // 2 - 10, y + 38, x + size // 2 + 10, y + 58), outline=WHITE, width=3)
        draw.text((x + size // 2 - 6, y + 60), "!", fill=WHITE, font=load_font("Poppins-Bold.ttf", 18))
        draw.ellipse((x + size - 28, y + 8, x + size - 4, y + 32), fill=(*ACCENT, 200))
        draw.text((x + size - 22, y + 12), "!", fill=WHITE, font=load_font("Poppins-Bold.ttf", 12))
    elif theme == "sync":
        draw.ellipse((x + size // 2 - 22, y + 16, x + size // 2 + 22, y + 60), outline=GOLD, width=4)
        for dx in (-18, 18):
            draw.polygon(
                [(x + size // 2 + dx, y + 8), (x + size // 2 + dx + 8, y + 20), (x + size // 2 + dx - 8, y + 20)],
                fill=GOLD,
            )
        for i in range(4):
            px = x + 20 + i * 18
            draw.ellipse((px, y + size - 28, px + 6, y + size - 22), fill=GOLD_LIGHT)
    elif theme == "premium":
        draw.polygon([(x + size // 2, y + 15), (x + size - 15, y + size - 20), (x + 15, y + size - 20)], fill=GOLD)
    elif theme == "analytics":
        for i, h in enumerate((40, 65, 50, 80)):
            bx = x + 18 + i * 22
            rounded_rect(draw, (bx, y + size - h, bx + 16, y + size - 10), 6, ACCENT if i % 2 else NAVY)
        draw.polygon([(x + size - 40, y + 30), (x + size - 10, y + 10), (x + size - 10, y + 50)], fill=GOLD)
    elif theme == "settle":
        draw.ellipse((x + 16, y + 28, x + 44, y + 56), fill=(*NAVY, 180))
        draw.ellipse((x + size - 44, y + 28, x + size - 16, y + 56), fill=GOLD)
        draw.line((x + 44, y + 42, x + size - 44, y + 42), fill=SUCCESS, width=4)
        draw.text((x + size // 2 - 10, y + 58), "₹", fill=NAVY, font=load_font("Poppins-Bold.ttf", 20))


def draw_headline_band(
    img: Image.Image,
    *,
    canvas_w: int,
    canvas_h: int,
    headline: str,
    subhead: str,
    badge: str | None = None,
    illus_theme: str = "travel",
    align: str = "left",
    gradient_to_white: bool = False,
) -> int:
    headline_h = int(canvas_h * HEADLINE_RATIO)
    draw = ImageDraw.Draw(img)
    for y in range(headline_h):
        t = y / headline_h
        if gradient_to_white and t > 0.55:
            fade = (t - 0.55) / 0.45
            r = int(NAVY[0] + (255 - NAVY[0]) * fade)
            g = int(NAVY[1] + (255 - NAVY[1]) * fade)
            b = int(NAVY[2] + (255 - NAVY[2]) * fade)
            draw.line((0, y, canvas_w, y), fill=(r, g, b, 255))
        else:
            r = int(DARK_NAVY[0] + (NAVY[0] - DARK_NAVY[0]) * (1 - t * 0.35))
            g = int(DARK_NAVY[1] + (NAVY[1] - DARK_NAVY[1]) * (1 - t * 0.35))
            b = int(DARK_NAVY[2] + (NAVY[2] - DARK_NAVY[2]) * (1 - t * 0.35))
            draw.line((0, y, canvas_w, y), fill=(r, g, b, 255))

    draw.ellipse((canvas_w - 240, -90, canvas_w + 40, 220), fill=(*NAVY, 90))
    draw.ellipse((-80, 100, 200, 380), fill=(*GOLD, 30))
    illus_x = canvas_w - 200 if align != "center" else canvas_w // 2 + 80
    draw_flat_illustration(draw, illus_theme, illus_x, 48, 110)

    scale = canvas_w / ANDROID_W
    pad = int(48 * scale)
    headline_font = load_font("Poppins-Bold.ttf", int(50 * scale))
    sub_font = load_font("Inter_Medium.ttf", int(22 * scale))
    badge_font = load_font("Inter_Medium.ttf", int(15 * scale))

    hw, _ = text_size(draw, headline, headline_font)
    sw, _ = text_size(draw, subhead, sub_font)
    text_x = pad if align == "left" else (canvas_w - hw) // 2
    sub_x = pad if align == "left" else (canvas_w - sw) // 2

    if badge:
        bw = int(180 * scale)
        badge_x = pad if align == "left" else (canvas_w - bw) // 2
        rounded_rect(draw, (badge_x, pad, badge_x + bw, pad + int(36 * scale)), 14, GOLD)
        draw.text((badge_x + int(14 * scale), pad + int(8 * scale)), badge, fill=DARK_NAVY, font=badge_font)

    hy = int(100 * scale) if badge else int(72 * scale)
    draw.text((text_x, hy), headline, fill=WHITE, font=headline_font)
    draw.text((sub_x, hy + int(64 * scale)), subhead, fill=(220, 228, 240), font=sub_font)
    underline_x = text_x if align == "left" else (canvas_w - int(72 * scale)) // 2
    draw.rounded_rectangle(
        (underline_x, hy + int(112 * scale), underline_x + int(72 * scale), hy + int(116 * scale)),
        radius=2,
        fill=GOLD,
    )
    return headline_h


def draw_body_gradient(canvas: Image.Image, headline_h: int):
    """Soft light-navy to white gradient below headline band."""
    draw = ImageDraw.Draw(canvas)
    body_h = canvas.size[1] - headline_h
    for y in range(body_h):
        t = y / max(body_h, 1)
        r = int(230 + (255 - 230) * t)
        g = int(238 + (255 - 238) * t)
        b = int(248 + (255 - 248) * t)
        draw.line((0, headline_h + y, canvas.size[0], headline_h + y), fill=(r, g, b, 255))


def make_listing_screenshot(
    screen: Image.Image,
    *,
    canvas_w: int,
    canvas_h: int,
    headline: str,
    subhead: str,
    badge: str | None = None,
    illus_theme: str = "travel",
    layout: str = "default",
    extra_screen: Image.Image | None = None,
) -> Image.Image:
    align = "center" if layout in ("center", "budget_alert", "settle") else "left"
    gradient = layout in ("gradient", "default")
    canvas = Image.new("RGBA", (canvas_w, canvas_h), CREAM)
    headline_h = draw_headline_band(
        canvas,
        canvas_w=canvas_w,
        canvas_h=canvas_h,
        headline=headline,
        subhead=subhead,
        badge=badge,
        illus_theme=illus_theme,
        align=align,
        gradient_to_white=gradient,
    )
    if gradient:
        draw_body_gradient(canvas, headline_h)

    if layout == "boards_grid":
        scales = [0.28, 0.24, 0.22]
        offsets = [(int(canvas_w * 0.08), headline_h + int(canvas_h * 0.06)), (int(canvas_w * 0.38), headline_h + int(canvas_h * 0.14)), (int(canvas_w * 0.62), headline_h + int(canvas_h * 0.22))]
        for i, (ox, oy) in enumerate(offsets):
            paste_phone(canvas, screen, ox, oy, scale=scales[i])
        return canvas

    if layout == "dual_phones" and extra_screen is not None:
        scale = 0.34 * (canvas_w / ANDROID_W)
        gap = int(canvas_w * 0.04)
        sw = int(screen.size[0] * scale) + 28
        total = sw * 2 + gap
        start_x = (canvas_w - total) // 2
        y = headline_h + int(canvas_h * 0.04)
        paste_phone(canvas, screen, start_x, y, scale=scale)
        paste_phone(canvas, extra_screen, start_x + sw + gap, y, scale=scale)
        cloud_x = canvas_w // 2 - 30
        cloud_y = y + int(screen.size[1] * scale * 0.35)
        cd = ImageDraw.Draw(canvas)
        cd.ellipse((cloud_x, cloud_y, cloud_x + 60, cloud_y + 36), fill=(*NAVY, 180))
        cd.text((cloud_x + 14, cloud_y + 8), "☁", fill=WHITE, font=load_font("Inter_Medium.ttf", 18))
        for i in range(3):
            px = cloud_x - 20 + i * 20
            cd.ellipse((px, cloud_y + 44, px + 5, cloud_y + 49), fill=GOLD_LIGHT)
        return canvas

    phone_target_w = int(canvas_w * (0.78 if layout == "track" else 0.86))
    scale = phone_target_w / screen.size[0]
    phone_h = int(screen.size[1] * scale)
    max_h = canvas_h - headline_h - int(canvas_h * 0.04)
    if phone_h > max_h:
        scale = max_h / screen.size[1]
        phone_target_w = int(screen.size[0] * scale)
    x = (canvas_w - phone_target_w) // 2 - int(canvas_w * 0.01)
    y = headline_h + int(canvas_h * 0.02)
    paste_phone(canvas, screen, x, y, scale=scale)

    if layout == "budget_alert":
        overlay = ImageDraw.Draw(canvas)
        nx = x + int(phone_target_w * 0.08)
        ny = y + int(phone_h * 0.42)
        nw = phone_target_w - int(phone_target_w * 0.16)
        rounded_rect(overlay, (nx, ny, nx + nw, ny + int(phone_h * 0.12)), 16, WHITE, outline=GOLD, width=3)
        overlay.text((nx + 20, ny + 16), "⚠  Budget Alert: 75% Spent", fill=NAVY, font=load_font("Poppins-SemiBold.ttf", int(18 * canvas_w / ANDROID_W)))

    if layout == "track":
        td = ImageDraw.Draw(canvas)
        icons = [("☕", x - int(canvas_w * 0.06), y + int(phone_h * 0.2)), ("🚕", x + phone_target_w + int(canvas_w * 0.02), y + int(phone_h * 0.35)), ("🛒", x - int(canvas_w * 0.04), y + int(phone_h * 0.55))]
        for emoji, ix, iy in icons:
            rounded_rect(td, (ix, iy, ix + 48, iy + 48), 12, WHITE, outline=(*NAVY, 100), width=2)
            td.text((ix + 12, iy + 10), emoji, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 20))

    return canvas


def make_home_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 220), 0, NAVY)
    draw.text((48, 72), "Home", fill=WHITE, font=load_font("Poppins-Bold.ttf", 34))
    y = 260
    rounded_rect(draw, (48, y, w - 48, y + 180), 24, WHITE, outline=(225, 230, 240), width=2)
    draw.text((80, y + 28), "Your balance", fill=MUTED, font=load_font("Inter_Medium.ttf", 18))
    draw.text((80, y + 62), "You are owed ₹1,200", fill=SUCCESS, font=load_font("Poppins-Bold.ttf", 40))
    draw.text((80, y + 120), "Across 3 active boards", fill=MUTED, font=load_font("Inter_Medium.ttf", 17))
    y += 220
    draw.text((48, y), "Recent activity", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
    y += 52
    recent = [
        ("Dinner · Goa trip", "₹2,400", "Rahul paid"),
        ("Taxi · Airport", "₹350", "You paid"),
        ("Groceries", "₹890", "Priya paid"),
    ]
    for title, amt, who in recent:
        rounded_rect(draw, (48, y, w - 48, y + 108), 16, WHITE, outline=(225, 230, 240), width=2)
        rounded_rect(draw, (64, y + 24, 92, y + 84), 10, ACCENT)
        draw.text((108, y + 22), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 22))
        draw.text((108, y + 52), who, fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
        tw, _ = text_size(draw, amt, load_font("Poppins-Bold.ttf", 24))
        draw.text((w - 64 - tw, y + 36), amt, fill=NAVY, font=load_font("Poppins-Bold.ttf", 24))
        y += 124
    return img


def make_track_expense_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "New Expense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 240
    fields = [
        ("Amount", "₹ 2,400"),
        ("Date", "Today · 7:30 PM"),
        ("Description", "Dinner at beach shack"),
        ("Payer", "You"),
    ]
    for label, value in fields:
        rounded_rect(draw, (48, y, w - 48, y + 100), 18, WHITE, outline=(225, 230, 240), width=2)
        draw.text((72, y + 18), label, fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
        draw.text((72, y + 46), value, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        y += 116
    draw.text((48, y + 8), "Category", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 22))
    y += 44
    cats = [("🍽", "Food", True), ("🚕", "Travel", False), ("🛒", "Shop", False), ("🏠", "Home", False)]
    cx = 48
    for emoji, label, active in cats:
        rounded_rect(draw, (cx, y, cx + 120, y + 88), 16, NAVY if active else WHITE, outline=(225, 230, 240), width=2)
        draw.text((cx + 44, y + 14), emoji, fill=WHITE if active else TEXT_DARK, font=load_font("Inter_Medium.ttf", 22))
        draw.text((cx + 32, y + 52), label, fill=WHITE if active else MUTED, font=load_font("Inter_Medium.ttf", 14))
        cx += 136
    rounded_rect(draw, (48, h - 140, w - 48, h - 56), 28, NAVY)
    tw, _ = text_size(draw, "Save expense", load_font("Poppins-Bold.ttf", 26))
    draw.text(((w - tw) // 2, h - 112), "Save expense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 26))
    return img


def make_boards_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "Your Boards", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 240
    boards = [
        ("Summer Goa Trip", "₹18,400", "✈", ACCENT),
        ("9th Street Apartment", "₹9,840", "🏠", (79, 70, 229)),
        ("Team Website Project", "₹4,250", "⚙", GOLD),
    ]
    for name, amt, icon, color in boards:
        rounded_rect(draw, (48, y, w - 48, y + 160), 20, WHITE, outline=(225, 230, 240), width=2)
        rounded_rect(draw, (68, y + 24, 120, y + 136), 12, color)
        draw.text((88, y + 52), icon, fill=WHITE, font=load_font("Inter_Medium.ttf", 28))
        draw.text((140, y + 36), name, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
        draw.text((140, y + 78), amt, fill=NAVY, font=load_font("Poppins-Bold.ttf", 30))
        y += 184
    return img


def make_budget_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "Goa Trip Budget", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 260
    rounded_rect(draw, (48, y, w - 48, y + 240), 24, WHITE, outline=(225, 230, 240), width=2)
    draw.text((80, y + 28), "Board spending limit", fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
    draw.text((80, y + 64), "₹15,000 spent", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((80, y + 124), "of ₹20,000 budget", fill=MUTED, font=load_font("Inter_Medium.ttf", 18))
    bar_w = w - 160
    rounded_rect(draw, (80, y + 170, w - 80, y + 186), 8, (230, 235, 242))
    rounded_rect(draw, (80, y + 170, 80 + int(bar_w * 0.75), y + 186), 8, GOLD)
    draw.text((80, y + 200), "75% used", fill=NAVY, font=load_font("Poppins-SemiBold.ttf", 20))
    y += 280
    draw.text((48, y), "Alerts", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
    y += 52
    alerts = [
        ("Budget Alert: 75% Spent", "Goa Trip · Food category"),
        ("Weekly reminder", "Review shared expenses"),
    ]
    for title, sub in alerts:
        rounded_rect(draw, (48, y, w - 48, y + 100), 16, WHITE, outline=(225, 230, 240), width=2)
        rounded_rect(draw, (72, y + 28, 108, y + 72), 10, GOLD)
        draw.text((128, y + 24), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 22))
        draw.text((128, y + 56), sub, fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
        y += 120
    return img


def make_sync_activity_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "Recent Activity", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 240
    items = [
        ("Taxi ₹350", "Just now · Goa Trip", True),
        ("Grocery bill added", "2 min ago · Apartment", False),
        ("Dinner split updated", "5 min ago · Goa Trip", False),
    ]
    for title, sub, highlight in items:
        rounded_rect(draw, (48, y, w - 48, y + 108), 16, (*GOLD_LIGHT, 40) if highlight else WHITE, outline=GOLD if highlight else (225, 230, 240), width=2)
        draw.text((76, y + 24), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        draw.text((76, y + 58), sub, fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
        y += 124
    return img


def make_analytics_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "Spending Insights", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 260
    cx, cy, r = w // 2, y + 140, 120
    segments = [(40, ACCENT), (30, NAVY), (20, GOLD), (10, MUTED)]
    start = 0
    for pct, color in segments:
        extent = int(360 * pct / 100)
        draw.pieslice((cx - r, cy - r, cx + r, cy + r), start, start + extent, fill=color)
        start += extent
    draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), fill=WHITE)
    draw.text((cx - 36, cy - 16), "By cat.", fill=MUTED, font=load_font("Inter_Medium.ttf", 16))
    y = cy + r + 40
    legend = [("Food 40%", ACCENT), ("Travel 30%", NAVY), ("Other 30%", GOLD)]
    for label, color in legend:
        rounded_rect(draw, (64, y, 88, y + 24), 6, color)
        draw.text((100, y + 2), label, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 18))
        y += 36
    y += 20
    draw.text((48, y), "Monthly trends", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
    y += 48
    bars = [60, 90, 75, 110, 85]
    for i, bh in enumerate(bars):
        bx = 80 + i * 90
        rounded_rect(draw, (bx, y + 120 - bh, bx + 48, y + 120), 8, GOLD if i == 3 else NAVY)
    return img


def make_settlements_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, NAVY)
    draw.text((48, 80), "Settlements", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 260
    settlements = [
        ("Sarah", "Sarah owes you ₹850", SUCCESS),
        ("Raj", "You owe Raj ₹1,200", NAVY),
        ("Priya", "Settled up", MUTED),
    ]
    for name, status, color in settlements:
        rounded_rect(draw, (48, y, w - 48, y + 128), 20, WHITE, outline=(225, 230, 240), width=2)
        rounded_rect(draw, (72, y + 28, 128, y + 100), 28, (*NAVY, 40))
        draw.text((92, y + 48), name[0], fill=NAVY, font=load_font("Poppins-Bold.ttf", 28))
        draw.text((156, y + 36), name, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
        draw.text((156, y + 72), status, fill=color, font=load_font("Inter_Medium.ttf", 20))
        y += 148
    rounded_rect(draw, (48, y + 12, w - 48, y + 96), 28, NAVY)
    tw, _ = text_size(draw, "Mark as settled", load_font("Poppins-Bold.ttf", 26))
    draw.text(((w - tw) // 2, y + 40), "Mark as settled", fill=WHITE, font=load_font("Poppins-Bold.ttf", 26))
    return img


def make_premium_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 260), 0, DARK_NAVY)
    mark = promo.fit_glyph(glyph, 72)
    img.paste(mark, (48, 72), mark)
    draw.text((140, 88), "Trivense Premium", fill=WHITE, font=load_font("Poppins-Bold.ttf", 30))
    draw.text((140, 132), "Unlock the full experience", fill=GOLD_LIGHT, font=load_font("Inter_Medium.ttf", 18))
    y = 300
    perks = [
        ("Unlimited categories", "Organize every expense your way"),
        ("Settlements", "Clear who owes whom instantly"),
        ("Export & backup", "CSV export and secure cloud backup"),
        ("Ad-free", "Focus on your group, not ads"),
    ]
    for title, sub in perks:
        rounded_rect(draw, (48, y, w - 48, y + 112), 18, WHITE, outline=(225, 230, 240), width=2)
        rounded_rect(draw, (72, y + 28, 108, y + 84), 12, GOLD)
        draw.text((128, y + 28), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        draw.text((128, y + 62), sub, fill=MUTED, font=load_font("Inter_Medium.ttf", 17))
        y += 132
    rounded_rect(draw, (48, h - 160, w - 48, h - 72), 28, GOLD)
    tw, _ = text_size(draw, "Start Premium · ₹99/mo", load_font("Poppins-Bold.ttf", 24))
    draw.text(((w - tw) // 2, h - 128), "Start Premium · ₹99/mo", fill=DARK_NAVY, font=load_font("Poppins-Bold.ttf", 24))
    return img


def make_feature_graphic(logo: Image.Image, screens: dict[str, Image.Image]) -> Image.Image:
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), (*NAVY, 255))
    draw = ImageDraw.Draw(img)

    draw.ellipse((620, -150, 1080, 310), fill=(0, 82, 128, 110))
    draw.ellipse((-140, 160, 260, 560), fill=(*DARK_NAVY, 220))
    for i in range(5):
        cx = 760 + i * 42
        cy = 370 + int(math.sin(i * 1.2) * 10)
        draw.ellipse((cx, cy, cx + 10, cy + 10), fill=(*GOLD, 140))

    mark = fit_logo(logo, 140, fill_ratio=0.88)
    img.paste(mark, (44, 72), mark)
    draw.text((210, 96), "Trivense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 54))
    draw.text((210, 162), TAGLINE, fill=(220, 228, 240), font=load_font("Inter_Medium.ttf", 22))
    draw.text((210, 198), "Trips · Roommates · Families · Teams", fill=MUTED, font=load_font("Inter_Regular.ttf", 17))

    rounded_rect(draw, (210, 248, 400, 292), 22, GOLD)
    draw.text((232, 258), "Download Free", fill=DARK_NAVY, font=load_font("Poppins-Bold.ttf", 20))

    pills = ["Multi-currency", "Real-time sync", "India-first"]
    px = 44
    py = 420
    for pill in pills:
        tw, _ = text_size(draw, pill, load_font("Inter_Medium.ttf", 14))
        rounded_rect(draw, (px, py, px + tw + 28, py + 34), 16, (0, 82, 128, 200))
        draw.text((px + 14, py + 8), pill, fill=WHITE, font=load_font("Inter_Medium.ttf", 14))
        px += tw + 40

    paste_phone(img, screens["split"], 640, 8, scale=0.245)
    draw_flat_illustration(draw, "team", 520, 300, 90)
    return img


LISTING_SCREENS = [
    {
        "file": "screenshot_01_split_expenses.png",
        "headline": "Split Expenses Easily",
        "subhead": "For groups, travelers, roommates, and more.",
        "badge": "SPLIT BILLS",
        "screen_key": "home",
        "illus_theme": "team",
        "layout": "gradient",
        "layout_desc": "Top text block, floating minimalist phone mockup below. Gradient background from light navy to white.",
        "illustration": "Four diverse people collaborating over coins and a rising line graph",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header at the top: "
            "'Split Expenses Easily'. Below it, smaller text: 'For groups, travelers, roommates, and more.' The main area "
            "features a clean, white background with a subtle soft blue-to-white gradient at the top. Floating in the center "
            "is a modern smartphone mockup showing the main Trivense Home Screen, which displays a balance card "
            "('You are owed ₹1,200') and recent activity. Above and surrounding the phone mockup is a stylized flat "
            "illustration of four diverse people happily collaborating over a stack of modern coins and a rising gold line "
            "graph. The aesthetic is clean, minimal, and premium, using navy and gold accents. Rounded cards and soft shadows "
            "define the UI."
        ),
    },
    {
        "file": "screenshot_02_track_expenses.png",
        "headline": "Track Every Expense",
        "subhead": "Fast entry, detailed notes, and instant categories.",
        "badge": "TRACK",
        "screen_key": "track",
        "illus_theme": "categories",
        "layout": "track",
        "layout_desc": "Top text block, partial device view showing a complex expense form.",
        "illustration": "Close-up hands holding a phone with floating category icons (Coffee, Taxi, Groceries)",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: "
            "'Track Every Expense'. Smaller text: 'Fast entry, detailed notes, and instant categories.' The phone mockup "
            "below shows a complex 'New Expense' screen with rounded input fields for Amount, Date, Category (represented "
            "by simple outline icons), Notes, and Payer. The UI uses light navy, white, and a touch of gold. Surrounding the "
            "phone mockup is a close-up flat illustration of stylized hands holding a mobile device, with various floating "
            "category icons (like a coffee cup, a taxi, and a shopping cart) swirling above it, emphasizing the speed and "
            "detail. Minimalist and clean."
        ),
    },
    {
        "file": "screenshot_03_create_boards.png",
        "headline": "Create Boards",
        "subhead": "Organize spending by Trip, Household, or Project.",
        "badge": "BOARDS",
        "screen_key": "boards",
        "illus_theme": "travel",
        "layout": "boards_grid",
        "layout_desc": "Left-aligned text block, large diagonal grid of phone screens showcasing board lists.",
        "illustration": "Small icons next to board names (Airplane, House, Gear/Team)",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Create Boards'. "
            "Smaller text: 'Organize spending by Trip, Household, or Project.' The main area features multiple overlapping "
            "phone mockups in a slight diagonal grid. These phone screens each display a list of rounded 'Board' cards, "
            "showcasing examples like 'Summer Goa Trip', '9th Street Apartment', and 'Team Project'. The board list uses "
            "clear icons (airplane, house, gear) and minimal text. The background is white with subtle depth and clean navy "
            "and gold accents. The overall look is clean, efficient, and sophisticated."
        ),
    },
    {
        "file": "screenshot_04_budgets_alerts.png",
        "headline": "Budgets & Alerts",
        "subhead": "Set spending limits and receive instant notifications.",
        "badge": "BUDGETS",
        "screen_key": "budget",
        "illus_theme": "budget",
        "layout": "budget_alert",
        "layout_desc": "Center-aligned text block, large single device showing budget status with notification overlay.",
        "illustration": "Money bag with security lock and exclamation notification rising above it",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Budgets & Alerts'. "
            "Smaller text: 'Set spending limits and receive instant notifications.' The phone mockup below shows a specific "
            "'Board Budget' screen. The main feature is a clear horizontal progress bar indicating ₹15,000 out of ₹20,000 "
            "spent, rendered in white, navy, and accented in gold. Overlaid on the screen is a clean, rounded notification "
            "card with an exclamation icon that reads 'Budget Alert: 75% Spent'. The surrounding area features a stylized "
            "flat illustration of a secure money bag with a shield and a small floating notification bell. The lighting and "
            "design are sophisticated and clean."
        ),
    },
    {
        "file": "screenshot_05_realtime_sync.png",
        "headline": "Real-time Sync",
        "subhead": "Instant updates across all your group's devices.",
        "badge": "SYNC",
        "screen_key": "sync",
        "extra_screen_key": "sync",
        "illus_theme": "sync",
        "layout": "dual_phones",
        "layout_desc": "Symmetrical layout with two interconnected devices and cloud icon between them.",
        "illustration": "Cloud icon connecting two phones with upward arrows and gold data particles",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Real-time Sync'. "
            "Smaller text: 'Instant updates across all your group's devices.' Two minimalist smartphone mockups are shown "
            "floating side-by-side. Both devices display identical screens with matching recent activity feeds, emphasizing "
            "immediate, seamless updating (e.g., the exact same 'Grocery bill added' entry is visible). A subtle cloud icon "
            "is positioned between the two phones, connecting them with subtle golden data streams and upward-pointing arrows, "
            "symbolizing live syncing. The overall design is clean, using deep navy, white, and a polished metallic gold accent."
        ),
    },
    {
        "file": "screenshot_06_analytics.png",
        "headline": "Analytics",
        "subhead": "Detailed spending charts and deep category breakdown.",
        "badge": "INSIGHTS",
        "screen_key": "analytics",
        "illus_theme": "analytics",
        "layout": "default",
        "layout_desc": "Top text, large phone mockup dedicated to data visualization.",
        "illustration": "Abstract flat charts and graphs floating around the phone with gold upward arrow",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Analytics'. "
            "Smaller text: 'Detailed spending charts and deep category breakdown.' The phone mockup below is focused on a "
            "data visualization dashboard screen. It features a sophisticated, clean pie chart (using navy and white, with "
            "gold highlighting key segments) and a minimal bar graph. The screen clearly shows spending categories and "
            "trends. Surrounding the phone is a sophisticated flat illustration of abstract, interlocking charts, graphs, and "
            "financial data points, all colored in navy and gold. The overall feeling is professional, intelligent, and "
            "trustworthy."
        ),
    },
    {
        "file": "screenshot_07_who_owes_whom.png",
        "headline": "Who Owes Whom",
        "subhead": "Simplified debt resolution and effortless payments.",
        "badge": "SETTLE UP",
        "screen_key": "settlements",
        "illus_theme": "settle",
        "layout": "settle",
        "layout_desc": "Center-aligned text block, large single device showing a settlement list.",
        "illustration": "Two people shaking hands with simplified arrow and INR currency flow between them",
        "ai_prompt": (
            "A premium portrait phone screenshot (1080x1920) for the 'Trivense' app. Large, bold header: 'Who Owes Whom'. "
            "Smaller text: 'Simplified debt resolution and effortless payments.' The phone mockup below shows a clean "
            "'Settlements' screen. The screen displays a clear list of rounded cards with user names and profile icons, "
            "indicating who owes money. Example entries include 'Sarah owes you ₹850' with green text, and 'You owe Raj "
            "₹1,200' with navy text. The surrounding background features a clean flat illustration of two stylized people "
            "reaching an agreement, with a sophisticated arrow and currency flow (showing the INR symbol) between them, "
            "rendered in navy and a soft gold. The lighting is bright and clean."
        ),
    },
    {
        "file": "screenshot_08_premium.png",
        "headline": "Premium Features",
        "subhead": "Unlimited categories, export, and backup",
        "badge": "PREMIUM",
        "screen_key": "premium",
        "illus_theme": "premium",
        "layout": "default",
        "layout_desc": "Top 19% navy gradient headline band with badge + headline + subhead + flat illustration. Center: phone mockup with premium UI",
        "illustration": "Flat premium accent top-right in headline band",
        "ai_prompt": "App store screenshot 1080x1920, premium minimal fintech, navy header, bold headline Premium Features, subhead Unlimited categories export and backup, phone mockup showing expense app premium, white cream background, gold accents, lots of whitespace",
    },
]


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA" and "icon" in path.name:
        img.save(path, "PNG", optimize=True)
    else:
        img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(ROOT)} ({img.size[0]}×{img.size[1]})")


def write_specs(manifest: dict) -> None:
    path = LISTING / "LISTING_SPECS.md"
    lines = [
        "# Trivense — App Store Listing Image System",
        "",
        "Complete production specs for Google Play and Apple App Store listing graphics.",
        "",
        f"**App name:** Trivense: Split expenses, made easy.",
        f"**Tagline:** {TAGLINE}",
        "",
        "## Brand palette",
        "",
        "| Token | Hex | Usage |",
        "|-------|-----|-------|",
        "| Primary Navy | `#003D66` | Headers, feature graphic, CTA backgrounds |",
        "| Dark Navy | `#002847` | App icon background, gradient depth |",
        "| Header | `#000000` | Optional high-contrast titles |",
        "| Background | `#FFFFFF` | Cards, clean areas |",
        "| Muted Text | `#888888` | Subheads, captions |",
        "| Gold Accent | `#C9A24E` | Badges, highlights, premium CTAs |",
        "",
        "## Global layout rules",
        "",
        "- One feature per screenshot; benefit-first copy",
        "- 48px minimum padding (scaled per canvas)",
        "- Headline band ≈19% of canvas height",
        "- Phone mockup centered, 86% canvas width max",
        "- Poppins Bold headlines, Inter Medium subheads",
        "- Never distort logo; 72% fill on icon, 88% on feature graphic",
        "",
    ]

    for asset in manifest["assets"]:
        lines.extend([
            f"---",
            f"",
            f"## {asset['title']}",
            f"",
            f"1. **Title:** {asset['title']}",
            f"2. **Purpose:** {asset['purpose']}",
            f"3. **Dimensions:** {asset['dimensions']}",
            f"4. **Layout:** {asset['layout']}",
            f"5. **Color palette:** {asset['colors']}",
            f"6. **Typography:** {asset['typography']}",
            f"7. **Illustration:** {asset['illustration']}",
            f"8. **Spacing:** {asset['spacing']}",
            f"9. **UI elements:** {asset['ui_elements']}",
            f"10. **Headline:** {asset['headline']}",
            f"11. **Supporting text:** {asset['supporting_text']}",
            f"12. **CTA:** {asset.get('cta', '—')}",
            f"13. **AI prompt:** {asset['ai_prompt']}",
            f"14. **Figma notes:** {asset['figma_notes']}",
            f"15. **Developer notes:** {asset['dev_notes']}",
            f"",
            f"**Export path:** `{asset['path']}`",
            f"",
        ])

    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  ✓ {path.relative_to(ROOT)}")


def build_manifest() -> dict:
    common_colors = "Primary Navy #003D66, Dark Navy #002847, Gold #C9A24E, White #FFFFFF, Muted #888888"
    common_type = "Headline: Poppins Bold 50–54px; Subhead: Inter Medium 22px; Badge: Inter Medium 15px"
    common_spacing = "48px edge padding; 64px headline-to-subhead; 19% headline band height"
    common_figma = "Auto-layout headline band; component variants for Android/iOS; logo as component; phone frame as component"
    common_dev = "Export @1x PNG; no transparency on screenshots; sRGB; optimize with pngquant or Play Console upload"

    assets = [
        {
            "title": "App Icon (512×512)",
            "purpose": "Google Play store icon — primary brand recognition in search and home",
            "dimensions": "512 × 512 px PNG, square, no rounded corners",
            "layout": "Full-bleed Dark Navy (#002847) canvas; logo centered at 72% fill with safe margins",
            "colors": common_colors,
            "typography": "No text — logo only",
            "illustration": "Use attached 3D glassmorphism wallet + gold growth arrow logo as-is",
            "spacing": "14% safe margin on all sides (logo occupies ~72% of canvas)",
            "ui_elements": "Logo mark only on navy background",
            "headline": "—",
            "supporting_text": "—",
            "cta": "—",
            "ai_prompt": "Premium fintech app icon, dark navy #002847 background, centered glass wallet card with gold upward arrow, 3D glassmorphism, minimal, no text, 512x512, crisp edges, safe margins",
            "figma_notes": "512×512 frame; logo component locked aspect ratio; export 1x PNG",
            "dev_notes": "Also used as Play Console high-res icon; sync to assets/icon.png via generate-brand-assets.py",
            "path": "store-assets/listing/app-icon/app_icon_512.png",
        },
        {
            "title": "Feature Graphic (1024×500)",
            "purpose": "Play Store banner — first visual above screenshots; drives install intent",
            "dimensions": "1024 × 500 px PNG",
            "layout": "Left: logo + wordmark + tagline + gold CTA pill. Right: phone mockup (dashboard). Bottom: trust pills. Background: navy gradient orbs",
            "colors": common_colors,
            "typography": "Trivense: Poppins Bold 54px; Tagline: Inter Medium 22px; CTA: Poppins Bold 20px",
            "illustration": "Subtle team/travel flat accent near phone; gold dot pattern",
            "spacing": "44px left margin; CTA 46px below tagline; pills 44px from bottom",
            "ui_elements": "Logo, wordmark, tagline, Download Free CTA, phone mockup, trust pills",
            "headline": "Trivense",
            "supporting_text": "Split expenses, made easy. · Trips · Roommates · Families · Teams",
            "cta": "Download Free",
            "ai_prompt": "Google Play feature graphic 1024x500, premium fintech, navy gradient, Trivense logo left, bold headline Split expenses made easy, gold CTA button, phone mockup right showing expense app, minimal clean whitespace, Splitwise Tricount style",
            "figma_notes": "1024×500; left text block max 560px; phone frame component right-aligned",
            "dev_notes": "Required for Play Store listing; upload as Feature Graphic",
            "path": "store-assets/listing/feature-graphic/feature_graphic_1024x500.png",
        },
    ]

    for i, spec in enumerate(LISTING_SCREENS, 1):
        assets.append({
            "title": f"Phone Screenshot {i} — {spec['headline']}",
            "purpose": f"Play Store screenshot #{i} — highlight {spec['screen_key']} feature for ASO conversion",
            "dimensions": "1080 × 1920 px (Android); also exported at 1290×2796 (iOS) and 1600×2560 (tablet)",
            "layout": spec.get("layout_desc", f"Top 19% navy gradient headline band. Center: phone mockup with {spec['screen_key']} UI"),
            "colors": common_colors,
            "typography": common_type,
            "illustration": spec.get("illustration", f"Flat {spec['illus_theme']} accent in headline band"),
            "spacing": common_spacing,
            "ui_elements": f"Phone frame, {spec['screen_key']} mock screen, badge pill, gold underline accent",
            "headline": spec["headline"],
            "supporting_text": spec["subhead"],
            "cta": "—",
            "ai_prompt": spec.get("ai_prompt", f"App store screenshot 1080x1920, premium minimal fintech, navy header, bold headline {spec['headline']}, subhead {spec['subhead']}, phone mockup showing expense app {spec['screen_key']}, white cream background, gold accents, lots of whitespace"),
            "figma_notes": common_figma,
            "dev_notes": common_dev,
            "path": f"store-assets/listing/screenshots/android/{spec['file']}",
        })

    return {"assets": assets, "screens": LISTING_SCREENS}


def main() -> None:
    print("Generating Trivense store listing image system…\n")
    logo = load_logo()
    logo.save(SOURCE / "logo.png", "PNG")

    glyph = promo.extract_glyph(SOURCE / "logo.png")
    screens = {
        "home": make_home_screen(glyph),
        "track": make_track_expense_screen(glyph),
        "boards": make_boards_screen(glyph),
        "budget": make_budget_screen(glyph),
        "sync": make_sync_activity_screen(glyph),
        "analytics": make_analytics_screen(glyph),
        "settlements": make_settlements_screen(glyph),
        "premium": make_premium_screen(glyph),
        "split": make_home_screen(glyph),
    }

    manifest = build_manifest()

    save(make_app_icon_512(logo), LISTING / "app-icon" / "app_icon_512.png")
    save(make_feature_graphic(logo, screens), LISTING / "feature-graphic" / "feature_graphic_1024x500.png")

    for spec in LISTING_SCREENS:
        extra = screens.get(spec.get("extra_screen_key")) if spec.get("extra_screen_key") else None
        for canvas_w, canvas_h, platform in (
            (ANDROID_W, ANDROID_H, "android"),
            (IOS_W, IOS_H, "ios"),
            (TABLET_W, TABLET_H, "tablet"),
        ):
            img = make_listing_screenshot(
                screens[spec["screen_key"]],
                canvas_w=canvas_w,
                canvas_h=canvas_h,
                headline=spec["headline"],
                subhead=spec["subhead"],
                badge=spec["badge"],
                illus_theme=spec["illus_theme"],
                layout=spec.get("layout", "default"),
                extra_screen=extra,
            )
            save(img, LISTING / "screenshots" / platform / spec["file"])

    # Legacy Play folder aliases for existing upload scripts
    PLAY_LEGACY.mkdir(parents=True, exist_ok=True)
    save(Image.open(LISTING / "app-icon" / "app_icon_512.png"), PLAY_LEGACY / "app_icon_512.png")
    save(Image.open(LISTING / "app-icon" / "app_icon_512.png"), PLAY_LEGACY / "trivense_icon_512.png")
    save(Image.open(LISTING / "feature-graphic" / "feature_graphic_1024x500.png"), PLAY_LEGACY / "feature_graphic_1024x500.png")
    save(Image.open(LISTING / "feature-graphic" / "feature_graphic_1024x500.png"), PLAY_LEGACY / "trivense_feature_graphic.png")
    for i, spec in enumerate(LISTING_SCREENS, 1):
        src = LISTING / "screenshots" / "android" / spec["file"]
        save(Image.open(src), PLAY_LEGACY / f"phone_screenshot_{i}.png")
        if i <= 2:
            save(Image.open(src), PLAY_LEGACY / f"trivense_screenshot_{i}.png")

    (LISTING / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    write_specs(manifest)

    total = 2 + len(LISTING_SCREENS) * 3
    print(f"\nDone — {total} images + specs in {LISTING.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
