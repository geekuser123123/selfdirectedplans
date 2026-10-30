"""Build the Self Directed 401k Dallas logo system as outlined SVGs (no font dependency).

Usage: python3 -I scripts/build-logo.py
Requires: fonttools, brotli (to read the woff2 files in assets/fonts).
Outputs SVGs to assets/brand/. PNGs are rendered by scripts/render-logo-png.js.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"
OUT = ROOT / "assets" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

PINE = "#142D30"
COPPER = "#D4A66A"
WHITE = "#FFFFFF"
CHARCOAL = "#202829"
IVORY = "#F4F0E8"


def text_path(font_file, text, size, tracking_em, x0, baseline):
    """Return (svg path data, advance width) for text set on a baseline."""
    font = TTFont(font_file)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    tracking = tracking_em * size
    pen = SVGPathPen(glyphs)
    x = x0
    names = [cmap[ord(c)] for c in text]
    for i, name in enumerate(names):
        glyph = glyphs[name]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        x += glyph.width * scale
        if i < len(names) - 1:
            x += tracking
    return pen.getCommands(), x - x0


def cap_height(font_file, size):
    font = TTFont(font_file)
    os2 = font["OS/2"]
    return getattr(os2, "sCapHeight", 0) * size / font["head"].unitsPerEm


# The monogram: an angular S. Two bars are joined by a copper diagonal "path"
# that descends through the mark; chamfered corners point the way forward.
def monogram(stem, path, ox=0, oy=0, s=1.0):
    def pts(p):
        return " ".join(f"{ox + x * s:.2f},{oy + y * s:.2f}" for x, y in p)
    return (
        f'<polygon fill="{stem}" points="{pts([(6, 6), (42, 6), (36, 14), (6, 14)])}"/>'
        f'<polygon fill="{stem}" points="{pts([(12, 34), (42, 34), (42, 42), (6, 42)])}"/>'
        f'<polygon fill="{path}" points="{pts([(6, 14), (14, 14), (42, 28), (42, 34), (34, 34), (6, 20)])}"/>'
    )


def write(name, body, w, h, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Self Directed 401k Dallas">'
        f"<title>Self Directed 401k Dallas</title>{rect}{body}</svg>\n"
    )
    (OUT / name).write_text(svg)
    print("wrote", name)


teko = FONTS / "teko-latin-500-normal.woff2"
poppins = FONTS / "poppins-latin-500-normal.woff2"


def horizontal(word_fill, sub_fill, stem, path, bg=None, name=""):
    icon_size = 64
    s = icon_size / 48
    gap = 16
    word_size = 52
    word_cap = cap_height(teko, word_size)
    sub_size = 16
    sub_cap = cap_height(poppins, sub_size)
    x0 = icon_size + gap
    pad_top = (icon_size - (word_cap + 8 + sub_cap)) / 2
    word_base = pad_top + word_cap
    word_d, word_w = text_path(teko, "SELF DIRECTED 401K", word_size, 0.05, x0, word_base)
    sub_base = word_base + 8 + sub_cap
    sub_d, sub_w = text_path(poppins, "DALLAS", sub_size, 0.35, x0 + 1, sub_base)
    # A fine copper rule runs from DALLAS to the end of the wordmark.
    rule_x = x0 + 1 + sub_w + 14
    rule = f'<rect x="{rule_x:.2f}" y="{sub_base - sub_cap / 2 - 0.5:.2f}" width="{x0 + word_w - rule_x:.2f}" height="1" fill="{sub_fill}"/>'
    body = (
        monogram(stem, path, 0, 0, s)
        + f'<path fill="{word_fill}" d="{word_d}"/>'
        + f'<path fill="{sub_fill}" d="{sub_d}"/>'
        + rule
    )
    write(name, body, x0 + word_w + 2, icon_size, bg)


horizontal(WHITE, COPPER, WHITE, COPPER, name="logo-dark-bg.svg")
horizontal(CHARCOAL, "#8A6A3E", PINE, COPPER, name="logo-light-bg.svg")
write("icon.svg", monogram(PINE, COPPER), 48, 48)
write("icon-light.svg", monogram(WHITE, COPPER), 48, 48)
# Favicon: monogram on a Deep Pine tile, readable at 16px.
write("favicon.svg", f'<rect width="48" height="48" rx="6" fill="{PINE}"/>' + monogram(WHITE, COPPER, 5, 5, 38 / 48), 48, 48)
