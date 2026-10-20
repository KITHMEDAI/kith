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

function wsUrl(): string {
  return 'wss://api.deepgram.com/v1/listen' +
    '?model=nova-3&language=en&smart_format=true&interim_results=true' +
    '&utterance_end_ms=1200&endpointing=400&vad_events=true&filler_words=false' +
    '&encoding=linear16&sample_rate=16000&channels=1' +
    KEYTERMS.map(t => `&keyterm=${encodeURIComponent(t)}`).join('');
}

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'failed' | 'stopped';

export function startDeepgramStream(opts: {
  token: string;
  media: MediaStream;
  onPartial: (text: string) => void;
  onUtterance: (text: string) => void;
  onStatus: (s: StreamStatus) => void;
}): () => void {
  const { token, media, onPartial, onUtterance, onStatus } = opts;
  let ws: WebSocket | null = null;
  let stopped = false;
  let retries = 0;
  let buffer: string[] = [];

  const audioCtx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
  let worklet: AudioWorkletNode | null = null;

  const flush = () => {
    const text = buffer.join(' ').trim();
    buffer = [];
    onPartial('');
    if (text) onUtterance(text);
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
    ws = new WebSocket(wsUrl(), ['token', token]);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { retries = 0; onStatus('live'); };
    ws.onmessage = (event) => {
      let data: Record<string, any>;
      try { data = JSON.parse(event.data as string); } catch { return; }
      if (data.type === 'Results') {
        const text: string = data.channel?.alternatives?.[0]?.transcript || '';
        if (!data.is_final) {
          onPartial([...buffer, text].join(' ').trim());
          return;
        }
        if (text.trim()) buffer.push(text.trim());
        onPartial(buffer.join(' '));
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

  return () => {
    stopped = true;
    flush();
    try { ws?.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* already closed */ }
    ws?.close();
    worklet?.disconnect();
    audioCtx.close().catch(() => {});
    media.getTracks().forEach(t => t.stop());
    onStatus('stopped');
  };
}
