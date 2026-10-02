// Project copy of physics-videos/toolkit/scripts/capture.mjs that waits for the async asset boot.
// usage: CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/capture.mjs render|stills|sheet . [...]
// Frame-exact rendering of a scene (scene.html) with headless Chrome.
//
//   node scripts/capture.mjs render <videoDir> [--fps 30] [--out draft-silent.mp4] [--crf 16]
//        → silent H.264 1920×1080 video + timeline.json (per-frame state + sfx events)
//   node scripts/capture.mjs stills <videoDir> --times 2,8.5,20 [--out qa]
//        → full-resolution JPEG stills (qa/still_<t>.jpg)
//   node scripts/capture.mjs sheet <videoDir> [--every 2] [--from 0] [--to <dur>] [--cols 4] [--out qa/sheet]
//        → contact sheets (16 time-stamped tiles each) for fast visual review
//   node scripts/capture.mjs cover <videoDir> [--time <payoff t>] [--title "…"] [--out cover.jpg]
//        → cover.jpg (1920×1080): the payoff frame with a big, thumbnail-legible title band.
//          mix.mjs puts it on the FIRST frame of the video so every platform picks it up.
//          --time defaults to 2.5 s before the end (the held payoff); --title to the scene's <title>.
//
// Fails loudly if the scene throws (window.SCENE_ERRORS) or the handwriting font did not load.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/3rddemo/physics-videos/toolkit/package.json');
const puppeteer = require('puppeteer-core');
import { args, chromePath, ffmpegPath, run, videoDir } from '../../physics-videos/toolkit/scripts/common.mjs';

const a = args();
const [cmd, rawDir] = a._;
if (!['render', 'stills', 'sheet', 'cover'].includes(cmd)) { console.error('usage: capture.mjs render|stills|sheet|cover <videoDir> [...]'); process.exit(2); }
const dir = videoDir(rawDir);
const sceneFile = a.scene || 'scene.html';
const url = 'file://' + join(dir, sceneFile) + '?video=1';

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--disable-extensions'] });
let exitCode = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof window.renderAt === 'function' || (window.SCENE_ERRORS && window.SCENE_ERRORS.length), { timeout: 120000 }).catch(() => {});
  const hasApi = await page.evaluate(() => typeof window.renderAt === 'function');
  if (!hasApi) throw new Error(`Scene did not start (no window.renderAt). Console errors:\n${consoleErrors.join('\n') || '(none)'}`);
  const fontOk = await page.evaluate(() => window.fontsReady);
  if (!fontOk) throw new Error('Handwriting font (Caveat) failed to load — check the toolkit path in scene.html');
  const info = await page.evaluate(() => ({ duration: window.SCENE.duration, paper: window.Sketch.theme.paper, title: document.title }));
  const errorsNow = async () => page.evaluate(() => window.SCENE_ERRORS.slice());
  const grab = async (q, stamp) => Buffer.from((await page.evaluate((q, stamp) => {
    const c = document.getElementById('stage');
    if (stamp) {                                  // QA timestamp (contact sheets only)
      const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = 'rgba(20,20,24,0.78)'; g.fillRect(0, 0, 250, 74); g.fillStyle = '#fff'; g.font = '700 50px monospace'; g.fillText(stamp, 16, 54); g.restore();
    }
    return c.toDataURL('image/jpeg', q);
  }, q, stamp)).split(',')[1], 'base64');

  if (cmd === 'render') {
    const fps = +(a.fps || 30), N = Math.round(info.duration * fps);
    const out = join(dir, a.out || 'draft-silent.mp4');
    const ff = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf || 16), '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out],
      { stdio: ['pipe', 'ignore', 'inherit'] });
    const ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg encode failed'))));
    const states = []; const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      states.push(await page.evaluate(t => window.renderAt(t), i / fps));
      const buf = await grab(0.95);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) { process.stdout.write(`frame ${i}/${N}  (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`); const e = await errorsNow(); if (e.length) throw new Error('Scene error: ' + e[0]); }
    }
    ff.stdin.end(); await ffDone;
    const errs = await errorsNow(); if (errs.length) throw new Error('Scene error: ' + errs[0]);
    writeFileSync(join(dir, 'timeline.json'), JSON.stringify({ fps, duration: info.duration, paper: info.paper, states, events: await page.evaluate(() => window.EVENTS) }));
    console.log(`rendered ${N} frames → ${out} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }

  if (cmd === 'stills') {
    const times = String(a.times || '').split(',').map(Number).filter(x => !isNaN(x)).sort((x, y) => x - y);
    if (!times.length) throw new Error('--times 1,5,10 required');
    const outDir = join(dir, a.out || 'qa'); mkdirSync(outDir, { recursive: true });
    for (const t of times) { await page.evaluate(t => window.renderAt(t), t); const f = join(outDir, `still_${t}.jpg`); writeFileSync(f, await grab(0.92)); console.log(f); }
    const errs = await errorsNow(); if (errs.length) throw new Error('Scene error: ' + errs[0]);
  }

  if (cmd === 'sheet') {
    const every = +(a.every || 2), from = +(a.from || 0), to = Math.min(+(a.to || info.duration), info.duration - 0.05);
    const cols = +(a.cols || 4), per = cols * cols;
    const base = join(dir, a.out || 'qa/sheet'); const tileDir = base + '_tiles';
    rmSync(tileDir, { recursive: true, force: true }); mkdirSync(tileDir, { recursive: true });
    let n = 0;
    for (let t = from; t <= to + 1e-6; t += every) {
      await page.evaluate(t => window.renderAt(t), t);
      writeFileSync(join(tileDir, `${String(n).padStart(4, '0')}.jpg`), await grab(0.85, `${t.toFixed(1)}s`)); n++;
    }
    const errs = await errorsNow(); if (errs.length) throw new Error('Scene error: ' + errs[0]);
    await run(ffmpegPath(), ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(tileDir, '%04d.jpg'),
      '-vf', `scale=360:640,tile=${cols}x${cols}:padding=8:margin=8:color=white`, '-q:v', '3', `${base}_%02d.jpg`]);
    rmSync(tileDir, { recursive: true, force: true });
    const made = readdirSync(join(base, '..')).filter(f => f.startsWith(base.split('/').pop() + '_') && f.endsWith('.jpg'));
    console.log(`${n} frames (every ${every}s, ${per} per sheet) → ${made.map(f => join(base, '..', f)).join(', ')}`);
  }

  if (cmd === 'cover') {
    const t = a.time !== undefined ? +a.time : Math.max(0, info.duration - 2.5);
    const title = String(a.title && a.title !== true ? a.title : info.title || '').trim();
    if (!title) throw new Error('No title: pass --title "…" or set <title> in scene.html');
    // blank paper (t = 0, nothing drawn yet) → used to erase the small in-scene title seamlessly
    await page.evaluate(() => { window.renderAt(0); const c = document.getElementById('stage'), o = document.createElement('canvas');
      o.width = c.width; o.height = c.height; o.getContext('2d').drawImage(c, 0, 0); window.__coverPaper = o; });
    await page.evaluate(t => window.renderAt(t), t);
    const errs = await errorsNow(); if (errs.length) throw new Error('Scene error: ' + errs[0]);
    await page.evaluate(title => {
      const c = document.getElementById('stage'), g = c.getContext('2d'), W = c.width, H = c.height, k = W / 1920;
      const th = window.Sketch.theme, ink = th.ink, sw = th.titleSwash;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      // paper band over the in-scene title, feathered into the picture
      const band = 206 * k, feather = 24 * k, m = document.createElement('canvas'); m.width = W; m.height = H;
      const mg = m.getContext('2d'); mg.drawImage(window.__coverPaper, 0, 0); mg.globalCompositeOperation = 'destination-in';
      const gr = mg.createLinearGradient(0, 0, 0, band + feather);      // one fill: destination-in keeps only what it covers
      gr.addColorStop(0, '#000'); gr.addColorStop(band / (band + feather), '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = gr; mg.fillRect(0, 0, W, band + feather);
      g.drawImage(m, 0, 0);
      // big title, auto-fitted to the width
      let size = 160 * k; const maxW = W - 220 * k, font = s => `700 ${s}px Caveat, 'Segoe Print', cursive`;
      g.font = font(size); while (g.measureText(title).width > maxW && size > 70 * k) { size -= 4 * k; g.font = font(size); }
      const tw = g.measureText(title).width, x = 104 * k, y = 160 * k;
      // marker swash behind the words + a hand-drawn underline
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(${sw[0]},${sw[1]},${sw[2]},0.55)`;
      g.beginPath(); g.moveTo(x - 18 * k, y - size * 0.34); g.quadraticCurveTo(x + tw * 0.5, y - size * 0.44, x + tw + 26 * k, y - size * 0.3);
      g.lineTo(x + tw + 20 * k, y + size * 0.1); g.quadraticCurveTo(x + tw * 0.5, y + size * 0.16, x - 10 * k, y + size * 0.12); g.closePath(); g.fill(); g.restore();
      g.fillStyle = ink; g.textBaseline = 'alphabetic'; g.fillText(title, x, y);
      g.strokeStyle = ink; g.lineWidth = 5 * k; g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i <= 24; i++) { const xx = x + 6 * k + i * (tw / 24), yy = y + 22 * k + Math.sin(i * 0.9) * 3 * k; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke(); g.restore();
    }, title);
    const out = join(dir, a.out || 'cover.jpg');
    writeFileSync(out, await grab(0.93));
    console.log(`cover (t=${t.toFixed(2)}s, "${title}") → ${out}`);
  }
} catch (e) {
  console.error('ERROR:', e.message); exitCode = 1;
} finally {
  await browser.close();
}
process.exit(exitCode);
