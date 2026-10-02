"""Caption timing: split each voice line into short phrases and time them from the
speech segments ffmpeg's silencedetect finds in vo/<id>.wav (falls back to a
character-proportional split). Appends window.CAPS to cues.js.
usage: python3 tools/captions.py"""
import json, os, re, subprocess
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cues = json.load(open(os.path.join(root, 'cues.json')))
MAXC = 30
DIGITS = {'six thousand seven hundred': '6,700', 'eighteen eighty-five': '1885', 'nineteen twenty-seven': '1927', 'World War Two': 'World War II'}
def phrases(text):
    parts = [p.strip() for p in re.split(r'(?<=[.,?!])\s+', text) if p.strip()]
    merged = []
    for p in parts:                      # glue short lead-ins ("Then," "In Peru,") to what follows
        if merged and len(merged[-1]) < 12 and not merged[-1].endswith(('.', '?', '!')): merged[-1] += ' ' + p
        else: merged.append(p)
    out = []
    for p in merged:                     # split long phrases once, at the word nearest the middle
        if len(p) <= MAXC: out.append(p); continue
        w = p.split(); cut = min(range(1, len(w)), key=lambda i: abs(len(' '.join(w[:i])) - len(p) / 2))
        a, b = ' '.join(w[:cut]), ' '.join(w[cut:])
        for q in (a, b):
            if len(q) > MAXC + 8:
                ww = q.split(); c2 = len(ww) // 2; out += [' '.join(ww[:c2]), ' '.join(ww[c2:])]
            else: out.append(q)
    return out
def speech_segments(wav, dur):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=n=-35dB:d=0.16', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    gaps = list(zip(st, en))
    segs, t = [], 0.0
    for a, b in gaps:
        if a > t + 0.05: segs.append((t, a))
        t = b
    if dur > t + 0.05: segs.append((t, dur))
    return segs
caps = []
for lid in cues['order']:
    L = cues['lines'][lid]; txt = L['text']
    for k, v in DIGITS.items(): txt = txt.replace(k, v)
    ph = phrases(txt)
    segs = speech_segments(os.path.join(root, 'vo', lid + '.wav'), L['dur'])
    # distribute phrases over the speech time by character count, snapping starts to segment starts when close
    total = sum(len(p) for p in ph); speech = sum(b - a for a, b in segs)
    def at_speech(x):                    # map "speech seconds" -> line time
        for a, b in segs:
            if x <= b - a: return a + x
            x -= b - a
        return segs[-1][1]
    acc = 0
    for p in ph:
        s = at_speech(speech * acc / total); acc += len(p); e = at_speech(speech * acc / total)
        caps.append([round(L['at'] + s, 2), round(L['at'] + e, 2), p])
for i in range(len(caps) - 1):           # no overlaps, and hold a beat if the next caption is far
    caps[i][1] = min(max(caps[i][1], caps[i][0] + 0.6), caps[i + 1][0] - 0.02)
js = open(os.path.join(root, 'cues.js')).read().split('\nwindow.CAPS')[0].rstrip('\n')
open(os.path.join(root, 'cues.js'), 'w').write(js + '\nwindow.CAPS = ' + json.dumps(caps) + ';\n')
for c in caps: print(f'{c[0]:6.2f} {c[1]:6.2f}  {c[2]}')
