# Physics Whiteboard toolkit

Everything needed to turn a physics idea into a polished, narrated, hand-drawn
explainer video. The agent writes one `scene.html` + one `script.json` per
video; the scripts do the rest.

```
physics-videos/
├── toolkit/                 ← this folder (shared, installed once)
│   ├── lib/sketch.js        drawing library + runtime (window.Sketch)
│   ├── fonts/Caveat.ttf     handwriting font (OFL), loaded locally
│   ├── scripts/             setup · vo · capture · sfx · mix · qa
│   ├── templates/starter/   minimal whiteboard scene to copy
│   └── examples/leidenfrost/  full reference scene (sketchbook theme)
└── <video-id>/              one folder per video
    ├── brief.md             storyboard: concept, beats, visuals, captions
    ├── script.json          narration lines          → vo/, cues.json, cues.js
    ├── scene.html           the animation            → draft-silent.mp4, timeline.json
    ├── sfx.wav              foley (from timeline)
    ├── draft.mp4            turn 1 output (voice + foley)
    ├── music.mp3            turn 2 soft background track
    ├── final.mp4            turn 2 output (voice + foley + ducked music)
    ├── poster.jpg           1920×1080 payoff still
    ├── cover.jpg            1920×1080 cover photo (payoff frame + big title) = FIRST FRAME of every mp4
    └── qa/                  stills, contact sheets, waveform, review notes
```

## Pipeline (run from `toolkit/`)

| Step | Command | Output |
|---|---|---|
| once | `node scripts/setup.mjs` | installs deps, checks ffmpeg/ffprobe/Chrome |
| voice | `node scripts/vo.mjs ../<id>` | `vo/*.mp3`, `cues.json`, `cues.js` + cue sheet |
| preview | `node scripts/capture.mjs sheet ../<id> --every 2` | `qa/sheet_XX.jpg` (16 time-stamped frames each) |
| stills | `node scripts/capture.mjs stills ../<id> --times 3,12.5` | `qa/still_<t>.jpg` full-res |
| render | `node scripts/capture.mjs render ../<id>` | `draft-silent.mp4`, `timeline.json` (~5–6 s per video second) |
| foley | `node scripts/sfx.mjs ../<id>` | `sfx.wav` |
| cover | `node scripts/capture.mjs cover ../<id> --time <payoff t> [--title "…"]` | `cover.jpg` (title from the scene's `<title>`) |
| mix | `node scripts/mix.mjs ../<id> --out draft.mp4` | voice + foley, −16 LUFS; `cover.jpg` becomes the first frame (0.5 s hold + 0.4 s dissolve, audio shifted) |
| mix+music | `node scripts/mix.mjs ../<id> --music music.mp3 --out final.mp4` | music ducked under the voice |
| QA | `node scripts/qa.mjs ../<id> --file final.mp4` | PASS/FAIL report (incl. cover = first frame), sheets from the encoded file, waveform |
| probe | `node scripts/probe.mjs <file>` | duration / streams of any media file |
| poster | `node scripts/capture.mjs stills ../<id> --times <t> --out .` then rename `still_<t>.jpg` → `poster.jpg` | thumbnail |

Open `scene.html` directly in a browser to watch it live (space = pause,
R = restart, `?t=12` jumps to 12 s). The capture scripts load it with
`?video=1`, which renders frame-exact at 1920×1080.

## Scene skeleton

```html
<canvas id="stage"></canvas>
<script src="../toolkit/lib/sketch.js"></script>
<script src="cues.js"></script>
<script>
const S = Sketch.init({ theme: 'whiteboard' });      // or 'sketchbook'
const C = CUES.lines, TOTAL = CUES.total;            // narration timing
S.captions([[C.intro.at + 0.5, 'One short caption line', { n: 1 }], …]);
let state; function init() { state = …; }            // reset (called on start + every loop)
function update(dt, t) { … }                          // deterministic sim; use S.rand()
function draw(t) { … }                                // pure drawing for time t
S.run({ duration: TOTAL, init, update, draw, state: t => ({ rumble: 0.5 }) });
</script>
```

Stage = **1600 × 1000** units (centred on a 16:9 page; rendered at 1920×1080).
Keep ~60 units of margin. The caption band (y > 820) belongs to captions.

## Drawing API (`S.*`)

| Call | What it does |
|---|---|
| `ink(pts, {key, w, color, alpha, closed, dash, progress, j, passes})` | wobbly hand-drawn line; `progress` 0→1 draws it on (the marker pen follows the tip) |
| `wash(pts, rgb, alpha, {key, sp, edge, op})` | watercolour / marker fill (multiply); `op:'source-over'` to paint over dark areas |
| `fill(pts, cssColor, {key})` | opaque fill — knock out lines behind an object |
| `hatch(poly, {key, sp, ang, alpha})` | pencil hatching clipped to a shape (shadows, metal, glass) |
| `txt(s, x, y, {size, weight, color, align, alpha, rot, reveal})` | handwritten text; `reveal` 0→1 writes it on |
| `label(s, x, y, tx, ty, {reveal, color, bend})` | text + leader arrow to a target |
| `arrow(x0, y0, x1, y1, {bend, head, progress, color, w})` | curved arrow |
| `title(text, subtitle, {reveal})` | page title with swash + underline (top-left) |
| `captions([[t, text, {n, badge, band}], …])` | bottom caption, one line, auto cross-fade |
| `highlight(cx, cy, rx, ry)` | glossy white highlight on liquids / glass / metal |
| shapes | `ell, circle, rect, roundRect, arc, wave, spring, bezier` → point arrays |
| timing | `keys([[t,v],…])(t)` smooth keyframes · `ease(t,a,b)` 0→1 ramp · `pulse(t,a,b)` 0→1→0 · `cue(id)` |
| misc | `S.ctx` (raw canvas), `S.rand()` (seeded), `S.sfx(type, {gain, pitch})`, `PAL` (rgb palette), `INKS` (css ink colours), `rgba(rgb, a)` |

**Keys matter:** every `ink/wash/hatch/txt` call takes a `key` (number or
string). The key seeds that element's wobble, so the same key keeps the same
character between frames while the line "boils" 8×/s. Give each element its own
stable key; derive keys for dynamic items from their id (`1000 + drop.id * 40`).

**Fading:** wrap elements in `S.ctx.save(); S.ctx.globalAlpha = a; … restore()`
— every primitive multiplies into the current alpha.

## Sound design

`state(t)` returns bed levels 0..1: `rumble hiss crackle wind hum bubble motor rain`.
`S.sfx(type, {gain, pitch})` fires one-shots: `drip splash sizzle boing crash puff pop tick click whoosh swish thud chime ding zap clack spring`.
Keep foley subtle and tied to what is on screen; the voice is king.

## Voices (`script.json` → `"voice"`)

`en-US-AndrewMultilingualNeural` (warm male, default) · `en-US-AvaMultilingualNeural` (friendly female) ·
`en-US-EmmaMultilingualNeural` (cheerful female) · `en-US-BrianMultilingualNeural` (relaxed male) ·
`en-GB-RyanNeural` / `en-GB-SoniaNeural` (British, documentary).
Rate `-3%` to `-6%` sounds unhurried and clear.
