'use client';

import { useEffect, useState } from 'react';
import { Mic, FileText, User, Play, Square, ChevronRight, Sparkles, Clock, CheckCircle2, MicOff } from 'lucide-react';

const PATIENTS = [
  { name: 'Priya Sharma', age: 34, tag: 'Anxiety · CBT', avatar: 'PS', color: 'bg-violet-500' },
  { name: 'Rahul Mehta', age: 28, tag: 'Depression · DBT', avatar: 'RM', color: 'bg-emerald-500' },
  { name: 'Ananya Iyer', age: 41, tag: 'OCD · ERP', avatar: 'AI', color: 'bg-pink-500' },
];

const NOTE_LINES = [
  { label: 'S', color: 'text-violet-600', text: 'Patient reports reduced sleep and persistent worry about work deadlines.' },
  { label: 'O', color: 'text-emerald-600', text: 'Affect anxious but engaged. Eye contact maintained. No flight of ideas.' },
  { label: 'A', color: 'text-amber-600', text: 'GAD with secondary insomnia. Partial response to current intervention.' },
  { label: 'P', color: 'text-pink-600', text: 'Continue CBT techniques. Introduce sleep hygiene protocol. F/U in 1 week.' },
];

// Steps: 0=patients, 1=profile, 2=recording, 3=notes-generating, 4=notes-done
const STEP_DURATIONS = [2200, 1800, 2800, 2000, 2800];

export default function DemoShowcase() {
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);

  // Advance steps
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 4) {
        setStep(0);
        setPatient(p => (p + 1) % PATIENTS.length);
        setNoteIdx(0);
        setElapsed(0);
      } else {
        setStep(s => s + 1);
      }
    }, STEP_DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  // Recording timer
  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  // Wave animation
  useEffect(() => {
    const t = setInterval(() => setWavePhase(p => p + 1), 80);
    return () => clearInterval(t);
  }, []);

  // Reveal note lines one by one in step 3
  useEffect(() => {
    if (step !== 3) return;
    if (noteIdx >= NOTE_LINES.length) return;
    const t = setTimeout(() => setNoteIdx(i => i + 1), 420);
    return () => clearTimeout(t);
  }, [step, noteIdx]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const p = PATIENTS[patient];

  const waveHeights = Array.from({ length: 20 }, (_, i) => {
    const base = step === 2 ? 0.4 : 0.1;
    return base + Math.abs(Math.sin((i + wavePhase * 0.18) * 0.7)) * (step === 2 ? 0.6 : 0.15);
  });

  return (
    <div className="relative select-none">
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-6 rounded-3xl opacity-30"
        style={{ background: 'radial-gradient(ellipse at center, #7c3aed 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Phone-style frame */}
      <div className="relative mx-auto w-[320px] rounded-[28px] overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg,#1e0d4e,#0f2a1e)', border: '1.5px solid rgba(139,92,246,0.35)' }}>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-[10px] font-semibold text-purple-300/70">KITH</span>
          <div className="flex items-center gap-1.5">
            {step === 2 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> REC
              </span>
            )}
            <span className="text-[10px] text-purple-300/50">{fmt(new Date().getHours() * 60 + new Date().getMinutes())}</span>
          </div>
        </div>

        {/* Screen content */}
        <div className="px-4 pb-6 min-h-[420px]">

          {/* ── STEP 0: Patient list ── */}
          {step === 0 && (
            <div className="animate-fade-in">
              <p className="text-[11px] font-semibold text-purple-300/60 uppercase tracking-wider mb-3">Today's Patients</p>
              <div className="space-y-2">
                {PATIENTS.map((pt, i) => (
                  <div key={pt.name}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-300 ${i === patient ? 'bg-white/15 ring-1 ring-violet-400/40 scale-[1.02]' : 'bg-white/5'}`}>
                    <div className={`h-9 w-9 rounded-full ${pt.color} flex items-center justify-center text-[11px] font-bold text-white flex-none`}>
                      {pt.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{pt.name}</p>
                      <p className="text-[10px] text-purple-300/60">{pt.tag}</p>
                    </div>
                    {i === patient && <ChevronRight className="h-4 w-4 text-violet-400" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <span className="text-[10px] text-purple-400/50 animate-pulse">Selecting {p.name}…</span>
              </div>
            </div>
          )}

          {/* ── STEP 1: Patient profile ── */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-2xl ${p.color} flex items-center justify-center text-sm font-bold text-white`}>
                  {p.avatar}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white">{p.name}</p>
                  <p className="text-[11px] text-purple-300/70">Age {p.age} · {p.tag}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {['Last session: 7 days ago', 'Next: Today 3:00 PM', '12 sessions total'].map(l => (
                  <div key={l} className="flex items-center gap-2 text-[11px] text-purple-200/70">
                    <div className="h-1 w-1 rounded-full bg-violet-400" />{l}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/8 p-3 mb-4 text-[11px] text-purple-200/70 leading-relaxed">
                Focus: Sleep anxiety and cognitive restructuring. Patient responded well to thought records last week.
              </div>
              <button className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 py-3 text-[13px] font-bold text-white flex items-center justify-center gap-2 shadow-lg animate-pulse-slow">
                <Play className="h-4 w-4" /> Start Session
              </button>
            </div>
          )}

          {/* ── STEP 2: Recording ── */}
          {step === 2 && (
            <div className="animate-fade-in flex flex-col items-center">
              <p className="text-[11px] font-semibold text-purple-300/60 uppercase tracking-wider mb-1 self-start">Session in Progress</p>
              <p className="text-[13px] font-bold text-white mb-4 self-start">{p.name}</p>

              {/* Waveform */}
              <div className="flex items-center justify-center gap-[3px] h-16 mb-4">
                {waveHeights.map((h, i) => (
                  <div key={i}
                    className="rounded-full bg-violet-400 transition-all duration-100"
                    style={{ width: 3, height: `${h * 100}%`, opacity: 0.5 + h * 0.5 }} />
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 mb-5">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xl font-mono font-bold text-white tabular-nums">{fmt(elapsed)}</span>
              </div>

              <div className="w-full rounded-xl bg-white/8 p-3 mb-4">
                <p className="text-[10px] text-purple-300/50 mb-1">Live transcript</p>
                <p className="text-[12px] text-purple-100/80 leading-relaxed">
                  "…I've been trying the breathing exercises but when I wake up at 3am the thoughts just spiral again. The thought records did help during the day though…"
                </p>
              </div>

              <button className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-400/30 px-5 py-2.5 text-[12px] font-semibold text-red-300">
                <Square className="h-3.5 w-3.5" /> End Session
              </button>
            </div>
          )}

          {/* ── STEP 3: Generating notes ── */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet-400 animate-spin" style={{ animationDuration: '2s' }} />
                <p className="text-[13px] font-semibold text-white">Writing SOAP note…</p>
              </div>
              <div className="space-y-3">
                {NOTE_LINES.map((line, i) => (
                  <div key={line.label}
                    className={`transition-all duration-500 ${i < noteIdx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="flex gap-2">
                      <span className={`text-[11px] font-bold ${line.color} mt-0.5 w-3 flex-none`}>{line.label}</span>
                      <div className="flex-1">
                        {i < noteIdx - 1 ? (
                          <p className="text-[11px] text-purple-100/80 leading-relaxed">{line.text}</p>
                        ) : i === noteIdx - 1 ? (
                          <p className="text-[11px] text-purple-100/80 leading-relaxed">{line.text}<span className="inline-block w-0.5 h-3 bg-violet-400 ml-0.5 animate-pulse align-middle" /></p>
                        ) : (
                          <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: Note done ── */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-[13px] font-semibold text-white">Note ready — {fmt(elapsed + 47)}</p>
              </div>
              <div className="space-y-3 mb-4">
                {NOTE_LINES.map(line => (
                  <div key={line.label} className="flex gap-2">
                    <span className={`text-[11px] font-bold ${line.color} mt-0.5 w-3 flex-none`}>{line.label}</span>
                    <p className="text-[11px] text-purple-100/80 leading-relaxed">{line.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl bg-violet-500 py-2.5 text-[12px] font-bold text-white">Approve</button>
                <button className="flex-1 rounded-xl bg-white/10 py-2.5 text-[12px] font-medium text-purple-200">Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-4 h-1.5 bg-violet-400' : 'w-1.5 h-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* Step label below */}
      <div className="text-center mt-4">
        <span className="text-xs font-medium text-purple-300/60">
          {['Selecting patient', 'Patient profile', 'Session recording', 'Generating note', 'Note ready to approve'][step]}
        </span>
      </div>
    </div>
  );
}
