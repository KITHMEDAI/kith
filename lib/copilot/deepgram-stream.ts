'use client';

/**
 * lib/copilot/deepgram-stream.ts
 *
 * One MediaStream → one Deepgram live WebSocket. The copilot opens two of these
 * (Meet tab audio = the other person, mic = you), so speaker labels come from
 * WHICH stream the words arrived on — no diarization guesswork needed.
 */

// Minimal worklet: Float32 → Int16 PCM, no gating/AGC. Tab audio is already
// clean digital audio, and the mic relies on the browser's echo cancellation.
const WORKLET_CODE = `
class CopilotPcm extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    const out = new Int16Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      out[i] = s < 0 ? s * 32768 : s * 32767;
    }
    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}
registerProcessor('copilot-pcm', CopilotPcm);
`;

const KEYTERMS = [
  "G'day", 'mate', 'NDIS', 'NDIA', 'SIL', 'SDA', 'PRN', 'Kith', 'C51', 'AGI360', 'KAOS', 'Ahpra', 'TGA',
  'support worker', 'case notes', 'progress notes', 'restrictive practice', 'Practice Standards',
  'heads of agreement', 'Essential Eight', 'allied health', 'participant', 'Anurag',
];

function wsUrl(diarize = false, keyterms: string[] = KEYTERMS): string {
  return 'wss://api.deepgram.com/v1/listen' +
    '?model=nova-3&language=en&smart_format=true&interim_results=true' +
    (diarize ? '&diarize=true' : '') +
    '&utterance_end_ms=1200&endpointing=400&vad_events=true&filler_words=false' +
    '&encoding=linear16&sample_rate=16000&channels=1' +
    keyterms.map(t => `&keyterm=${encodeURIComponent(t)}`).join('');
}

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'failed' | 'stopped';

export function startDeepgramStream(opts: {
  token: string;
  media: MediaStream;
  onPartial: (text: string) => void;
  /** speaker = Deepgram's diarized speaker index (only when diarize is on). */
  onUtterance: (text: string, speaker?: number) => void;
  onStatus: (s: StreamStatus) => void;
  /** Separate voices within this one stream (e.g. several people in a meeting tab). */
  diarize?: boolean;
  /** Vocabulary to boost (defaults to the copilot's list). */
  keyterms?: string[];
}): () => Promise<void> {
  const { token, media, onPartial, onUtterance, onStatus, diarize = false, keyterms } = opts;
  let ws: WebSocket | null = null;
  let stopped = false;
  let retries = 0;
  // Finalised words grouped into consecutive same-speaker runs, so one
  // utterance never mixes two people's words.
  let runs: Array<{ speaker?: number; text: string }> = [];

  const audioCtx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
  let worklet: AudioWorkletNode | null = null;

  const runsText = () => runs.map(r => r.text).join(' ').trim();

  const flush = () => {
    const out = runs.filter(r => r.text.trim());
    runs = [];
    onPartial('');
    for (const r of out) onUtterance(r.text.trim(), r.speaker);
  };

  const addFinal = (alt: { transcript?: string; words?: Array<{ word: string; punctuated_word?: string; speaker?: number }> }) => {
    const words = alt.words ?? [];
    if (!diarize || !words.length) {
      const t = (alt.transcript || '').trim();
      if (!t) return;
      const last = runs[runs.length - 1];
      if (last) last.text += ` ${t}`; else runs.push({ text: t });
      return;
    }
    for (const w of words) {
      const word = w.punctuated_word || w.word;
      const last = runs[runs.length - 1];
      if (last && last.speaker === w.speaker) last.text += ` ${word}`;
      else runs.push({ speaker: w.speaker, text: word });
    }
  };

  const setupAudio = async () => {
    const blobUrl = URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }));
    await audioCtx.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);
    const source = audioCtx.createMediaStreamSource(media);
    worklet = new AudioWorkletNode(audioCtx, 'copilot-pcm');
    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    source.connect(worklet); // not connected to destination → no local playback/echo
  };

  const open = () => {
    onStatus(retries ? 'reconnecting' : 'connecting');
    ws = new WebSocket(wsUrl(diarize, keyterms), ['token', token]);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { retries = 0; onStatus('live'); };
    ws.onmessage = (event) => {
      let data: Record<string, any>;
      try { data = JSON.parse(event.data as string); } catch { return; }
      if (data.type === 'Results') {
        const alt = data.channel?.alternatives?.[0] ?? {};
        const text: string = alt.transcript || '';
        if (!data.is_final) {
          onPartial(`${runsText()} ${text}`.trim());
          return;
        }
        addFinal(alt);
        onPartial(runsText());
        if (data.speech_final) flush();
      } else if (data.type === 'UtteranceEnd') {
        flush();
      }
    };
    ws.onclose = () => {
      if (stopped) return;
      if (retries < 6) {
        retries += 1;
        onStatus('reconnecting');
        setTimeout(open, 1000 * retries);
      } else {
        onStatus('failed');
      }
    };
  };

  setupAudio().then(open).catch(() => onStatus('failed'));

  // Graceful stop: stop sending audio, ask Deepgram to finalise what it has
  // (CloseStream), wait briefly for those last results, then flush. Without
  // this the final few words of a recording can be lost.
  return async () => {
    stopped = true;
    worklet?.disconnect();
    media.getTracks().forEach(t => t.stop());
    const sock = ws;
    if (sock && sock.readyState === WebSocket.OPEN) {
      await new Promise<void>(resolve => {
        const done = () => resolve();
        sock.addEventListener('close', done, { once: true });
        try { sock.send(JSON.stringify({ type: 'CloseStream' })); } catch { resolve(); }
        setTimeout(done, 2500);
      });
    }
    flush();
    try { sock?.close(); } catch { /* already closed */ }
    audioCtx.close().catch(() => {});
    onStatus('stopped');
  };
}
