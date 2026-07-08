"""
data_loader.py — Streams the two open-source medical ASR datasets used to
stress-test Kith's transcription + entity-extraction pipeline.

Both datasets are pulled via Hugging Face `datasets` in streaming mode, so
nothing is downloaded to disk up front — rows are decoded on demand as you
iterate.

Datasets:
  - ekacare/eka-medical-asr-evaluation-dataset
      Short (0.5-30s) real clinical utterances with ground-truth text and
      annotated medical entities (drugs, advice, etc). Configs: "en" (~3.6k
      rows) or "hi" (~320 rows). Only a "test" split exists.
  - Meddies/meddies-asr-synth-dialog
      Full synthetic consultations (16kHz mono FLAC), config "{lang}_dialogs"
      — one row per whole consultation — with a `doctor:`/`patient:`-prefixed
      ground truth transcript and a turn-level `segments` list for slicing
      15-30s windows out of a long recording.

Requires: `datasets`, `soundfile` (audio decoding backend). Meddies and/or
eka may require an HF_TOKEN (see config.py) depending on current gating —
pass one regardless; it's a no-op against ungated datasets.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator, List, Optional, Tuple

import numpy as np

from config import (
    EKA_CONFIG, EKA_DATASET, EKA_SPLIT,
    HF_TOKEN, MEDDIES_CONFIG, MEDDIES_DATASET, MEDDIES_SPLIT,
    get_logger,
)

log = get_logger(__name__)


@dataclass
class EkaSample:
    session_id: str
    speaker: str
    audio_array: np.ndarray
    sampling_rate: int
    duration: float
    text: str
    medical_entities: list  # [[entity_text, category, [[start, end]]], ...]
    recording_context: Optional[str] = None


@dataclass
class MeddiesTurn:
    start_s: float
    end_s: float
    role: str
    text: str
    voice_id: Optional[str] = None


@dataclass
class MeddiesSample:
    dialog_id: str
    lang: str
    audio_array: np.ndarray
    sampling_rate: int
    duration_s: float
    n_turns: int
    text: str  # role-prefixed, \n-joined ground truth ("doctor: ...\npatient: ...")
    segments: List[MeddiesTurn]
    profile: Optional[str] = None


def _load_datasets_module():
    try:
        import datasets
        return datasets
    except ImportError as e:
        raise ImportError(
            "The `datasets` package is required. Install with: pip install datasets soundfile"
        ) from e


def stream_eka_dataset(
    config: str = EKA_CONFIG,
    split: str = EKA_SPLIT,
    limit: Optional[int] = None,
) -> Iterator[EkaSample]:
    """Streams ekacare/eka-medical-asr-evaluation-dataset row by row.

    Yields EkaSample — decoded audio + ground truth text + medical entity
    annotations, exactly what eval.py needs for WER and entity-extraction
    scoring.
    """
    ds_module = _load_datasets_module()
    log.info("Streaming %s (config=%s, split=%s)", EKA_DATASET, config, split)
    ds = ds_module.load_dataset(
        EKA_DATASET, name=config, split=split, streaming=True,
        token=HF_TOKEN or None,
    )

    count = 0
    for row in ds:
        audio = row["audio"]
        yield EkaSample(
            session_id=row.get("session_id", ""),
            speaker=row.get("speaker", ""),
            audio_array=np.asarray(audio["array"], dtype=np.float32),
            sampling_rate=int(audio["sampling_rate"]),
            duration=float(row.get("duration", 0.0)),
            text=row.get("text", ""),
            medical_entities=row.get("medical_entities", []) or [],
            recording_context=row.get("recording_context"),
        )
        count += 1
        if limit is not None and count >= limit:
            break
    log.info("Streamed %d rows from eka dataset", count)


def stream_meddies_dataset(
    lang: str = "en",
    split: str = MEDDIES_SPLIT,
    limit: Optional[int] = None,
) -> Iterator[MeddiesSample]:
    """Streams Meddies/meddies-asr-synth-dialog, `{lang}_dialogs` config —
    one row per FULL synthetic consultation, with turn-level `segments` for
    slicing 15-30s training/eval windows out of a long recording.
    """
    ds_module = _load_datasets_module()
    config_name = f"{lang}_dialogs"
    log.info("Streaming %s (config=%s, split=%s)", MEDDIES_DATASET, config_name, split)

    ds = ds_module.load_dataset(
        MEDDIES_DATASET, name=config_name, split=split, streaming=True,
        token=HF_TOKEN or None,
    )

    count = 0
    for row in ds:
        audio = row["audio"]
        segments = [
            MeddiesTurn(
                start_s=float(seg["start_s"]),
                end_s=float(seg["end_s"]),
                role=seg["role"],
                text=seg["text"],
                voice_id=seg.get("voice_id"),
            )
            for seg in row.get("segments", []) or []
        ]
        yield MeddiesSample(
            dialog_id=row.get("dialog_id", ""),
            lang=row.get("lang", lang),
            audio_array=np.asarray(audio["array"], dtype=np.float32),
            sampling_rate=int(audio["sampling_rate"]),
            duration_s=float(row.get("duration_s", 0.0)),
            n_turns=int(row.get("n_turns", len(segments))),
            text=row.get("text", ""),
            segments=segments,
            profile=row.get("profile"),
        )
        count += 1
        if limit is not None and count >= limit:
            break
    log.info("Streamed %d rows from Meddies dataset", count)


# ── Offline mock data (no network / no HF token needed) ──────────────────
# Mirrors the real schema exactly so pipeline.py / eval.py can be exercised
# end-to-end without downloading anything — the first thing to run before
# spending time on real model/dataset downloads.

def mock_eka_samples(n: int = 2) -> List[EkaSample]:
    rng = np.random.default_rng(0)
    texts = [
        "I've been having chest pain for the last two days, doctor.",
        "Take Metformin 500mg twice daily after food, and come back in two weeks.",
    ]
    entities: List[list] = [
        [],
        [["Metformin", "drug", [[5, 14]]], ["500mg", "dosage", [[15, 20]]], ["twice daily", "frequency", [[21, 32]]]],
    ]
    samples = []
    for i in range(n):
        duration = 3.0
        samples.append(EkaSample(
            session_id=f"mock-session-{i}",
            speaker="doctor" if i % 2 else "patient",
            audio_array=(rng.standard_normal(int(duration * 16000)).astype(np.float32) * 0.01),
            sampling_rate=16000,
            duration=duration,
            text=texts[i % len(texts)],
            medical_entities=entities[i % len(entities)],
            recording_context="conversation",
        ))
    return samples


def mock_meddies_samples(n: int = 1) -> List[MeddiesSample]:
    rng = np.random.default_rng(1)
    samples = []
    for i in range(n):
        turns = [
            MeddiesTurn(0.0, 3.0, "doctor", "What brings you in today?"),
            MeddiesTurn(3.0, 7.5, "patient", "I've had a fever and sore throat since yesterday."),
            MeddiesTurn(7.5, 11.0, "doctor", "Let's take your temperature and have a look at your throat."),
        ]
        duration = turns[-1].end_s
        text = "\n".join(f"{t.role}: {t.text}" for t in turns)
        samples.append(MeddiesSample(
            dialog_id=f"mock-dialog-{i}",
            lang="en",
            audio_array=(rng.standard_normal(int(duration * 16000)).astype(np.float32) * 0.01),
            sampling_rate=16000,
            duration_s=duration,
            n_turns=len(turns),
            text=text,
            segments=turns,
            profile="baseline",
        ))
    return samples


if __name__ == "__main__":
    # Smoke test: mock data only, no network needed.
    log.info("Mock eka sample text: %s", mock_eka_samples(1)[0].text)
    log.info("Mock meddies sample text:\n%s", mock_meddies_samples(1)[0].text)
