"""Turn raw Pollinations renders into print-ready collage pieces.

usage: python3 tools/process.py
  assets/raw/<name>.jpg  ->  assets/cut/<name>.png

Modes (see JOBS):
  ht   newsprint halftone: ink dots (45 deg screen) + a little continuous tone,
       written as dark ink on a transparent background so the scene can lay it
       over any paper scrap.
  cut  colour cutout: the near-white background is flood-filled away from the
       border and the subject gets a white sticker rim, posterised slightly so
       it reads as printed.
Every raw render loses its bottom strip first (the generator's watermark).
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, 'assets', 'raw'), os.path.join(ROOT, 'assets', 'cut')
INK = (28, 24, 22)

# name: (mode, output width, crop box as fractions l,t,r,b, contrast gamma)
JOBS = {
    'corn':       ('ht', 640, (0.06, 0.03, 0.94, 0.93), 1.0),
    'cart':       ('ht', 640, (0.05, 0.12, 0.95, 0.93), 1.0),
    'palace':     ('ht', 900, (0.0, 0.0, 1.0, 0.94), 1.5),
    'crowd':      ('ht', 900, (0.0, 0.44, 1.0, 0.955), 1.0),
    'concession': ('ht', 900, (0.08, 0.33, 0.98, 0.93), 1.0),
    'dig':        ('ht', 900, (0.0, 0.0, 1.0, 0.93), 1.0),
}


def load(name, crop, width):
    im = Image.open(os.path.join(RAW, name + '.jpg')).convert('RGB')
    w, h = im.size
    l, t, r, b = crop
    im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)


def halftone(im, gamma, cell=6.0):
    g = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    g = np.asarray(g.filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32) / 255.0
    dark = np.clip(1.0 - g, 0, 1) ** gamma
    h, w = dark.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    c, s = np.cos(np.pi / 4), np.sin(np.pi / 4)
    u, v = (x * c + y * s) / cell, (-x * s + y * c) / cell
    du, dv = u - np.round(u), v - np.round(v)
    dist = np.sqrt(du * du + dv * dv)                 # 0 at dot centre, ~0.7 at cell corner
    radius = 0.72 * np.sqrt(dark)
    dots = np.clip((radius - dist) * cell * 1.2 + 0.5, 0, 1)
    alpha = np.maximum(dots * 0.95, dark * 0.32)      # dots + a whisper of continuous tone
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = INK
    out[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def cutout(im, rim=10):
    a = np.asarray(im, dtype=np.int16)
    bg = (a.min(axis=2) > 222) & ((a.max(axis=2) - a.min(axis=2)) < 26)
    # flood fill the background from the border so white highlights inside survive
    h, w = bg.shape
    seen = np.zeros_like(bg)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < h and 0 <= x < w and bg[y, x] and not seen[y, x]:
            seen[y, x] = True
            stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    mask = Image.fromarray(((~seen) * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))
    sticker = mask.filter(ImageFilter.MaxFilter(rim * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    img = ImageOps.posterize(im, 5)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    paper = Image.new('RGBA', im.size, (250, 246, 236, 255))
    out.paste(paper, (0, 0), sticker)
    out.paste(img.convert('RGBA'), (0, 0), mask.filter(ImageFilter.GaussianBlur(0.8)))
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (mode, width, crop, gamma) in JOBS.items():
        if not os.path.exists(os.path.join(RAW, name + '.jpg')):
            print('skip (no raw)', name)
            continue
        im = load(name, crop, width)
        res = halftone(im, gamma) if mode == 'ht' else cutout(im)
        res.save(os.path.join(OUT, name + '.png'), optimize=True)
        print(f'{name:11} {mode}  {res.size[0]}x{res.size[1]}')
