/* Paper-cut plates and drawn props for the popcorn piece. A plate is used for any
   beat whose Pollinations render is missing (assets/cut/<name>.png wins when it
   exists). Props (popcorn, bucket, gears...) are motion-graphics elements. */
(function () {
  const INK = '#1c1816', CREAM = '#f3ead2', SNOW = '#fbf8f0', GOLD = '#e8b33a', RED = '#b81d16', VEL = '#8f1a16';
  const rng = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  function screen(x, w, h, alpha = 0.18, cell = 6) {
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(255,250,235,${alpha})`;
    for (let yy = 0; yy < h + cell; yy += cell) for (let xx = (yy / cell) % 2 ? cell / 2 : 0; xx < w + cell; xx += cell) { x.beginPath(); x.arc(xx, yy, cell * 0.22, 0, 7); x.fill(); }
    x.restore();
  }
  const sky = (x, w, h, a, b) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); x.fillStyle = gr; x.fillRect(0, 0, w, h); };
  function person(x, px, by, s, hat) {
    x.fillRect(px - 14 * s, by - 90 * s, 28 * s, 90 * s); x.beginPath(); x.arc(px, by - 102 * s, 13 * s, 0, 7); x.fill();
    if (hat === 1) { x.fillRect(px - 20 * s, by - 112 * s, 40 * s, 5 * s); x.fillRect(px - 12 * s, by - 132 * s, 24 * s, 22 * s); }
    if (hat === 2) { x.beginPath(); x.ellipse(px, by - 112 * s, 22 * s, 6 * s, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(px, by - 115 * s, 13 * s, 9 * s, 0, Math.PI, 0); x.fill(); }
  }

  const PLATES = {
    palace(x, w, h) {
      sky(x, w, h, '#3a1512', '#170908');
      x.fillStyle = GOLD; x.beginPath(); x.moveTo(w * 0.1, h); x.lineTo(w * 0.1, h * 0.3); x.quadraticCurveTo(w * 0.5, h * 0.02, w * 0.9, h * 0.3); x.lineTo(w * 0.9, h); x.fill();
      x.fillStyle = '#efe2c0'; x.beginPath(); x.moveTo(w * 0.16, h); x.lineTo(w * 0.16, h * 0.34); x.quadraticCurveTo(w * 0.5, h * 0.1, w * 0.84, h * 0.34); x.lineTo(w * 0.84, h); x.fill();
      for (const side of [0, 1]) {                                                 // velvet curtains
        x.fillStyle = VEL; x.beginPath(); const x0 = side ? w * 0.84 : w * 0.16, dir = side ? -1 : 1;
        x.moveTo(x0, h * 0.3); x.lineTo(x0 + dir * w * 0.2, h * 0.3); x.quadraticCurveTo(x0 + dir * w * 0.08, h * 0.6, x0 + dir * w * 0.12, h); x.lineTo(x0, h); x.fill();
        x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(x0 + dir * k * w * 0.035, h * 0.3); x.quadraticCurveTo(x0 + dir * k * w * 0.02, h * 0.65, x0 + dir * k * w * 0.024, h); x.stroke(); }
      }
      x.fillStyle = VEL; x.fillRect(w * 0.16, h * 0.26, w * 0.68, h * 0.08);
      x.fillStyle = GOLD; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(w * 0.18 + i * w * 0.038, h * 0.34, 6, 0, 7); x.fill(); }
      x.fillStyle = INK; for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) { const px = w * 0.08 + i * w * 0.065 + (r % 2) * 18; x.beginPath(); x.arc(px, h * (0.86 + r * 0.06), 20, Math.PI, 0); x.fill(); x.fillRect(px - 20, h * (0.86 + r * 0.06), 40, 40); }
      screen(x, w, h, 0.12);
    },
    crowd(x, w, h) {
      sky(x, w, h, '#24304f', '#0f1424'); const R = rng(3);
      x.fillStyle = '#1c1816'; x.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.3);                     // marquee
      x.fillStyle = CREAM; x.fillRect(w * 0.12, h * 0.17, w * 0.76, h * 0.2);
      x.fillStyle = INK; x.font = `${h * 0.12}px Bebas`; x.textAlign = 'center'; x.fillText('NOW TALKING!', w / 2, h * 0.32);
      for (let i = 0; i < 26; i++) { x.fillStyle = (i % 2) ? GOLD : '#fff3c4'; x.beginPath(); x.arc(w * 0.1 + i * w * 0.0315, h * 0.14, 6, 0, 7); x.fill(); x.beginPath(); x.arc(w * 0.1 + i * w * 0.0315, h * 0.4, 6, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(232,179,58,0.25)'; x.beginPath(); x.moveTo(w * 0.1, h * 0.42); x.lineTo(w * 0.9, h * 0.42); x.lineTo(w, h); x.lineTo(0, h); x.fill();
      x.fillStyle = INK; for (let i = 0; i < 16; i++) { const s = 0.9 + R() * 0.35; person(x, w * 0.04 + i * w * 0.062 + R() * 10, h * 0.98, s * h / 420, Math.floor(R() * 3)); }
      screen(x, w, h, 0.12);
    },
    concession(x, w, h) {
      sky(x, w, h, '#5a1d17', '#2a0c09');
      x.fillStyle = GOLD; x.fillRect(0, h * 0.12, w, h * 0.12); x.fillStyle = INK; x.font = `${h * 0.09}px Bebas`; x.textAlign = 'center'; x.fillText('REFRESHMENTS', w / 2, h * 0.21);
      // glass popcorn machine
      x.fillStyle = INK; x.fillRect(w * 0.32, h * 0.3, w * 0.36, h * 0.38);
      x.fillStyle = '#fff3c4'; x.fillRect(w * 0.35, h * 0.33, w * 0.3, h * 0.3);
      const R = rng(8); x.fillStyle = '#f7e6a8'; for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(w * 0.36 + R() * w * 0.28, h * 0.5 + R() * h * 0.12, 5 + R() * 5, 0, 7); x.fill(); }
      x.fillStyle = RED; x.fillRect(w * 0.32, h * 0.26, w * 0.36, h * 0.05);
      x.fillStyle = INK; x.fillRect(0, h * 0.68, w, h * 0.32); x.fillStyle = GOLD; x.fillRect(0, h * 0.68, w, 8);
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? CREAM : RED; x.fillRect(w * (0.06 + i * 0.03), h * 0.52, w * 0.025, h * 0.16); }
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? CREAM : RED; x.fillRect(w * (0.76 + i * 0.03), h * 0.52, w * 0.025, h * 0.16); }
      screen(x, w, h, 0.12);
    },
    dig(x, w, h) {
      const R = rng(5), bands = ['#d9b98a', '#c49a66', '#a97c4c', '#8c6239', '#6e4a2a'];
      bands.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, h * (0.1 + i * 0.18)); for (let k = 0; k <= 12; k++) x.lineTo(k * w / 12, h * (0.1 + i * 0.18) + (R() - 0.5) * 18); x.lineTo(w, h); x.lineTo(0, h); x.fill(); });
      x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, w, h * 0.1);
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(40,25,10,0.35)'; x.beginPath(); x.arc(R() * w, h * 0.15 + R() * h * 0.8, 2 + R() * 4, 0, 7); x.fill(); }
      x.strokeStyle = INK; x.lineWidth = 2; for (let i = 0; i <= 6; i++) { x.beginPath(); x.moveTo(i * w / 6, h * 0.1); x.lineTo(i * w / 6, h); x.stroke(); }
      for (let i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(0, h * 0.1 + i * h * 0.18); x.lineTo(w, h * 0.1 + i * h * 0.18); x.stroke(); }
      screen(x, w, h, 0.1);
    },
    audience(x, w, h) {
      const gr = x.createRadialGradient(w / 2, -h * 0.2, 10, w / 2, -h * 0.2, h * 1.3); gr.addColorStop(0, '#f6f0da'); gr.addColorStop(0.35, '#7d8aa0'); gr.addColorStop(1, '#10131c');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = INK; const R = rng(9);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) {
        const px = i * w / 9 + (r % 2) * w / 18 + (R() - 0.5) * 10, py = h * (0.45 + r * 0.16), s = 0.8 + r * 0.25;
        x.beginPath(); x.arc(px, py, 26 * s, 0, 7); x.fill(); x.fillRect(px - 40 * s, py + 18 * s, 80 * s, 200);
      }
      screen(x, w, h, 0.1);
    },
  };

  /* ---- props ---- */
  function popcornPiece(x, cx, cy, r, seed) {                // one fluffy kernel, cut-paper style
    const R = rng(seed), lobes = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + R() * 0.5; lobes.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.4, r * (0.42 + R() * 0.2)]); }
    lobes.push([0, 0, r * 0.55]);
    x.fillStyle = '#fffaf0'; lobes.forEach(([dx, dy, rr]) => { x.beginPath(); x.arc(cx + dx, cy + dy, rr + 5, 0, 7); x.fill(); });
    lobes.forEach(([dx, dy, rr], i) => {
      const gr = x.createRadialGradient(cx + dx - rr * 0.3, cy + dy - rr * 0.3, 1, cx + dx, cy + dy, rr);
      gr.addColorStop(0, '#fffdf3'); gr.addColorStop(0.7, '#f7e9bf'); gr.addColorStop(1, i % 3 ? '#efce7a' : '#e2b44e');
      x.fillStyle = gr; x.beginPath(); x.arc(cx + dx, cy + dy, rr, 0, 7); x.fill();
    });
    x.fillStyle = '#c98a2c'; x.beginPath(); x.ellipse(cx + r * 0.15, cy + r * 0.25, r * 0.16, r * 0.1, 0.4, 0, 7); x.fill();
  }
  function bucket(x, w, h, label = 'POPCORN') {               // red & white striped bucket heaped with popcorn
    const top = h * 0.32, R = rng(2);
    for (let i = 0; i < 26; i++) popcornPiece(x, w * 0.14 + R() * w * 0.72, top - R() * h * 0.22 + 20, 30 + R() * 16, 50 + i);
    x.save(); x.beginPath(); x.moveTo(w * 0.08, top); x.lineTo(w * 0.92, top); x.lineTo(w * 0.8, h); x.lineTo(w * 0.2, h); x.closePath();
    x.fillStyle = '#fffaf0'; x.lineWidth = 18; x.strokeStyle = '#fffaf0'; x.lineJoin = 'round'; x.stroke(); x.fill(); x.clip();
    for (let i = -2; i < 12; i++) { x.fillStyle = i % 2 ? '#f6efe0' : RED; x.beginPath(); x.moveTo(w * (0.08 + i * 0.084), top); x.lineTo(w * (0.08 + (i + 1) * 0.084), top); x.lineTo(w * (0.2 + (i + 1) * 0.06), h); x.lineTo(w * (0.2 + i * 0.06), h); x.fill(); }
    const sh = x.createLinearGradient(w * 0.08, 0, w * 0.92, 0); sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(0.3, 'rgba(0,0,0,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
    x.fillStyle = sh; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(w / 2, h * 0.62, w * 0.27, h * 0.13, 0, 0, 7); x.fill();
    x.strokeStyle = RED; x.lineWidth = 5; x.beginPath(); x.ellipse(w / 2, h * 0.62, w * 0.25, h * 0.115, 0, 0, 7); x.stroke();
    x.fillStyle = RED; x.font = `${w * 0.1}px Abril`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, w / 2, h * 0.625);
    x.restore();
    for (let i = 0; i < 9; i++) popcornPiece(x, w * 0.14 + R() * w * 0.72, top + 8 - R() * 30, 26 + R() * 14, 90 + i);
    screen(x, w, h, 0.08, 7);
  }
  function gear(x, cx, cy, r, teeth, rot) {
    x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath();
    for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r : r * 0.82; x.lineTo(Math.cos(a - 0.08) * rr, Math.sin(a - 0.08) * rr); x.lineTo(Math.cos(a + 0.08) * rr, Math.sin(a + 0.08) * rr); }
    x.closePath(); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.25, 0, 7); x.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); x.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); x.stroke(); }
    x.restore();
  }
  window.ART = { PLATES, screen, popcornPiece, bucket, gear };
})();
