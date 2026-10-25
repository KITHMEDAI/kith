"""
Australian-accent noisy-room audio for the aus-noise eval.

For each dialogue in scripts.json: voices every turn with Microsoft's
Australian neural voices (edge-tts), joins them with short pauses, and writes
three versions (16 kHz mono WAV):
  <id>.clean.wav   no noise
  <id>.busy.wav    real background chatter at 15 dB below the speech
  <id>.loud.wav    chatter + low traffic / air-con rumble at 5 dB below the speech

Background chatter comes from real meetings (AMI Meeting Corpus, CC BY 4.0),
overlaid so no single voice is intelligible enough to dominate.

  python scripts/workspace-eval/aus-noise/synth.py <folder with AMI .wav files>
"""
import asyncio, json, os, re, subprocess, sys, tempfile

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "audio")
F, M = "en-AU-NatashaNeural", "en-AU-WilliamMultilingualNeural"
VOICES = {
    "shift_summary": {"A": F, "B": M},
    "home_visit": {"A": F, "B": M},
    "incident_report": {"A": M, "B": F},
    "team_meeting": {"A": F, "B": M},
}
LEVELS = {"busy": (15, False), "loud": (5, True)}  # SNR dB, add rumble


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def mean_db(path):
    r = subprocess.run(["ffmpeg", "-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    return float(re.search(r"mean_volume: (-?[\d.]+) dB", r.stderr).group(1))


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


async def voice_dialogue(sc, tmp):
    parts = []
    for i, (who, text) in enumerate(sc["turns"]):
        mp3 = os.path.join(tmp, f"{sc['id']}-{i}.mp3")
        await edge_tts.Communicate(text, VOICES[sc["id"]][who]).save(mp3)
        wav = mp3[:-4] + ".wav"
        # 16 kHz mono + 0.45 s pause after each turn (like the earlier TTS eval)
        ff("-i", mp3, "-af", "apad=pad_dur=0.45", "-ar", "16000", "-ac", "1", wav)
        parts.append(wav)
    lst = os.path.join(tmp, f"{sc['id']}.txt")
    with open(lst, "w") as f:
        f.write("\n".join(f"file '{p.replace(chr(92), '/')}'" for p in parts))
    clean = os.path.join(OUT, f"{sc['id']}.clean.wav")
    ff("-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", clean)
    return clean


def make_babble(ami_dir, seconds, tmp):
    """Two different real meetings overlaid (offset), then softened: café-style chatter."""
    srcs = sorted(f for f in os.listdir(ami_dir) if f.endswith(".wav"))[:2]
    out = os.path.join(tmp, "babble.wav")
    ff("-ss", "120", "-t", str(seconds), "-i", os.path.join(ami_dir, srcs[0]),
       "-ss", "300", "-t", str(seconds), "-i", os.path.join(ami_dir, srcs[1]),
       "-filter_complex", "[0][1]amix=inputs=2:normalize=0,lowpass=f=3500,aecho=0.6:0.5:40:0.3",
       "-ar", "16000", "-ac", "1", out)
    return out


def mix(clean, noise, snr, rumble, out, tmp):
    gain = mean_db(clean) - mean_db(noise) - snr
    if rumble:
        rum = os.path.join(tmp, "rumble.wav")
        ff("-f", "lavfi", "-i", f"anoisesrc=color=brown:duration={duration(clean)}:amplitude=0.25", "-ar", "16000", "-ac", "1", rum)
        rgain = mean_db(clean) - mean_db(rum) - (snr + 3)
        ff("-i", clean, "-i", noise, "-i", rum, "-filter_complex",
           f"[1]volume={gain}dB[n];[2]volume={rgain}dB[r];[0][n][r]amix=inputs=3:normalize=0:duration=first",
           "-ar", "16000", "-ac", "1", out)
    else:
        ff("-i", clean, "-i", noise, "-filter_complex",
           f"[1]volume={gain}dB[n];[0][n]amix=inputs=2:normalize=0:duration=first", "-ar", "16000", "-ac", "1", out)


async def main():
    ami = sys.argv[1] if len(sys.argv) > 1 else None
    if not ami or not os.path.isdir(ami):
        sys.exit("usage: synth.py <folder with AMI .wav files>")
    os.makedirs(OUT, exist_ok=True)
    scripts = json.load(open(os.path.join(HERE, "scripts.json"), encoding="utf-8"))
    with tempfile.TemporaryDirectory() as tmp:
        for sc in scripts:
            clean = await voice_dialogue(sc, tmp)
            secs = duration(clean)
            babble = make_babble(ami, secs + 1, tmp)
            for name, (snr, rumble) in LEVELS.items():
                mix(clean, babble, snr, rumble, os.path.join(OUT, f"{sc['id']}.{name}.wav"), tmp)
            print(f"{sc['id']}: {secs:.0f} s  (clean, busy {LEVELS['busy'][0]} dB, loud {LEVELS['loud'][0]} dB)")


if __name__ == "__main__":
    asyncio.run(main())
