"""Procedural music bed: a dusty, swung parlour-jazz comp that follows the edit.

    python3 scripts/music.py            -> music.wav (48 kHz stereo)

Arrangement keys off cues.json so it stays in sync if the narration changes:
  hook (dark)      low pad + vinyl only
  1886 onward      brushes, walking bass, piano comp, sparse celesta motif
  "in the dark"    band drops out to the pad, comes back on "broken"
  end card         resolves on a held F6/9 chord
"""
import json, os
import numpy as np
from scipy.signal import butter, lfilter
import soundfile as sf

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cues = json.load(open(os.path.join(here, 'cues.json')))
L = cues['lines']
SR = 48000
DUR = cues['total'] + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(7)


def word_at(line, word):
    s = L[line]['text'].lower()
    return L[line]['at'] + L[line]['dur'] * s.index(word) / len(s)


START = L['fountain']['at'] - 0.3            # groove starts with the first newspaper page
DARK0, DARK1 = word_at('brief', 'feel') - 0.35, word_at('brief', 'broken')
END = L['payoff']['end'] + 0.35              # end card

BPM = 92
beat = 60 / BPM
swing = 0.62                                  # swung eighths
out_l = np.zeros(N)
out_r = np.zeros(N)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def lp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2))
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype='band')
    return lfilter(b, a, x)


def add(t0, sig, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0:
        return
    s = sig[max(0, -i): N - i] * gain
    i = max(0, i)
    out_l[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    out_r[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def env_curve(t):
    """band level 0..1 over time (intro, dark drop-out, ending)."""
    a = np.clip((t - START + 0.2) / 0.6, 0, 1)
    d = 1 - np.clip((t - DARK0) / 0.3, 0, 1) * (1 - np.clip((t - DARK1) / 0.4, 0, 1))
    e = 1 - np.clip((t - END) / 0.4, 0, 1)
    return a * d * e


def piano(freqs, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for h, amp in ((1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)):
            det = 1 + (rng.random() - 0.5) * 0.002
            s += amp * np.sin(2 * np.pi * f * h * det * t) * np.exp(-t * (2.2 + h * 1.4))
    s *= np.minimum(1, t / 0.004)
    return lp(s, 3800) * 0.11 * vel


def bass(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    s *= np.exp(-t * 3.2) * np.minimum(1, t / 0.008)
    return lp(s, 900) * 0.32


def celesta(f, dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t * 9)
    return s * np.exp(-t * 3.0) * 0.07


def brush(dur, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = rng.standard_normal(n)
    return bp(w, 2500, 9000) * np.exp(-t * 18 / bright) * 0.05


def kick(dur=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 70 * np.exp(-t * 8) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.25


# chords (F major ii-V-ish parlour loop): Fmaj7, D7, Gm7, C7
CHORDS = [
    (41, [57, 60, 64, 65]),   # F  : A C E F
    (38, [57, 60, 62, 66]),   # D7 : A C D F#
    (43, [58, 62, 65, 67]),   # Gm7: Bb D F G
    (36, [58, 60, 64, 67]),   # C7 : Bb C E G
]
MOTIF = [72, 74, 77, 79, 77, 74]     # pentatonic-ish celesta phrase

# --- pad (whole piece), louder in the dark moments
t_axis = np.arange(N) / SR
pad = np.zeros(N)
for f, a in ((midi(41), 1), (midi(48), 0.6), (midi(57), 0.35), (midi(60), 0.25)):
    pad += a * np.sin(2 * np.pi * f * t_axis + 0.3 * np.sin(2 * np.pi * 0.11 * t_axis))
pad = lp(pad, 700)
band = env_curve(t_axis)
pad_level = 0.05 * (1 - 0.6 * band) * np.clip(t_axis / 1.5, 0, 1) * (1 - np.clip((t_axis - (DUR - 2.5)) / 2.5, 0, 1))
out_l += pad * pad_level
out_r += pad * pad_level

# --- groove
bar = beat * 4
nbars = int((END - START) / bar) + 1
for b in range(nbars):
    t0 = START + b * bar
    root, voicing = CHORDS[b % 4]
    lvl = float(env_curve(np.array([t0 + 0.01]))[0])
    if lvl <= 0.01:
        continue
    # walking bass: root, fifth, octave-ish, approach tone
    walk = [root, root + 7, root + 12 if b % 2 else root + 9, CHORDS[(b + 1) % 4][0] - 1]
    for k, n in enumerate(walk):
        tt = t0 + k * beat
        if tt < END:
            add(tt, bass(midi(n), beat * 0.95), pan=-0.1, gain=lvl * float(env_curve(np.array([tt]))[0] > 0.01))
    # piano comp: beat 2 and the "and" of 3 (swung)
    for off, vel in ((beat, 0.9), (beat * 2 + beat * swing, 0.7)):
        tt = t0 + off
        if tt < END and env_curve(np.array([tt]))[0] > 0.01:
            add(tt, piano([midi(n) for n in voicing], 0.9, vel), pan=0.25, gain=lvl)
    # brushes on every swung eighth, soft kick on 1 and 3
    for k in range(4):
        for e, g in ((0, 1.0), (swing, 0.55)):
            tt = t0 + (k + e) * beat
            if tt < END and env_curve(np.array([tt]))[0] > 0.01:
                add(tt, brush(0.25, 1.2 if k % 2 else 0.8), pan=0.35, gain=lvl * g)
        if k in (0, 2):
            add(t0 + k * beat, kick(), gain=lvl * 0.8)
    # celesta motif every other bar
    if b % 2 == 1:
        for k, n in enumerate(MOTIF[: 3 + (b % 4 == 3) * 3]):
            add(t0 + k * beat * 0.5 + beat, celesta(midi(n)), pan=-0.3, gain=lvl)

# --- ending: held F6/9 with a celesta flourish
end_chord = piano([midi(n) for n in (53, 57, 62, 67, 69)], 3.5, 1.1)
add(END + 0.05, end_chord, pan=0.1, gain=1.0)
add(END + 0.05, bass(midi(29), 2.5), gain=0.9)
for k, n in enumerate([77, 81, 84, 89]):
    add(END + 0.12 + k * 0.09, celesta(midi(n), 2.0), pan=0.3)

# --- vinyl: hiss + crackle
hiss = bp(rng.standard_normal(N), 3000, 11000) * 0.004
crk = np.zeros(N)
idx = rng.choice(N, size=int(DUR * 22), replace=False)
crk[idx] = rng.standard_normal(len(idx)) * 0.09
crk = bp(crk, 1500, 9000)
out_l += hiss + crk
out_r += hiss + np.roll(crk, 37)

# gentle tape-style saturation + normalize
mix = np.stack([out_l, out_r], 1)
mix = np.tanh(mix * 1.6) / 1.6
mix *= 0.85 / np.max(np.abs(mix))
sf.write(os.path.join(here, 'music.wav'), mix.astype(np.float32), SR)
print(f'music.wav {DUR:.1f}s  groove {START:.2f}-{END:.2f}  dark {DARK0:.2f}-{DARK1:.2f}')
