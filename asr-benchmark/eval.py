"""
eval.py — Scores the ASR + SOAP pipeline against Hugging Face ground truth.
Two independent metrics:

  1. Word Error Rate (WER) — the pipeline's transcribed text vs. the
     dataset's ground-truth `text`, via the `evaluate` library (jiwer under
     the hood).

  2. Medical entity extraction precision/recall — compares the entity
     *strings* the SOAP note pulled out (drug names) against the eka
     dataset's annotated `medical_entities` ground truth.

     NOTE: this is presence-based (case-insensitive string matching), not
     span-level NER scoring — pipeline.py + summarizer.py produce a SOAP
     note, not token-tagged spans, so span-level precision/recall isn't a
     meaningful comparison for this architecture. This still answers the
     practical question "did the pipeline catch the actual medications,"
     just not at character-offset granularity. If you need span-level NER
     scoring, that's a different pipeline shape (tag every token, not
     summarize into a note) — flag it if that's actually what you want.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Set, Tuple

from config import get_logger
from data_loader import EkaSample
from pipeline import DiarizationTranscriptionPipeline, TranscriptSegment
from summarizer import SOAPNote, generate_soap_note

log = get_logger(__name__)


@dataclass
class WERResult:
    wer: float
    n_samples: int
    hypotheses: List[str]
    references: List[str]


@dataclass
class EntityScore:
    precision: float
    recall: float
    f1: float
    true_positives: Set[str]
    false_positives: Set[str]
    false_negatives: Set[str]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def transcript_to_text(segments: List[TranscriptSegment]) -> str:
    """Flattens speaker-labeled segments back into plain text for WER —
    diarization/speaker labels aren't part of the WER comparison, only the
    words themselves."""
    return " ".join(seg.text for seg in segments).strip()


def compute_wer(hypotheses: List[str], references: List[str]) -> WERResult:
    try:
        import evaluate
    except ImportError as e:
        raise ImportError("pip install evaluate jiwer") from e

    wer_metric = evaluate.load("wer")
    # evaluate's WER breaks on empty references — filter out samples with
    # nothing meaningful to score against.
    pairs = [(h, r) for h, r in zip(hypotheses, references) if r.strip()]
    if not pairs:
        return WERResult(wer=float("nan"), n_samples=0, hypotheses=[], references=[])
    hyps, refs = zip(*pairs)
    score = wer_metric.compute(predictions=list(hyps), references=list(refs))
    return WERResult(wer=score, n_samples=len(pairs), hypotheses=list(hyps), references=list(refs))


def extract_ground_truth_entities(
    medical_entities: list,
    categories: Tuple[str, ...] = ("drug", "medication"),
) -> Set[str]:
    """eka's medical_entities format: [[entity_text, category, [[start,end]]], ...].
    Keeps only drug/medication-category entities by default — widen
    `categories` (e.g. add "advice", "test") to compare more entity types."""
    out: Set[str] = set()
    for ent in medical_entities or []:
        if not ent:
            continue
        entity_text = ent[0] if len(ent) > 0 else None
        category = ent[1] if len(ent) > 1 else None
        if entity_text and (category is None or str(category).lower() in categories):
            out.add(_normalize(entity_text))
    return out


def extract_predicted_entities(note: SOAPNote) -> Set[str]:
    """Pulls comparable entity strings out of the SOAP note's structured
    medications list — the pipeline's equivalent of "what drugs did you
    catch"."""
    return {_normalize(med.drug_name) for med in note.medications if med.drug_name}


def score_entities(predicted: Set[str], ground_truth: Set[str]) -> EntityScore:
    tp = predicted & ground_truth
    fp = predicted - ground_truth
    fn = ground_truth - predicted

    precision = len(tp) / len(predicted) if predicted else (1.0 if not ground_truth else 0.0)
    recall = len(tp) / len(ground_truth) if ground_truth else (1.0 if not predicted else 0.0)
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return EntityScore(
        precision=precision, recall=recall, f1=f1,
        true_positives=tp, false_positives=fp, false_negatives=fn,
    )


def evaluate_eka_samples(
    samples: List[EkaSample],
    pipeline: DiarizationTranscriptionPipeline,
    run_summarizer: bool = True,
    mock_summarizer: bool = False,
) -> dict:
    """Runs the full pipeline over a batch of eka samples and reports WER +
    aggregate entity precision/recall/F1."""
    hypotheses, references = [], []
    entity_scores: List[EntityScore] = []

    for sample in samples:
        segments = pipeline.run(sample.audio_array, sample.sampling_rate)
        hyp_text = transcript_to_text(segments)
        hypotheses.append(hyp_text)
        references.append(sample.text)

        if run_summarizer:
            # Mock-mode pipelines don't produce a real transcript, so feed
            # the summarizer the ground truth instead — otherwise entity
            # scoring would be comparing against literal "[mock transcript]".
            summarizer_input = hyp_text if (hyp_text and not pipeline.mock_mode) else sample.text
            note = generate_soap_note(summarizer_input, mock_mode=mock_summarizer)
            predicted = extract_predicted_entities(note)
            truth = extract_ground_truth_entities(sample.medical_entities)
            entity_scores.append(score_entities(predicted, truth))

    wer_result = compute_wer(hypotheses, references)

    agg_entities = None
    if entity_scores:
        agg_entities = {
            "precision": sum(s.precision for s in entity_scores) / len(entity_scores),
            "recall": sum(s.recall for s in entity_scores) / len(entity_scores),
            "f1": sum(s.f1 for s in entity_scores) / len(entity_scores),
            "n_samples": len(entity_scores),
        }

    return {
        "wer": wer_result.wer,
        "wer_n_samples": wer_result.n_samples,
        "entities": agg_entities,
    }


if __name__ == "__main__":
    from data_loader import mock_eka_samples

    log.info("Running eval smoke test in full mock mode (no network, no downloads)")
    pipe = DiarizationTranscriptionPipeline(mock_mode=True)
    samples = mock_eka_samples(3)
    report = evaluate_eka_samples(samples, pipe, run_summarizer=True, mock_summarizer=True)
    log.info("Report: %s", report)
