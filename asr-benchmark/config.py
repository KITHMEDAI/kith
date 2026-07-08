"""
config.py — Shared configuration for the ASR/diarization/SOAP benchmark
pipeline. Everything here is overridable via environment variables so the
same code runs in mock mode (no downloads, no network) or fully live.
"""
from __future__ import annotations

import logging
import os

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


# ── Hugging Face datasets ────────────────────────────────────────────────
# HF_TOKEN is required for gated resources (pyannote's pretrained pipeline,
# and possibly the Meddies dataset if it requires accepting terms). Get one
# at https://huggingface.co/settings/tokens — "Read" access is enough.
HF_TOKEN = os.environ.get("HF_TOKEN", "")

EKA_DATASET = "ekacare/eka-medical-asr-evaluation-dataset"
# The dataset ships English ("en", ~3.6k rows) and Hindi ("hi", ~320 rows)
# configs — default to English.
EKA_CONFIG = os.environ.get("EKA_CONFIG", "en")
EKA_SPLIT = os.environ.get("EKA_SPLIT", "test")  # only split the dataset has

MEDDIES_DATASET = "Meddies/meddies-asr-synth-dialog"
MEDDIES_LANG = os.environ.get("MEDDIES_LANG", "en")
# "{lang}_dialogs" = one row per full consultation (what pipeline.py wants).
# "{lang}_utterances" also exists if you want single-turn rows instead.
MEDDIES_CONFIG = f"{MEDDIES_LANG}_dialogs"
MEDDIES_SPLIT = os.environ.get("MEDDIES_SPLIT", "train")

# ── faster-whisper (transcription) ───────────────────────────────────────
# Model size trades accuracy for speed/RAM: tiny < base < small < medium < large-v3.
# "small" on CPU with int8 is a reasonable default for a laptop stress test.
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")        # "cpu" or "cuda"
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")  # "int8", "float16", "float32"

# ── PyAnnote.audio (diarization) ─────────────────────────────────────────
# GATED model — before this will load, you must accept the terms for BOTH
# of these on huggingface.co (logged in as the account that owns HF_TOKEN):
#   https://huggingface.co/pyannote/speaker-diarization-3.1
#   https://huggingface.co/pyannote/segmentation-3.0
PYANNOTE_MODEL = os.environ.get("PYANNOTE_MODEL", "pyannote/speaker-diarization-3.1")

# ── Ollama (local LLM for SOAP extraction) ───────────────────────────────
# Requires Ollama installed and running locally: https://ollama.com
# Defaults to a model already pulled on this machine — swap via OLLAMA_MODEL
# env var, or pull a medical-tuned alternative:
#   ollama pull cniongolo/biomistral
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:latest")

SAMPLE_RATE = 16000
