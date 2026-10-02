# Why the Bottle Curves

A 70-second, 9:16 (1080x1920) motion graphic explainer on why the Coca-Cola contour bottle looks the way it does, from the 1886 soda fountain to the 1993 plastic contour bottle. The style is newspaper cutout and mixed media: halftone print, torn paper, ransom-note type, rubber stamps, masking tape and marker notes, all moving on a 12 fps stop-motion boil.

**Final file:** `final.mp4` (H.264 + AAC, 30 fps, -16 LUFS)

## The story beats

| Time | Beat |
|---|---|
| 0:00 | Close your eyes. A fingertip traces the contour in the dark, in a crowd of plain bottles |
| 0:05 | 1886, Jacobs' Pharmacy, Atlanta. Five cents a glass, no bottle at all |
| 0:12 | 1894 onward: straight-sided glass with paper labels |
| 0:18 | Labels soak off in ice water. Copycats (Koka-Nola, Toka-Cola) use the same bottles |
| 0:25 | 1915 brief: a bottle you'd know by feel in the dark, or broken on the ground |
| 0:32 | Root Glass Co., Terre Haute. Earl R. Dean looks up coca and kola in the encyclopedia |
| 0:38 | He finds the cocoa pod instead. Wrong plant, perfect shape. The pod morphs into the bottle |
| 0:46 | 1916: the prototype wobbles on the line, gets slimmed. "Hobble skirt" |
| 0:52 | 1957 painted labels, 1960 the shape itself is trademarked, 1993 plastic keeps the curves |
| 1:02 | The lineup, then the payoff: an anti-copycat device you can feel |

## How it's made

Everything on screen is drawn in code (`scene.html`, canvas 2D). There are no stock or generated images.

- **Vessels:** each bottle is a radial profile curve rendered as a halftone, with painted highlights, flutes and a white scissor-cut border. Because the pod and the bottle share one profile format, the cocoa pod can morph straight into the contour bottle.
- **Type:** ransom-note headlines (eight typefaces, random paper chips), typewriter caption strips, Permanent Marker notes.
- **Audio:** Kokoro TTS voiceover (offline, `af_heart`), procedural foley from the scene's event list, and a procedural parlour-jazz bed that drops out for the "in the dark" beat.

## Rebuild

```bash
# 1. voice (needs kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases)
pip install kokoro-onnx soundfile scipy
python3 scripts/vo.py --models /path/to/kokoro      # vo/*.wav, cues.json, cues.js
for f in vo/*.wav; do ffmpeg -y -i "$f" -ar 24000 "${f%.wav}.mp3"; done

# 2. picture (uses the shared toolkit's puppeteer install)
(cd ../physics-videos/toolkit && npm install)
node scripts/render.mjs sheet --every 1          # qa/sheet_XX.jpg contact sheets
node scripts/render.mjs render                   # draft-silent.mp4 + timeline.json

# 3. sound + mix
python3 scripts/music.py                         # music.wav
node ../physics-videos/toolkit/scripts/sfx.mjs .  # sfx.wav from timeline events
node ../physics-videos/toolkit/scripts/mix.mjs . --music music.wav --no-cover --fade-in 0.05 --out final.mp4
```

Open `scene.html` in a browser to scrub it live (`?t=40` jumps to 40 s, space pauses).

## Fact notes

- First sold at Jacobs' Pharmacy, Atlanta, 8 May 1886, at 5 cents a glass.
- First bottled in 1894 (Biedenharn, Vicksburg); straight-sided bottles with paper diamond labels ran until 1916.
- The 1915 bottlers' brief asked for a bottle recognizable "by feel in the dark" or "lying broken on the ground".
- Root Glass Company, Terre Haute, Indiana. Earl R. Dean's team found the cocoa pod in the Encyclopaedia Britannica while looking for coca and kola. Design patent granted 16 Nov 1915.
- The wide prototype was unstable on conveyor belts and was slimmed for 1916 production. Nicknamed the "hobble skirt" bottle.
- Applied colour (painted) labels from 1957; the shape was registered as a trademark in 1960; the plastic contour bottle arrived in 1993.

Brand handling: the brand is named in narration and captions only. No logo, script lettering or trade dress artwork is recreated.
