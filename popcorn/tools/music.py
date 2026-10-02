"""Original music bed: a silent-movie ragtime piano (honky-tonk detune), stride left
hand, syncopated right hand, light woodblock. Fully synthesized, nothing to license.
usage: python3 tools/music.py [seconds]   -> music.wav (48 kHz stereo)"""
import os, sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 65.0
BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int((DUR + 2) * SR)
L = np.zeros(N); R = np.zeros(N)
rnd = np.random.default_rng(3)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

def put(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def lowpass(x, f):
    a = 1 - np.exp(-2 * np.pi * f / SR); return lfilter([a], [1, a - 1], x)

def piano(m, dur=1.2, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m); out = np.zeros(n)
    for det in (-0.004, 0.0035):                       # two slightly-off strings: honky-tonk
        for k, a in ((1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)):
            out += a * np.sin(2 * np.pi * f * k * (1 + det) * t + k) * np.exp(-t * (2.2 + k * 1.1 + f / 900))
    hammer = rnd.uniform(-1, 1, n) * np.exp(-t * 90) * 0.15
    out = (out + hammer) * 0.07 * vel
    out[:60] *= np.linspace(0, 1, 60)
    rel = int(0.04 * SR); out[-rel:] *= np.linspace(1, 0, rel)
    return out

def chord(ms, dur=0.5, vel=0.8): return sum(piano(m, dur, vel) for m in ms)

def woodblock(g=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1250 * t) * 0.6 + np.sin(2 * np.pi * 1870 * t) * 0.3) * np.exp(-t * 60) * 0.12 * g

# chords as (bass note, oom note, chord tones)
F_, D7, G7, C7, F7, Bb, Bbm, Am = (29, 36, [57, 60, 65]), (26, 33, [57, 60, 66]), (31, 38, [59, 62, 65]), (36, 31, [58, 60, 64]), (29, 36, [57, 63, 65]), (34, 41, [58, 62, 65]), (34, 41, [58, 61, 65]), (33, 40, [57, 60, 64])
prog = [F_, D7, G7, C7, F_, F7, Bb, Bbm, F_, D7, G7, C7, Am, D7, G7, C7]
# right-hand melody per bar: (beat offset, midi, beats) - syncopated ragtime phrases
mel = [
    [(0, 77, 0.5), (0.5, 76, 0.25), (0.75, 77, 0.75), (1.5, 81, 0.5), (2, 84, 1), (3, 81, 0.5), (3.5, 77, 0.5)],
    [(0, 78, 0.75), (0.75, 81, 0.75), (1.5, 78, 0.5), (2, 74, 1.5), (3.5, 72, 0.5)],
    [(0, 74, 0.5), (0.5, 77, 0.5), (1, 79, 0.75), (1.75, 77, 0.25), (2, 74, 1), (3, 71, 1)],
    [(0, 72, 0.5), (0.5, 76, 0.5), (1, 79, 0.5), (1.5, 82, 1), (2.5, 79, 0.5), (3, 76, 1)],
    [(0, 77, 0.75), (0.75, 81, 0.75), (1.5, 84, 0.5), (2, 86, 0.75), (2.75, 84, 0.25), (3, 81, 1)],
    [(0, 75, 0.5), (0.5, 77, 0.5), (1, 81, 1), (2, 84, 0.5), (2.5, 81, 0.5), (3, 75, 1)],
    [(0, 74, 0.75), (0.75, 77, 0.75), (1.5, 82, 1), (2.5, 81, 0.5), (3, 77, 1)],
    [(0, 73, 0.75), (0.75, 77, 0.75), (1.5, 80, 1), (2.5, 77, 0.5), (3, 73, 1)],
    [(0, 72, 0.5), (0.5, 77, 0.5), (1, 81, 0.5), (1.5, 84, 1.5), (3, 81, 1)],
    [(0, 81, 0.5), (0.5, 78, 0.5), (1, 74, 0.75), (1.75, 72, 0.25), (2, 74, 1), (3, 78, 1)],
    [(0, 79, 0.75), (0.75, 77, 0.75), (1.5, 74, 0.5), (2, 71, 1), (3, 74, 1)],
    [(0, 76, 0.5), (0.5, 79, 0.5), (1, 82, 1), (2, 79, 0.75), (2.75, 76, 0.25), (3, 72, 1)],
    [(0, 76, 0.75), (0.75, 72, 0.75), (1.5, 69, 0.5), (2, 72, 1), (3, 76, 1)],
    [(0, 78, 0.5), (0.5, 81, 0.5), (1, 84, 1), (2, 81, 0.5), (2.5, 78, 0.5), (3, 74, 1)],
    [(0, 79, 0.5), (0.5, 77, 0.5), (1, 74, 0.5), (1.5, 71, 0.5), (2, 74, 1), (3, 77, 1)],
    [(0, 76, 0.5), (0.5, 79, 0.5), (1, 82, 0.5), (1.5, 84, 0.5), (2, 82, 0.5), (2.5, 79, 0.5), (3, 76, 1)],
]

nbars = int(DUR / BAR)
for b in range(nbars):
    t0 = b * BAR; bass, oom, ch = prog[b % len(prog)]
    if b == nbars - 1:                                     # final F chord with a roll
        put(piano(bass, 3.0, 1.2), t0, -0.2); put(piano(bass + 12, 3.0, 0.8), t0, -0.2)
        for k, m in enumerate([65, 69, 72, 77, 81]): put(piano(m, 3.0, 0.9), t0 + k * 0.04, -0.1 + k * 0.08)
        break
    put(piano(bass, 0.6, 1.1), t0, -0.25); put(piano(bass + 12, 0.6, 0.6), t0, -0.25)       # stride bass
    put(piano(oom, 0.6, 1.0), t0 + 2 * BEAT, -0.25); put(piano(oom + 12, 0.6, 0.55), t0 + 2 * BEAT, -0.25)
    for k in (1, 3): put(chord(ch, 0.45, 0.7), t0 + k * BEAT, -0.05)                      # chord on 2 & 4
    for k in (1, 3): put(woodblock(0.8), t0 + k * BEAT, 0.4)
    if b >= 1:
        for off, m, dur in mel[(b - 1) % len(mel)]:
            put(piano(m, max(0.3, dur * BEAT * 1.4), 1.0), t0 + off * BEAT, 0.2)
            put(piano(m - 12, max(0.3, dur * BEAT * 1.4), 0.35), t0 + off * BEAT, 0.2)      # octave doubling

mix = np.stack([L, R], 1)[: int(DUR * SR)]
mix = lowpass(mix.T, 7000).T                                # old-recording softness
for d, g in ((0.027, 0.16), (0.049, 0.1)):
    k = int(d * SR); mix[k:] += mix[:-k][:, ::-1] * g
mix /= np.max(np.abs(mix)) * 1.15
fade = int(2.0 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(os.path.join(ROOT, 'music.wav'), mix.astype(np.float32), SR)
print(f'music.wav {DUR:.1f}s, {nbars} bars at {BPM} bpm')
