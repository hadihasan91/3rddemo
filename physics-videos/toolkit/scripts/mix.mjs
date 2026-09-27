// Final mix: picture + voice-over (+ foley) (+ ducked background music) → broadcast-loudness MP4.
//
//   node scripts/mix.mjs <videoDir> [--video draft-silent.mp4] [--out draft.mp4]
//        [--music music.mp3] [--music-db -19] [--sfx-db -7] [--no-sfx]
//        [--fade-in 0.6] [--fade-out 1.2] [--lufs -16]
//        [--cover cover.jpg] [--cover-hold 0.5] [--cover-fade 0.4] [--no-cover]
//
// • Voice lines are placed at the times in cues.json (from vo.mjs).
// • Foley (sfx.wav) and music are side-chain ducked under the voice, so words stay clear.
// • Music is loudness-normalized first (any track behaves the same), loops if shorter than the
//   video, fades in/out, and sits --music-db below the voice (−19 ≈ soft, ~10 dB under the voice
//   in pauses; it ducks a further ~6–8 dB while someone speaks). Useful range −16…−23.
// • Loudness is normalized (default −16 LUFS integrated, −1.5 dBTP) — standard for online video.
// • Cover: if cover.jpg exists (capture.mjs cover), it becomes the FIRST FRAME of the video — held
//   --cover-hold seconds, then cross-dissolved into the animation over --cover-fade seconds. Every
//   platform that thumbnails from frame 0 (WhatsApp, Telegram, X, Slack, iMessage…) shows it.
//   All audio is shifted by --cover-hold, so voice/picture sync is unchanged. --no-cover disables.
// • Picture fades in from paper (when there is no cover) and fades out to the paper colour.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { args, ffmpegPath, probeDuration, readJson, run, videoDir } from './common.mjs';

const a = args();
const dir = videoDir(a._[0]);
const video = join(dir, a.video || 'draft-silent.mp4');
const out = join(dir, a.out || 'draft.mp4');
if (!existsSync(video)) throw new Error(`Missing ${video} — run capture.mjs render first`);
const cues = readJson(join(dir, 'cues.json'));
const tl = readJson(join(dir, 'timeline.json'), {});
const D = +probeDuration(video).toFixed(3);
const paper = (tl.paper || '#fbfbf8').replace('#', '0x');
const fadeIn = +(a['fade-in'] ?? 0.6), fadeOut = +(a['fade-out'] ?? 1.2);
const useSfx = !a['no-sfx'] && existsSync(join(dir, 'sfx.wav'));
const music = a.music ? join(dir, a.music) : null;
if (music && !existsSync(music)) throw new Error(`Missing music file ${music}`);
const coverArg = a.cover && a.cover !== true ? a.cover : 'cover.jpg';
const cover = a['no-cover'] ? null : join(dir, coverArg);
if (a.cover && a.cover !== true && !existsSync(cover)) throw new Error(`Missing cover ${cover} — run capture.mjs cover first`);
const useCover = !!cover && existsSync(cover);
const hold = useCover ? +(a['cover-hold'] ?? 0.5) : 0, xf = +(a['cover-fade'] ?? 0.4), fps = +(tl.fps || 30);
const TOT = +(D + hold).toFixed(3);
const sfxDb = +(a['sfx-db'] ?? -7), musicDb = +(a['music-db'] ?? -19), lufs = +(a.lufs ?? -16);

const inputs = ['-i', video];
const vo = cues.order.map(id => ({ id, at: cues.lines[id].at, file: join(dir, 'vo', `${id}.mp3`) }));
for (const v of vo) { if (!existsSync(v.file)) throw new Error(`Missing ${v.file} — run vo.mjs`); inputs.push('-i', v.file); }
let idx = 1 + vo.length;
const sfxIdx = useSfx ? idx++ : -1; if (useSfx) inputs.push('-i', join(dir, 'sfx.wav'));
const musIdx = music ? idx++ : -1; if (music) inputs.push('-stream_loop', '-1', '-i', music);
const covIdx = useCover ? idx++ : -1; if (useCover) inputs.push('-loop', '1', '-framerate', String(fps), '-t', String(hold + xf), '-i', cover);

const f = [];
f.push(`anullsrc=r=48000:cl=stereo,atrim=0:${D}[base]`);
vo.forEach((v, i) => f.push(`[${i + 1}]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(v.at * 1000)}:all=1[v${i}]`));
f.push(`[base]${vo.map((_, i) => `[v${i}]`).join('')}amix=inputs=${vo.length + 1}:normalize=0:duration=first,highpass=f=70,` +
  `acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,asplit=3[vo][key1][key2]`);
let beds = [];
if (useSfx) { f.push(`[${sfxIdx}]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${D},volume=${sfxDb}dB[fx0]`); f.push(`[fx0][key1]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=400[fx]`); beds.push('[fx]'); }
else f.push('[key1]anullsink');
if (music) {
  f.push(`[${musIdx}]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${D},asetpts=N/SR/TB,loudnorm=I=-16:TP=-2:LRA=11,aresample=48000,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, D - 3.5)}:d=3.5,volume=${musicDb}dB[mu0]`);
  f.push(`[mu0][key2]sidechaincompress=threshold=0.03:ratio=4:attack=60:release=700:makeup=1[mu]`); beds.push('[mu]');
} else f.push('[key2]anullsink');
f.push(`[vo]${beds.join('')}amix=inputs=${1 + beds.length}:normalize=0:duration=first,loudnorm=I=${lufs}:TP=-1.5:LRA=11,aresample=48000,atrim=0:${D},afade=t=in:st=0:d=0.05,afade=t=out:st=${Math.max(0, D - fadeOut)}:d=${fadeOut}${useCover ? `,adelay=${Math.round(hold * 1000)}:all=1,apad,atrim=0:${TOT}` : ''}[aout]`);
if (useCover) {
  f.push(`[0:v]setpts=PTS-STARTPTS,settb=AVTB,format=yuv420p,fade=t=out:st=${Math.max(0, D - fadeOut)}:d=${fadeOut}:color=${paper},fps=${fps}[mv]`);
  f.push(`[${covIdx}:v]scale=1920:1080,setsar=1,setpts=PTS-STARTPTS,settb=AVTB,format=yuv420p,fps=${fps}[cv]`);
  f.push(`[cv][mv]xfade=transition=fade:duration=${xf}:offset=${hold}[vout]`);
} else {
  f.push(`[0:v]fade=t=in:st=0:d=${fadeIn}:color=${paper},fade=t=out:st=${Math.max(0, D - fadeOut)}:d=${fadeOut}:color=${paper}[vout]`);
}

await run(ffmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'),
  '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(TOT), '-movflags', '+faststart', out]);
console.log(`mixed → ${out}  (${TOT}s · cover ${useCover ? `first frame, ${hold}s + ${xf}s dissolve` : 'none'} · voice ${vo.length} lines · sfx ${useSfx ? sfxDb + ' dB' : 'off'} · music ${music ? musicDb + ' dB, ducked' : 'off'})`);
