/* ---------------------------------------------------------- bespoke pieces */
const BUTTER = '#f2c230', VELVET = '#8f1a16';
function art(w, h, fn, o = {}) {                     // a scrap whose content is drawn by fn(ctx, w, h)
  return scrap(w, h, { seed: o.seed || w + h, color: o.color || CREAM, sides: o.sides, edge: o.edge, blur: o.blur, draw: (x, ww, hh) => fn(x, ww, hh) });
}
function popcornSticker(r, seed) {
  const pad = 30, c = mk(r * 2.4 + pad * 2, r * 2.4 + pad * 2), x = c.getContext('2d');
  x.shadowColor = 'rgba(40,20,0,0.35)'; x.shadowBlur = 10; x.shadowOffsetY = 6;
  window.ART.popcornPiece(x, c.width / 2, c.height / 2, r, seed); c.pad = pad; return c;
}
function bucketSticker(w, label) {
  const h = w * 1.25, pad = 50, a = mk(w, h); window.ART.bucket(a.getContext('2d'), w, h, label);
  const c = mk(w + pad * 2, h + pad * 2), x = c.getContext('2d');
  x.shadowColor = 'rgba(35,22,10,0.45)'; x.shadowBlur = 24; x.shadowOffsetX = 8; x.shadowOffsetY = 16; x.drawImage(a, pad, pad); c.pad = pad; return c;
}
function filmClip(name, width, o = {}) {             // halftone image framed as a strip of film
  const img = IMG[name], plate = !img && window.ART.PLATES[name]; if (!img && !plate) return null;
  const ih = img ? img.height * width / img.width : Math.round(width * (o.ar || 0.66)), sp = 46;
  return scrap(width + sp * 2, ih + 40 + (o.caption ? 46 : 0), { seed: o.seed || name.length * 17, color: '#16130f', sides: 'tb', edge: 5, draw(x, w, h) {
    x.fillStyle = '#efe7d3'; for (let y = 14; y < h - 10; y += 34) { x.beginPath(); x.roundRect(12, y, 22, 16, 4); x.fill(); x.beginPath(); x.roundRect(w - 34, y, 22, 16, 4); x.fill(); }
    x.save(); x.translate(sp, 20); x.beginPath(); x.rect(0, 0, width, ih); x.clip();
    if (img) { x.fillStyle = '#efe7d3'; x.fillRect(0, 0, width, ih); x.drawImage(img, 0, 0, width, ih); } else plate(x, width, ih);
    x.restore();
    if (o.caption) { x.fillStyle = '#efe7d3'; x.font = '24px Elite'; x.textAlign = 'center'; x.fillText(o.caption, w / 2, ih + 52); }
  } });
}
function marquee(w, h, text, size) {                 // theatre marquee board; bulbs drawn live by drawBulbs
  return scrap(w, h, { seed: 1927, color: '#1c1816', sides: '', blur: 24, draw(x) {
    x.fillStyle = VELVET; x.fillRect(14, 14, w - 28, h - 28);
    x.fillStyle = CREAM; x.fillRect(44, 44, w - 88, h - 88);
    x.fillStyle = INK; x.font = `${size}px Bebas`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + size * 0.05);
  } });
}
function drawBulbs(cx, cy, w, h, t, on = 1, key = 0) {   // chasing marquee lights around a w x h rect centred on cx,cy
  const step = 34, pts = [];
  for (let x = -w / 2 + 22; x <= w / 2 - 22; x += step) { pts.push([x, -h / 2 + 22]); }
  for (let y = -h / 2 + 22 + step; y <= h / 2 - 22; y += step) pts.push([w / 2 - 22, y]);
  for (let x = w / 2 - 22 - step; x >= -w / 2 + 22; x -= step) pts.push([x, h / 2 - 22]);
  for (let y = h / 2 - 22 - step; y > -h / 2 + 22; y -= step) pts.push([-w / 2 + 22, y]);
  const chase = Math.floor(t * 10);
  pts.forEach(([x, y], i) => {
    const lit = on * ((i + chase) % 3 === 0 ? 1 : 0.35);
    if (lit > 0.5) { const gr = g.createRadialGradient(cx + x, cy + y, 0, cx + x, cy + y, 26); gr.addColorStop(0, `rgba(255,214,120,${0.55 * lit})`); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx + x, cy + y, 26, 0, 7); g.fill(); }
    g.fillStyle = lit > 0.5 ? '#fff4c9' : (on > 0 ? '#c99a3a' : '#6d5a3a'); g.beginPath(); g.arc(cx + x, cy + y, 8.5, 0, 7); g.fill();
  });
}
function blueprint() {
  const w = 600, h = 470;
  return scrap(w, h, { seed: 1885, color: '#1f3f78', sides: '', blur: 18, grain: 0.12, draw(x) {
    x.strokeStyle = 'rgba(255,255,255,0.13)'; x.lineWidth = 1; for (let i = 0; i < w; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 24) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = '26px Elite'; x.textAlign = 'left'; x.fillText('STEAM POPCORN MACHINE', 30, 48); x.font = '20px Elite'; x.fillText('FIG. 1  ·  CHICAGO, 1885', 30, 78);
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 3;
    x.strokeRect(300, 120, 230, 250); x.beginPath(); x.moveTo(300, 120); x.lineTo(415, 96); x.lineTo(530, 120); x.stroke();
    x.beginPath(); x.ellipse(415, 300, 70, 26, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(415, 270); x.lineTo(415, 160); x.stroke();
    x.beginPath(); x.moveTo(330, 370); x.lineTo(330, 420); x.moveTo(500, 370); x.lineTo(500, 420); x.stroke();
    x.setLineDash([8, 6]); x.beginPath(); x.moveTo(180, 300); x.lineTo(300, 300); x.stroke(); x.setLineDash([]);
  } });
}
function noSign() {
  const w = 520, h = 330;
  return scrap(w, h, { seed: 2525, color: '#f4eee0', sides: '', blur: 18, draw(x) {
    x.strokeStyle = RED; x.lineWidth = 14; x.beginPath(); x.roundRect(18, 18, w - 36, h - 36, 16); x.stroke();
    x.fillStyle = RED; x.font = '120px Bebas'; x.textAlign = 'center'; x.fillText('NO', w / 2, 150); x.font = '90px Bebas'; x.fillText('POPCORN', w / 2, 250);
    x.font = '22px Elite'; x.fillStyle = INK; x.fillText('BY ORDER OF THE MANAGEMENT', w / 2, 292);
    x.globalCompositeOperation = 'destination-out'; const R = rng(4); for (let i = 0; i < 260; i++) { x.globalAlpha = R() * 0.5; x.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
  } });
}
function titleCard(lines, w = 620, h = 380) {          // silent-film intertitle
  return scrap(w, h, { seed: 1919, color: '#100d0b', sides: '', blur: 20, grain: 0.14, draw(x) {
    x.strokeStyle = '#efe7d3'; x.lineWidth = 3; x.strokeRect(26, 26, w - 52, h - 52); x.lineWidth = 1; x.strokeRect(36, 36, w - 72, h - 72);
    [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]].forEach(([cx, cy]) => { x.fillStyle = '#efe7d3'; x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.fill(); });
    x.fillStyle = '#efe7d3'; x.textAlign = 'center'; x.font = '54px PlayfairI';
    lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 - (lines.length - 1) * 34 + i * 68 + 16));
  } });
}
function carpet() {
  const w = 420, h = 300;
  return scrap(w, h, { seed: 77, color: VELVET, edge: 8, draw(x) {
    x.strokeStyle = GOLD_ALPHA(0.85); x.lineWidth = 3;
    for (let yy = 0; yy < h + 60; yy += 60) for (let xx = 0; xx < w + 60; xx += 60) { x.beginPath(); x.moveTo(xx, yy - 26); x.lineTo(xx + 26, yy); x.lineTo(xx, yy + 26); x.lineTo(xx - 26, yy); x.closePath(); x.stroke(); x.fillStyle = GOLD_ALPHA(0.7); x.beginPath(); x.arc(xx, yy, 5, 0, 7); x.fill(); }
    x.strokeStyle = GOLD_ALPHA(0.9); x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28);
  } });
}
const GOLD_ALPHA = a => `rgba(232,179,58,${a})`;
function ticket(seed, col) {
  const w = 300, h = 130;
  return scrap(w, h, { seed, color: col, sides: 'lr', edge: 4, blur: 10, draw(x) {
    x.strokeStyle = 'rgba(28,24,22,0.6)'; x.setLineDash([6, 5]); x.lineWidth = 2; x.strokeRect(12, 12, w - 24, h - 24); x.setLineDash([]);
    x.fillStyle = INK; x.textAlign = 'center'; x.font = '62px Bebas'; x.fillText('ADMIT ONE', w / 2, 84); x.font = '18px Elite'; x.fillText('No. ' + (10000 + seed * 37), w / 2, 112);
  } });
}
function headline() {
  const w = 900, h = 300;
  return scrap(w, h, { seed: 1929, color: '#efe7d3', draw(x) {
    x.fillStyle = INK; x.textAlign = 'center'; x.font = '44px Fraktur'; x.fillText('The Evening Kernel', w / 2, 62); x.fillRect(40, 78, w - 80, 3); x.fillRect(40, 85, w - 80, 1);
    x.font = '19px Elite'; x.fillText('OCTOBER 1929  ·  EXTRA', w / 2, 112);
    x.font = '118px Playfair'; x.fillText('STOCKS CRASH', w / 2, 232);
    x.fillStyle = 'rgba(60,48,36,0.3)'; for (let i = 0; i < 3; i++) x.fillRect(60 + i * 270, 256, 240, 8);
  } });
}
function coin(label, r = 86) {
  const pad = 30, c = mk(r * 2 + pad * 2, r * 2 + pad * 2), x = c.getContext('2d'), cx = c.width / 2;
  x.shadowColor = 'rgba(35,22,10,0.45)'; x.shadowBlur = 16; x.shadowOffsetY = 8;
  const gr = x.createRadialGradient(cx - r * 0.3, cx - r * 0.3, 5, cx, cx, r); gr.addColorStop(0, '#f1efe9'); gr.addColorStop(1, '#8d8a84');
  x.fillStyle = gr; x.beginPath(); x.arc(cx, cx, r, 0, 7); x.fill(); x.shadowColor = 'transparent';
  x.strokeStyle = 'rgba(40,40,40,0.5)'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cx, r * 0.86, 0, 7); x.stroke();
  x.fillStyle = '#3a3936'; x.font = `${r * 0.95}px Abril`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, cx, cx + 4);
  window.ART.screen(x, c.width, c.height, 0.08, 5); c.pad = pad; return c;
}
function ration() {
  const w = 600, h = 400;
  return scrap(w, h, { seed: 1942, color: '#e9e2cd', sides: '', blur: 16, draw(x) {
    x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(14, 14, w - 28, h - 28);
    x.fillStyle = INK; x.textAlign = 'center'; x.font = '42px OldStdB'; x.fillText('RATION COUPONS', w / 2, 74); x.font = '22px Elite'; x.fillText('SUGAR · 1942 · DO NOT LOSE', w / 2, 108);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
      const cx = 40 + i * 132, cy = 136 + r * 120; x.setLineDash([5, 4]); x.strokeRect(cx, cy, 120, 108); x.setLineDash([]);
      x.font = '58px Bebas'; x.fillText(String(r * 4 + i + 1), cx + 60, cy + 66); x.font = '15px Elite'; x.fillText('SUGAR', cx + 60, cy + 94);
    }
  } });
}
function candyBar(label, col, seed) {
  return scrap(300, 110, { seed, color: col, sides: 'lr', edge: 7, blur: 10, draw(x, w, h) {
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = '52px Bebas'; x.textAlign = 'center'; x.fillText(label, w / 2, h / 2 + 18);
  } });
}
function dig() {
  const w = 760, h = 520;
  return scrap(w, h, { seed: 6700, color: '#e9dcc0', draw(x) {
    x.save(); x.translate(20, 20); window.ART.PLATES.dig(x, w - 40, h - 80); x.restore();
    for (let i = 0; i < 5; i++) { x.save(); window.ART.popcornPiece(x, 160 + i * 110, 300 + (i % 2) * 60, 20, 300 + i); x.restore(); }
    x.fillStyle = INK; x.font = '24px Elite'; x.textAlign = 'center'; x.fillText('EXCAVATION, COASTAL PERU', w / 2, h - 22);
  } });
}

/* ---------------------------------------------------------- scenes */
const IMG = {};
let SCENES = [];
const TR = [6.6, 15.4, 23.5, 32.45, 38.05, 45.6, 52.5, 57.55];
const WIPE_COL = [[BUTTER, RED], [NAVY, BUTTER], [RED, INK], [BUTTER, NAVY], [INK, RED], [NAVY, BUTTER], [RED, BUTTER], [INK, RED]];
const POPS = [];                                      // popcorn bursts: {t, x, y, n, spread}
function burst(t, x, y, n = 14, spread = 1) { POPS.push({ t, x, y, n, spread }); for (let i = 0; i < Math.min(n, 10); i++) sfx(t + i * 0.045 + hash(i + t) * 0.03, 'pop', 0.55, 0.9 + hash(i * 3 + t) * 0.6); }
let PC = [];
function drawBursts(t, sceneStart, sceneEnd) {
  for (const b of POPS) {
    if (b.t < sceneStart - 0.01 || b.t >= sceneEnd || t < b.t) continue;
    for (let i = 0; i < b.n; i++) {
      const u = t - b.t - i * 0.03; if (u < 0) continue;
      const a = -Math.PI / 2 + (hash(i * 7 + b.t) - 0.5) * 2.2 * b.spread, v = 900 + hash(i * 13 + b.t) * 700;
      const x = b.x + Math.cos(a) * v * u, y = b.y + Math.sin(a) * v * u + 1500 * u * u;
      if (y > H + 200) continue;
      const s = clamp(u / 0.08) * (0.7 + hash(i + b.t * 3) * 0.6);
      drawCanvasAt(PC[i % PC.length], x, y, u * (hash(i) - 0.5) * 10, s, 1, 600 + i, 0.5);
    }
  }
}

function buildScenes() {
  PC = [0, 1, 2, 3, 4, 5].map(i => popcornSticker(34 + i * 3, 700 + i));
  const BUCKET = bucketSticker(470, 'POPCORN');

  /* 0 · hook */
  const s0 = [];
  s0.push(P(marquee(940, 330, 'POPCORN', 230), 540, 330, 0.1, { anim: 'drop', rot: -0.02, key: 1 }));
  s0.push(F(0.25, t => drawBulbs(540, 330, 940, 330, t, clamp((t - 0.45) / 0.2), 1)));
  s0.push(P(BUCKET, 540, 1060, 0.7, { anim: 'slideU', rot: 0.03, float: 4 }));
  s0.push(Wd(ransom('WHY THE', 74, 101), 540, 610, 1.3, { rot: -0.03, dt: 0.05 }));
  s0.push(Wd(ransom('MOVIES?', 96, 102), 540, 720, 2.3, { rot: 0.02, dt: 0.06 }));
  s0.push(St(stamp('NOT ALWAYS WELCOME', RED, 74), 540, 1290, 5.0, { rot: -0.08 }));

  /* 1 · ancient */
  const s1 = [];
  s1.push(P(scrap(900, 1300, { seed: 21, color: KRAFT, edge: 10 }), 470, 820, TR[0] + 0.12, { anim: 'slideL', rot: -0.025, quiet: true }));
  const corn = clip('corn', 440, { caption: 'ZEA MAYS' });
  s1.push(P(corn || textScrap('MAIZE', { font: '120px Abril' }), 360, 650, 7.2, { rot: -0.05 }));
  s1.push(P(textScrap('THOUSANDS OF YEARS', { font: '52px Bebas', bg: NAVY, fg: CREAM, seed: 4 }), 720, 330, 8.5, { rot: 0.05 }));
  const digC = IMG.dig ? clip('dig', 640, { caption: 'EXCAVATION, COASTAL PERU' }) : dig();
  s1.push(P(digC, 640, 1080, 11.0, { anim: 'slideR', rot: 0.03 }));
  s1.push(P(textScrap('6,700 YEARS OLD', { font: '96px Abril', bg: RED, fg: CREAM, seed: 6 }), 560, 270, 13.1, { anim: 'slam', rot: -0.05 }));
  s1.push(F(13.6, (t, u) => markerPath(ovalPts(640, 1080, 300, 150, 31), eOut(u / 0.5), { w: 10 }), { sfx: [[13.6, 'swish', 0.35, 1.3]] }));

  /* 2 · Cretors */
  const s2 = [];
  s2.push(P(textScrap('1885', { font: '150px Abril', bg: BUTTER, seed: 7 }), 300, 260, 15.85, { anim: 'slam', rot: -0.06 }));
  s2.push(Lb('C. CRETORS · CHICAGO', 690, 420, 16.9, { size: 30, rot: 0.02 }));
  s2.push(P(blueprint(), 540, 720, 18.2, { anim: 'slideL', rot: 0.025 }));
  s2.push(F(18.5, (t, u) => {                         // gears turning on the blueprint
    g.save(); g.translate(540, 720); g.rotate(0.025); g.translate(-540, -720);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; const a = clamp(u / 0.3);
    g.globalAlpha = a; window.ART.gear(g, 380, 790, 70, 10, t * 1.6); window.ART.gear(g, 290, 690, 46, 8, -t * 2.4 + 0.2); g.restore();
  }));
  const cart = clip('cart', 520, { caption: 'NOW, POPCORN ANYWHERE' });
  s2.push(P(cart || textScrap('STREET CART', { font: '100px Bebas' }), 600, 1150, 20.5, { anim: 'slideR', rot: -0.03 }));
  s2.push(Wd(ransom('ANYWHERE!', 92, 103), 540, 1440 - 40, 22.0, { rot: -0.03, dt: 0.04 }));

  /* 3 · the ban */
  const s3 = [];
  s3.push(P(scrap(1100, 900, { seed: 31, color: VELVET, edge: 12 }), 540, 520, TR[2] + 0.1, { anim: 'slideR', rot: 0.02, quiet: true }));
  s3.push(P(filmClip('palace', 760, { caption: 'THE MOVIE PALACE', ar: 0.7 }), 540, 520, 23.9, { rot: -0.02 }));
  s3.push(St(stamp('KEPT OUT', RED, 110), 300, 230, 25.4, { rot: -0.12 }));
  s3.push(P(noSign(), 760, 980, 25.6, { anim: 'drop', rot: 0.05 }));
  s3.push(P(carpet(), 280, 1010, 26.5, { rot: -0.08 }));
  s3.push(Lb('FANCY CARPETS', 280, 1190, 26.8, { size: 28 }));
  s3.push(P(titleCard(['Reading', 'required.']), 560, 1260, 28.6, { anim: 'slideU', rot: -0.03 }));
  s3.push(St(stamp('NO RIFF-RAFF', NAVY, 90), 560, 1420, 30.4, { rot: 0.06, comp: 'source-over' }));

  /* 4 · talkies */
  const s4 = [];
  s4.push(P(textScrap('1927', { font: '160px Abril', bg: RED, fg: CREAM, seed: 9 }), 540, 260, 33.5, { anim: 'slam', rot: 0.04 }));
  s4.push(Wd(ransom('TALKIES!', 120, 104), 540, 470, 34.45, { rot: -0.03, dt: 0.06 }));
  s4.push(F(34.5, (t, u) => { for (let k = 0; k < 3; k++) { const p = eOut(clamp((u - k * 0.15) / 0.4)); markerPath(curvePts(820 + k * 40, 380 - k * 18, 900 + k * 50, 470, 820 + k * 40, 560 + k * 18), p, { w: 8 }); markerPath(curvePts(260 - k * 40, 380 - k * 18, 180 - k * 50, 470, 260 - k * 40, 560 + k * 18), p, { w: 8 }); } }));
  s4.push(P(filmClip('crowd', 760, { caption: 'EVERYONE CAME', ar: 0.66 }), 540, 900, 35.8, { anim: 'slideR', rot: 0.02 }));
  s4.push(F(36.0, (t, u) => {                          // flurry of ticket stubs
    for (let i = 0; i < 9; i++) { const v = u - i * 0.12; if (v < 0) continue; const e = eBack(clamp(v / 0.35));
      drawCanvasAt(TICKETS[i % 3], 120 + hash(i + 40) * 840, 1200 + hash(i + 41) * 260, (hash(i + 42) - 0.5) * 0.9, e * 0.8, 1, 800 + i); }
  }, { sfx: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [36.0 + i * 0.12, 'swish', 0.3, 1.2 + i * 0.05]) }));

  /* 5 · the Depression */
  const s5 = [];
  s5.push(P(headline(), 540, 330, 38.3, { anim: 'drop', rot: -0.03 }));
  s5.push(P(coin('5¢'), 330, 700, 40.0, { rot: -0.1 }));
  s5.push(P(coin('10¢', 100), 640, 690, 41.1, { rot: 0.08 }));
  s5.push(P(popcornSticker(60, 812), 880, 700, 40.5, { rot: 0.2 }));
  s5.push(P(filmClip('concession', 720, { caption: 'THE LOBBY STAND', ar: 0.62 }), 540, 1110, 42.0, { anim: 'slideU', rot: 0.02 }));
  s5.push(St(stamp('STILL OPEN', '#2f6b3a', 110), 760, 1370, 44.0, { rot: -0.07, comp: 'source-over' }));
  s5.push(F(42.3, () => {}, {}));

  /* 6 · World War II */
  const s6 = [];
  s6.push(P(textScrap('1942', { font: '150px Abril', bg: NAVY, fg: CREAM, seed: 12 }), 290, 250, 46.0, { anim: 'slam', rot: -0.05 }));
  s6.push(P(ration(), 600, 560, 47.2, { anim: 'slideR', rot: 0.03 }));
  s6.push(P(candyBar('CANDY', '#6b3a22', 61), 300, 860, 48.0, { rot: -0.12 }));
  s6.push(P(candyBar('SODA', RED, 62), 760, 880, 48.3, { rot: 0.1 }));
  s6.push(F(48.8, (t, u) => { markerPath(linePts(170, 900, 440, 820, 63, 6), eOut(u / 0.25), { w: 12 }); markerPath(linePts(620, 840, 900, 920, 64, 6), eOut((u - 0.2) / 0.25), { w: 12 }); }, { sfx: [[48.8, 'swish', 0.4, 1.4], [49.0, 'swish', 0.4, 1.5]] }));
  s6.push(Wd(ransom('3× POPCORN', 120, 105), 540, 1110, 49.7, { rot: -0.02, dt: 0.05 }));
  s6.push(F(50.2, () => {}, {}));

  /* 7 · today */
  const s7 = [];
  s7.push(P(marquee(940, 300, 'NOW SHOWING', 170), 540, 260, TR[6] + 0.1, { anim: 'drop', rot: 0.02, quiet: true }));
  s7.push(F(TR[6] + 0.1, t => drawBulbs(540, 260, 940, 300, t, t < 55.4 ? 0 : clamp((t - 55.4) / 0.15), 2), { sfx: [[55.4, 'zap', 0.5, 1.6], [55.45, 'ding', 0.35, 1.2]] }));
  s7.push(P(bucketSticker(520, 'TODAY'), 540, 900, 52.8, { anim: 'slideU', rot: -0.02, float: 4 }));
  s7.push(P(textScrap('COSTS: PENNIES', { font: '80px Bebas', bg: BUTTER, seed: 14 }), 540, 1330, 54.2, { anim: 'slam', rot: -0.04 }));
  s7.push(F(52.5, (t, u) => { if (t < 55.4) { g.save(); g.fillStyle = 'rgba(10,8,6,0.35)'; g.fillRect(0, 0, W, H); g.restore(); } }));

  /* 8 · outro */
  const s8 = [];
  s8.push(P(marquee(980, 420, 'POPCORN', 270), 540, 420, TR[7] + 0.1, { anim: 'drop', rot: -0.02, quiet: true }));
  s8.push(F(TR[7] + 0.1, t => drawBulbs(540, 420, 980, 420, t, 1, 3)));
  s8.push(Wd(ransom("DIDN'T SNEAK IN.", 76, 106), 540, 760, 58.6, { rot: -0.02, dt: 0.035 }));
  s8.push(Wd(ransom('IT SAVED', 120, 107), 540, 930, 60.4, { rot: 0.02, dt: 0.05 }));
  s8.push(Wd(ransom('THE MOVIES.', 104, 108), 540, 1080, 60.85, { rot: -0.025, dt: 0.045 }));
  s8.push(P(titleCard(['The End'], 460, 200), 540, 1300, 62.4, { rot: 0.02 }));

  burst(0.9, 540, 880, 22, 1.1); burst(2.2, 540, 880, 12, 0.9);
  burst(20.8, 600, 1000, 16, 0.8);
  burst(50.2, 300, 1300, 14, 0.7); burst(50.45, 540, 1300, 14, 0.7); burst(50.7, 780, 1300, 14, 0.7);
  burst(53.0, 540, 760, 14, 0.9);
  burst(60.5, 540, 1500, 26, 1.3); burst(61.0, 300, 1500, 14, 0.8); burst(61.3, 780, 1500, 14, 0.8);

  SCENES = [s0, s1, s2, s3, s4, s5, s6, s7, s8].map((items, i) => ({ items: items.filter(it => it.kind !== 'pic' || it.c), start: i ? TR[i - 1] : 0, end: TR[i] ?? TOTAL, i }));
  SCENES.forEach(sc => sc.items.forEach(itemSfx));
  TR.forEach(t => { sfx(t - 0.42, 'whoosh', 0.9, 1); sfx(t - 0.05, 'swish', 0.5, 0.8); });
  window.EVENTS = EV.sort((a, b) => a.t - b.t);
}
let TICKETS = [];

/* ---------------------------------------------------------- captions */
const CAPS = window.CAPS || [];
const CAP_C = new Map();
function capStrip(text, i) {
  if (CAP_C.has(i)) return CAP_C.get(i);
  const t = mk(10, 10).getContext('2d'); t.font = '700 50px Oswald'; const tw = t.measureText(text).width;
  const c = scrap(tw + 56, 84, { seed: 900 + i, color: i % 2 ? '#fbf6ea' : CREAM, sides: 'lr', edge: 5, blur: 12, sy: 6, draw(x, w, h) {
    x.font = '700 50px Oswald'; x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3);
  } });
  CAP_C.set(i, c); return c;
}
function drawCaptions(t) {
  const i = CAPS.findIndex(([a, b]) => t >= a && t < b + 0.12); if (i < 0) return;
  const [a] = CAPS[i], u = t - a, e = eBack(clamp(u / 0.18));
  drawCanvasAt(capStrip(CAPS[i][2], i), 540, 1560, (i % 2 ? 0.012 : -0.012) + (1 - e) * 0.05, lerp(0.85, 1, e), clamp(u / 0.06), 1200 + i, 0.4);
}

/* ---------------------------------------------------------- frame */
const CAM = [[1.0, 1.04, 0, 12], [1.02, 1.0, 10, -10], [1.0, 1.04, 0, -12], [1.03, 1.0, -8, 8], [1.0, 1.05, 0, 0], [1.0, 1.035, 6, -10], [1.0, 1.04, 0, 8], [1.0, 1.05, 0, 0], [1.03, 1.0, 0, -6]];
const BGOFF = [[200, 160], [420, 80], [100, 300], [500, 260], [260, 40], [380, 330], [80, 120], [460, 200], [300, 250]];
function shake(t) {
  let x = 0, y = 0;
  for (const s of SLAMS) { const d = t - s; if (d < 0 || d > 0.4) continue; const a = 9 * Math.exp(-d * 11); x += Math.sin(d * 70) * a; y += Math.cos(d * 55) * a * 0.7; }
  return [x, y];
}
function render(t) {
  T_NOW = t;
  const si = SCENES.findIndex(s => t >= s.start && t < s.end), sc = SCENES[si < 0 ? SCENES.length - 1 : si];
  const lt = (t - sc.start) / Math.max(1, sc.end - sc.start), [z0, z1, dx, dy] = CAM[sc.i], z = lerp(z0, z1, eInOut(clamp(lt)));
  const [shx, shy] = shake(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const [bx, by] = BGOFF[sc.i];
  g.save(); g.translate(W / 2 + shx * 0.5, H / 2 + shy * 0.5); g.scale(1 + (z - 1) * 0.5, 1 + (z - 1) * 0.5); g.translate(-W / 2 - bx - dx * lt * 0.5, -H / 2 - by - dy * lt * 0.5);
  g.drawImage(BG, 0, 0); g.restore();
  g.save(); g.translate(W / 2 + shx, H / 2 + shy); g.scale(z, z); g.translate(-W / 2 + dx * lt, -H / 2 + dy * lt);
  for (const it of sc.items) drawItem(it, t);
  drawBursts(t, sc.start, sc.end);
  g.restore();
  TR.forEach((T, i) => {
    const u = (t - (T - 0.5)) / 1.0; if (u <= 0 || u >= 1.08) return;
    [0, 1].forEach(k => {
      const wp = WIPES[i * 2 + k]; if (!wp) return;
      const x = lerp(W + 60, -(W + 500) - 60, k ? eInOut(clamp((u - 0.09) / 0.91)) : eInOut(clamp(u / 0.91)));
      g.drawImage(wp, x - wp.pad, -wp.pad - 40);
    });
  });
  drawCaptions(t);
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.16; g.drawImage(GRAIN[Math.floor(t * FPS_BOIL) % 4], 0, 0, W, H); g.restore();
  g.drawImage(VIGNETTE, 0, 0);
  return { hum: t > 23.5 && t < 32.45 ? 0.3 : 0, crackle: (t > 0.8 && t < 3.5) || (t > 20.6 && t < 23.4) || (t > 50.1 && t < 52.4) || (t > 60.4 && t < 62.6) ? 0.35 : 0 };
}
let WIPES = [];
function buildWipes() {
  WIPES = [];
  TR.forEach((T, i) => WIPE_COL[i].forEach((col, k) => {
    WIPES.push(scrap(W + 500, H + 80, { seed: 400 + i * 2 + k, color: col, edge: 22, step: 14, sides: 'lr', blur: 30, sx: -12, sy: 0, pad: 60, grain: 0.1 }));
  }));
}

/* ---------------------------------------------------------- boot */
const ASSETS = ['corn', 'cart', 'palace', 'crowd', 'concession', 'dig'];
function loadImg(n) { return new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `assets/cut/${n}.png`; }); }
(async () => {
  try {
    const fams = ['Abril', 'Elite', '700 1px Oswald', '400 1px Oswald', 'Playfair', 'PlayfairI', 'Fraktur', 'Marker', 'Bebas', 'OldStd', 'OldStdB'];
    await Promise.all(fams.map(f => document.fonts.load(f.includes('px') ? f : `40px ${f}`)));
    await Promise.all(ASSETS.map(loadImg));
    window.fontsReady = ['Abril', 'Elite', 'Fraktur', 'Marker', 'Bebas'].every(f => document.fonts.check(`40px ${f}`));
    buildBackground(); buildWipes(); TICKETS = [ticket(1, '#f1d9a0'), ticket(2, '#e9b9a4'), ticket(3, '#cfdcd6')]; buildScenes();
    window.renderAt = t => render(t);
    window.MISSING = ASSETS.filter(a => !IMG[a]);
    if (!/video=1/.test(location.search)) {
      const q = location.search.match(/t=([\d.]+)/); const off = q ? +q[1] : 0, t0 = performance.now();
      const loop = () => { render((off + (performance.now() - t0) / 1000) % TOTAL); requestAnimationFrame(loop); }; loop();
    }
  } catch (e) { window.SCENE_ERRORS.push(String(e && e.stack || e)); }
})();
</script>
</body>
</html>
