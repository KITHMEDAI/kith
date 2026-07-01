'use client';

import { useRef, useState, useCallback } from 'react';
import type { TranscriptSegment } from '@/types';

// ─── Enhanced AudioWorklet ─────────────────────────────────────────────────────
// Runs in a dedicated audio thread. Applies 4-stage enhancement pipeline
// optimised for laptop microphones with two speakers in the same room:
//
//   1. High-pass filter (80 Hz) — removes desk rumble, fan noise, HVAC hum
//   2. Automatic Gain Control  — equalises quiet patient vs louder therapist
//   3. Soft noise gate         — silences keyboard clicks / breath between words
//   4. Soft limiter            — prevents harsh clipping on loud close-mic voice
//
// All processing runs at 16 kHz mono. Output is Int16 PCM sent to main thread.
const WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // ── High-pass filter state (1-pole IIR, fc=80 Hz @ 16 kHz) ──────────────
    // alpha = tau / (tau + dt),  tau = 1/(2π*fc),  dt = 1/fs
    // alpha = (1/(2π*80)) / (1/(2π*80) + 1/16000) = 0.9694
    this._hpAlpha  = 0.9694;
    this._hpY      = 0;   // filter output
    this._hpX      = 0;   // previous input

    // ── AGC state ─────────────────────────────────────────────────────────────
    this._rms        = 0.02;    // smoothed RMS (start non-zero to avoid init spike)
    this._targetRms  = 0.12;    // desired RMS level going into the encoder
    this._gain       = 1.0;
    this._agcAttack  = 0.003;   // fast rise  (catches sudden loud bursts)
    this._agcRelease = 0.0002;  // slow decay (doesn't pump on pauses)
    this._gainMin    = 0.5;
    this._gainMax    = 16.0;    // high ceiling — laptop placed across the room, soft-spoken patient

    // ── Noise gate ────────────────────────────────────────────────────────────
    // Below gateOpen the gate closes smoothly; above gateClose it's fully open.
    // Thresholds kept LOW so a quiet, far-field patient voice is never gated out —
    // missing clinical speech is far worse than a little room noise (Layer-1 Haiku
    // cleans the transcript anyway).
    this._gateOpen   = 0.006;
    this._gateClose  = 0.003;
    this._gateState  = 1.0;     // 0=closed, 1=open  (current gate gain)
    this._gateAttack = 0.05;
    this._gateRel    = 0.002;

    // ── Lookahead buffer (64 samples) to soften gate transitions ─────────────
    this._lookahead = new Float32Array(64);
    this._laPos     = 0;
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    const len  = ch.length;
    const out  = new Float32Array(len);

    // ── Step 1: High-pass filter + compute block RMS ──────────────────────────
    let rmsSum = 0;
    const hp = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      // y[n] = alpha * (y[n-1] + x[n] - x[n-1])
      this._hpY  = this._hpAlpha * (this._hpY + ch[i] - this._hpX);
      this._hpX  = ch[i];
      hp[i]      = this._hpY;
      rmsSum    += this._hpY * this._hpY;
    }
    const blockRms = Math.sqrt(rmsSum / len);

    // ── Step 2: AGC gain update ───────────────────────────────────────────────
    const alpha = blockRms > this._rms ? this._agcAttack : this._agcRelease;
    this._rms   = this._rms * (1 - alpha) + blockRms * alpha;
    const rawGain = this._targetRms / Math.max(this._rms, 0.001);
    this._gain  = Math.min(Math.max(rawGain, this._gainMin), this._gainMax);

    // ── Step 3: Noise gate ────────────────────────────────────────────────────
    let targetGate;
    if (blockRms > this._gateOpen) {
      targetGate = 1.0;
    } else if (blockRms < this._gateClose) {
      targetGate = 0.15; // keep a larger quiet tail so soft speech still passes through
    } else {
      targetGate = (blockRms - this._gateClose) / (this._gateOpen - this._gateClose);
    }
    const gateAlpha = targetGate > this._gateState ? this._gateAttack : this._gateRel;
    this._gateState = this._gateState * (1 - gateAlpha) + targetGate * gateAlpha;

    const totalGain = this._gain * this._gateState;

    // ── Step 4: Apply gain + soft limiter (tanh) ──────────────────────────────
    for (let i = 0; i < len; i++) {
      // tanh soft-clip keeps peaks clean without harsh digital clipping
      out[i] = Math.tanh(hp[i] * totalGain * 0.85);
    }

    // ── Convert to Int16 and post ─────────────────────────────────────────────
    const int16 = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, out[i] * 32767));
    }
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);
`;

// ─── Deepgram WebSocket URL ────────────────────────────────────────────────────
// nova-3 + en (not "multi") gives ~15% higher WER accuracy for Indian English.
// "multi" adds language-detection overhead that hurts latency and accuracy when
// the session will mostly be English. Switch to "hi" or "ta" if needed per therapist.
//
// Key params for single-mic two-speaker setup:
//   diarize=true           — voice characteristic separation (pitch, timbre)
//   diarize_version=3      — latest diarization model
//   utterance_end_ms=1500  — 1.5s silence = end of utterance (better turn detection)
//   no_delay=true          — stream words as they're recognised, don't buffer
//   punctuate=true         — via smart_format; keeps output readable
// nova-3 keyterm prompting: boosts recognition of clinical vocabulary that
// generic models routinely mis-hear (drug names, disorders, techniques). These
// are exactly the "unclear" words that matter most in a note, so getting them
// right at the source beats fixing them downstream.
const CLINICAL_KEYTERMS = [
  // medications
  'sertraline', 'escitalopram', 'fluoxetine', 'venlafaxine', 'clonazepam',
  'olanzapine', 'lithium', 'bupropion', 'mirtazapine', 'SSRI', 'SNRI',
  // conditions
  'anxiety', 'depression', 'bipolar', 'schizophrenia', 'psychosis', 'OCD',
  'PTSD', 'ADHD', 'panic attack', 'insomnia', 'anhedonia', 'dissociation',
  'rumination', 'hypomania', 'suicidal ideation', 'self-harm',
  // techniques
  'CBT', 'DBT', 'EMDR', 'behavioural activation', 'exposure therapy',
  'cognitive restructuring', 'mindfulness', 'grounding',
];

const DG_WS_URL =
  'wss://api.deepgram.com/v1/listen' +
  '?model=nova-3' +
  '&language=multi' +             // auto-detects Hindi, Hinglish, Tamil, Telugu, English, mixed
  '&diarize=true' +               // speaker separation by voice characteristics
  '&smart_format=true' +          // punctuation, numbers, dates
  '&interim_results=true' +       // show words as spoken
  '&utterance_end_ms=1500' +      // 1.5 s silence = new speaker turn
  '&vad_events=true' +            // voice-activity events
  '&no_delay=true' +              // don't buffer — stream immediately
  '&filler_words=false' +         // skip "um", "uh" — cleaner transcript
  '&encoding=linear16' +
  '&sample_rate=16000' +
  '&channels=1';

const SPEAKER_MAP: Record<number, string> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
const MAX_RECONNECT = 6;
const RECONNECT_BASE_MS = 1500;

export function useRealTimeTranscript() {
  const wsRef          = useRef<WebSocket | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const workletRef     = useRef<AudioWorkletNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const tokenRef       = useRef<string>('');
  const reconnectRef   = useRef(0);
  const intentionalRef = useRef(false);
  const pendingRef     = useRef<{ speaker: string; words: string[]; start_ms: number } | null>(null);

  const [segments, setSegments]               = useState<TranscriptSegment[]>([]);
  const [partialText, setPartialText]         = useState('');
  const [isConnected, setIsConnected]         = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  >('idle');

  // ── Mic → AudioWorklet → WebSocket ──────────────────────────────────────────
  const startMic = useCallback(async (ws: WebSocket) => {
    // Request mono 16 kHz with all browser-level enhancements ON.
    // The worklet then applies additional processing on top.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,       // remove speaker-to-mic feedback
        noiseSuppression: true,       // browser-level denoise
        autoGainControl: false,       // we do our own AGC in the worklet (more control)
        // @ts-ignore — non-standard but supported in Chrome/Edge
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googAutoGainControl: false,
      },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
    audioCtxRef.current = audioCtx;

    // Inline the worklet as a Blob URL — no public/ file needed
    const blob   = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);

    const source  = audioCtx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(audioCtx, 'pcm-processor', {
      processorOptions: {},
      outputChannelCount: [1],
    });
    workletRef.current = worklet;

    // Route worklet output straight to WebSocket — no playback (avoids feedback)
    worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
    };

    source.connect(worklet);
    // Deliberately NOT connected to audioCtx.destination
  }, []);

  // ── Parse Deepgram message ───────────────────────────────────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    let data: Record<string, unknown>;
    try { data = JSON.parse(event.data as string); } catch { return; }

    const type = data.type as string;

    if (type === 'Results') {
      const channel = data.channel as {
        alternatives?: Array<{
          transcript?: string;
          words?: Array<{ word: string; speaker: number; start: number; end: number; confidence: number }>;
        }>;
      } | undefined;
      const alt = channel?.alternatives?.[0];
      if (!alt) return;

      const transcript  = alt.transcript || '';
      const isFinal     = data.is_final as boolean;
      const speechFinal = data.speech_final as boolean;

      if (!isFinal) {
        setPartialText(transcript);
        return;
      }

      setPartialText('');
      if (!transcript.trim()) return;

      // Pick dominant speaker from word-level diarization labels
      const words = alt.words || [];
      const speakerCounts: Record<number, number> = {};
      words.forEach(w => { speakerCounts[w.speaker] = (speakerCounts[w.speaker] || 0) + 1; });
      const dominant = Object.entries(speakerCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
      const speakerNum   = dominant !== undefined ? Number(dominant) : 0;
      const speakerLabel = `Speaker ${SPEAKER_MAP[speakerNum] ?? String.fromCharCode(65 + speakerNum)}`;

      const startMs = words[0] ? Math.round(words[0].start * 1000) : (data.start as number ?? 0) * 1000;
      const endMs   = words[words.length - 1] ? Math.round(words[words.length - 1].end * 1000) : startMs + 1000;
      const avgConf = words.length > 0 ? words.reduce((s, w) => s + w.confidence, 0) / words.length : 0.9;

      // Flag individual low-confidence words so Layer 1 of the note pipeline can
      // repair them from full-conversation context. Threshold 0.6 ≈ Deepgram's
      // "probably misheard" boundary; de-duplicated, punctuation stripped.
      const lowConf = Array.from(new Set(
        words
          .filter(w => w.confidence < 0.6)
          .map(w => w.word.replace(/[^\p{L}\p{N}'-]/gu, '').trim())
          .filter(Boolean),
      ));

      const seg: TranscriptSegment = {
        speaker: speakerLabel,
        text: transcript,
        start_ms: startMs,
        end_ms: endMs,
        confidence: avgConf,
        is_partial: false,
        ...(lowConf.length ? { low_conf: lowConf } : {}),
      };

      if (speechFinal || !pendingRef.current || pendingRef.current.speaker !== speakerLabel) {
        // Flush any pending utterance from different speaker
        if (pendingRef.current && pendingRef.current.speaker !== speakerLabel && pendingRef.current.words.length) {
          const p = pendingRef.current;
          setSegments(prev => [...prev, {
            speaker: p.speaker,
            text: p.words.join(' '),
            start_ms: p.start_ms,
            end_ms: startMs,
            confidence: avgConf,
            is_partial: false,
          }]);
        }
        setSegments(prev => [...prev, seg]);
        pendingRef.current = null;
      } else {
        // Same speaker — accumulate
        pendingRef.current.words.push(transcript);
      }
    }

    // UtteranceEnd — flush any accumulated text
    if (type === 'UtteranceEnd' && pendingRef.current?.words.length) {
      const p = pendingRef.current;
      setSegments(prev => [...prev, {
        speaker: p.speaker,
        text: p.words.join(' '),
        start_ms: p.start_ms,
        end_ms: Date.now(),
        confidence: 0.9,
        is_partial: false,
      }]);
      pendingRef.current = null;
    }
  }, []);

  // ── Open WebSocket ───────────────────────────────────────────────────────────
  const openWebSocket = useCallback((token: string) => {
    setConnectionStatus(reconnectRef.current > 0 ? 'reconnecting' : 'connecting');

    // Deepgram browser auth: token passed as WebSocket subprotocol
    const ws = new WebSocket(DG_WS_URL, ['token', token]);
    ws.binaryType = 'arraybuffer';

    ws.onopen = async () => {
      reconnectRef.current = 0;
      setIsConnected(true);
      setConnectionStatus('connected');
      try { await startMic(ws); } catch (err) { console.error('[Kith] Mic error:', err); }
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
      setIsConnected(false);
      if (intentionalRef.current) return;
      if (reconnectRef.current < MAX_RECONNECT) {
        const delay = RECONNECT_BASE_MS * Math.pow(2, reconnectRef.current);
        reconnectRef.current += 1;
        setConnectionStatus('reconnecting');
        console.warn(`[Kith] WS closed (${e.code}) — retry in ${delay}ms`);
        setTimeout(() => openWebSocket(tokenRef.current), delay);
      } else {
        setConnectionStatus('failed');
        console.error('[Kith] WS reconnect exhausted after', MAX_RECONNECT, 'attempts');
      }
    };

    ws.onerror = (err) => { console.error('[Kith] WS error:', err); };

    wsRef.current = ws;
  }, [startMic, handleMessage]);

  const connect = useCallback(async (token: string) => {
    intentionalRef.current = false;
    reconnectRef.current   = 0;
    tokenRef.current       = token;
    openWebSocket(token);
  }, [openWebSocket]);

  const disconnect = useCallback(() => {
    intentionalRef.current = true;

    // Flush any remaining pending utterance
    if (pendingRef.current?.words.length) {
      const p = pendingRef.current;
      setSegments(prev => [...prev, {
        speaker: p.speaker,
        text: p.words.join(' '),
        start_ms: p.start_ms,
        end_ms: Date.now(),
        confidence: 0.9,
        is_partial: false,
      }]);
      pendingRef.current = null;
    }

    workletRef.current?.disconnect();
    workletRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    setIsConnected(false);
    setConnectionStatus('idle');
    setPartialText('');
  }, []);

  return { segments, partialText, isConnected, connectionStatus, connect, disconnect };
}
