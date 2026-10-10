#!/usr/bin/env python3
"""
Génère les ressources de marque RECTOY-AIRES :
  - favicons (SVG, ICO, PNG, apple-touch-icon, icônes PWA)
  - vidéo de splash screen (paysage + portrait) et affiches
Usage : python3 scripts/brand/make_assets.py   (nécessite Pillow et ffmpeg)
L'emblème est redessiné (hexagone circuit + R). Pour utiliser le logo officiel,
remplacez draw_emblem() ou copiez vos propres fichiers dans public/.
"""
import math, os, subprocess, shutil, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUB = os.path.join(ROOT, "public")
FONT_B = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
FONT_M = "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf"
FONT_L = "/usr/share/fonts/truetype/google-fonts/Poppins-LightItalic.ttf"

BG = (7, 17, 31)
C1 = (0, 168, 255)
C2 = (0, 119, 182)
CY = (69, 199, 255)
WHITE = (255, 255, 255)

def ease(t):  # easeOutCubic
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def seg(t, a, b):  # progression 0..1 de t entre a et b
    return max(0.0, min(1.0, (t - a) / (b - a)))

def hex_pts(cx, cy, r):
    return [(cx + r * math.cos(math.radians(-90 + 60 * k)),
             cy + r * math.sin(math.radians(-90 + 60 * k))) for k in range(6)]

def partial_line(d, pts, prog, color, width):
    """Trace une polyligne sur la fraction prog de sa longueur."""
    lens = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(lens); target = total * prog; acc = 0; drawn = [pts[0]]
    for i, L in enumerate(lens):
        if acc + L <= target:
            drawn.append(pts[i + 1]); acc += L
        else:
            f = (target - acc) / L if L else 0
            a, b = pts[i], pts[i + 1]
            drawn.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)); break
    if len(drawn) > 1:
        d.line(drawn, fill=color, width=int(width), joint="curve")
    return drawn[-1]

def circuits(cx, cy, r):
    """Pistes de circuit sortant des sommets (coordonnées relatives à l'échelle r)."""
    v = hex_pts(cx, cy, r); out = []
    # (sommet, direction radiale, longueur 1, angle de coude, longueur 2)
    spec = [(1, -30, .55, 0, .45), (2, 30, .5, 0, .5), (4, 150, .5, 180, .5), (5, 210, .55, 180, .45), (0, -90, .38, -45, .3)]
    for vi, ang, l1, ang2, l2 in spec:
        p0 = v[vi]
        p1 = (p0[0] + r * l1 * math.cos(math.radians(ang)), p0[1] + r * l1 * math.sin(math.radians(ang)))
        p2 = (p1[0] + r * l2 * math.cos(math.radians(ang2)), p1[1] + r * l2 * math.sin(math.radians(ang2)))
        out.append([p0, p1, p2])
    return out

def draw_emblem(img, cx, cy, r, t, S=1.0, letter_font=None):
    """Dessine l'emblème à l'instant t (0..1 = progression totale de l'animation)."""
    d = ImageDraw.Draw(img, "RGBA")
    w = max(2, int(r * 0.075))
    hp = hex_pts(cx, cy, r) + [hex_pts(cx, cy, r)[0]]
    p_hex = ease(seg(t, 0.0, 0.55))
    partial_line(d, hp, p_hex, C1 + (255,), w)
    # hexagone intérieur fin
    hp2 = hex_pts(cx, cy, r * 0.82) + [hex_pts(cx, cy, r * 0.82)[0]]
    partial_line(d, hp2, ease(seg(t, 0.12, 0.62)), C2 + (200,), max(1, int(w * 0.35)))
    # circuits
    for i, path in enumerate(circuits(cx, cy, r)):
        p = ease(seg(t, 0.30 + i * 0.05, 0.75 + i * 0.03))
        end = partial_line(d, path, p, CY + (230,), max(2, int(w * 0.5)))
        if p >= 0.98:
            nr = max(3, int(w * 0.85))
            d.ellipse([path[-1][0] - nr, path[-1][1] - nr, path[-1][0] + nr, path[-1][1] + nr], fill=BG + (255,), outline=CY + (255,), width=max(2, int(w * .4)))
    # lettre R
    a = ease(seg(t, 0.55, 0.85))
    if a > 0 and letter_font:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.text((cx, cy + r * 0.04), "R", font=letter_font, fill=WHITE + (int(255 * a),), anchor="mm")
        img.alpha_composite(layer)

def glow(img, amount=1.0, radius=18):
    alpha = img.split()[3].resize((img.width // 4, img.height // 4), Image.BILINEAR)
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius / 4)).resize(img.size, Image.BILINEAR)
    alpha = alpha.point(lambda v: min(255, int(v * amount * 0.9)))
    out = Image.new("RGBA", img.size, C1 + (0,))
    out.putalpha(alpha)
    return out

# ----------------------------------------------------------------- favicons
def favicon_image(size):
    S = 4; N = size * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, N - 1, N - 1], radius=int(N * 0.22), fill=BG + (255,))
    f = ImageFont.truetype(FONT_B, int(N * 0.40))
    # aucun circuit à petite taille : hexagone + R pour rester lisible
    r = N * 0.36; cx = cy = N / 2
    hp = hex_pts(cx, cy, r) + [hex_pts(cx, cy, r)[0]]
    d.line(hp, fill=C1 + (255,), width=max(2, int(N * 0.05)), joint="curve")
    d.text((cx, cy + N * 0.015), "R", font=f, fill=WHITE + (255,), anchor="mm")
    return img.resize((size, size), Image.LANCZOS)

def make_favicons():
    for size, name in [(16, "favicon-16.png"), (32, "favicon-32.png"), (48, "favicon-48.png"),
                       (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        favicon_image(size).save(os.path.join(PUB, name))
    favicon_image(256).save(os.path.join(PUB, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    # SVG vectoriel (navigateurs modernes)
    pts = " ".join(f"{50 + 36 * math.cos(math.radians(-90 + 60 * k)):.2f},{50 + 36 * math.sin(math.radians(-90 + 60 * k)):.2f}" for k in range(6))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00a8ff"/><stop offset="1" stop-color="#0077b6"/></linearGradient></defs>
<rect width="100" height="100" rx="22" fill="#07111f"/>
<polygon points="{pts}" fill="none" stroke="url(#g)" stroke-width="5" stroke-linejoin="round"/>
<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Poppins,Segoe UI,Arial,sans-serif" font-weight="700" font-size="40" fill="#fff">R</text>
</svg>
'''
    open(os.path.join(PUB, "favicon.svg"), "w").write(svg)
    open(os.path.join(PUB, "site.webmanifest"), "w").write('''{
  "name": "RECTOY-AIRES",
  "short_name": "RECTOY-AIRES",
  "description": "Technologie • Innovation • Impact",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#07111f",
  "theme_color": "#07111f",
  "lang": "fr",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
''')

# --------------------------------------------------------------- splash vidéo
LAYOUTS = {
    "landscape": dict(W=1280, H=720, ecx=640, ecy=215, er=100, word=60, sub=18, tag=19, slo=28, name="splash"),
    "portrait":  dict(W=720, H=1280, ecx=360, ecy=450, er=125, word=48, sub=17, tag=17, slo=28, name="splash-mobile"),
}
FPS = 30; DUR = 5.2

def background(W, H):
    bg = Image.new("RGBA", (W, H), BG + (255,))
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(grid)
    step = 60
    for x in range(0, W, step): d.line([(x, 0), (x, H)], fill=(0, 168, 255, 14))
    for y in range(0, H, step): d.line([(0, y), (W, y)], fill=(0, 168, 255, 14))
    bg.alpha_composite(grid)
    vig = Image.new("L", (W, H), 0); vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * .2, -H * .1, W * 1.2, H * 1.1], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(W, H) * .18))
    dark = Image.new("RGBA", (W, H), (4, 10, 18, 255))
    return Image.composite(bg, dark, vig)

def spaced_text(d, cx, y, text, font, spacing, fills, alpha_fn, rise_fn):
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = cx - total / 2
    for i, ch in enumerate(text):
        a = alpha_fn(i, len(text)); dy = rise_fn(i, len(text))
        if a > 0:
            d.text((x, y + dy), ch, font=font, fill=fills(i) + (int(255 * a),), anchor="ls")
        x += widths[i] + spacing

def make_splash(layout_key, keep_frames=False):
    L = LAYOUTS[layout_key]; W, H = L["W"], L["H"]; SS = 2
    base = background(W, H)
    f_letter = ImageFont.truetype(FONT_B, int(L["er"] * 2 * SS * 0.68))
    f_word = ImageFont.truetype(FONT_B, L["word"] * SS)
    f_sub = ImageFont.truetype(FONT_M, L["sub"] * SS)
    f_tag = ImageFont.truetype(FONT_M, L["tag"] * SS)
    f_slo = ImageFont.truetype(FONT_L, L["slo"] * SS)
    fdir = os.path.join("/tmp", f"splash_{layout_key}")
    shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)
    n = int(FPS * DUR)
    word_y = L["ecy"] + L["er"] + L["word"] + 48
    for i in range(n):
        t = i / FPS
        fade_out = 1 - seg(t, DUR - 0.5, DUR)
        layer = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        # emblème
        draw_emblem(layer, L["ecx"] * SS, L["ecy"] * SS, L["er"] * SS, seg(t, 0.2, 2.6), letter_font=f_letter)
        # pulsation lumineuse après apparition
        pulse = 0.55 + 0.45 * math.sin(max(0, t - 2.0) * 3.2) if t > 2.0 else seg(t, 0.8, 2.0) * 0.55
        g = glow(layer, amount=1.2 * pulse + 0.2, radius=26 * SS)
        d = ImageDraw.Draw(layer, "RGBA")
        cx = W * SS // 2
        # mot-symbole
        t0 = 2.2
        spaced_text(d, cx, word_y * SS, "RECTOY-AIRES", f_word, 7 * SS,
                    lambda k: WHITE if k < 6 else CY,
                    lambda k, m: ease(seg(t, t0 + k * 0.055, t0 + 0.45 + k * 0.055)),
                    lambda k, m: (1 - ease(seg(t, t0 + k * 0.055, t0 + 0.45 + k * 0.055))) * 26 * SS)
        # TECHNOLOGIES
        a = ease(seg(t, 3.0, 3.6))
        spaced_text(d, cx, (word_y + L["sub"] + 26) * SS, "T E C H N O L O G I E S", f_sub, 4 * SS,
                    lambda k: (154, 167, 183), lambda k, m: a, lambda k, m: 0)
        # ligne
        la = ease(seg(t, 3.2, 3.9)); lw = int(W * (0.18 if layout_key == "landscape" else 0.36) * SS * la)
        ly = int((word_y + L["sub"] + 26 + L["tag"] + 8) * SS)
        d.line([(cx - lw // 2, ly), (cx + lw // 2, ly)], fill=C1 + (int(200 * la),), width=2 * SS)
        # tagline
        a = ease(seg(t, 3.5, 4.1))
        spaced_text(d, cx, (word_y + L["sub"] + 26 + L["tag"] + 52) * SS, "TECHNOLOGIE • INNOVATION • IMPACT", f_tag, 3 * SS,
                    lambda k: CY, lambda k, m: a, lambda k, m: (1 - a) * 12 * SS)
        # devise
        a = ease(seg(t, 4.0, 4.6))
        d.text((cx, (word_y + L["sub"] + 26 + L["tag"] + 62 + L["slo"] + 18) * SS), "Grandeur & Rigueur",
               font=f_slo, fill=WHITE + (int(235 * a),), anchor="ms")
        # assemblage
        layer = layer.resize((W, H), Image.LANCZOS)
        g = g.resize((W, H), Image.BILINEAR)
        frame = base.copy(); frame.alpha_composite(g); frame.alpha_composite(layer)
        # fondu d'entrée / sortie
        intro = ease(seg(t, 0.0, 0.35))
        out = Image.blend(Image.new("RGBA", (W, H), BG + (255,)), frame, intro * fade_out + (1 - intro * fade_out) * 0)
        out.convert("RGB").save(os.path.join(fdir, f"{i:04d}.png"))
        if i == int(FPS * 4.4):
            out.convert("RGB").save(os.path.join(PUB, "src", f"{L['name']}-poster.jpg"), quality=85)
    mp4 = os.path.join(PUB, "src", f"{L['name']}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fdir, "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow",
                    "-movflags", "+faststart", "-an", mp4], check=True)
    if not keep_frames: shutil.rmtree(fdir, ignore_errors=True)
    print("OK", mp4, round(os.path.getsize(mp4) / 1024), "Ko")

if __name__ == "__main__":
    os.makedirs(os.path.join(PUB, "src"), exist_ok=True)
    make_favicons(); print("favicons OK")
    what = sys.argv[1:] or ["landscape", "portrait"]
    for k in what: make_splash(k)
