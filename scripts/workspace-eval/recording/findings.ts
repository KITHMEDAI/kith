// Analyst findings appended to the recording report by finalize.ts.
export const FINDINGS = `
## How this was run

- 10 two-person scripts (\`scripts.json\`, 62–89 s each, 1,707 words total) synthesised with Windows System.Speech (\`synth.ps1\`; Speaker A = David, Speaker B = Zira; 16 kHz mono, which is the format the live recorder streams; 450 ms gap between turns).
- Transcribed with Deepgram **pre-recorded** \`/v1/listen\` using the live recorder's settings (\`nova-3, language=multi, diarize, smart_format, filler_words=false\` plus the same 35 \`CLINICAL_KEYTERMS\`), with \`utterances=true\`. That is 10 transcriptions, cached in \`out/dg-*.json\`.
- Turned into the app's \`Speaker X: text\` format (one line per utterance, label = raw diarizer index, as \`useRealTimeTranscript.ts:266-267\` does) and passed to \`generateNote(inputMode:'recorded')\` with a field and note type that fit each script.
- **Control:** the same note was also generated from the *perfect* script transcript, which separates STT errors from note-model errors. That is 20 generations in total.
- Judged against the original script (with real roles) by \`judge()\` (Sonnet 4.6, pass = every criterion ≥ 4). The judge is told the note date (Wed 21 Oct 2026) the model receives.
- **Caveat:** TTS audio is clean, with no noise and no overlap, and the API is pre-recorded rather than streaming. These numbers are a **best case**. A real laptop mic over the streaming socket will be worse, especially for diarization.

## Headline numbers

| Metric | Result |
|---|---|
| Pooled WER (normalised for case, punctuation and number formatting) | **3.5%** (range 1.2–11.3%; the worst case is the numbers/names/dates script) |
| Speaker accuracy, word level (Deepgram words[].speaker) | **95.4%** mean (100% on 8/10; 54.8% on crosstalk, where diarization collapsed to **1 speaker**) |
| Speaker accuracy, segment level (one label per segment, which is what the app sends) | **84.5%** mean (54.8–96%) |
| Note pass rate (all judge criteria ≥ 4), STT transcript | **4/10** |
| Note pass rate, control (perfect transcript) | **6/10** |
| Avg judge scores, STT vs control | faithfulness 3.6 vs 4.0, coverage 4.7 vs 5.0, speaker attribution 3.5 vs 4.5, stt_robustness 3.5 |
| Judge-tagged issue root cause | 28 [STT] vs 28 [MODEL] |

## What went wrong, and where it came from

### From STT (Deepgram)
1. **Segment-level speaker labels are the biggest STT problem.** Word-level diarization was perfect on 8/10 scripts. The transcript the app builds attaches one label per segment, and segments routinely span a turn change. Examples: "Speaker B: including GST to replace it. Can we get a second quote?" and "Speaker A: Drafted. Needs your sign off. Send it. Done. Budget?". The live hook does the same thing: it labels each is_final chunk by its *dominant* speaker (\`hooks/useRealTimeTranscript.ts:261-267\`). The note model then repeats wrong ownership. In the pharma case it wrote "Dr Carter to complete and email the adverse event report form", which reverses who does what.
2. **Short turns collapse to one speaker.** In the crosstalk script, all 22 turns came back as "Speaker A". Stand-ups and quick handovers are exactly this shape.
3. **Numbers and IDs get mangled by smart_format with language=multi.** "seven oh five" became "$775.05". "4471 9032" became "4400 and 719000 and 32". "fifteenth of January 2027" became "01/15/2027" (a **US date format**). "two hundred and ten covers" became "two and ten covers", and "610 bus" became "six and ten bus". multi also produces US spellings: center, mom, favor, counselor, penciled.
4. **AU and trade vocabulary gets misheard.** reo→rio, set-downs→shutdowns, Parramatta→Paramedic, Wattle→Waddle, Harbourside→Harbyside, Greenline→Green line, ServiceM8→"service m eight", coolroom→cool room, low→Lowe, Mei→May, and "Siobhan and Aoife" became "and A of". The keyterms sent are a **psychiatry list** (sertraline, EMDR, …; \`useRealTimeTranscript.ts:124-135\`) inherited from the clinical app, so none of the Workspace fields benefit from them.

### From the note model (Sonnet 4.6, generateNote)
5. **It repeats garbled figures as confirmed facts.** "$775.05 per week" appears in the summary, decisions and action items, and is only questioned once, in missing_info. "Paramedic clinic" and "14 Waddle Crescent" are stated as fact, and "Lowe" was turned into a brand ("Lowe oat milk").
6. **It does weekday↔date arithmetic wrong.** The prompt passes "Date: 21 October 2026" with no weekday. Across all eval notes, **7 of 20** weekday+date mentions the model computed were wrong. Examples: "Friday 24 October 2026" (a Saturday) in the crosstalk control, "Monday 24 October" and "Monday 27 October" in one note (edge/pii_numbers), and "Wednesday 22 October" (a Thursday) in edge/code_input.
7. **It over-reaches with regulatory and clinical inferences nobody stated.** Examples: "~20 pack-year history" when only 20 years of smoking was said, "NDIS reportable incident … within 24 hours", "delegated authority limits", "house pinot noir", "salbutamol", and "Ben is in good spirits".
8. **It trusts speaker labels too much.** It rarely says when ownership is uncertain, even when one segment obviously contains a question and its answer.

## Client code risks in the live recorder (file:line)

| # | Issue | Where | Impact |
|---|---|---|---|
| R1 | **The last words are lost on Stop.** disconnect() closes the socket immediately, without sending Deepgram Finalize or CloseStream. Buffered audio never comes back as is_final, and the interim text is discarded (setPartialText('')). The 350 ms wait cannot help because the socket is already closed. | hooks/useRealTimeTranscript.ts:374-403 (393, 402); components/workspace/NewNote.tsx:83-90 | The final sentence, usually the action or sign-off, is dropped |
| R2 | **The Deepgram MASTER API key is handed to every signed-in browser.** /api/w/token returns DEEPGRAM_API_KEY itself. | app/api/w/token/route.ts:9; lib/deepgram.ts:19-25 | Anyone who signs up can take the key and bill or abuse the account |
| R3 | **Reconnects leak resources and relabel speakers.** ws.onopen calls startMic() again, creating a new getUserMedia and AudioContext; the old ones are never closed (refs overwritten). Audio during the backoff (1.5 s → 48 s) is dropped, and diarizer indices restart per socket. | useRealTimeTranscript.ts:337-342, 205-208, 346-355 | Leaked mic, silent gaps, swapped speakers |
| R4 | **Dead accumulation code.** pendingRef.current is never set to a non-null value, so the accumulate branch, the UtteranceEnd flush and the disconnect flush never run. | useRealTimeTranscript.ts:293-326, 378-389 | Fragmented lines and segment-level mislabels |
| R5 | **Confidence is computed and then discarded.** low_conf is calculated per segment, but NewNote sends only s.text. | useRealTimeTranscript.ts:276-290; NewNote.tsx:88 | Garbled numbers become facts |
| R6 | **The minimum-words check counts "Speaker X:" labels.** | NewNote.tsx:89; app/api/w/notes/route.ts:22 | Near-empty notes cost a generation |
| R7 | **Long recordings fail outright.** A ~9k-word meeting (about 60 min) hit max_tokens 4096, stopping with stop_reason=max_tokens after 43 s, and the JSON parse threw, so the note is marked failed. Over about 2 h, slice(0,120000) silently drops the end. Generation runs in waitUntil under maxDuration=60, so a slower run is killed and the note stays "processing" forever. | lib/workspace/generate.ts:143,148; app/api/w/notes/route.ts:6,46; lib/workspace/server.ts:100-124 | 1 h+ meetings produce nothing |
| R8 | **Nothing is persisted during recording.** A refresh, crash or phone sleep loses everything. restoreSegments is exported but unused. | NewNote.tsx:32-34 | Total loss on long sessions |
| R9 | **sample_rate=16000 is hardcoded** and assumes AudioContext({sampleRate:16000}) is honoured. Firefox and older Safari can refuse it or throw when connecting a stream with a different rate. | useRealTimeTranscript.ts:160, 207 | Garbled or empty transcription on those browsers |
| R10 | **The code contradicts its own comment.** The comment recommends en over multi; the code sends language=multi, which also causes the US date and spelling formatting. | useRealTimeTranscript.ts:111-113 vs 151 | See #3 |

## Proposed fixes

**F1. Label words, not segments** (useRealTimeTranscript.ts:261-306). Split each final result wherever the word speaker changes:
~~~ts
const runs: { spk: number; words: typeof words }[] = [];
for (const w of words) {
  const last = runs[runs.length - 1];
  if (last && last.spk === w.speaker) last.words.push(w); else runs.push({ spk: w.speaker ?? 0, words: [w] });
}
const segs = runs.map(r => ({
  speaker: 'Speaker ' + (SPEAKER_MAP[r.spk] ?? String.fromCharCode(65 + r.spk)),
  text: r.words.map(w => (w as any).punctuated_word ?? w.word).join(' '),
  start_ms: Math.round(r.words[0].start * 1000), end_ms: Math.round(r.words[r.words.length - 1].end * 1000),
  confidence: r.words.reduce((s, w) => s + w.confidence, 0) / r.words.length, is_partial: false,
  low_conf: r.words.filter(w => w.confidence < 0.6).map(w => w.word),
}));
setSegments(prev => [...prev, ...segs]);
~~~
In this eval, this raises speaker accuracy from 84.5% to 95.4%. Merge consecutive same-speaker lines when building the transcript.

**F2. Flush on Stop** (useRealTimeTranscript.ts:374, NewNote.tsx:83):
~~~ts
const disconnect = useCallback(async () => {
  intentionalRef.current = true;
  workletRef.current?.disconnect(); streamRef.current?.getTracks().forEach(t => t.stop());
  const ws = wsRef.current;
  if (ws?.readyState === WebSocket.OPEN) {
    const done = new Promise<void>(res => {
      const t = setTimeout(res, 2000);
      ws.addEventListener('message', e => { try { if (JSON.parse(e.data).from_finalize) { clearTimeout(t); res(); } } catch {} });
    });
    ws.send(JSON.stringify({ type: 'Finalize' }));
    await done;
    ws.send(JSON.stringify({ type: 'CloseStream' }));
  }
  ws?.close(); // ...rest unchanged
}, []);
~~~
In stopRecording, \`await disconnect()\` and drop the 350 ms sleep. As a last resort, append any remaining partialText as a final segment.

**F3. Fix the prompt for recordings** (generate.ts BASE_RULES, or a block included when inputMode==='recorded'):
~~~
Before: (no guidance about ASR errors)
After:
11. RECORDING TRANSCRIPTS come from automatic speech recognition. Speaker labels can be wrong, especially for short turns or when one line contains both a question and its answer: work out who said or agreed to what from the content (names addressed, question→answer). When ownership of a commitment is genuinely unclear, write "owner unclear" instead of guessing.
12. Numbers, names, addresses and reference numbers may be mis-heard. If a figure is implausible in context (odd cents on a weekly rent, a value contradicting nearby figures, a fragmented ID like "4400 and 719000 and 32", a place that is not real such as "Paramedic clinic"), do NOT repeat it as a decision or confirmed fact: state it once with "(verify, possibly mis-transcribed)" and add an "attention" flag. Words marked [?word] were low-confidence.
13. Do not add thresholds, legal timeframes, clinical calculations or regulatory procedures that were not said (e.g. "5°C", "within 24 hours", "pack-years"). A flag may say what to check, in the speaker's own terms.
~~~
Pass confidence through at NewNote.tsx:88. Mark each word in s.low_conf as "[?word]" when joining the transcript.

**F4. Weekday and calendar in the prompt** (server.ts:112, generate.ts:142):
~~~ts
// server.ts:112
date: new Date(note.created_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }),
// generate.ts: add a 14-day lookup to the user message
const cal = Array.from({ length: 14 }, (_, i) => { const d = new Date(created); d.setDate(d.getDate() + i - 7);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }).join(', ');
// "Date: Wednesday 21 October 2026\nCalendar (use ONLY this to resolve 'Friday', 'next Tuesday'): " + cal
~~~
Add this rule: "Keep relative days as spoken. Add a calendar date in brackets only by looking it up in the calendar line."

**F5. Field-aware Deepgram settings** (useRealTimeTranscript.ts:124-163). Default to \`language=en-AU\` and use multi only when the profile says the user works in other languages. Replace CLINICAL_KEYTERMS with per-field lists in lib/workspace/fields.ts: construction (reo, set-downs, formwork, edge protection, hoist, SWMS), hospitality (coolroom, covers, reach-in), council (councillor, tender, roads reserve), and so on. Add the user's own names and places through connect(token, extraKeyterms), which NewNote never passes today.

**F6. Long recordings** (generate.ts:148, route.ts:6). Set max_tokens 16000 and use streaming. If stop_reason==='max_tokens', retry with "at most 40 action items, merge similar". For inputs over about 6k words, chunk-summarise first (Haiku per 15-minute chunk, then a Sonnet merge). Set maxDuration=300. Add a sweeper that marks notes still "processing" after 10 minutes as failed. Show the user "(transcript truncated)" instead of slicing silently.

**F7. Security.** /api/w/token should return a short-lived token (POST https://api.deepgram.com/v1/auth/grant, ttl about 60 s), not the key. Re-fetch the token on reconnect (useRealTimeTranscript.ts:354), and close the old stream and context before startMic (R3).

**F8. Persist while recording.** Debounce-save segments every 10 s (localStorage, or a draft ws_notes row) and offer to restore them on load.
`;
