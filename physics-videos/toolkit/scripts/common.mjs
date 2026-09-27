// Shared helpers for the toolkit scripts: binary paths, arg parsing, process runner.
import { existsSync, chmodSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const TOOLKIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(TOOLKIT, 'package.json'));

function ensureExec(p) { try { chmodSync(p, 0o755); } catch { /* ignore */ } return p; }
export function ffmpegPath() {
  try { const p = require('ffmpeg-static'); if (p && existsSync(p)) return ensureExec(p); } catch { /* fallthrough */ }
  return 'ffmpeg';
}
export function ffprobePath() {
  try { const p = require('@ffprobe-installer/ffprobe').path; if (p && existsSync(p)) return ensureExec(p); } catch { /* fallthrough */ }
  return 'ffprobe';
}
export function chromePath() {
  const cands = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const hit = cands.find(p => existsSync(p));
  if (!hit) throw new Error('No Chrome/Chromium found. Set CHROME_PATH.');
  return hit;
}
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) out[k] = true; else { out[k] = v; i++; } }
    else out._.push(a);
  }
  return out;
}
export function run(bin, argv, { quiet = true } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(bin, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; if (!quiet) process.stderr.write(d); });
    p.on('error', rej);
    p.on('close', code => code === 0 ? res({ out, err }) : rej(new Error(`${bin.split('/').pop()} exited ${code}\n${err.slice(-3000)}`)));
  });
}
export function probeDuration(file) {
  const r = spawnSync(ffprobePath(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(String(r.stdout).trim());
}
export function readJson(p, fallback) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { if (fallback !== undefined) return fallback; throw new Error(`Cannot read ${p}`); } }
export const videoDir = d => { if (!d) throw new Error('Pass the video folder as the first argument'); return resolve(d); };
