"""
Real Australian speakers × noisy room (transcription accuracy only).

Input: LibriVox "Celebration of Dialects and Accents, Vol. 1" clips (public
domain, archive.org/details/dialect_accent_0909_librivox): real volunteers
reading Aesop's "The North Wind and the Sun" in their own accent.
For each clip: clean / busy (15 dB) / loud (5 dB) versions using the same
noise as synth.py, transcribed with the production Deepgram settings, and
scored against the standard passage (the LibriVox intro is cut off first).
An English RP and a New Zealand reader are baselines.

  python scripts/workspace-eval/aus-noise/real_voices.py <librivox folder> <AMI folder>
"""
import json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import ff, duration, make_babble, mix, LEVELS  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REF = ("The North Wind and the Sun were disputing which was the stronger, when a traveller came along wrapped "
       "in a warm cloak. They agreed that the one who first succeeded in making the traveller take his cloak off "
       "should be considered stronger than the other. Then the North Wind blew as hard as he could, but the more "
       "he blew the more closely did the traveller fold his cloak around him; and at last the North Wind gave up "
       "the attempt. Then the Sun shone out warmly, and immediately the traveller took off his cloak. And so the "
       "North Wind was obliged to confess that the Sun was the stronger of the two.")
READERS = {
    "03arb": "Australian (Annise)", "15gwd": "Australian (Graeme Dunlop)", "24tf": "Australian, cultivated (Timothy Ferguson)",
    "25mvc": "Australian (Magdalena)", "33ml": "Australian, metropolitan", "35lb": "Australian",
    "04rg": "BASELINE English RP (Ruth Golding)", "13mch": "BASELINE New Zealand",
}


def words(t):
    t = t.lower().replace("traveler", "traveller").replace("shined", "shone")
    return re.findall(r"[a-z']+", t)


def wer(ref, hyp):
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): d[i][0] = i
    for j in range(m + 1): d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (ref[i-1] != hyp[j-1]))
    i, j, errs = n, m, []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i-1][j-1] + (ref[i-1] != hyp[j-1]):
            if ref[i-1] != hyp[j-1]: errs.append(f"{ref[i-1]}→{hyp[j-1]}")
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i-1][j] + 1: errs.append(f"-{ref[i-1]}"); i -= 1
        else: errs.append(f"+{hyp[j-1]}"); j -= 1
    return d[n][m] / n, list(reversed(errs))


def passage_only(hyp):
    """Cut the LibriVox intro/outro: from the first 'north wind' to the last 'two'."""
    # The title is read first ("The North Wind and the Sun, attributed to Aesop"): start at the
    # "north wind" that the passage itself begins with ("...and the sun were disputing").
    start = next((k for k in range(len(hyp) - 1) if hyp[k] == "north" and hyp[k+1] == "wind"
                  and any(w in ("were", "was", "disputing") for w in hyp[k+2:k+8])), 0)
    start = max(0, start - 1)  # keep the leading "the"
    end = max((k for k, w in enumerate(hyp) if w in ("two", "too", "to")), default=len(hyp) - 1)
    return hyp[start:end + 1]


def transcribe(path):
    key = os.environ["DEEPGRAM_API_KEY"]
    qs = urllib.parse.urlencode({"model": "nova-3", "language": "en", "smart_format": "true", "punctuate": "true",
                                 "utterances": "true", "utt_split": "0.8", "diarize": "true", "mip_opt_out": "true"})
    req = urllib.request.Request(f"https://api.deepgram.com/v1/listen?{qs}", data=open(path, "rb").read(),
                                 headers={"Authorization": f"Token {key}", "Content-Type": "audio/wav"})
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.load(r)
    return j["results"]["channels"][0]["alternatives"][0]["transcript"]


def main():
    lib, ami = sys.argv[1], sys.argv[2]
    ref = words(REF)
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for f in sorted(os.listdir(lib)):
            m = re.search(r"_(\d+[a-z]+)_64kb\.mp3$", f)
            if not m: continue
            rid = m.group(1)
            clean = os.path.join(tmp, f"{rid}.clean.wav")
            ff("-i", os.path.join(lib, f), "-ar", "16000", "-ac", "1", clean)
            babble = make_babble(ami, duration(clean) + 1, tmp)
            files = {"clean": clean}
            for name, (snr, rumble) in LEVELS.items():
                files[name] = os.path.join(tmp, f"{rid}.{name}.wav")
                mix(clean, babble, snr, rumble, files[name], tmp)
            for level, path in files.items():
                hyp = passage_only(words(transcribe(path)))
                w, errs = wer(ref, hyp)
                rows.append({"reader": READERS.get(rid, rid), "id": rid, "level": level, "wer": round(w * 100, 1), "errors": errs[:12]})
                print(f"{READERS.get(rid, rid):45s} {level:6s} WER {w*100:5.1f}%  {' '.join(errs[:8])}")

    def avg(pred, level):
        xs = [r["wer"] for r in rows if pred(r) and r["level"] == level]
        return f"{sum(xs)/len(xs):.1f}%" if xs else "n/a"
    aus = lambda r: not r["reader"].startswith("BASELINE")
    base = lambda r: r["reader"].startswith("BASELINE")
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H-%M")
    md = [f"# Eval: real Australian voices × noisy room ({stamp})", "",
          "Real LibriVox volunteers (public domain) reading Aesop's \"The North Wind and the Sun\" in their own accent, "
          "transcribed with the production Deepgram settings. Word error rate is measured on the passage only (intro cut). "
          "The baselines (English RP, New Zealand) show how much of the error is the accent vs small wording differences in the text read.", "",
          "| Level | Australian speakers (avg WER) | Baselines (avg WER) |", "|---|---|---|",
          *[f"| {lv} | {avg(aus, lv)} | {avg(base, lv)} |" for lv in ["clean", "busy", "loud"]], "",
          "| Reader | Level | WER | First errors |", "|---|---|---|---|",
          *[f"| {r['reader']} | {r['level']} | {r['wer']}% | {', '.join(r['errors'][:8]) or '—'} |" for r in rows]]
    out = os.path.join(ROOT, "docs", "product", "eval-reports", f"aus-real-voices-{stamp}")
    open(out + ".md", "w", encoding="utf-8").write("\n".join(md))
    json.dump(rows, open(out + ".json", "w"), indent=1)
    print("report →", out + ".md")


if __name__ == "__main__":
    main()
