// Print duration / streams of any media file (e.g. to check a downloaded music track decodes).
//   node scripts/probe.mjs <file>
import { run, ffprobePath } from './common.mjs';
const f = process.argv[2];
if (!f) { console.error('usage: probe.mjs <file>'); process.exit(2); }
const { out } = await run(ffprobePath(), ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_type,codec_name,sample_rate,channels,width,height', '-of', 'json', f]);
const j = JSON.parse(out);
console.log(`${f}\n  duration ${(+j.format.duration).toFixed(1)}s` + j.streams.map(s => `\n  ${s.codec_type}: ${s.codec_name}${s.sample_rate ? ' ' + s.sample_rate + ' Hz' : ''}${s.width ? ' ' + s.width + '×' + s.height : ''}`).join(''));
