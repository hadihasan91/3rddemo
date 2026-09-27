// One-time setup: install npm deps (if missing) and verify every binary works.
//   node scripts/setup.mjs
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { TOOLKIT } from './common.mjs';

if (!existsSync(join(TOOLKIT, 'node_modules', 'puppeteer-core')) || !existsSync(join(TOOLKIT, 'node_modules', 'node-edge-tts'))) {
  console.log('Installing toolkit dependencies…');
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: TOOLKIT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
const { ffmpegPath, ffprobePath, chromePath } = await import('./common.mjs');
const check = (name, bin, a) => { const r = spawnSync(bin, a); const ok = r.status === 0; console.log(`${ok ? '✓' : '✗'} ${name}: ${ok ? String(r.stdout).split('\n')[0].slice(0, 70) : 'NOT WORKING (' + bin + ')'}`); return ok; };
let ok = true;
ok = check('ffmpeg', ffmpegPath(), ['-version']) && ok;
ok = check('ffprobe', ffprobePath(), ['-version']) && ok;
try { ok = check('chrome', chromePath(), ['--version']) && ok; } catch (e) { console.log('✗ chrome:', e.message); ok = false; }
console.log(ok ? 'Toolkit ready.' : 'Toolkit NOT ready — fix the items above.');
process.exit(ok ? 0 : 1);
