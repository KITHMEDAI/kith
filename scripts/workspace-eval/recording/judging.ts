import { judge } from '../harness';

export const NOTE_DATE = '21 October 2026';
// The note model is given "Date: 21 October 2026" in its user message (as processNote does),
// so the judge must know that too, or every dated title is wrongly called a hallucination.
export const DATE_CTX = `CONTEXT GIVEN TO THE NOTE MODEL: "Date: ${NOTE_DATE}" (a Wednesday). Using this date for the note, or resolving a relative day ("Friday", "next Tuesday") to the CORRECT calendar date from it, is NOT an invention. Resolving it to a WRONG calendar date IS an error. Adding a year to a spoken day+month is acceptable only if it is the obvious upcoming one.`;

export const CRITERIA = {
  faithfulness: 'Every fact in the NOTE is supported by the ORIGINAL SCRIPT (ground truth). Facts that came from a mis-transcription and are wrong vs the script count as errors.',
  coverage: 'All important facts, numbers, names, dates, decisions, actions and risks from the ORIGINAL SCRIPT appear in the note.',
  speaker_attribution: 'Who said / committed to / owns what is correct vs the script roles. Using "Speaker A/B" is fine when names were not spoken; assigning a statement or action to the wrong person is an error.',
  stt_robustness: 'Where the STT TRANSCRIPT differs from the script, the note either silently corrects obvious errors, or does not state the garbled detail as fact (flags it / lists it as missing). Score 5 if the transcript had no material errors.',
};

export function judgeStt(scriptText: string, transcript: string, noteText: string) {
  return judge('Recording → transcript → structured professional note.\n' + DATE_CTX +
    '\nPrefix every issue with [STT] if the root cause is a transcription/diarization error (visible in STT TRANSCRIPT vs ORIGINAL SCRIPT), or [MODEL] if the transcript was right but the note is wrong.',
    CRITERIA,
    `ORIGINAL SCRIPT (ground truth, with real roles):\n${scriptText}\n\nSTT TRANSCRIPT (what the note model actually received):\n${transcript}\n\nNOTE:\n${noteText}`);
}

export function judgeControl(scriptText: string, perfect: string, noteText: string) {
  const { stt_robustness: _, ...c } = CRITERIA;
  return judge('Transcript → structured professional note (control: perfect transcript).\n' + DATE_CTX + '\nPrefix every issue with [MODEL].', c,
    `ORIGINAL SCRIPT (ground truth, with real roles):\n${scriptText}\n\nTRANSCRIPT GIVEN TO THE MODEL:\n${perfect}\n\nNOTE:\n${noteText}`);
}
