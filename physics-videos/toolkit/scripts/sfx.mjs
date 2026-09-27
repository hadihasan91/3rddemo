// Procedural foley, driven by the scene's own timeline (timeline.json from capture.mjs render).
//
//   node scripts/sfx.mjs <videoDir>            → sfx.wav (48 kHz mono)
//
// Continuous "beds" come from numeric fields the scene returns from state(t) (0..1 each):
//   rumble  low roar (burner, engine, wind tunnel)      hiss     airy high noise (steam, gas)
//   crackle sizzling / frying crackles                  wind     slow, breathy band-passed noise
//   hum     soft electrical 110 Hz hum                  bubble   random watery blips (boiling)
//   motor   whirring tone (fans, turbines, spinning)    rain     dense soft ticks
// One-shot events come from S.sfx(type, { gain, pitch }) calls:
//   drip  splash  sizzle  boing  crash  puff  pop  tick  click  whoosh  swish  thud  chime  ding  zap  clack  spring
// Anything else is ignored. gain ≈ 0..1.5 (default 1), pitch multiplies the base frequency.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { args, readJson, videoDir } from './common.mjs';

const dir = videoDir(args()._[0]);
const { fps, states, events, duration } = readJson(join(dir, 'timeline.json'));
const SR = 48000, dur = (duration || states.length / fps) + 0.5, N = Math.ceil(dur * SR);
const out = new Float32Array(N);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
const chan = k => states.some(s => typeof s[k] === 'number' && s[k] > 0);
const stateAt = (t, k) => { const f = t * fps, i = Math.min(states.length - 1, Math.floor(f)), j = Math.min(states.length - 1, i + 1), u = f - i; const a = +states[i]?.[k] || 0, b = +states[j]?.[k] || 0; return a * (1 - u) + b * u; };
const lp = c => { let y = 0; return x => (y += c * (x - y)); };
const coef = hz => 1 - Math.exp(-2 * Math.PI * hz / SR);
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ beds */
const beds = ['rumble', 'hiss', 'crackle', 'wind', 'hum', 'bubble', 'motor', 'rain'].filter(chan);
if (beds.length) {
  const f = { r1: lp(coef(420)), r2: lp(coef(420)), hLo: lp(coef(2500)), hHi: lp(coef(9000)), wLo: lp(coef(300)), wHi: lp(coef(1400)) };
  const sm = Object.fromEntries(beds.map(b => [b, 0]));
  let crack = 0, humPh = 0, motorPh = 0, bub = null;
  for (let n = 0; n < N; n++) {
    const t = n / SR, w = noise();
    for (const b of beds) sm[b] += (Math.min(1.5, stateAt(t, b)) - sm[b]) * 0.0006;
    let s = 0;
    if (sm.rumble) s += f.r2(f.r1(w)) * 3.2 * 0.12 * sm.rumble * (0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
    const hi = f.hHi(w) - f.hLo(w);
    if (sm.hiss) s += hi * 0.16 * sm.hiss;
    if (sm.crackle) { if (rnd() < 60 / SR * sm.crackle) crack = 1; crack *= 0.9975; s += hi * (0.35 + 1.4 * crack) * 0.5 * sm.crackle; }
    if (sm.wind) s += (f.wHi(w) - f.wLo(w)) * 0.5 * sm.wind * (0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 1.9));
    if (sm.hum) { humPh += TAU * 110 / SR; s += (Math.sin(humPh) * 0.6 + Math.sin(humPh * 2) * 0.25 + Math.sin(humPh * 3) * 0.1) * 0.05 * sm.hum; }
    if (sm.motor) { motorPh += TAU * (180 + 60 * sm.motor) / SR; s += (Math.sin(motorPh) + 0.4 * Math.sin(motorPh * 2.01)) * 0.035 * sm.motor + hi * 0.03 * sm.motor; }
    if (sm.rain && rnd() < 400 / SR * sm.rain) { const k = Math.floor(n); for (let i = 0; i < 90 && k + i < N; i++) out[k + i] += noise() * Math.exp(-i / 18) * 0.05 * sm.rain; }
    if (sm.bubble) {
      if (!bub && rnd() < 14 / SR * sm.bubble) bub = { ph: 0, f: 500 + rnd() * 900, n: 0, L: SR * (0.03 + rnd() * 0.04) };
      if (bub) { const u = bub.n / bub.L; bub.ph += TAU * bub.f * (1 + u * 1.5) / SR; s += Math.sin(bub.ph) * Math.sin(Math.PI * u) * 0.12 * sm.bubble; if (++bub.n >= bub.L) bub = null; }
    }
    out[n] += s;
  }
}

/* ------------------------------------------------------------ one-shots */
const add = (t0, len, fn) => { const s = Math.floor(t0 * SR), L = Math.floor(len * SR); for (let i = 0; i < L && s + i < N; i++) if (s + i >= 0) out[s + i] += fn(i / SR, i / L); };
function tone(t0, len, f0, f1, amp, decay, wave = Math.sin) { let ph = 0; add(t0, len, (t, u) => { const f = f0 + (f1 - f0) * Math.min(1, u * 3); ph += TAU * f / SR; return wave(ph) * Math.exp(-t / decay) * amp; }); }
function band(t0, len, amp, lo, hi, attack = 0.01, shape = 1.6) { const a = lp(coef(lo)), b = lp(coef(hi)); add(t0, len, (t, u) => { const w = noise(); return (b(w) - a(w)) * Math.min(1, t / attack) * Math.pow(1 - u, shape) * amp; }); }
function low(t0, len, amp, hz, attack = 0.005) { const a = lp(coef(hz)); add(t0, len, (t, u) => a(noise()) * Math.min(1, t / attack) * Math.pow(1 - u, 2) * amp); }
const FX = {
  drip: (t, g, p) => tone(t, 0.12, 700 * p, 2200 * p, 0.35 * g, 0.028),
  splash: (t, g, p) => { tone(t, 0.12, 600 * p, 1800 * p, 0.25 * g, 0.03); band(t + 0.01, 0.5, 0.9 * g, 800, 7000, 0.005, 2.2); },
  sizzle: (t, g) => band(t, 0.8, 1.0 * g, 2500, 9000, 0.01, 1.6),
  boing: (t, g, p) => { let ph = 0; add(t, 0.34, tt => { const f = (330 + 160 * Math.min(1, tt / 0.06)) * p + 25 * Math.sin(tt * TAU * 16); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-tt / 0.09) * 0.16 * g; }); },
  crash: (t, g) => { band(t, 1.1, 1.3 * g, 1500, 9000, 0.004, 1.8); low(t, 0.4, 0.8 * g, 200); },
  puff: (t, g) => { const a = lp(coef(900)); add(t, 0.35, (tt, u) => a(noise()) * Math.sin(Math.PI * u) * 0.5 * g); },
  pop: (t, g, p) => tone(t, 0.06, 1400 * p, 900 * p, 0.2 * g, 0.012),
  tick: (t, g) => band(t, 0.035, 0.6 * g, 2000, 8000, 0.001, 3),
  click: (t, g, p) => { tone(t, 0.03, 2200 * p, 1800 * p, 0.25 * g, 0.006); band(t, 0.02, 0.4 * g, 3000, 9000, 0.0005, 3); },
  whoosh: (t, g) => { const a = lp(coef(300)), b = lp(coef(3000)); add(t, 0.6, (tt, u) => (b(noise()) - a(noise()) * 0.5) * Math.sin(Math.PI * u) ** 2 * 0.7 * g); },
  swish: (t, g) => band(t, 0.25, 0.5 * g, 1500, 6000, 0.08, 1.2),
  thud: (t, g, p) => { tone(t, 0.3, 120 * p, 60 * p, 0.5 * g, 0.08); low(t, 0.15, 0.6 * g, 300); },
  chime: (t, g, p) => { for (const [m, a] of [[1, 1], [2.76, 0.35], [5.4, 0.15]]) tone(t, 1.6, 880 * p * m, 880 * p * m, 0.09 * a * g, 0.45); },
  ding: (t, g, p) => { for (const [m, a] of [[1, 1], [2.0, 0.3]]) tone(t, 1.0, 1320 * p * m, 1320 * p * m, 0.08 * a * g, 0.25); },
  zap: (t, g, p) => { let ph = 0; add(t, 0.25, (tt, u) => { ph += TAU * (900 - 700 * u) * p / SR; return (Math.sign(Math.sin(ph)) * 0.5 + noise() * 0.5) * Math.pow(1 - u, 2) * 0.12 * g; }); },
  clack: (t, g, p) => { tone(t, 0.08, 1800 * p, 1500 * p, 0.3 * g, 0.015); tone(t, 0.08, 3100 * p, 2900 * p, 0.12 * g, 0.01); },
  spring: (t, g, p) => { let ph = 0; add(t, 0.5, (tt) => { ph += TAU * (220 * p + 80 * Math.sin(tt * TAU * 11)) / SR; return Math.sin(ph) * Math.exp(-tt / 0.15) * 0.14 * g; }); },
};
let used = 0;
for (const e of events || []) { const fx = FX[e.type]; if (!fx) continue; fx(e.t, e.gain ?? 1, e.pitch ?? 1); used++; }

let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const g = peak > 0 ? 0.7 / peak : 0;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * g * 32767))), 44 + i * 2);
writeFileSync(join(dir, 'sfx.wav'), buf);
console.log(`sfx.wav ${dur.toFixed(1)}s · beds: ${beds.join(', ') || 'none'} · one-shots: ${used}/${(events || []).length}`);
