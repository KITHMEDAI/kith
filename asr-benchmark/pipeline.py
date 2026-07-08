"""
pipeline.py — Diarization + transcription pipeline for the ASR benchmark.

Flow:
  1. PyAnnote.audio determines WHEN each speaker is talking (diarization —
     "a speaker change happened at 12.4s").
  2. Each diarized chunk is sliced out of the full audio array and sent to
     faster-whisper individually, so the transcript comes back already
     labeled by speaker: "00:12 - [SPEAKER_00]: What brings you in today?"

Both models load lazily (on first call to .run(), not at construction time)
since they're large downloads — importing this module or constructing the
pipeline should never trigger a multi-GB download by itself.

PyAnnote's pretrained pipeline is GATED on Hugging Face: you must accept the
terms for both of these, logged in as the account that owns HF_TOKEN, or
Pipeline.from_pretrained() will fail with a 401/403:
  https://huggingface.co/pyannote/speaker-diarization-3.1
  https://huggingface.co/pyannote/segmentation-3.0
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple, Union

import numpy as np

from config import (
    HF_TOKEN, PYANNOTE_MODEL, SAMPLE_RATE,
    WHISPER_COMPUTE_TYPE, WHISPER_DEVICE, WHISPER_MODEL_SIZE,
    get_logger,
)

log = get_logger(__name__)


@dataclass
class TranscriptSegment:
    start_s: float
    end_s: float
    speaker: str  # pyannote's raw label (e.g. "SPEAKER_00") — mapping this
                  # to doctor/patient roles happens later, in summarizer.py
    text: str

    def format(self) -> str:
        mm, ss = divmod(int(self.start_s), 60)
        return f"{mm:02d}:{ss:02d} - [{self.speaker}]: {self.text}"


class DiarizationTranscriptionPipeline:
    def __init__(
        self,
        whisper_model_size: str = WHISPER_MODEL_SIZE,
        device: str = WHISPER_DEVICE,
        compute_type: str = WHISPER_COMPUTE_TYPE,
        pyannote_model: str = PYANNOTE_MODEL,
        hf_token: str = HF_TOKEN,
        mock_mode: bool = False,
    ):
        self.whisper_model_size = whisper_model_size
        self.device = device
        self.compute_type = compute_type
        self.pyannote_model_name = pyannote_model
        self.hf_token = hf_token
        self.mock_mode = mock_mode

        self._whisper = None   # lazy-loaded real model, or "mock"
        self._diarizer = None  # lazy-loaded real pipeline, or "mock"

    # ── Lazy model loading ────────────────────────────────────────────────
    def _get_whisper(self):
        if self._whisper is None:
            if self.mock_mode:
                log.info("[mock] Skipping real faster-whisper load")
                self._whisper = "mock"
                return self._whisper
            try:
                from faster_whisper import WhisperModel
            except ImportError as e:
                raise ImportError("pip install faster-whisper") from e
            log.info(
                "Loading faster-whisper model=%s device=%s compute_type=%s",
                self.whisper_model_size, self.device, self.compute_type,
            )
            self._whisper = WhisperModel(
                self.whisper_model_size, device=self.device, compute_type=self.compute_type,
            )
        return self._whisper

    def _get_diarizer(self):
        if self._diarizer is None:
            if self.mock_mode:
                log.info("[mock] Skipping real pyannote pipeline load")
                self._diarizer = "mock"
                return self._diarizer
            try:
                from pyannote.audio import Pipeline
            except ImportError as e:
                raise ImportError("pip install pyannote.audio torch") from e
            log.info("Loading pyannote pipeline=%s", self.pyannote_model_name)
            if not self.hf_token:
                log.warning(
                    "No HF_TOKEN set — %s is gated; accept terms on huggingface.co "
                    "and export HF_TOKEN=hf_xxx before this will load.",
                    self.pyannote_model_name,
                )
            # pyannote.audio renamed this kwarg from `use_auth_token` to
            # `token` around v3.3 — try the current name first, fall back
            # for older installs.
            try:
                self._diarizer = Pipeline.from_pretrained(
                    self.pyannote_model_name, token=self.hf_token or None,
                )
            except TypeError:
                self._diarizer = Pipeline.from_pretrained(
                    self.pyannote_model_name, use_auth_token=self.hf_token or None,
                )
        return self._diarizer

    # ── Diarization ───────────────────────────────────────────────────────
    def _diarize(self, audio_array: np.ndarray, sampling_rate: int) -> List[Tuple[float, float, str]]:
        """Returns [(start_s, end_s, speaker_label), ...] sorted by start time."""
        if self.mock_mode:
            # Alternate speakers every ~4s — enough to exercise downstream
            # code without loading any real model.
            duration = len(audio_array) / sampling_rate
            turns, t, i = [], 0.0, 0
            while t < duration:
                end = min(t + 4.0, duration)
                turns.append((t, end, f"SPEAKER_{i % 2:02d}"))
                t, i = end, i + 1
            return turns

        import torch
        diarizer = self._get_diarizer()
        waveform = torch.from_numpy(audio_array).float().unsqueeze(0)  # (1, n_samples)
        output = diarizer({"waveform": waveform, "sample_rate": sampling_rate})

        # pyannote.audio >=4.0 wraps the result in a DiarizeOutput dataclass;
        # older versions return the Annotation directly. Prefer
        # `exclusive_speaker_diarization` when present — it resolves
        # overlapping speech into non-overlapping turns, which is what we
        # want when slicing distinct chunks to hand to Whisper one at a time.
        annotation = getattr(output, "exclusive_speaker_diarization", None) \
            or getattr(output, "speaker_diarization", None) \
            or output

        turns = [
            (turn.start, turn.end, speaker)
            for turn, _, speaker in annotation.itertracks(yield_label=True)
        ]
        turns.sort(key=lambda t: t[0])
        return turns

    # ── Transcription of one diarized slice ──────────────────────────────
    def _transcribe_slice(self, audio_slice: np.ndarray) -> str:
        if self.mock_mode:
            return "[mock transcript]"
        if len(audio_slice) == 0:
            return ""
        whisper = self._get_whisper()
        segments, _info = whisper.transcribe(audio_slice, language="en", vad_filter=True)
        return " ".join(seg.text.strip() for seg in segments).strip()

    # ── Public entry point ────────────────────────────────────────────────
    def run(
        self,
        audio: Union[str, np.ndarray],
        sampling_rate: int = SAMPLE_RATE,
        min_segment_s: float = 0.3,
    ) -> List[TranscriptSegment]:
        """Accepts a local audio file path OR an in-memory float32 mono
        array (e.g. straight from a Hugging Face dataset row). Returns
        speaker-labeled, timestamped transcript segments in chronological
        order — this is the "00:12 - [SPEAKER_00]: ..." output the spec
        asks for.
        """
        if isinstance(audio, str):
            audio_array, sampling_rate = self._load_audio_file(audio, sampling_rate)
        else:
            audio_array = np.asarray(audio, dtype=np.float32)

        turns = self._diarize(audio_array, sampling_rate)
        log.info("Diarization found %d speaker turns", len(turns))

        results: List[TranscriptSegment] = []
        for start_s, end_s, speaker in turns:
            if end_s - start_s < min_segment_s:
                continue
            i0, i1 = int(start_s * sampling_rate), int(end_s * sampling_rate)
            text = self._transcribe_slice(audio_array[i0:i1])
            if text:
                results.append(TranscriptSegment(start_s, end_s, speaker, text))
        return results

    @staticmethod
    def _load_audio_file(path: str, target_sr: int) -> Tuple[np.ndarray, int]:
        try:
            import soundfile as sf
        except ImportError as e:
            raise ImportError("pip install soundfile") from e
        data, sr = sf.read(path, dtype="float32", always_2d=False)
        if data.ndim > 1:
            data = data.mean(axis=1)  # downmix to mono
        if sr != target_sr:
            try:
                import librosa
            except ImportError as e:
                raise ImportError("pip install librosa") from e
            data = librosa.resample(data, orig_sr=sr, target_sr=target_sr)
            sr = target_sr
        return data, sr


if __name__ == "__main__":
    # Smoke test — mock mode, no downloads, no network.
    from data_loader import mock_meddies_samples

    sample = mock_meddies_samples(1)[0]
    pipe = DiarizationTranscriptionPipeline(mock_mode=True)
    for seg in pipe.run(sample.audio_array, sample.sampling_rate):
        log.info(seg.format())
