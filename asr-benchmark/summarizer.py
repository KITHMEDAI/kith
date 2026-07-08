"""
summarizer.py — Turns a speaker-attributed transcript into a structured
SOAP note using a free, fully local LLM served by Ollama (llama3,
BioMistral, or any other pulled model) — no API keys, no per-token cost.

Ollama must be installed and running locally (https://ollama.com — once
installed, `ollama serve` usually runs automatically) with the target model
already pulled:
    ollama pull llama3                    # general-purpose, ~4.7GB
    ollama pull cniongolo/biomistral       # medical-tuned alternative
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import List, Optional

import requests

from config import OLLAMA_HOST, OLLAMA_MODEL, get_logger

log = get_logger(__name__)


@dataclass
class Medication:
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None


@dataclass
class SOAPNote:
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    medications: List[Medication] = field(default_factory=list)
    tests_ordered: List[str] = field(default_factory=list)
    follow_up: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


SOAP_JSON_SCHEMA_HINT = """{
  "subjective": "string — patient's complaints, symptoms, history, in their own words",
  "objective": "string — doctor's vital signs / exam findings spoken aloud during the visit",
  "assessment": "string — differential or working diagnosis",
  "plan": "string — overall plan narrative",
  "medications": [ { "drug_name": "string", "dosage": "string or null", "frequency": "string or null" } ],
  "tests_ordered": ["string", "..."],
  "follow_up": "string or null — when the patient should come back"
}"""

SYSTEM_PROMPT = (
    "You are a clinical scribe assistant. You are given a speaker-labeled "
    "transcript of a doctor-patient consultation and must extract a SOAP "
    "note as STRICT JSON matching the schema given — no prose outside the "
    "JSON object, no markdown fences. If a field has no information in the "
    "transcript, use an empty string (or empty list / null as appropriate) "
    "rather than inventing content."
)


def build_prompt(transcript: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"JSON schema:\n{SOAP_JSON_SCHEMA_HINT}\n\n"
        f"Transcript:\n{transcript}\n\n"
        "Return ONLY the JSON object."
    )


def generate_soap_note(
    transcript: str,
    model: str = OLLAMA_MODEL,
    host: str = OLLAMA_HOST,
    timeout: int = 120,
    mock_mode: bool = False,
) -> SOAPNote:
    """Calls a local Ollama model with JSON-mode forced, parses + validates
    the result into a SOAPNote. Raises on an unreachable Ollama or invalid
    JSON — callers decide whether to retry/skip that sample.
    """
    if mock_mode:
        log.info("[mock] Returning a stub SOAP note without calling Ollama")
        return SOAPNote(
            subjective="Patient reports symptoms consistent with the transcript.",
            objective="No vitals mentioned in this mock transcript.",
            assessment="Working diagnosis pending real model output.",
            plan="Follow the standard care plan.",
            medications=[Medication("Metformin", "500mg", "twice daily")],
            tests_ordered=[],
            follow_up="2 weeks",
        )

    prompt = build_prompt(transcript)
    log.info("Requesting SOAP note from Ollama model=%s", model)
    try:
        resp = requests.post(
            f"{host}/api/generate",
            json={"model": model, "prompt": prompt, "format": "json", "stream": False},
            timeout=timeout,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise ConnectionError(
            f"Could not reach Ollama at {host} — is `ollama serve` running "
            f"and has `{model}` been pulled? (ollama pull {model})"
        ) from e

    raw = resp.json().get("response", "")

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error("Ollama did not return valid JSON: %s", raw[:300])
        raise ValueError("Ollama response was not valid JSON") from e

    meds = [
        Medication(
            drug_name=m.get("drug_name", ""),
            dosage=m.get("dosage"),
            frequency=m.get("frequency"),
        )
        for m in parsed.get("medications", []) or []
    ]

    return SOAPNote(
        subjective=parsed.get("subjective", "") or "",
        objective=parsed.get("objective", "") or "",
        assessment=parsed.get("assessment", "") or "",
        plan=parsed.get("plan", "") or "",
        medications=meds,
        tests_ordered=parsed.get("tests_ordered", []) or [],
        follow_up=parsed.get("follow_up"),
    )


if __name__ == "__main__":
    demo_transcript = (
        "00:00 - [SPEAKER_00]: What brings you in today?\n"
        "00:04 - [SPEAKER_01]: I've had chest pain for two days.\n"
        "00:09 - [SPEAKER_00]: Take Metformin 500mg twice daily after food, come back in two weeks."
    )
    note = generate_soap_note(demo_transcript, mock_mode=True)
    log.info("Mock SOAP note:\n%s", json.dumps(note.to_dict(), indent=2))
