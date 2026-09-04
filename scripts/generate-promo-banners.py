#!/usr/bin/env python3
"""Generate Trivense Play Store / marketing banners (1024×682) in Rasoi-style layouts."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ROOT / "store-assets" / "promo"
FONTS = ASSETS / "fonts"

W, H = 1024, 682

# Brand palette — matches app.config.js (#31356e) + theme accents
BRAND = (49, 53, 110)
BRAND_LIGHT = (62, 68, 130)
BRAND_DARK = (38, 42, 92)
CREAM = (245, 247, 252)
WHITE = (255, 255, 255)
TEXT_DARK = (30, 34, 72)
ACCENT = (13, 148, 136)  # teal
ACCENT_LIGHT = (16, 185, 169)
SUCCESS = (16, 185, 129)
MUTED = (160, 168, 210)
TAGLINE = "Split expenses, made easy."


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def extract_glyph(icon_path: Path) -> Image.Image:
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
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum > 170:
                gp[x, y] = (255, 255, 255, min(255, a))
    bbox = glyph.getbbox()
    if not bbox:
        raise RuntimeError(f"Could not extract glyph from {icon_path}")
    return glyph.crop(bbox)


def fit_glyph(glyph: Image.Image, size: int, fill_ratio: float = 0.88) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = int(size * fill_ratio)
    g = glyph.copy()
    g.thumbnail((target, target), Image.LANCZOS)
    ox = (size - g.size[0]) // 2
    oy = (size - g.size[1]) // 2
    canvas.paste(g, (ox, oy), g)
    return canvas


def rounded_rect(draw, xy, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text_size(draw, text, font):
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def draw_wave_split(img: Image.Image, wave_y: float = 0.68):
    """Top = brand color, bottom = cream with wavy divider."""
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, int(H * wave_y) + 40), fill=BRAND)
    pts = []
    for x in range(0, W + 1, 8):
        y = int(H * wave_y + math.sin(x / 80) * 18 + math.sin(x / 35) * 8)
        pts.append((x, y))
    pts += [(W, H), (0, H)]
    draw.polygon(pts, fill=CREAM)
    return img


def draw_diagonal_split(img: Image.Image):
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, H), fill=CREAM)
    pts = [(int(W * 0.42), 0), (W, 0), (W, H), (0, H), (0, int(H * 0.55))]
    draw.polygon(pts, fill=BRAND)
    draw.ellipse((680, -100, 1080, 300), fill=(*BRAND_LIGHT, 100))
    return img


def brand_header(img: Image.Image, glyph: Image.Image, x: int = 48, y: int = 36):
    mark = fit_glyph(glyph, 56)
    img.paste(mark, (x, y), mark)
    draw = ImageDraw.Draw(img)
    draw.text((x + 68, y + 6), "Trivense", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 28))
    draw.text((x + 68, y + 38), TAGLINE, fill=(*MUTED[:3],), font=load_font("Inter_Regular.ttf", 13))


def draw_phone(img: Image.Image, screen: Image.Image, x: int, y: int, scale: float = 0.34):
    sw, sh = screen.size
    fw, fh = int(sw * scale), int(sh * scale)
    frame_img = screen.resize((fw, fh), Image.LANCZOS)
    bezel = 12
    outer = Image.new("RGBA", (fw + bezel * 2, fh + bezel * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(outer)
    rounded_rect(d, (0, 0, fw + bezel * 2 - 1, fh + bezel * 2 - 1), 32, (18, 22, 48, 255))
    rounded_rect(d, (bezel, bezel, fw + bezel - 1, fh + bezel - 1), 22, (0, 0, 0, 255))
  # dynamic island
    d.rounded_rectangle((fw // 2 - 36 + bezel, bezel + 8, fw // 2 + 36 + bezel, bezel + 24), radius=10, fill=(30, 30, 30, 255))
    outer.paste(frame_img, (bezel, bezel))
    img.paste(outer, (x, y), outer)


def make_dashboard_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 260), 0, BRAND)
    mark = fit_glyph(glyph, 80)
    img.paste(mark, (40, 70), mark)
    draw.text((140, 88), "Trivense", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 34))
    draw.text((140, 132), "Dashboard", fill=MUTED, font=load_font("Inter_Medium.ttf", 20))
    y = 300
    draw.text((48, y), "This week", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 36))
    y += 60
    for label, val in [("Total spent", "₹12,450"), ("Active boards", "3"), ("Budget left", "₹8,200")]:
        rounded_rect(draw, (48, y, w - 48, y + 130), 18, WHITE, outline=(225, 228, 238), width=2)
        draw.text((76, y + 24), label, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
        draw.text((76, y + 56), val, fill=BRAND, font=load_font("Poppins-Bold.ttf", 32))
        y += 150

    y += 12
    draw.text((48, y), "Recent expenses", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
    y += 48
    recent = [
        ("Dinner · Goa trip", "₹2,400", "Food"),
        ("Uber · Airport", "₹680", "Travel"),
        ("Hotel share", "₹4,200", "Stay"),
    ]
    for title, amt, cat in recent:
        rounded_rect(draw, (48, y, w - 48, y + 108), 16, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (64, y + 24, 92, y + 84), 10, ACCENT)
        draw.text((108, y + 22), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 22))
        draw.text((108, y + 52), cat, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 16))
        tw, _ = text_size(draw, amt, load_font("Poppins-Bold.ttf", 24))
        draw.text((w - 64 - tw, y + 36), amt, fill=BRAND, font=load_font("Poppins-Bold.ttf", 24))
        y += 124
    return img


def make_boards_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, BRAND)
    draw.text((48, 80), "Expense boards", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 240
    boards = [
        ("Europe Trip 2025", "₹48,200", ACCENT),
        ("Home & utilities", "₹9,840", (79, 70, 229)),
        ("Office lunch", "₹2,150", (249, 115, 22)),
    ]
    for name, amt, color in boards:
        rounded_rect(draw, (48, y, w - 48, y + 160), 20, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (68, y + 24, 100, y + 136), 12, color)
        draw.text((120, y + 36), name, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
        draw.text((120, y + 78), amt, fill=BRAND, font=load_font("Poppins-Bold.ttf", 30))
        y += 184
    return img


def make_analytics_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, BRAND)
    draw.text((48, 80), "Analytics", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 260
    draw.text((48, y), "Spending breakdown", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 28))
    y += 56
    cats = [("Food", 32, ACCENT), ("Travel", 24, (79, 70, 229)), ("Shopping", 18, (249, 115, 22)), ("Other", 26, (148, 163, 184))]
    for name, pct, color in cats:
        rounded_rect(draw, (48, y, w - 48, y + 56), 12, WHITE, outline=(225, 228, 238), width=1)
        rounded_rect(draw, (64, y + 14, 64 + int((w - 200) * pct / 100), y + 42), 8, color)
        draw.text((w - 120, y + 16), f"{pct}%", fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 18))
        draw.text((64, y - 22), name, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 16))
        y += 80
    return img


def make_split_screen(glyph: Image.Image) -> Image.Image:
    """Splitwise-style group balance list with owe/owed colors."""
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 220), 0, BRAND)
    draw.text((48, 72), "Balances", fill=WHITE, font=load_font("Poppins-Bold.ttf", 34))
    draw.text((48, 124), "Overall, you are owed ₹2,050", fill=ACCENT_LIGHT, font=load_font("Inter_Medium.ttf", 20))
    y = 260
    groups = [
        ("Goa Trip 2025", "you are owed ₹1,450", SUCCESS, "🏖️"),
        ("Home & utilities", "you owe ₹680", (249, 115, 22), "🏠"),
        ("Office lunch", "settled up", (148, 163, 184), "🍽️"),
    ]
    for name, status, color, emoji in groups:
        rounded_rect(draw, (48, y, w - 48, y + 148), 20, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (72, y + 28, 132, y + 92), 16, (*BRAND_LIGHT, 40))
        draw.text((88, y + 44), emoji, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 28))
        draw.text((156, y + 32), name, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
        draw.text((156, y + 72), status, fill=color, font=load_font("Inter_Medium.ttf", 20))
        y += 168
    rounded_rect(draw, (w - 220, h - 140, w - 48, h - 56), 32, ACCENT)
    draw.text((w - 196, h - 112), "+ Add expense", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 22))
    return img


def make_settle_screen(glyph: Image.Image) -> Image.Image:
    """Tricount-style hero balance card."""
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, BRAND)
    draw.text((48, 80), "Goa Trip 2025", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 240
    rounded_rect(draw, (48, y, w - 48, y + 220), 24, WHITE, outline=(225, 228, 238), width=2)
    draw.text((88, y + 36), "🤑", fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 44))
    draw.text((160, y + 44), "You're owed", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 20))
    draw.text((160, y + 76), "₹1,450", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 52))
    draw.text((160, y + 148), "By Rahul & Priya", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 20))
    y += 260
    draw.text((48, y), "Suggested payments", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 26))
    y += 52
    payments = [("Rahul → You", "₹900"), ("Priya → You", "₹550")]
    for pair, amt in payments:
        rounded_rect(draw, (48, y, w - 48, y + 100), 16, WHITE, outline=(225, 228, 238), width=2)
        draw.text((76, y + 24), pair, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        draw.text((76, y + 58), amt, fill=ACCENT, font=load_font("Poppins-Bold.ttf", 26))
        y += 120
    rounded_rect(draw, (48, y + 24, w - 48, y + 108), 28, BRAND)
    tw, _ = text_size(draw, "Mark as settled", load_font("Poppins-Bold.ttf", 28))
    draw.text(((w - tw) // 2, y + 52), "Mark as settled", fill=WHITE, font=load_font("Poppins-Bold.ttf", 28))
    return img


def make_currency_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 200), 0, BRAND)
    draw.text((48, 80), "Multi-currency", fill=WHITE, font=load_font("Poppins-Bold.ttf", 32))
    y = 260
    draw.text((48, y), "Trip totals in any currency", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 28))
    y += 56
    currencies = [
        ("₹", "INR", "₹48,200", "Goa Trip", ACCENT),
        ("$", "USD", "$1,240", "NYC Weekend", (79, 70, 229)),
        ("€", "EUR", "€890", "Europe Tour", (249, 115, 22)),
        ("£", "GBP", "£620", "London Visit", (16, 185, 129)),
    ]
    for sym, code, amt, label, color in currencies:
        rounded_rect(draw, (48, y, w - 48, y + 132), 20, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (72, y + 28, 132, y + 104), 16, color)
        draw.text((96, y + 44), sym, fill=WHITE, font=load_font("Poppins-Bold.ttf", 36))
        draw.text((156, y + 32), label, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        draw.text((156, y + 64), f"{amt} · {code}", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
        draw.text((w - 120, y + 48), "Live", fill=SUCCESS, font=load_font("Inter_Medium.ttf", 16))
        y += 152
    return img


def make_invite_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 220), 0, BRAND)
    brand_header(img, glyph, 40, 50)
    y = 280
    draw.text((48, y), "Invite your group", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 32))
    y += 56
    rounded_rect(draw, (48, y, w - 48, y + 200), 24, WHITE, outline=(225, 228, 238), width=2)
    draw.text((80, y + 32), "Share code", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
    draw.text((80, y + 68), "TRV-GOA-7K2", fill=BRAND, font=load_font("Poppins-Bold.ttf", 40))
    rounded_rect(draw, (80, y + 136, 280, y + 180), 20, ACCENT)
    draw.text((108, y + 148), "Copy link", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 18))
    y += 240
    draw.text((48, y), "Members (4)", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
    y += 48
    members = [("You", "Admin", BRAND), ("Rahul", "Member", ACCENT), ("Priya", "Member", (79, 70, 229)), ("Amit", "Member", (249, 115, 22))]
    for name, role, color in members:
        rounded_rect(draw, (48, y, w - 48, y + 88), 16, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (72, y + 20, 120, y + 68), 24, color)
        initial = name[0]
        tw, _ = text_size(draw, initial, load_font("Poppins-Bold.ttf", 22))
        draw.text((96 - tw // 2, y + 30), initial, fill=WHITE, font=load_font("Poppins-Bold.ttf", 22))
        draw.text((140, y + 22), name, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 22))
        draw.text((140, y + 50), role, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 16))
        y += 104
    return img


def make_sync_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 260), 0, BRAND)
    mark = fit_glyph(glyph, 80)
    img.paste(mark, (40, 70), mark)
    draw.text((140, 88), "Trivense", fill=WHITE, font=load_font("Poppins-SemiBold.ttf", 34))
    draw.text((140, 132), "Synced · Just now", fill=ACCENT_LIGHT, font=load_font("Inter_Medium.ttf", 20))
    y = 300
    perks = [
        ("Offline-first", "Add expenses without signal"),
        ("Cloud sync", "Everyone sees updates instantly"),
        ("Secure boards", "Private to your group"),
    ]
    for title, sub in perks:
        rounded_rect(draw, (48, y, w - 48, y + 120), 18, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (72, y + 28, 108, y + 92), 12, ACCENT)
        draw.text((128, y + 28), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 24))
        draw.text((128, y + 62), sub, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
        y += 140
    rounded_rect(draw, (48, y + 20, w - 48, y + 180), 20, (*BRAND_LIGHT, 30))
    draw.text((80, y + 48), "Free to start", fill=BRAND, font=load_font("Poppins-Bold.ttf", 32))
    draw.text((80, y + 96), "1 board · Weekly analytics · 3 categories", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
    draw.text((80, y + 132), "Premium: unlimited boards, export, ad-free", fill=ACCENT, font=load_font("Inter_Medium.ttf", 18))
    return img


def make_search_screen(glyph: Image.Image) -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, w, 220), 0, BRAND)
    brand_header(img, glyph, 40, 50)
    y = 260
    rounded_rect(draw, (48, y, w - 48, y + 56), 28, WHITE)
    draw.text((80, y + 16), "Search expenses...", fill=(148, 163, 184), font=load_font("Inter_Regular.ttf", 20))
    y += 80
    for chip in ["This week", "Food", "Shared"]:
        rounded_rect(draw, (48, y, 48 + 140, y + 40), 20, ACCENT)
        draw.text((68, y + 10), chip, fill=WHITE, font=load_font("Inter_Medium.ttf", 16))
        y += 0
    chips_x = [48, 200, 352]
    for i, chip in enumerate(["This week", "Food", "Shared"]):
        rounded_rect(draw, (chips_x[i], 340, chips_x[i] + 130, 380), 20, ACCENT)
        draw.text((chips_x[i] + 16, 350), chip, fill=WHITE, font=load_font("Inter_Medium.ttf", 15))
    y = 420
    rounded_rect(draw, (48, y, w - 48, y + 200), 20, WHITE, outline=(225, 228, 238), width=2)
    draw.text((76, y + 24), "Dinner at cafe", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 26))
    draw.text((76, y + 64), "₹2,400 · Food · Shared", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))
    rounded_rect(draw, (76, y + 110, 200, y + 150), 16, (*ACCENT, 30) if False else (204, 251, 241))
    draw.text((96, y + 120), "Perfect match", fill=ACCENT, font=load_font("Inter_Medium.ttf", 16))
    return img


def banner_01_hook(glyph: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND)
    img = draw_wave_split(img, 0.62)
    draw = ImageDraw.Draw(img)
    brand_header(img, glyph, 56, 40)
    draw.text((56, 130), "Never Wonder", fill=WHITE, font=load_font("Poppins-Bold.ttf", 52))
    draw.text((56, 192), "Who Owes What", fill=WHITE, font=load_font("Poppins-Bold.ttf", 52))
    draw.text((56, 268), "Kab kitna diya?", fill=(*MUTED[:3],), font=load_font("Inter_Regular.ttf", 22))

    icon_size = 180
    mark = fit_glyph(glyph, icon_size)
    icon_bg = Image.new("RGBA", (icon_size + 40, icon_size + 40), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(icon_bg)
    rounded_rect(d2, (0, 0, icon_size + 39, icon_size + 39), 36, BRAND_LIGHT)
    icon_bg.paste(mark, (20, 20), mark)
    img.paste(icon_bg, (W // 2 - icon_size // 2 - 20, 280), icon_bg)

    draw.text((W // 2 - 28, 470), "FREE", fill=WHITE, font=load_font("Poppins-Bold.ttf", 14))
    rounded_rect(draw, (W // 2 - 36, 458, W // 2 + 36, 490), 12, SUCCESS)

    features = [("Unlimited boards", "📊"), ("Real-time sync", "🔄"), ("Smart analytics", "📈")]
    fx = 120
    for title, _ in features:
        rounded_rect(draw, (fx, 530, fx + 240, 610), 16, WHITE, outline=(225, 228, 238), width=2)
        draw.text((fx + 20, 558), title, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 16))
        fx += 270

    rounded_rect(draw, (W // 2 - 200, 630, W // 2 + 200, 672), 28, BRAND)
    tw, _ = text_size(draw, "Download Free", load_font("Poppins-Bold.ttf", 22))
    draw.text((W // 2 - tw // 2, 644), "Download Free", fill=WHITE, font=load_font("Poppins-Bold.ttf", 22))
    return img


def banner_02_problem(glyph: Image.Image, screen: Image.Image) -> Image.Image:
    img = draw_diagonal_split(Image.new("RGBA", (W, H), CREAM))
    draw = ImageDraw.Draw(img)
    brand_header(img, glyph, 48, 36)
    draw.text((48, 140), "Confused About", fill=WHITE, font=load_font("Poppins-Bold.ttf", 46))
    draw.text((48, 200), "Splitting Bills?", fill=WHITE, font=load_font("Poppins-Bold.ttf", 46))
    draw.text((48, 272), "Get instant expense clarity", fill=MUTED, font=load_font("Inter_Medium.ttf", 22))
    draw.text((48, 560), "Settled in seconds.", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 26))
    draw_phone(img, screen, 560, 80, scale=0.38)
    # notification card
    rounded_rect(draw, (820, 180, 990, 260), 14, WHITE)
    draw.text((840, 198), "7 PM", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 14))
    draw.text((840, 220), "Split ready", fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 16))
    return img


def banner_03_feature(glyph: Image.Image, screen: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND)
    img = draw_wave_split(img, 0.65)
    draw = ImageDraw.Draw(img)
    brand_header(img, glyph, 48, 36)
    rounded_rect(draw, (48, 100, 210, 132), 8, BRAND_LIGHT)
    draw.text((60, 106), "FEATURE", fill=WHITE, font=load_font("Inter_Medium.ttf", 14))
    draw.text((48, 150), "Track Every", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((48, 206), "Shared Expense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((48, 272), "Based on your boards, budget, and members.", fill=MUTED, font=load_font("Inter_Regular.ttf", 18))

    feats = [
        ("Smart boards", "Create trip & group boards"),
        ("Better splits", "See who owes whom instantly"),
        ("Personalized", "Based on your spending habits"),
    ]
    fx = 48
    for title, sub in feats:
        rounded_rect(draw, (fx, 560, fx + 290, 650), 14, WHITE, outline=(225, 228, 238), width=2)
        rounded_rect(draw, (fx + 16, 576, fx + 56, 616), 20, ACCENT)
        draw.text((fx + 72, 578), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 17))
        draw.text((fx + 72, 604), sub, fill=(110, 118, 145), font=load_font("Inter_Regular.ttf", 13))
        fx += 320

    draw_phone(img, screen, 580, 60, scale=0.36)
    return img


def banner_04_boards(glyph: Image.Image, screen: Image.Image) -> Image.Image:
    img = draw_diagonal_split(Image.new("RGBA", (W, H), CREAM))
    draw = ImageDraw.Draw(img)
    mark = fit_glyph(glyph, 72)
    rounded_rect(draw, (48, 36, 120, 108), 16, BRAND)
    img.paste(mark, (48, 36), mark)
    draw.text((140, 52), "10+", fill=ACCENT_LIGHT, font=load_font("Poppins-Bold.ttf", 48))
    draw.text((140, 108), "Board Types", fill=TEXT_DARK, font=load_font("Poppins-Bold.ttf", 36))
    draw.text((140, 158), "Trips · Home · Office · Events", fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 18))

    pills = ["Europe Trip", "Home Bills", "Office", "Events", "& more"]
    px = 48
    for pill in pills:
        rounded_rect(draw, (px, 600, px + 150, 640), 20, WHITE, outline=BRAND, width=2)
        tw, _ = text_size(draw, pill, load_font("Inter_Medium.ttf", 13))
        draw.text((px + (150 - tw) // 2, 612), pill, fill=BRAND, font=load_font("Inter_Medium.ttf", 13))
        px += 168

    draw_phone(img, screen, 520, 40, scale=0.40)
    return img


def banner_05_insights(glyph: Image.Image, screen: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND)
    img = draw_wave_split(img, 0.68)
    draw = ImageDraw.Draw(img)
    brand_header(img, glyph, 48, 36)
    draw.text((48, 108), "SIMPLICITY", fill=WHITE, font=load_font("Inter_Medium.ttf", 13))
    draw.text((48, 140), "Find What Fits", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((48, 198), "Your Budget Today", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((48, 264), "This week. Shared. By category.", fill=MUTED, font=load_font("Inter_Regular.ttf", 18))

    icons = [("<20 min", "Quick add"), ("Shared", "Group split"), ("Kids", "Family board")]
    ix = 48
    for label, sub in icons:
        rounded_rect(draw, (ix, 580, ix + 180, 660), 40, WHITE)
        draw.text((ix + 50, 600), label, fill=BRAND, font=load_font("Poppins-Bold.ttf", 18))
        draw.text((ix + 30, 628), sub, fill=(110, 118, 145), font=load_font("Inter_Regular.ttf", 12))
        ix += 210

    draw_phone(img, screen, 560, 50, scale=0.37)
    return img


def banner_06_social(glyph: Image.Image, screen: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, H), fill=BRAND)
    draw.ellipse((-60, 400, 300, 760), fill=(*BRAND_DARK,))
    draw.text((56, 56), "Loved By Travelers", fill=WHITE, font=load_font("Poppins-Bold.ttf", 48))
    draw.text((56, 120), "Unlimited boards · Real-time sync · Analytics", fill=MUTED, font=load_font("Inter_Medium.ttf", 20))

    cards = [
        ("Multi-board", "Organize every trip"),
        ("INR + more", "Multi-currency"),
        ("Smart splits", "Who owes whom"),
        ("92% accuracy", "Budget tracking"),
    ]
    cx = 56
    for title, sub in cards:
        rounded_rect(draw, (cx, 200, cx + 200, 300), 16, WHITE)
        draw.text((cx + 16, 222), title, fill=BRAND, font=load_font("Poppins-Bold.ttf", 18))
        draw.text((cx + 16, 252), sub, fill=(110, 118, 145), font=load_font("Inter_Regular.ttf", 13))
        cx += 220

    draw.text((56, 340), "✓ Safe · Secure · Reliable", fill=WHITE, font=load_font("Inter_Medium.ttf", 16))
    draw.text((56, 368), "Your data is private. Your expenses are personal.", fill=MUTED, font=load_font("Inter_Regular.ttf", 14))
    draw_phone(img, screen, 620, 30, scale=0.38)
    return img


def banner_07_lifestyle_dark(glyph: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), (20, 24, 48))
    draw = ImageDraw.Draw(img)
    # warm gradient overlay
    for y in range(H):
        alpha = int(80 * (1 - y / H))
        draw.line([(0, y), (W, y)], fill=(49, 53, 110, alpha))
    draw.text((56, 48), "★ Less Guessing.", fill=WHITE, font=load_font("Poppins-Bold.ttf", 42))
    draw.text((56, 100), "More Sharing.", fill=WHITE, font=load_font("Poppins-Bold.ttf", 42))
    draw.text((56, 162), "5 daily insights. ", fill=WHITE, font=load_font("Inter_Medium.ttf", 20))
    draw.text((260, 162), "Zero bill stress.", fill=ACCENT_LIGHT, font=load_font("Inter_Medium.ttf", 20))

    stats = [("Unlimited", "boards"), ("Real-time", "sync"), ("Multi", "currency"), ("Smart", "analytics")]
    sx = 56
    for a, b in stats:
        draw.line([(sx + 60, 220), (sx + 60, 280)], fill=(80, 90, 140), width=1)
        draw.text((sx, 230), a, fill=WHITE, font=load_font("Inter_Medium.ttf", 14))
        draw.text((sx, 252), b, fill=MUTED, font=load_font("Inter_Regular.ttf", 12))
        sx += 130

    mark = fit_glyph(glyph, 48)
    rounded_rect(draw, (56, 600, 108, 652), 12, BRAND)
    img.paste(mark, (56, 600), mark)
    draw.text((120, 612), "Trivense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 22))
    draw.text((120, 638), "Your everyday expense companion.", fill=MUTED, font=load_font("Inter_Regular.ttf", 12))

    # schedule cards right
    cards = [
        ("Mon", "Europe Trip", "₹4,200"),
        ("Tue", "Home bills", "₹1,840"),
        ("Wed", "Office lunch", "₹650"),
        ("Thu", "Weekend trip", "₹2,100"),
        ("Fri", "Settle up", "₹800"),
    ]
    cy = 40
    for day, title, amt in cards:
        rounded_rect(draw, (720, cy, 990, cy + 90), 14, WHITE)
        draw.text((740, cy + 14), day, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 13))
        draw.text((740, cy + 34), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 16))
        draw.text((740, cy + 58), amt, fill=BRAND, font=load_font("Poppins-Bold.ttf", 16))
        cy += 100

    rounded_rect(draw, (720, 560, 990, 600), 20, WHITE)
    draw.text((740, 572), "❤ Loved by 10,000+ travelers", fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 14))
    return img


def banner_08_lifestyle_family(glyph: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND_DARK)
    draw = ImageDraw.Draw(img)
    # simulated warm photo gradient
    for y in range(H):
        t = y / H
        r = int(30 + 40 * t)
        g = int(28 + 30 * t)
        b = int(50 + 20 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))
    draw.text((56, 56), "Spend More Time", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((56, 112), "Traveling Together", fill=WHITE, font=load_font("Poppins-Bold.ttf", 44))
    draw.text((56, 176), "Less tracking. More memories.", fill=MUTED, font=load_font("Inter_Medium.ttf", 20))

    cards = [
        ("8:00 AM", "Breakfast", "☀️ Trip budget check"),
        ("12:30 PM", "Lunch", "☀️ Log shared meal"),
        ("4:00 PM", "Snack", "☀️ Split with group"),
        ("7:00 PM", "Dinner", "🌙 Settle today's share"),
        ("10:00 PM", "Review", "🌙 See who owes whom"),
    ]
    cy = 220
    for time, title, desc in cards:
        rounded_rect(draw, (56, cy, 420, cy + 72), 14, WHITE)
        rounded_rect(draw, (72, cy + 16, 104, cy + 56), 8, BRAND)
        draw.text((120, cy + 14), time, fill=(110, 118, 145), font=load_font("Inter_Medium.ttf", 12))
        draw.text((120, cy + 32), title, fill=TEXT_DARK, font=load_font("Poppins-SemiBold.ttf", 16))
        draw.text((120, cy + 52), desc, fill=(110, 118, 145), font=load_font("Inter_Regular.ttf", 11))
        cy += 82

    mark = fit_glyph(glyph, 100)
    rounded_rect(draw, (780, 480, 960, 640), 24, BRAND)
    img.paste(mark, (820, 520), mark)
    draw.text((820, 600), "Trivense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 24))
    draw.text((780, 648), "Loved by 10,000+ groups ❤", fill=WHITE, font=load_font("Inter_Medium.ttf", 14))
    return img


def banner_09_cta(glyph: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (W, H), BRAND)
    img = draw_wave_split(img, 0.55)
    draw = ImageDraw.Draw(img)
    brand_header(img, glyph, 56, 40)
    draw.text((56, 130), "Start Splitting", fill=WHITE, font=load_font("Poppins-Bold.ttf", 50))
    draw.text((56, 192), "Smarter Today", fill=WHITE, font=load_font("Poppins-Bold.ttf", 50))
    draw.text((56, 262), "Download ", fill=WHITE, font=load_font("Inter_Medium.ttf", 22))
    draw.text((180, 262), "Trivense", fill=WHITE, font=load_font("Poppins-Bold.ttf", 22))
    draw.text((56, 290), "now.", fill=WHITE, font=load_font("Inter_Medium.ttf", 22))

    draw.text((56, 400), "TRIVENSE", fill=BRAND, font=load_font("Poppins-Bold.ttf", 42))
    draw.text((56, 452), "EXPENSE TRACKING MADE EASY", fill=ACCENT, font=load_font("Inter_Medium.ttf", 14))

    icon_size = 200
    mark = fit_glyph(glyph, icon_size)
    icon_bg = Image.new("RGBA", (icon_size + 48, icon_size + 48), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(icon_bg)
    rounded_rect(d2, (0, 0, icon_size + 47, icon_size + 47), 40, BRAND_LIGHT)
    icon_bg.paste(mark, (24, 24), mark)
    img.paste(icon_bg, (700, 80), icon_bg)

    boxes = [("FREE", "Free to start"), ("📊", "Smart analytics"), ("🌍", "Multi-currency"), ("⚡", "Real-time sync")]
    bx = 56
    for icon, label in boxes:
        rounded_rect(draw, (bx, 510, bx + 200, 580), 14, WHITE, outline=(225, 228, 238), width=2)
        draw.text((bx + 20, 528), icon, fill=BRAND, font=load_font("Poppins-Bold.ttf", 20))
        draw.text((bx + 20, 552), label, fill=TEXT_DARK, font=load_font("Inter_Medium.ttf", 13))
        bx += 220

    rounded_rect(draw, (W // 2 - 220, 610, W // 2 + 220, 662), 28, BRAND)
    tw, _ = text_size(draw, "Download Trivense Free  →", load_font("Poppins-Bold.ttf", 20))
    draw.text((W // 2 - tw // 2, 626), "Download Trivense Free  →", fill=WHITE, font=load_font("Poppins-Bold.ttf", 20))
    return img


BANNERS = [
    ("01-hook-never-wonder-who-owes-what", lambda g, s: banner_01_hook(g)),
    ("02-problem-confused-about-splitting", lambda g, s: banner_02_problem(g, s["dashboard"])),
    ("03-feature-track-shared-expenses", lambda g, s: banner_03_feature(g, s["boards"])),
    ("04-feature-expense-boards", lambda g, s: banner_04_boards(g, s["boards"])),
    ("05-feature-budget-insights", lambda g, s: banner_05_insights(g, s["search"])),
    ("06-social-proof-travelers", lambda g, s: banner_06_social(g, s["analytics"])),
    ("07-lifestyle-less-guessing", lambda g, s: banner_07_lifestyle_dark(g)),
    ("08-lifestyle-travel-together", lambda g, s: banner_08_lifestyle_family(g)),
    ("09-cta-download-today", lambda g, s: banner_09_cta(g)),
]


def main() -> None:
    print("Generating Trivense promo banners (1024×682)…\n")
    OUT.mkdir(parents=True, exist_ok=True)
    glyph = extract_glyph(ASSETS / "icon.png")
    screens = {
        "dashboard": make_dashboard_screen(glyph),
        "boards": make_boards_screen(glyph),
        "analytics": make_analytics_screen(glyph),
        "split": make_split_screen(glyph),
        "settle": make_settle_screen(glyph),
        "search": make_search_screen(glyph),
        "currency": make_currency_screen(glyph),
        "invite": make_invite_screen(glyph),
        "sync": make_sync_screen(glyph),
    }
    for name, builder in BANNERS:
        img = builder(glyph, screens)
        path = OUT / f"{name}.png"
        img.save(path, "PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)} ({img.size[0]}×{img.size[1]})")
    print(f"\nDone — {len(BANNERS)} banners in {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
