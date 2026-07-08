# ASR / Diarization / SOAP Benchmark Pipeline

Standalone local Python pipeline for stress-testing the ambient-scribe tech
Kith's production pipeline conceptually resembles (transcription → speaker
diarization → SOAP note extraction), using only free, local, open-source
tools. Not part of the Next.js app itself — a separate R&D/benchmark tool.

## Quick start (mock mode — no downloads, no accounts needed)

```bash
pip install numpy requests
python data_loader.py   # prints mock dataset rows
python pipeline.py      # prints a mock speaker-labeled transcript
python summarizer.py    # prints a mock SOAP note (no Ollama needed)
python eval.py          # runs WER + entity-extraction scoring on mock data
```

This proves the whole pipeline shape works before you spend time/bandwidth
on real model downloads.

## Full setup (real models + real data)

```bash
pip install -r requirements.txt
```

1. **Hugging Face token** — get one (Read access is enough) at
   https://huggingface.co/settings/tokens, then:
   ```bash
   export HF_TOKEN=hf_xxxxxxxxxxxx
   ```

2. **Accept pyannote's gated model terms** (same HF account as the token
   above), or diarization will fail with a 401/403. Confirmed as of
   `pyannote.audio` 4.0.7, all THREE of these need accepting — the third one
   is a newer dependency of the pipeline that isn't obvious from pyannote's
   own docs, only surfaces as a `GatedRepoError` at runtime:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
   - https://huggingface.co/pyannote/speaker-diarization-community-1

3. **Install Ollama** (https://ollama.com) and pull a model:
   ```bash
   ollama pull llama3.1                # general-purpose, ~4.9GB
   # or a medical-tuned alternative:
   ollama pull cniongolo/biomistral
   ```
   `ollama serve` typically runs automatically once installed. If you
   already have any Ollama model pulled, just point `OLLAMA_MODEL` (see
   config.py) at it instead of pulling a new one.

4. Run for real:
   ```python
   from data_loader import stream_eka_dataset
   from pipeline import DiarizationTranscriptionPipeline
   from eval import evaluate_eka_samples

   samples = list(stream_eka_dataset(limit=20))
   pipe = DiarizationTranscriptionPipeline()  # mock_mode=False by default
   report = evaluate_eka_samples(samples, pipe, mock_summarizer=False)
   print(report)
   ```

## Files

| File | Purpose |
|---|---|
| `config.py` | All env-var configuration (model names, HF token, Ollama host) |
| `data_loader.py` | Streams `ekacare/eka-medical-asr-evaluation-dataset` + `Meddies/meddies-asr-synth-dialog`; includes offline mock samples |
| `pipeline.py` | PyAnnote diarization → faster-whisper transcription per speaker chunk |
| `summarizer.py` | Local Ollama call that turns a transcript into a structured SOAP note (JSON mode) |
| `eval.py` | WER (via `evaluate`/jiwer) + medical-entity precision/recall/F1 harness |

## Verified working (real data, real models, real Ollama — not just mock mode)

Ran end-to-end on 2 real `ekacare` samples with `whisper_model_size='tiny'`
and `llama3.1:latest`:

```
REPORT: {'wer': 0.433, 'entities': {'precision': 0.0, 'recall': 0.0, 'f1': 0.0}}
```

Both numbers are real signal, not bugs: `tiny` is the least accurate Whisper
size (try `small` or `medium` for meaningfully better WER), and a
general-purpose model with a single zero-shot prompt isn't reliably pulling
drug names into the SOAP note's structured JSON — exactly the kind of gap
this harness exists to surface before trusting a model choice in production.

## Known limitations

- Entity-extraction scoring is **presence-based** (case-insensitive string
  match against the SOAP note's `medications` list), not span-level NER —
  the pipeline produces a summarized note, not token-tagged spans, so
  character-offset scoring against eka's `medical_entities` annotations
  isn't a meaningful comparison for this architecture.
- `faster-whisper` and `pyannote.audio` model weights download on first real
  (non-mock) use — expect a multi-hundred-MB to multi-GB download the first
  time you run without `mock_mode=True`.
- **Windows-specific**: `datasets>=4.0` defaults Audio-feature decoding to
  `torchcodec`, which needs a "full-shared" FFmpeg build with exposed DLLs —
  not what the common Windows FFmpeg installers (e.g. gyan.dev's "essentials"
  build) ship. `requirements.txt` pins `datasets<4.0.0` to use the
  `soundfile`/`librosa` decoder instead, which needs no special FFmpeg build.
  You'll still see a `torchcodec ... UserWarning` at import time from
  `pyannote.audio` itself — harmless, since `pipeline.py` always passes
  audio as an in-memory waveform dict, never through torchcodec's file
  decoder.
