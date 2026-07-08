"""
low_volume_test.py — Measures how transcription accuracy degrades as audio
volume drops, using real eka dataset samples scaled down to several
severity levels. This is the honest, achievable substitute for "simulate a
quiet microphone in a live browser session" — we can't reliably fake
degraded mic input into an automated browser recording, but we CAN take
real clinical audio and quantitatively measure the actual ASR pipeline's
behavior as it gets quieter.

Run: python low_volume_test.py
"""
from __future__ import annotations

import numpy as np

from config import get_logger
from data_loader import stream_eka_dataset
from pipeline import DiarizationTranscriptionPipeline
from eval import compute_wer, transcript_to_text

log = get_logger(__name__)

VOLUME_LEVELS = [1.0, 0.5, 0.25, 0.1, 0.05]  # 1.0 = original, 0.05 = ~26dB quieter
N_SAMPLES = 5


def scale_volume(audio: np.ndarray, factor: float) -> np.ndarray:
    return (audio * factor).astype(np.float32)


def main():
    log.info("Streaming %d real eka samples...", N_SAMPLES)
    samples = list(stream_eka_dataset(limit=N_SAMPLES))
    log.info("Got %d samples", len(samples))

    pipe = DiarizationTranscriptionPipeline(whisper_model_size="tiny")

    results = {}
    for level in VOLUME_LEVELS:
        hyps, refs = [], []
        turns_found = []
        for s in samples:
            scaled = scale_volume(s.audio_array, level)
            segments = pipe.run(scaled, s.sampling_rate)
            turns_found.append(len(segments))
            hyps.append(transcript_to_text(segments))
            refs.append(s.text)
        wer_result = compute_wer(hyps, refs)
        results[level] = {
            "wer": wer_result.wer,
            "avg_turns_found": sum(turns_found) / len(turns_found),
            "zero_turn_samples": sum(1 for t in turns_found if t == 0),
        }
        log.info("Volume=%.2f -> WER=%.3f, avg_turns=%.1f, zero_turn_samples=%d",
                  level, wer_result.wer, results[level]["avg_turns_found"], results[level]["zero_turn_samples"])

    print("\n=== LOW VOLUME DEGRADATION REPORT ===")
    for level, r in results.items():
        pct = int(level * 100)
        print(f"Volume {pct:3d}%: WER={r['wer']:.3f}  avg diarized turns/sample={r['avg_turns_found']:.1f}  samples with ZERO turns found={r['zero_turn_samples']}/{N_SAMPLES}")


if __name__ == "__main__":
    main()
