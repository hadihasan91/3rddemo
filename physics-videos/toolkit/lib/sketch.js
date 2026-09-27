/* =============================================================================
   Sketch — hand-drawn whiteboard animation toolkit            (window.Sketch)
   -----------------------------------------------------------------------------
   A tiny procedural "hand-drawn" renderer for explainer videos:
     • ink lines that wobble and re-jitter ~8×/s ("line boil", like cel animation)
     • watercolour / marker washes, pencil hatching, handwritten text
     • draw-on reveals with an optional marker pen that follows the stroke tip
     • two themes: "whiteboard" (clean white board, marker) and
       "sketchbook" (cream paper, ink + watercolour)
     • a runtime that plays in the browser AND renders frame-exact for video
       (window.renderAt(t) in ?video=1 mode — used by scripts/capture.mjs)

   Classic script (works from file://). Load with:
     <script src="../toolkit/lib/sketch.js"></script>
     <script src="cues.js"></script>            (optional, written by vo.mjs)
     <script> const S = Sketch.init({ theme: 'whiteboard' }); ... S.run({...}) </script>

   Coordinate system: every scene draws on a 1600×1000 "stage" grid that is
   centred on a 16:9 (1778×1000) page. The runtime scales it to the window
   (browser) or to exactly 1920×1080 (video).
   ========================================================================== */
(function (global) {
  'use strict';

  const PAGE_W = 1778, PAGE_H = 1000, OX = 89;          // page size + stage offset
  const STAGE_W = 1600, STAGE_H = 1000;
  const scriptSrc = (document.currentScript && document.currentScript.src) || '';
  const BASE = scriptSrc.replace(/lib\/sketch\.js(\?.*)?$/, '');

  /* ---------------------------------------------------------------- themes */
  const THEMES = {
    whiteboard: {
      paper: '#fcfcfa', ink: '#1e2024', grain: 0.06, grainLo: 240, grainHi: 255,
      blotDark: 'rgba(120,125,135,0.014)', blotLight: 'rgba(255,255,255,0.14)',
      fibers: false, ghosts: true, vignette: 'rgba(60,64,72,0.07)',
      washScale: 0.9, inkScale: 1.12, captionBand: [205, 225, 245], badge: [255, 214, 120],
      titleSwash: [255, 222, 110],
    },
    sketchbook: {
      paper: '#f7efdd', ink: '#2a2118', grain: 0.26, grainLo: 228, grainHi: 255,
      blotDark: 'rgba(172,128,72,0.055)', blotLight: 'rgba(255,252,240,0.12)',
      fibers: true, ghosts: false, vignette: 'rgba(115,72,30,0.16)',
      washScale: 1, inkScale: 1, captionBand: [240, 214, 170], badge: [250, 200, 120],
      titleSwash: [140, 190, 230],
    },
  };

  /* --------------------------------------------------------------- palette */
  const PAL = {
    water: [104, 168, 220], waterDeep: [44, 100, 178], sky: [140, 190, 230],
    orange: [243, 140, 48], yellow: [251, 208, 96], blue: [86, 128, 230],
    red: [206, 50, 40], hot: [236, 74, 30], green: [96, 168, 110], teal: [70, 160, 160],
    purple: [150, 110, 200], pink: [232, 120, 150], metal: [92, 88, 92], grey: [150, 150, 155],
    steam: [120, 132, 152], wood: [70, 50, 40], rubber: [214, 86, 60], sand: [240, 214, 170],
    white: [255, 255, 255], black: [30, 30, 34],
  };
  const INKS = { red: '#c8322a', blue: '#1f4f86', green: '#2f7a45', grey: '#6b6f78' };

  /* ------------------------------------------------------------ math utils */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const ease = (t, a, b) => smooth((t - a) / (b - a));       // 0→1 between a and b
  const pulse = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(a, b, c) { let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul((c | 0) + 0x9e37, 0x85ebca6b); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; }
  function strKey(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const K = k => (typeof k === 'string' ? strKey(k) : (k | 0) || 1);

  /* ------------------------------------------------------------------ state */
  let cv, ctx, theme = THEMES.whiteboard, INK = theme.ink;
  let boilTick = 0, boilFps = 8;
  let simRand = mulberry(2024);
  let PAPER, GRAIN;
  let penTip = null;           // device-space tip of the most recent partial stroke
  let penEnabled = true;
  const EVENTS = [];
  let clock = 0;               // scene time (s)
  let captionList = null, captionState = { key: null, prev: null, t: 99 };

  const R = (key, p = 0) => mulberry(hash(K(key), boilTick, p));

  /* ------------------------------------------------------------ path utils */
  function resample(pts, seg, closed) {
    const out = [], n = pts.length, m = closed ? n : n - 1;
    if (n < 2) return pts.slice();
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / seg));
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function jit(pts, amt, r) {
    const n = pts.length, o = pts.map(() => [(r() - .5) * 2 * amt, (r() - .5) * 2 * amt]);
    return pts.map((p, i) => {
      const a = o[Math.max(0, i - 1)], b = o[i], c = o[Math.min(n - 1, i + 1)];
      return [p[0] + (a[0] + 2 * b[0] + c[0]) / 4, p[1] + (a[1] + 2 * b[1] + c[1]) / 4];
    });
  }
  function trace(pts, closed) {
    const n = pts.length; if (n < 2) return;
    if (closed) {
      ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
      for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const p = pts[i], q = pts[i + 1]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function truncate(pts, frac) {                        // first `frac` of a polyline (by length)
    if (frac >= 1) return pts;
    const L = pathLength(pts) * clamp(frac, 0, 1); const out = [pts[0]]; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + d >= L) { const u = d ? (L - acc) / d : 0; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); return out; }
      acc += d; out.push(b);
    }
    return out;
  }

  /* ---------------------------------------------------------------- shapes */
  function ell(cx, cy, rx, ry, n = 30, a0 = 0) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; }
  function circle(cx, cy, r, n = 30, a0 = 0) { return ell(cx, cy, r, r, n, a0); }
  function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  function roundRect(x, y, w, h, r = 12, n = 5) {
    const p = [], corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of corners) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function arc(cx, cy, r, a0, a1, n = 24) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
  function wave(x0, y0, x1, amp, wavelength, phase = 0, step = 6) { const p = []; for (let x = x0; x <= x1; x += step) p.push([x, y0 + amp * Math.sin((x - x0) / wavelength * Math.PI * 2 + phase)]); return p; }
  function spring(x0, y0, x1, y1, coils = 8, width = 16) {
    const p = [], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    p.push([x0, y0]); const lead = 0.08;
    for (let i = 0; i <= coils * 2; i++) { const u = lead + (1 - 2 * lead) * i / (coils * 2), s = (i % 2 ? 1 : -1) * width; p.push([x0 + dx * u + nx * s, y0 + dy * u + ny * s]); }
    p.push([x1, y1]); return p;
  }
  function bezier(p0, p1, p2, n = 16) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]); } return p; }

  /* ------------------------------------------------------------ primitives */
  // Wobbly, double-pass ink stroke.  o.progress (0..1) draws it on progressively.
  function ink(pts, o = {}) {
    const key = o.key ?? 1, w = (o.w ?? 2.4) * theme.inkScale, j = o.j ?? 1.3, passes = o.passes ?? 2,
      color = o.color || INK, alpha = o.alpha ?? 0.92, closed = !!o.closed, seg = o.seg || 14;
    const progress = o.progress ?? 1;
    if (progress <= 0 || pts.length < 2) return;
    let base = resample(pts, seg, closed);
    if (closed) base = base.concat(base.slice(0, Math.min(3, base.length)));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
    const baseA = ctx.globalAlpha;
    if (o.dash) ctx.setLineDash(o.dash);
    let tip = null;
    for (let p = 0; p < passes; p++) {
      const r = R(key, p); let q = jit(base, j * (p ? 1.35 : 1), r);
      if (progress < 1) q = truncate(q, progress);
      if (q.length < 2) continue;
      ctx.globalAlpha = baseA * alpha * (p ? 0.5 : 1);
      ctx.lineWidth = w * (p ? 0.55 : 1) * (0.85 + r() * 0.3);
      ctx.beginPath(); trace(q, false); ctx.stroke();
      if (p === 0) tip = q[q.length - 1];
    }
    if (progress < 1 && tip && o.pen !== false) setPen(tip[0], tip[1]);
    ctx.restore();
  }
  // Watercolour / marker wash: layered translucent fills with a pooled edge.
  function wash(pts, col, a, o = {}) {
    const key = o.key ?? 1, sp = o.sp ?? 2.2, layers = o.layers ?? 3, seg = o.seg || 18;
    a *= theme.washScale;
    const base = resample(pts, seg, true);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'multiply';
    for (let l = 0; l < layers; l++) {
      const q = jit(base, sp * (1 + l * 0.45), R(key, 50 + l));
      ctx.fillStyle = rgba(col, a / layers * 1.3); ctx.beginPath(); trace(q, true); ctx.fill();
    }
    if (o.edge !== false) {
      const q = jit(base, sp * 0.6, R(key, 60));
      ctx.strokeStyle = rgba(col, Math.min(1, a * 0.55)); ctx.lineWidth = o.edgeW || 1.4;
      ctx.beginPath(); trace(q, true); ctx.stroke();
    }
    ctx.restore();
  }
  // Solid (opaque) fill, e.g. to knock out lines behind an object.
  function fill(pts, color, o = {}) {
    const q = jit(resample(pts, o.seg || 18, true), o.sp ?? 1, R(o.key ?? 1, 70));
    ctx.save(); ctx.fillStyle = color; ctx.beginPath(); trace(q, true); ctx.fill(); ctx.restore();
  }
  // Pencil hatching clipped to a polygon.
  function hatch(poly, o = {}) {
    const key = o.key ?? 1, sp = o.sp || 8, ang = o.ang ?? -0.95, a = o.alpha ?? 0.35, w = o.w || 1.1;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, D = Math.hypot(x1 - x0, y1 - y0) / 2 + 10;
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    ctx.save(); ctx.beginPath(); trace(resample(poly, 18, true), true); ctx.clip();
    const r = R(key, 90), baseA = ctx.globalAlpha; ctx.strokeStyle = o.color || INK; ctx.lineCap = 'round';
    for (let d = -D; d <= D; d += sp) {
      const ox = cx + px * d, oy = cy + py * d;
      const a0 = [ox - dx * D + (r() - .5) * 4, oy - dy * D], a1 = [ox + dx * D, oy + dy * D + (r() - .5) * 4];
      ctx.globalAlpha = baseA * a * (0.55 + r() * 0.45); ctx.lineWidth = w * (0.7 + r() * 0.6);
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]);
      ctx.quadraticCurveTo((a0[0] + a1[0]) / 2 + (r() - .5) * 3, (a0[1] + a1[1]) / 2 + (r() - .5) * 3, a1[0], a1[1]); ctx.stroke();
    }
    ctx.restore();
  }
  const FONT = "Caveat, 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
  function font(size, wt = 600) { ctx.font = `${wt} ${size}px ${FONT}`; }
  function measure(s, size = 30, wt = 600) { ctx.save(); font(size, wt); const w = ctx.measureText(s).width; ctx.restore(); return w; }
  // Handwritten text. o.reveal (0..1) wipes it in left→right (with the pen).
  function txt(s, x, y, o = {}) {
    const reveal = o.reveal ?? 1; if (reveal <= 0) return;
    const r = R(o.key ?? strKey(String(s)), 3), size = o.size || 32, wt = o.weight || 600;
    ctx.save(); font(size, wt);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillStyle = o.color || INK; ctx.globalAlpha *= clamp(o.alpha ?? 1, 0, 1);
    ctx.translate(x + (r() - .5) * 0.9, y + (r() - .5) * 0.9);
    ctx.rotate((o.rot || 0) + (r() - .5) * 0.012);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (reveal < 1) {
      const w = ctx.measureText(s).width, left = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
      const cut = left + w * reveal;
      ctx.beginPath(); ctx.rect(left - 10, -size * 1.4, (cut - left) + 10, size * 2.2); ctx.clip();
      if (o.pen !== false) setPen(cut, -size * 0.25);
    }
    ctx.fillText(s, 0, 0); ctx.restore();
  }
  function wrap(s, maxW, size = 32, wt = 600) {
    const words = String(s).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (measure(test, size, wt) > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
    if (cur) lines.push(cur); return lines;
  }
  function arrow(x0, y0, x1, y1, o = {}) {
    const bend = o.bend || 0, progress = o.progress ?? 1;
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
    const pts = bezier([x0, y0], [mx, my], [x1, y1], 12);
    ink(pts, { ...o, seg: 12, progress: Math.min(1, progress / 0.85) });
    if (progress > 0.85) {
      const a = Math.atan2(y1 - my, x1 - mx), L = o.head || 13;
      ink([[x1 - L * Math.cos(a - 0.45), y1 - L * Math.sin(a - 0.45)], [x1, y1], [x1 - L * Math.cos(a + 0.45), y1 - L * Math.sin(a + 0.45)]],
        { ...o, key: K(o.key ?? 1) + 1, seg: 8, dash: null, progress: (progress - 0.85) / 0.15 });
    }
  }
  // Label with a leader arrow pointing at (tx,ty).
  function label(s, x, y, tx, ty, o = {}) {
    txt(s, x, y, { size: o.size || 34, weight: o.weight || 700, color: o.color, align: o.align || 'center', key: o.key, reveal: o.reveal, alpha: o.alpha });
    if ((o.reveal ?? 1) >= 1) arrow(o.fromX ?? x, o.fromY ?? (y + 10), tx, ty, { key: K(o.key ?? s) + 7, w: 2.2, head: 11, bend: o.bend ?? 0.15, color: o.color, progress: o.arrowProgress ?? 1 });
  }
  // A glossy liquid / glass highlight.
  function highlight(cx, cy, rx, ry, o = {}) {
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${o.alpha ?? 0.9})`; ctx.lineCap = 'round'; ctx.lineWidth = o.w || 3.4;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.12, Math.PI * 1.42); ctx.stroke(); ctx.restore();
  }

  /* -------------------------------------------------------------- the pen */
  function setPen(x, y) { if (!penEnabled) return; const m = ctx.getTransform(); penTip = [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
  function drawPen(scaleDev) {
    if (!penTip) return;
    const x = penTip[0] / scaleDev, y = penTip[1] / scaleDev;   // page coords (no stage offset)
    ctx.save(); ctx.setTransform(scaleDev, 0, 0, scaleDev, 0, 0);
    ctx.translate(x, y); ctx.rotate(-0.62);
    const L = 170, Wd = 26;
    // soft shadow
    ctx.save(); ctx.translate(10, 14); ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.roundRect(8, -Wd / 2, L, Wd, 8); ctx.fill(); ctx.restore();
    // barrel, grip, cap, nib
    const body = [[14, -Wd / 2], [L, -Wd / 2], [L, Wd / 2], [14, Wd / 2]];
    fill(body, '#f4f4f2', { key: 'pen-body', sp: 0.4 });
    wash([[L - 58, -Wd / 2], [L, -Wd / 2], [L, Wd / 2], [L - 58, Wd / 2]], [40, 44, 52], 0.9, { key: 'pen-cap', sp: 0.4, op: 'source-over' });
    wash([[14, -Wd / 2 + 2], [40, -Wd / 2 + 2], [40, Wd / 2 - 2], [14, Wd / 2 - 2]], [60, 64, 72], 0.6, { key: 'pen-grip', sp: 0.3, op: 'source-over' });
    ink(body.concat([body[0]]), { key: 'pen-outline', w: 2, j: 0.5 });
    const nib = [[0, 0], [14, -8], [14, 8]];
    fill(nib, '#2a2d33', { key: 'pen-nib', sp: 0.2 });
    ink([[0, 0], [14, -8], [14, 8], [0, 0]], { key: 'pen-nib-o', w: 1.6, j: 0.3 });
    ink([[50, -Wd / 2 + 5], [L - 66, -Wd / 2 + 5]], { key: 'pen-shine', w: 3, color: '#ffffff', alpha: 0.9, passes: 1, j: 0.3 });
    ctx.restore();
    penTip = null;
  }

  /* ------------------------------------------------------------ paper etc. */
  function makePaper() {
    const c = document.createElement('canvas'); c.width = PAGE_W; c.height = PAGE_H; const g = c.getContext('2d');
    g.fillStyle = theme.paper; g.fillRect(0, 0, PAGE_W, PAGE_H);
    const r = mulberry(42);
    for (let i = 0; i < 46; i++) {
      const x = r() * PAGE_W, y = r() * PAGE_H, rad = 80 + r() * 280, dark = r() < .55;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const col = dark ? theme.blotDark : theme.blotLight;             // fade to the SAME colour at alpha 0
      gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    if (theme.fibers) {
      for (let i = 0; i < 340; i++) {
        g.strokeStyle = `rgba(140,105,60,${0.03 + r() * 0.05})`; g.lineWidth = 0.5 + r() * 0.7;
        const x = r() * PAGE_W, y = r() * PAGE_H, a = r() * Math.PI * 2, l = 6 + r() * 24;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + (r() - .5) * 7, y + Math.sin(a) * l / 2 + (r() - .5) * 7, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(110,80,40,${0.04 + r() * 0.06})`; g.fillRect(r() * PAGE_W, r() * PAGE_H, 1 + r(), 1 + r()); }
    }
    if (theme.ghosts) {   // faint marks of previously erased marker — sells the whiteboard
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(90,100,120,${0.007 + r() * 0.009})`; g.lineWidth = 8 + r() * 22;
        const x = r() * PAGE_W, y = r() * PAGE_H, l = 120 + r() * 360, a = (r() - .5) * 0.5;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y - 30 + r() * 60, x + l * 0.7, y - 30 + r() * 60, x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke();
      }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(80,90,100,${0.01 + r() * 0.015})`; g.fillRect(r() * PAGE_W, r() * PAGE_H, 1 + r() * 1.5, 1); }
    }
    const v = g.createRadialGradient(PAGE_W / 2, PAGE_H / 2, PAGE_H * 0.36, PAGE_W / 2, PAGE_H / 2, PAGE_H * 0.98);
    v.addColorStop(0, theme.vignette.replace(/[\d.]+\)$/, '0)')); v.addColorStop(1, theme.vignette);
    g.fillStyle = v; g.fillRect(0, 0, PAGE_W, PAGE_H);
    return c;
  }
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = 889; c.height = 500; const g = c.getContext('2d');
    const id = g.createImageData(c.width, c.height), d = id.data, gr = mulberry(99), span = theme.grainHi - theme.grainLo;
    for (let i = 0; i < d.length; i += 4) { const v = theme.grainLo + gr() * span | 0; d[i] = v; d[i + 1] = v - (theme.fibers ? 3 : 0); d[i + 2] = v - (theme.fibers ? 10 : 0); d[i + 3] = 255; }
    g.putImageData(id, 0, 0); return c;
  }

  /* -------------------------------------------------------------- captions */
  // captions([[t, 'text' | null, { n: '1' }], ...]) — one short line each, drawn
  // bottom-centre with a soft band and an optional number badge; cross-faded.
  function captions(list) { captionList = list.slice().sort((a, b) => a[0] - b[0]); }
  function captionAt(t) { let c = null; if (captionList) for (const e of captionList) if (t >= e[0]) c = e; return c; }
  function drawCaptionEntry(e, alpha, dy, key) {
    if (!e || !e[1] || alpha <= 0.01) return;
    const text = e[1], opt = e[2] || {}, size = opt.size || 56, y = opt.y || 882;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(0, dy);
    const tw = measure(text, size, 700), hasBadge = !!opt.n, bw = hasBadge ? 70 : 0;
    const x0 = STAGE_W / 2 - (tw + bw) / 2;
    const band = opt.band || theme.captionBand;
    wash([[x0 - 34, y - size * 0.62], [x0 + tw + bw + 30, y - size * 0.68], [x0 + tw + bw + 38, y + size * 0.52], [x0 - 26, y + size * 0.6]], band, 0.34, { key: key + 6, sp: 4, edge: false });
    if (hasBadge) {
      wash(ell(x0 + 26, y - 4, 29, 28, 18), opt.badge || theme.badge, 0.65, { key: key + 1 });
      ink(ell(x0 + 26, y - 4, 29, 28, 20, -1), { key: key + 2, closed: true, w: 2.4 });
      txt(String(opt.n), x0 + 26, y + 10, { size: 42, weight: 700, align: 'center', key: key + 3 });
    }
    txt(text, x0 + bw, y + size * 0.3, { size, weight: 700, key: key + 4 });
    ctx.restore();
  }
  function drawCaptions(dt) {
    if (!captionList) return;
    const cur = captionAt(clock);
    const curKey = cur ? cur[0] : null;
    if (curKey !== captionState.key) { captionState.prev = captionState.key; captionState.key = curKey; captionState.t = 0; }
    captionState.t += dt;
    const u = smooth(captionState.t / 0.6);
    const find = k => captionList.find(e => e[0] === k);
    if (captionState.prev !== null) drawCaptionEntry(find(captionState.prev), 1 - u, -u * 10, 900);
    drawCaptionEntry(cur, u, (1 - u) * 10, 950);
  }

  /* ----------------------------------------------------------------- title */
  function title(text, subtitle, o = {}) {
    const x = o.x ?? 92, y = o.y ?? 122, size = o.size ?? 78, reveal = o.reveal ?? 1;
    const tw = measure(text, size, 700);
    if (reveal > 0.2) wash([[x - 8, y - 18], [x + tw * 0.45, y - 26], [x + tw + 20, y - 14], [x + tw + 16, y + 14], [x + tw * 0.5, y + 18], [x, y + 16]], o.swash || theme.titleSwash, 0.3 * ease(reveal, 0.2, 1), { key: 'title-swash', sp: 3 });
    txt(text, x, y, { size, weight: 700, key: 'title', reveal: Math.min(1, reveal * 1.25) });
    const ul = []; for (let i = 0; i <= 20; i++) ul.push([x + 4 + i * (tw / 20), y + 20 + Math.sin(i * 0.9) * 2.5]);
    if (reveal > 0.8) ink(ul, { key: 'title-ul', w: 2.6, progress: ease(reveal, 0.8, 1) });
    if (subtitle) txt(subtitle, x + 6, y + 62, { size: o.subSize ?? 36, weight: 600, key: 'subtitle', alpha: 0.82 * ease(reveal, 0.6, 1) });
  }

  /* ------------------------------------------------------- timeline helpers */
  // keys([[t, v], ...]) → f(t): smooth-stepped interpolation between keyframes.
  function keys(list, mode = 'smooth') {
    return t => {
      if (t <= list[0][0]) return list[0][1];
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i], b = list[i + 1];
        if (t <= b[0]) { const u = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], mode === 'linear' ? u : smooth(u)); }
      }
      return list[list.length - 1][1];
    };
  }
  function cue(id) {
    const C = global.CUES;
    if (!C || !C.lines || !C.lines[id]) throw new Error(`cue "${id}" not found — run scripts/vo.mjs to generate cues.js`);
    return C.lines[id];       // { at, dur, end, text }
  }
  function sfx(type, o = {}) { EVENTS.push({ t: +clock.toFixed(3), type, ...o }); }
  const rand = () => simRand();

  /* ---------------------------------------------------------------- runtime */
  const VIDEO = new URLSearchParams(location.search).has('video');
  let scale = 1, dpr = 1, scene = null, paused = false, SCENE_ERRORS = [];

  function init(opts = {}) {
    theme = THEMES[opts.theme] || THEMES.whiteboard; INK = theme.ink;
    boilFps = opts.boilFps || 8;
    penEnabled = opts.pen !== false;
    // local handwriting font (no network needed)
    const st = document.createElement('style');
    st.textContent = `@font-face{font-family:Caveat;src:url('${BASE}fonts/Caveat.ttf') format('truetype');font-weight:400 700;font-display:block}
      html,body{margin:0;height:100%;background:${VIDEO ? '#000' : '#e4e1da'};overflow:hidden}
      body{display:flex;align-items:center;justify-content:center}
      canvas{display:block;${VIDEO ? '' : 'box-shadow:0 14px 50px rgba(40,40,50,.25);border-radius:3px;'}}`;
    document.head.appendChild(st);
    cv = document.getElementById(opts.canvasId || 'stage') || (() => { const c = document.createElement('canvas'); c.id = 'stage'; document.body.appendChild(c); return c; })();
    ctx = cv.getContext('2d');
    PAPER = makePaper(); GRAIN = makeGrain();
    const resize = () => {
      dpr = VIDEO ? 1 : Math.min(global.devicePixelRatio || 1, 2);
      scale = VIDEO ? 1920 / PAGE_W : Math.min(innerWidth / PAGE_W, innerHeight / PAGE_H) * 0.97;
      cv.style.width = PAGE_W * scale + 'px'; cv.style.height = PAGE_H * scale + 'px';
      cv.width = Math.round(PAGE_W * scale * dpr); cv.height = Math.round(PAGE_H * scale * dpr);
    };
    addEventListener('resize', resize); resize();
    return api;
  }

  function frame(dt) {
    const sd = scale * dpr;
    ctx.setTransform(sd, 0, 0, sd, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(PAPER, 0, 0, PAGE_W, PAGE_H);
    ctx.save(); ctx.translate(OX, 0);
    try { scene.draw(clock); }
    catch (err) { reportError(err); }
    ctx.restore();
    ctx.save(); ctx.translate(OX, 0); drawCaptions(dt); ctx.restore();
    if (paused && !VIDEO) { ctx.save(); ctx.translate(OX, 0); txt('❚❚ paused', 1560, 975, { size: 30, align: 'right', alpha: 0.6, key: 'paused' }); ctx.restore(); }
    drawPen(sd);
    ctx.save(); ctx.setTransform(sd, 0, 0, sd, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = theme.grain;
    ctx.drawImage(GRAIN, 0, 0, PAGE_W, PAGE_H); ctx.restore();
    if (SCENE_ERRORS.length) {
      ctx.save(); ctx.setTransform(sd, 0, 0, sd, 0, 0); ctx.fillStyle = 'rgba(200,0,0,0.85)'; ctx.fillRect(0, 0, PAGE_W, 60);
      ctx.fillStyle = '#fff'; ctx.font = '600 26px monospace'; ctx.fillText('SCENE ERROR: ' + SCENE_ERRORS[0], 20, 40); ctx.restore();
    }
  }
  function reportError(err) {
    const msg = (err && err.stack) ? String(err.stack).split('\n').slice(0, 2).join(' | ') : String(err);
    if (SCENE_ERRORS.length < 20) SCENE_ERRORS.push(msg);
    console.error(err);
  }
  function step(dt) {
    clock += dt;
    if (scene.loop && clock >= scene.duration) restart();
    try { scene.update && scene.update(dt, clock); } catch (err) { reportError(err); }
  }
  function restart() { clock = 0; simRand = mulberry(scene.seed || 2024); EVENTS.length = 0; captionState = { key: null, prev: null, t: 99 }; scene.init && scene.init(); }

  // run({ duration, init(), update(dt,t), draw(t), state()?, loop?, seed? })
  function run(sc) {
    scene = Object.assign({ loop: !VIDEO, seed: 2024 }, sc);
    if (!(scene.duration > 0)) throw new Error('scene.duration is required (seconds)');
    simRand = mulberry(scene.seed);
    try { scene.init && scene.init(); } catch (err) { reportError(err); }
    const fontsReady = Promise.race([
      document.fonts ? Promise.all([document.fonts.load('700 40px Caveat'), document.fonts.load('600 40px Caveat')]) : Promise.resolve(),
      new Promise(r => setTimeout(r, 4000)),
    ]);
    global.SCENE = { duration: scene.duration, fps: 30 };
    global.EVENTS = EVENTS; global.SCENE_ERRORS = SCENE_ERRORS;
    if (VIDEO) {
      global.fontsReady = fontsReady.then(() => document.fonts ? document.fonts.check('700 40px Caveat') : true);
      let lastT = 0;
      global.renderAt = t => {
        while (clock + 1 / 120 < t) step(1 / 60);
        boilTick = Math.floor(t * boilFps);
        frame(Math.max(0, t - lastT)); lastT = t;
        let st = {};
        try { st = scene.state ? scene.state(clock) || {} : {}; } catch (err) { reportError(err); }
        return { t: clock, ...st };
      };
      return;
    }
    // browser playback
    const s0 = parseFloat(new URLSearchParams(location.search).get('t')) || 0;
    for (let k = 0; k < s0 * 60; k++) step(1 / 60);
    addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; e.preventDefault(); } if (e.code === 'KeyR') restart(); });
    cv.addEventListener('click', e => {
      if (!scene.onClick) return;
      const rc = cv.getBoundingClientRect();
      scene.onClick((e.clientX - rc.left) / rc.width * PAGE_W - OX, (e.clientY - rc.top) / rc.height * PAGE_H);
    });
    let last = 0, realT = 0;
    const loop = now => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; realT += dt;
      boilTick = Math.floor(realT * boilFps);
      if (!paused) step(dt);
      frame(paused ? 0 : dt);
      requestAnimationFrame(loop);
    };
    fontsReady.finally(() => requestAnimationFrame(loop));
  }

  const api = {
    init, run, captions, title,
    ink, wash, fill, hatch, txt, wrap, measure, font, arrow, label, highlight,
    ell, circle, rect, roundRect, arc, wave, spring, bezier, resample, truncate, trace,
    keys, ease, pulse, smooth, lerp, clamp, rgba, cue, sfx, rand, mulberry,
    PAL, INKS, STAGE_W, STAGE_H, VIDEO,
    get ctx() { return ctx; }, get INK() { return INK; }, get theme() { return theme; }, get time() { return clock; },
  };
  global.Sketch = api;
})(window);
