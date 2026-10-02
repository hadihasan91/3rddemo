/* Paper-cut silhouette plates, used for any beat whose Pollinations render is
   missing (assets/cut/<name>.png wins whenever it exists). Each plate draws an
   ink silhouette scene into a w x h box, then gets the same newsprint dot
   screen as the halftone clippings so both read as one printed collage. */
(function () {
  const INK = '#1c1816', CREAM = '#f3ead2', SNOW = '#fbf8f0', LAMP = '#e8b33a', ICE = '#c9e0e6';
  const rng = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  function screen(x, w, h, alpha = 0.18, cell = 6) {          // print dot screen over the ink
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(255,250,235,${alpha})`;
    for (let yy = 0; yy < h + cell; yy += cell) for (let xx = (yy / cell) % 2 ? cell / 2 : 0; xx < w + cell; xx += cell) { x.beginPath(); x.arc(xx, yy, cell * 0.22, 0, 7); x.fill(); }
    x.restore();
  }
  function sky(x, w, h, top, bottom) { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom); x.fillStyle = gr; x.fillRect(0, 0, w, h); }
  function tree(x, bx, by, len, ang, depth, R) {
    if (depth === 0 || len < 4) return;
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    x.lineWidth = Math.max(1, depth * 1.3); x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
    tree(x, ex, ey, len * (0.68 + R() * 0.12), ang - 0.35 - R() * 0.25, depth - 1, R);
    tree(x, ex, ey, len * (0.68 + R() * 0.12), ang + 0.3 + R() * 0.25, depth - 1, R);
  }
  function house(x, hx, by, w, h, roof, R, snow = true) {
    x.fillStyle = INK; x.fillRect(hx, by - h, w, h);
    x.beginPath(); x.moveTo(hx - 6, by - h); x.lineTo(hx + w / 2, by - h - roof); x.lineTo(hx + w + 6, by - h); x.closePath(); x.fill();
    if (snow) { x.fillStyle = SNOW; x.beginPath(); x.moveTo(hx - 6, by - h); x.lineTo(hx + w / 2, by - h - roof); x.lineTo(hx + w + 6, by - h); x.lineTo(hx + w + 2, by - h + 6); x.lineTo(hx + w / 2, by - h - roof + 9); x.lineTo(hx - 2, by - h + 6); x.closePath(); x.fill(); }
    x.fillStyle = LAMP;
    for (let i = 0; i < Math.floor(w / 26); i++) if (R() < 0.6) x.fillRect(hx + 9 + i * 26, by - h + 16 + (R() < 0.5 ? 0 : 30), 10, 13);
  }

  const PLATES = {
    village(x, w, h) {
      const R = rng(4); sky(x, w, h, '#9fb9c4', ICE);
      x.fillStyle = 'rgba(28,24,22,0.35)'; x.beginPath(); x.moveTo(0, h * 0.62);           // far hills
      for (let i = 0; i <= 12; i++) x.lineTo(i * w / 12, h * (0.5 + Math.sin(i * 1.3) * 0.05 + R() * 0.03)); x.lineTo(w, h * 0.7); x.lineTo(0, h * 0.7); x.fill();
      const base = h * 0.72;
      [[40, 90, 110, 46], [150, 70, 90, 40], [235, 100, 130, 50], [560, 90, 100, 44], [668, 120, 92, 40]].forEach(([hx, ww, hh, rf]) => house(x, hx, base, ww, hh, rf, R));
      // church
      x.fillStyle = INK; x.fillRect(380, base - 150, 150, 150); x.fillRect(430, base - 250, 50, 110);
      x.beginPath(); x.moveTo(424, base - 250); x.lineTo(455, base - 340); x.lineTo(486, base - 250); x.fill();
      x.fillStyle = SNOW; x.beginPath(); x.moveTo(424, base - 250); x.lineTo(455, base - 340); x.lineTo(462, base - 318); x.lineTo(434, base - 246); x.fill();
      x.fillStyle = LAMP; x.beginPath(); x.arc(455, base - 200, 12, 0, 7); x.fill(); x.fillRect(440, base - 70, 30, 70);
      x.strokeStyle = INK; [[20, 0.4], [520, 0.3], [790, 0.5]].forEach(([tx], i) => tree(x, tx, base, 60, -Math.PI / 2, 7, rng(10 + i)));
      // frozen river
      x.fillStyle = '#e9f2f3'; x.fillRect(0, base, w, h - base);
      x.strokeStyle = 'rgba(28,24,22,0.55)'; x.lineWidth = 2;
      for (let i = 0; i < 9; i++) { let px = R() * w, py = base + 20 + R() * (h - base - 30); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += 20 + R() * 40; py += (R() - 0.5) * 18; x.lineTo(px, py); } x.stroke(); }
      x.fillStyle = INK; x.fillRect(0, base - 3, w, 5);
      x.fillStyle = SNOW; for (let i = 0; i < 90; i++) { x.beginPath(); x.arc(R() * w, R() * base, 1 + R() * 2.5, 0, 7); x.fill(); }
      screen(x, w, h);
    },
    bridge(x, w, h) {
      const R = rng(7); sky(x, w, h, '#efd9a6', '#e9c77d');
      x.fillStyle = 'rgba(28,24,22,0.3)';                                                // skyline
      for (let i = 0; i < 16; i++) { const bw = 30 + R() * 50, bh = 40 + R() * 80; x.fillRect(i * w / 16, h * 0.42 - bh, bw, bh); }
      x.fillRect(w * 0.7, h * 0.42 - 160, 26, 160); x.fillRect(w * 0.7 + 40, h * 0.42 - 160, 26, 160);   // cathedral towers
      const deck = h * 0.45; x.fillStyle = INK; x.fillRect(0, deck, w, h * 0.2);
      x.fillStyle = '#5d6f75';
      for (let i = 0; i < 5; i++) { const cx = w * (0.1 + i * 0.2), r = w * 0.075; x.beginPath(); x.moveTo(cx - r, h * 0.66); x.arc(cx, h * 0.66, r, Math.PI, 0); x.lineTo(cx + r, h * 0.66); x.fill(); }
      x.fillStyle = '#5d6f75'; x.fillRect(0, h * 0.66, w, h * 0.34);
      x.strokeStyle = 'rgba(255,250,235,0.6)'; x.lineWidth = 3;
      for (let i = 0; i < 14; i++) { const yy = h * 0.7 + R() * h * 0.28, xx = R() * w; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 30 + R() * 50, yy); x.stroke(); }
      x.fillStyle = INK;                                                                    // crowd on the deck
      for (let i = 0; i < 22; i++) { const px = 10 + R() * (w - 20), ph = 26 + R() * 12; x.fillRect(px - 5, deck - ph, 10, ph); x.beginPath(); x.arc(px, deck - ph - 6, 6.5, 0, 7); x.fill(); }
      for (let i = 0; i < 4; i++) { const lx = 60 + i * (w - 120) / 3; x.fillRect(lx - 2, deck - 70, 4, 70); x.fillStyle = LAMP; x.beginPath(); x.arc(lx, deck - 74, 7, 0, 7); x.fill(); x.fillStyle = INK; }
      screen(x, w, h);
    },
    vendor(x, w, h) {
      sky(x, w, h, '#efd9a6', '#e3b866'); const R = rng(9);
      x.fillStyle = INK; x.fillRect(0, h * 0.82, w, h * 0.18);
      // stall + awning
      x.fillRect(w * 0.12, h * 0.45, w * 0.76, h * 0.38);
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f3ead2' : '#b81d16'; x.beginPath(); const ax = w * 0.08 + i * w * 0.105; x.moveTo(ax, h * 0.2); x.lineTo(ax + w * 0.105, h * 0.2); x.lineTo(ax + w * 0.105, h * 0.32); x.arc(ax + w * 0.0525, h * 0.32, w * 0.0525, 0, Math.PI); x.fill(); }
      x.fillStyle = INK; x.fillRect(w * 0.12, h * 0.2, 8, h * 0.3); x.fillRect(w * 0.88 - 8, h * 0.2, 8, h * 0.3);
      // cauldron + fire
      x.beginPath(); x.ellipse(w * 0.5, h * 0.5, w * 0.16, h * 0.09, 0, 0, Math.PI); x.fill(); x.fillRect(w * 0.34, h * 0.42, w * 0.32, h * 0.08);
      x.fillStyle = LAMP; x.font = `bold ${h * 0.08}px OldStdB`; x.textAlign = 'center'; x.fillText('FRITES', w * 0.5, h * 0.7);
      x.strokeStyle = 'rgba(255,250,235,0.85)'; x.lineWidth = 5; x.lineCap = 'round';
      for (let i = 0; i < 3; i++) { x.beginPath(); for (let k = 0; k < 12; k++) x.lineTo(w * (0.42 + i * 0.08) + Math.sin(k * 0.8 + i) * 9, h * 0.4 - k * 9); x.stroke(); }
      screen(x, w, h);
    },
    whitehouse(x, w, h) {
      sky(x, w, h, '#c7d3d8', '#e9e4d4'); const R = rng(11);
      const base = h * 0.82; x.fillStyle = '#6f7f63'; x.fillRect(0, base, w, h - base);
      x.fillStyle = '#f7f3e8'; x.fillRect(w * 0.08, h * 0.38, w * 0.84, base - h * 0.38);           // facade
      x.fillStyle = INK; x.fillRect(w * 0.08, h * 0.38, w * 0.84, 10); x.fillRect(w * 0.08, base - 8, w * 0.84, 8);
      x.beginPath(); x.moveTo(w * 0.36, h * 0.38); x.lineTo(w * 0.5, h * 0.22); x.lineTo(w * 0.64, h * 0.38); x.closePath(); x.fill();
      x.fillStyle = '#f7f3e8'; x.beginPath(); x.moveTo(w * 0.39, h * 0.37); x.lineTo(w * 0.5, h * 0.255); x.lineTo(w * 0.61, h * 0.37); x.closePath(); x.fill();
      x.fillStyle = INK; for (let i = 0; i < 6; i++) x.fillRect(w * (0.37 + i * 0.052), h * 0.4, 9, base - h * 0.4);
      for (let i = 0; i < 6; i++) { x.fillRect(w * (0.11 + i * 0.04), h * 0.46, 14, 26); x.fillRect(w * (0.11 + i * 0.04), h * 0.62, 14, 26); x.fillRect(w * (0.67 + i * 0.04), h * 0.46, 14, 26); x.fillRect(w * (0.67 + i * 0.04), h * 0.62, 14, 26); }
      x.fillRect(w * 0.5 - 1, h * 0.05, 3, h * 0.18); x.fillStyle = '#b3202a'; x.fillRect(w * 0.5 + 2, h * 0.05, 40, 24);
      x.strokeStyle = INK; tree(x, w * 0.03, base, 70, -Math.PI / 2, 7, R); tree(x, w * 0.97, base, 70, -Math.PI / 2, 7, rng(12));
      screen(x, w, h);
    },
    capitol(x, w, h) {
      sky(x, w, h, '#d9cdb0', '#efe7d3');
      const base = h * 0.86, cx = w / 2; x.fillStyle = INK;
      x.fillRect(w * 0.05, base - h * 0.2, w * 0.9, h * 0.2);                                         // wings
      x.fillRect(cx - w * 0.16, base - h * 0.34, w * 0.32, h * 0.34);
      x.fillRect(cx - w * 0.12, base - h * 0.48, w * 0.24, h * 0.14);                                 // drum
      x.beginPath(); x.ellipse(cx, base - h * 0.48, w * 0.13, h * 0.2, 0, Math.PI, 0); x.fill();       // dome
      x.fillRect(cx - 9, base - h * 0.76, 18, h * 0.1); x.beginPath(); x.arc(cx, base - h * 0.77, 9, 0, 7); x.fill();
      x.fillStyle = '#efe7d3';
      for (let i = 0; i < 9; i++) x.fillRect(cx - w * 0.11 + i * w * 0.027, base - h * 0.46, 5, h * 0.1);
      for (let i = 0; i < 16; i++) { x.fillRect(w * 0.08 + i * w * 0.054, base - h * 0.15, 8, h * 0.11); }
      x.fillStyle = INK; x.fillRect(0, base, w, h - base);
      screen(x, w, h);
    },
    soldiers(x, w, h) {
      sky(x, w, h, '#c46a46', '#e9b46a'); const R = rng(14);
      x.fillStyle = INK; x.beginPath(); x.moveTo(0, h * 0.78); for (let i = 0; i <= 10; i++) x.lineTo(i * w / 10, h * (0.76 + R() * 0.05)); x.lineTo(w, h); x.lineTo(0, h); x.fill();
      for (let i = 0; i < 6; i++) {
        const sx = w * (0.1 + i * 0.16) + (R() - 0.5) * 20, by = h * 0.8, s = 0.85 + R() * 0.3;
        x.fillRect(sx - 16 * s, by - 120 * s, 32 * s, 120 * s);                                  // body
        x.beginPath(); x.arc(sx, by - 132 * s, 13 * s, 0, 7); x.fill();                           // head
        x.beginPath(); x.ellipse(sx, by - 140 * s, 30 * s, 6 * s, 0, 0, 7); x.fill();             // brodie brim
        x.beginPath(); x.ellipse(sx, by - 142 * s, 17 * s, 13 * s, 0, Math.PI, 0); x.fill();      // dome
        x.lineWidth = 4 * s; x.strokeStyle = INK; x.beginPath(); x.moveTo(sx + 12 * s, by - 40 * s); x.lineTo(sx + 26 * s, by - 190 * s); x.stroke();
      }
      screen(x, w, h);
    },
    diner(x, w, h) {
      sky(x, w, h, '#bcdbe6', '#f1e6c9'); x.fillStyle = INK; const base = h * 0.84;
      x.fillRect(w * 0.12, h * 0.42, w * 0.76, base - h * 0.42);
      x.beginPath(); x.moveTo(w * 0.06, h * 0.42); x.lineTo(w * 0.94, h * 0.42); x.lineTo(w * 0.9, h * 0.34); x.lineTo(w * 0.1, h * 0.34); x.fill();
      x.fillStyle = '#f3ead2'; for (let i = 0; i < 6; i++) x.fillRect(w * (0.16 + i * 0.12), h * 0.5, w * 0.09, h * 0.16);
      // big sign
      x.fillStyle = '#b81d16'; x.beginPath(); x.roundRect(w * 0.3, h * 0.06, w * 0.4, h * 0.24, 18); x.fill();
      x.fillStyle = '#f3ead2'; x.font = `${h * 0.15}px Bebas`; x.textAlign = 'center'; x.fillText('DRIVE-IN', w / 2, h * 0.24);
      x.fillStyle = INK; x.fillRect(w * 0.49, h * 0.3, w * 0.02, h * 0.05);
      // car with fins
      x.beginPath(); x.moveTo(w * 0.04, base); x.lineTo(w * 0.06, base - h * 0.1); x.lineTo(w * 0.16, base - h * 0.12); x.lineTo(w * 0.22, base - h * 0.2);
      x.lineTo(w * 0.34, base - h * 0.2); x.lineTo(w * 0.4, base - h * 0.12); x.lineTo(w * 0.5, base - h * 0.14); x.lineTo(w * 0.5, base); x.fill();
      x.fillStyle = '#f3ead2'; [[0.13], [0.42]].forEach(([u]) => { x.beginPath(); x.arc(w * u, base, h * 0.05, 0, 7); x.fill(); });
      x.fillStyle = INK; x.fillRect(0, base, w, h - base);
      screen(x, w, h);
    },
    pig(x, w, h) {
      sky(x, w, h, '#efe7d3', '#e2d6b8'); x.fillStyle = INK; const cx = w * 0.48, cy = h * 0.52;
      x.beginPath(); x.ellipse(cx, cy, w * 0.3, h * 0.24, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(cx + w * 0.3, cy - h * 0.06, w * 0.12, h * 0.14, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(cx + w * 0.41, cy - h * 0.02, w * 0.04, h * 0.07, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(cx + w * 0.26, cy - h * 0.16); x.lineTo(cx + w * 0.3, cy - h * 0.32); x.lineTo(cx + w * 0.34, cy - h * 0.15); x.fill();
      [[-0.2], [-0.08], [0.12], [0.22]].forEach(([u]) => x.fillRect(cx + w * u, cy + h * 0.12, w * 0.05, h * 0.24));
      x.lineWidth = 5; x.strokeStyle = INK; x.beginPath(); x.moveTo(cx - w * 0.3, cy - h * 0.05);
      for (let k = 0; k < 20; k++) { const a = k * 0.6; x.lineTo(cx - w * 0.33 - Math.cos(a) * 10 - k * 0.6, cy - h * 0.08 - Math.sin(a) * 10); } x.stroke();
      x.fillStyle = '#efe7d3'; x.beginPath(); x.arc(cx + w * 0.33, cy - h * 0.1, 5, 0, 7); x.fill();
      x.fillStyle = INK; x.fillRect(0, h * 0.86, w, h * 0.14);
      screen(x, w, h);
    },
  };
  window.ART = { PLATES, screen };
})();
