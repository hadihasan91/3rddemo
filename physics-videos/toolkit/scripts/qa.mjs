// Technical QA of a finished video: specs, loudness, A/V sync, contact sheet and waveform.
//
//   node scripts/qa.mjs <videoDir> [--file final.mp4] [--every 3] [--out qa/final] [--cover cover.jpg]
//
// Also checks that the FIRST FRAME of the file is the cover (cover.jpg, SSIM ≥ 0.9), so platforms
// that thumbnail from frame 0 show it. Fails if cover.jpg is missing.
//
// Prints a PASS/WARN report and writes:
//   <out>_sheet_XX.jpg   frames from the ENCODED video (catches fades, encode issues)
//   <out>_wave.png       waveform of the soundtrack (voice vs. music balance at a glance)
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { args, ffmpegPath, ffprobePath, run, videoDir } from './common.mjs';

const a = args();
const dir = videoDir(a._[0]);
const file = join(dir, a.file || 'final.mp4');
const base = join(dir, a.out || 'qa/final'); mkdirSync(dirname(base), { recursive: true });
const every = +(a.every || 3);

const probe = JSON.parse((await run(ffprobePath(), ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,duration,sample_rate,channels:format=duration,size', '-of', 'json', file])).out);
const v = probe.streams.find(s => s.codec_type === 'video'), au = probe.streams.find(s => s.codec_type === 'audio');
const dur = +probe.format.duration;
const { err } = await run(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const I = +(err.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
const TP = +(err.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)?.[0]);
const sil = (await run(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=n=-45dB:d=4', '-f', 'null', '-'])).err;
const silences = [...sil.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map(m => [+m[1], +m[2]]);

const coverFile = join(dir, a.cover && a.cover !== true ? a.cover : 'cover.jpg');
let coverSsim = null;
if (existsSync(coverFile)) {
  const r = await run(ffmpegPath(), ['-hide_banner', '-nostats', '-i', file, '-i', coverFile, '-filter_complex',
    '[0:v]trim=end_frame=1,setpts=PTS-STARTPTS,scale=1920:1080,format=yuv420p[a];[1:v]scale=1920:1080,format=yuv420p[b];[a][b]ssim', '-frames:v', '1', '-f', 'null', '-']);
  coverSsim = +(r.err.match(/All:([\d.]+)/)?.[1] ?? NaN);
}

const checks = [];
const chk = (ok, label, detail, warnOnly = false) => checks.push({ s: ok ? 'PASS' : warnOnly ? 'WARN' : 'FAIL', label, detail });
chk(v && v.width === 1920 && v.height === 1080, 'resolution', v ? `${v.width}×${v.height}` : 'no video');
chk(v && /^(30|30000\/1001|25|24|60)/.test(v.r_frame_rate), 'frame rate', v?.r_frame_rate);
chk(!!au, 'audio track', au ? `${au.codec_name} ${au.sample_rate} Hz ${au.channels}ch` : 'none');
chk(au && Math.abs(+au.duration - +v.duration) < 0.25, 'A/V length match', au ? `video ${(+v.duration).toFixed(2)}s · audio ${(+au.duration).toFixed(2)}s` : '-');
chk(Math.abs(I - -16) <= 1.5, 'integrated loudness', `${I} LUFS (target −16)`);
chk(TP <= -1.0, 'true peak', `${TP} dBTP (≤ −1)`);
chk(silences.length === 0, 'no long silences', silences.length ? silences.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)}s`).join(', ') : 'none ≥4s', true);
chk(coverSsim !== null && coverSsim >= 0.9, 'cover = first frame', coverSsim === null ? `no ${coverFile.split('/').pop()} — run capture.mjs cover, then mix.mjs` : `SSIM ${coverSsim.toFixed(3)} (≥ 0.9)`);
chk(dur >= 30 && dur <= 240, 'duration', `${dur.toFixed(1)}s`, true);

await run(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', file, '-vf', `fps=1/${every},scale=640:360,tile=4x4:padding=8:margin=8:color=white`, '-q:v', '3', `${base}_sheet_%02d.jpg`]);
await run(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', file, '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=1800x360:colors=0x1f4f86', '-frames:v', '1', `${base}_wave.png`]);

console.log(`QA ${file}  (${(probe.format.size / 1e6).toFixed(1)} MB)`);
for (const c of checks) console.log(`  ${c.s.padEnd(4)}  ${c.label.padEnd(20)} ${c.detail}`);
console.log(`  sheets: ${base}_sheet_XX.jpg (every ${every}s) · waveform: ${base}_wave.png`);
process.exit(checks.some(c => c.s === 'FAIL') ? 1 : 0);
