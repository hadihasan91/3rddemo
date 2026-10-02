"""Original music bed: a light Paris-cafe musette (accordion, upright bass, brushes).
Fully synthesized, so there is nothing to license.
usage: python3 tools/music.py [seconds]   -> music.wav (48 kHz stereo)"""
import os, sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 69.0
BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int((DUR + 1) * SR)
L = np.zeros(N); R = np.zeros(N)
rnd = np.random.default_rng(7)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def env(n, a=0.01, r=0.08):
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e

def lowpass(x, hz_):
    a = 1 - np.exp(-2 * np.pi * hz_ / SR)
    return lfilter([a], [1, a - 1], x)

def accordion(m, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
    out = np.zeros(n)
    for det in (-0.0035, 0.0, 0.0042):                  # three reeds, musette detune
        ph = np.cumsum(hz(m) * (1 + det) * vib) / SR
        saw = 2 * (ph % 1) - 1
        sq = np.sign(np.sin(2 * np.pi * ph)) * 0.4
        out += saw * 0.5 + sq * 0.5
    out = lowpass(out, 2600) * 0.12 * vel
    return out * env(n, 0.025, min(0.12, dur * 0.4))

def pluck_bass(m, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    s *= np.exp(-t * 5.5); s[:120] *= np.linspace(0, 1, 120)
    return s * 0.42

def stab(ms, dur=0.22):
    out = sum(accordion(m, dur, 0.55) for m in ms); return out

def brush(dur=0.18, g=1.0):
    n = int(dur * SR); w = rnd.uniform(-1, 1, n)
    w = w - lowpass(w, 1800); return w * np.exp(-np.arange(n) / SR * 18) * 0.10 * g

def shaker(g=1.0):
    n = int(0.06 * SR); w = rnd.uniform(-1, 1, n); w = w - lowpass(w, 5000)
    return w * np.hanning(n) * 0.05 * g

# chords: (bass root midi, stab notes)
C, Am, Dm, G7, F, E7 = (36, [60, 64, 67]), (33, [60, 64, 69]), (38, [62, 65, 69]), (31, [59, 62, 65, 67]), (41, [60, 65, 69]), (40, [59, 64, 68])
prog = [C, Am, Dm, G7, C, F, G7, C, Am, E7, Am, Dm, F, G7, C, G7]
# melody per bar: list of (beat offset, midi, beats)
mel = [
    [(0, 76, 1), (1, 74, 0.5), (1.5, 72, 0.5), (2, 79, 1.5)],
    [(0, 76, 1), (1, 72, 1), (2, 69, 2)],
    [(0, 74, 1), (1, 77, 0.5), (1.5, 76, 0.5), (2, 74, 1), (3, 72, 1)],
    [(0, 71, 1.5), (1.5, 72, 0.5), (2, 74, 2)],
    [(0, 76, 1), (1, 74, 0.5), (1.5, 72, 0.5), (2, 79, 1), (3, 81, 1)],
    [(0, 81, 1.5), (1.5, 79, 0.5), (2, 77, 2)],
    [(0, 74, 1), (1, 76, 0.5), (1.5, 77, 0.5), (2, 79, 1), (3, 71, 1)],
    [(0, 72, 3)],
    [(0, 76, 1), (1, 77, 0.5), (1.5, 76, 0.5), (2, 72, 2)],
    [(0, 71, 1), (1, 74, 1), (2, 80, 2)],
    [(0, 81, 1), (1, 79, 0.5), (1.5, 77, 0.5), (2, 76, 2)],
    [(0, 74, 1), (1, 77, 1), (2, 81, 2)],
    [(0, 79, 1), (1, 77, 0.5), (1.5, 76, 0.5), (2, 74, 1), (3, 72, 1)],
    [(0, 71, 1), (1, 74, 1), (2, 77, 1), (3, 79, 1)],
    [(0, 76, 2), (2, 72, 2)],
    [(0, 74, 1), (1, 71, 1), (2, 67, 2)],
]

nbars = int(DUR / BAR)
for b in range(nbars):
    t0 = b * BAR
    ch = prog[b % len(prog)]
    last = b == nbars - 1
    if last:                                             # final held chord with a little roll
        put(pluck_bass(ch[0] - 12 if ch[0] > 30 else ch[0], 2.5), t0, 0, 1.2)
        for k, m in enumerate([60, 64, 67, 72]): put(accordion(m, BAR * 1.2, 0.8), t0 + k * 0.05, -0.2 + k * 0.13)
        break
    # oom-pah: bass on 1 & 3 (root, fifth), chord stabs on 2 & 4
    put(pluck_bass(ch[0]), t0, -0.1)
    put(pluck_bass(ch[0] + 7), t0 + 2 * BEAT, -0.1)
    for k in (1, 3): put(stab(ch[1]), t0 + k * BEAT, 0.25)
    # percussion
    for k in (1, 3): put(brush(g=1.0), t0 + k * BEAT, 0.3)
    for k in range(8):
        sw = 0.04 if k % 2 else 0                        # light swing
        put(shaker(1.0 if k % 2 else 0.6), t0 + k * BEAT / 2 + sw, -0.4)
    # melody from bar 2 on, accordion in the right of centre
    if b >= 2:
        for off, m, dur in mel[(b - 2) % len(mel)]:
            put(accordion(m, dur * BEAT * 0.95, 0.85), t0 + off * BEAT, 0.15)

mix = np.stack([L, R], 1)[: int(DUR * SR)]
# simple room: two short slap echoes
for d, g in ((0.031, 0.18), (0.057, 0.12)):
    k = int(d * SR); mix[k:] += mix[:-k][:, ::-1] * g
mix /= np.max(np.abs(mix)) * 1.15
fade = int(2.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(os.path.join(ROOT, 'music.wav'), mix.astype(np.float32), SR)
print(f'music.wav {DUR:.1f}s, {nbars} bars at {BPM} bpm')
