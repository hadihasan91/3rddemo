"""Voice-over: synthesize script.json lines with Kokoro, then write cues.json / cues.js.
usage: python3 tools/vo.py <model_dir>   (needs kokoro.onnx + voices.bin)"""
import json, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
md = sys.argv[1]
sc = json.load(open(os.path.join(root, 'script.json')))
k = Kokoro(os.path.join(md, 'kokoro.onnx'), os.path.join(md, 'voices.bin'))
lines, t, order = {}, sc['lead'], []
for i, l in enumerate(sc['lines']):
    s, sr = k.create(l['text'], voice=sc['voice'], speed=sc['speed'], lang='en-us')
    # trim leading/trailing silence
    nz = np.where(np.abs(s) > 0.01)[0]
    s = s[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.12 * sr)]
    f = os.path.join(root, 'vo', l['id'] + '.wav'); sf.write(f, s, sr)
    dur = len(s) / sr
    at = sc['lead'] if i == 0 else t + l.get('pauseBefore', 0.6)
    lines[l['id']] = {'at': round(at, 2), 'dur': round(dur, 2), 'end': round(at + dur, 2), 'text': l['text']}
    t = at + dur; order.append(l['id'])
    print(f"{l['id']:8} {at:6.2f} -> {t:6.2f}  ({dur:.1f}s)")
cues = {'total': round(t + sc['tail'], 2), 'order': order, 'lines': lines}
json.dump(cues, open(os.path.join(root, 'cues.json'), 'w'), indent=1)
open(os.path.join(root, 'cues.js'), 'w').write('window.CUES = ' + json.dumps(cues, indent=1) + ';\n')
print('total', cues['total'])
