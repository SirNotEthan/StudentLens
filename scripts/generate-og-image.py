"""One-off script to generate the site's social preview (og:image).
Run with: python scripts/generate-og-image.py
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG_TOP = (26, 46, 39)
BG_BOTTOM = (45, 90, 77)
ACCENT = (127, 209, 185)
WHITE = (245, 250, 248)

img = Image.new('RGB', (W, H), BG_TOP)
draw = ImageDraw.Draw(img)

for y in range(H):
    t = y / H
    r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
    g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
    b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

FONT_DIR = 'C:/Windows/Fonts/'
title_font = ImageFont.truetype(FONT_DIR + 'segoeuib.ttf', 108)
tagline_font = ImageFont.truetype(FONT_DIR + 'segoeui.ttf', 40)

# Accent bar
draw.rectangle([(90, 210), (98, 330)], fill=ACCENT)

draw.text((130, 220), 'StudentLens', font=title_font, fill=WHITE)
draw.text((132, 350), 'Student journalism, published.', font=tagline_font, fill=ACCENT)

# Corner accent circles for texture
draw.ellipse([(W - 260, -120), (W + 60, 180)], outline=ACCENT, width=3)
draw.ellipse([(-140, H - 160), (160, H + 140)], outline=ACCENT, width=3)

img.save('public/og-image.png', 'PNG', optimize=True)
print('Wrote public/og-image.png', img.size)
