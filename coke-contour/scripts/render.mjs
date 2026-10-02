// Frame-exact capture of scene.html at 1080x1920 (9:16) with headless Chromium.
//
//   node scripts/render.mjs render [--fps 30] [--out draft-silent.mp4]   → video + timeline.json (for sfx.mjs)
//   node scripts/render.mjs sheet  [--every 1] [--from 0] [--to T]        → qa/sheet_XX.jpg contact sheets
//   node scripts/render.mjs stills --times 3,12.5                         → qa/still_<t>.jpg
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLKIT = resolve(DIR, '../physics-videos/toolkit');
const require = createRequire(join(TOOLKIT, 'package.json'));
const puppeteer = require('puppeteer-core');
const { args, chromePath, ffmpegPath, run } = await import(join(TOOLKIT, 'scripts/common.mjs'));

const a = args(), cmd = a._[0], W = 1080, H = 1920;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files'] }).catch(() => puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] }));
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + join(DIR, 'scene.html') + '?video=1', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.renderAt === 'function' || (window.SCENE_ERRORS || []).length, { timeout: 60000 }).catch(() => {});
  if (!(await page.evaluate(() => typeof window.renderAt === 'function'))) throw new Error('scene did not start: ' + errs.concat(await page.evaluate(() => window.SCENE_ERRORS || [])).join('\n'));
  if (!(await page.evaluate(() => window.fontsReady))) throw new Error('fonts failed to load');
  const dur = await page.evaluate(() => window.SCENE.duration);
  const check = async () => { const e = await page.evaluate(() => window.SCENE_ERRORS.slice()); if (e.length) throw new Error('scene error: ' + e[0]); };
  const grab = async (q, stamp) => Buffer.from((await page.evaluate((q, stamp) => {
    const c = document.getElementById('stage');
    if (stamp) { const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(20,20,24,0.8)'; g.fillRect(0, 0, 300, 90); g.fillStyle = '#fff'; g.font = '700 60px monospace'; g.fillText(stamp, 16, 66); g.restore(); }
    return c.toDataURL('image/jpeg', q);
  }, q, stamp)).split(',')[1], 'base64');

  if (cmd === 'render') {
    const fps = +(a.fps || 30), N = Math.round(dur * fps), out = join(DIR, a.out || 'draft-silent.mp4');
    const ff = spawn(ffmpegPath(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf || 15), '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg failed'))));
    const states = [], t0 = Date.now();
    for (let i = 0; i < N; i++) {
      states.push(await page.evaluate(t => window.renderAt(t), i / fps));
      const buf = await grab(0.96); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) { console.log(`frame ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); await check(); }
    }
    ff.stdin.end(); await done; await check();
    writeFileSync(join(DIR, 'timeline.json'), JSON.stringify({ fps, duration: dur, paper: '#ECE2CC', states, events: await page.evaluate(() => window.EVENTS) }));
    console.log(`rendered ${N} frames -> ${out}`);
  }
  if (cmd === 'stills') {
    const times = String(a.times).split(',').map(Number); mkdirSync(join(DIR, 'qa'), { recursive: true });
    for (const t of times) { await page.evaluate(t => window.renderAt(t), t); writeFileSync(join(DIR, 'qa', `still_${t}.jpg`), await grab(0.92)); }
    await check(); console.log('stills', times.join(', '));
  }
  if (cmd === 'sheet') {
    const every = +(a.every || 1), from = +(a.from || 0), to = Math.min(+(a.to || dur), dur - 0.05), cols = +(a.cols || 6), rows = +(a.rows || 3);
    const base = join(DIR, 'qa', a.out || 'sheet'), tiles = base + '_tiles'; rmSync(tiles, { recursive: true, force: true }); mkdirSync(tiles, { recursive: true });
    let n = 0; for (let t = from; t <= to + 1e-6; t += every) { await page.evaluate(t => window.renderAt(t), t); writeFileSync(join(tiles, `${String(n++).padStart(4, '0')}.jpg`), await grab(0.85, t.toFixed(1))); }
    await check();
    await run(ffmpegPath(), ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(tiles, '%04d.jpg'), '-vf', `scale=270:480,tile=${cols}x${rows}:padding=6:margin=6:color=white`, '-q:v', '3', `${base}_%02d.jpg`]);
    rmSync(tiles, { recursive: true, force: true }); console.log(`${n} tiles -> ${base}_XX.jpg`);
  }
} catch (e) { console.error('ERROR:', e.message); code = 1; } finally { await browser.close(); }
process.exit(code);
