'use client';

import { useEffect, useState, useRef } from 'react';
import { Play, Square, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';

const PATIENTS = [
  { name: 'Priya Sharma', age: 34, tag: 'Anxiety · CBT', avatar: 'PS', color: '#7c3aed' },
  { name: 'Rahul Mehta', age: 28, tag: 'Depression · DBT', avatar: 'RM', color: '#0d9488' },
  { name: 'Ananya Iyer', age: 41, tag: 'OCD · ERP', avatar: 'AI', color: '#db2777' },
];

const NOTE_LINES = [
  { label: 'S', color: '#a78bfa', text: 'Reports reduced sleep and persistent worry about work deadlines.' },
  { label: 'O', color: '#34d399', text: 'Affect anxious but engaged. Eye contact maintained. No FoI.' },
  { label: 'A', color: '#fbbf24', text: 'GAD with secondary insomnia. Partial response to CBT.' },
  { label: 'P', color: '#f472b6', text: 'Sleep hygiene protocol. F/U in 1 week. Continue CBT.' },
];

const TRANSCRIPTS = [
  '"…I\'ve been trying the breathing but at 3am the thoughts just spiral…"',
  '"…work has been overwhelming, I keep second-guessing every decision…"',
  '"…the thought records did help during the day, but evenings are still hard…"',
];

// Steps: 0=patients, 1=profile, 2=recording(nebula), 3=generating, 4=done
const DURATIONS = [2000, 1800, 3000, 2200, 2500];

function NebulaDemo({ active }: { active: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#000', borderRadius: 16 }}>
      <div className="neb neb-a" />
      <div className="neb neb-b" />
      <div className="neb neb-c" />
      <div className="neb neb-d" />
      <div className={`neb-core ${active ? 'neb-core-active' : ''}`} />
      <div className="neb-stars" />
      <style>{`
        .neb{position:absolute;border-radius:50%;filter:blur(40px);opacity:.85;mix-blend-mode:screen}
        .neb-a{width:55%;height:55%;background:radial-gradient(circle,#8b5cf6,transparent 68%);top:-10%;left:-10%;animation:neb-a 9s ease-in-out infinite alternate}
        .neb-b{width:50%;height:50%;background:radial-gradient(circle,#2563eb,transparent 68%);bottom:-12%;left:30%;animation:neb-b 11s ease-in-out infinite alternate}
        .neb-c{width:45%;height:45%;background:radial-gradient(circle,#10b981,transparent 68%);top:-8%;right:-10%;animation:neb-c 13s ease-in-out infinite alternate}
        .neb-d{width:38%;height:38%;background:radial-gradient(circle,#ec4899,transparent 70%);bottom:-10%;left:0;animation:neb-a 15s ease-in-out infinite alternate-reverse}
        .neb-core{position:absolute;top:50%;left:50%;width:45%;height:45%;transform:translate(-50%,-50%);border-radius:50%;mix-blend-mode:screen;background:radial-gradient(circle,rgba(255,255,255,.2),rgba(139,92,246,.12) 45%,transparent 72%);animation:neb-breathe 4s ease-in-out infinite}
        .neb-core-active{animation:neb-breathe-active 1.1s ease-in-out infinite}
        .neb-stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,rgba(255,255,255,.5),transparent),radial-gradient(1px 1px at 70% 60%,rgba(255,255,255,.4),transparent),radial-gradient(1px 1px at 45% 80%,rgba(255,255,255,.35),transparent),radial-gradient(1px 1px at 85% 25%,rgba(255,255,255,.4),transparent);opacity:.5}
        @keyframes neb-a{from{transform:translate(0,0) scale(1)}to{transform:translate(40px,30px) scale(1.3)}}
        @keyframes neb-b{from{transform:translate(0,0) scale(1.1)}to{transform:translate(-40px,-25px) scale(.85)}}
        @keyframes neb-c{from{transform:translate(0,0) scale(1)}to{transform:translate(-30px,40px) scale(1.2)}}
        @keyframes neb-breathe{0%,100%{opacity:.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:.8;transform:translate(-50%,-50%) scale(1.15)}}
        @keyframes neb-breathe-active{0%,100%{opacity:.85;transform:translate(-50%,-50%) scale(1.08)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}}
      `}</style>
    </div>
  );
}

export default function DemoShowcase() {
  const [step, setStep] = useState(0);
  const [patIdx, setPatIdx] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transcriptIdx, setTranscriptIdx] = useState(0);
  const [nebulaActive, setNebulaActive] = useState(false);

  const p = PATIENTS[patIdx];

  // Step advancement
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 4) {
        setStep(0);
        setPatIdx(i => (i + 1) % PATIENTS.length);
        setNoteIdx(0);
        setElapsed(0);
        setTranscriptIdx(0);
        setNebulaActive(false);
      } else {
        setStep(s => s + 1);
      }
    }, DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  // Recording timer + nebula pulse
  useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    const neb = setInterval(() => setNebulaActive(a => !a), 1400);
    const tc = setInterval(() => setTranscriptIdx(i => (i + 1) % TRANSCRIPTS.length), 2200);
    return () => { clearInterval(timer); clearInterval(neb); clearInterval(tc); };
  }, [step]);

  // Note line reveal
  useEffect(() => {
    if (step !== 3 || noteIdx >= NOTE_LINES.length) return;
    const t = setTimeout(() => setNoteIdx(i => i + 1), 480);
    return () => clearTimeout(t);
  }, [step, noteIdx]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* Outer glow */}
      <div className="pointer-events-none absolute -inset-8 rounded-3xl opacity-25"
        style={{ background: 'radial-gradient(ellipse,#7c3aed,transparent 70%)', filter: 'blur(50px)' }} />

      {/* Device frame */}
      <div className="relative rounded-[24px] overflow-hidden shadow-2xl"
        style={{ background: '#0a0a12', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset' }}>

        {/* Titlebar */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            </div>
          </div>
          <span className="text-[10px] font-semibold text-white/30 tracking-widest uppercase">Kith</span>
          {step === 2 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> REC {fmt(elapsed)}
            </span>
          )}
          {step !== 2 && <div className="w-16" />}
        </div>

        {/* Content */}
        <div className="min-h-[380px]">

          {/* ── 0: Patient list ── */}
          {step === 0 && (
            <div className="p-4 animate-fade-in">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Today's Patients</p>
              <div className="space-y-2">
                {PATIENTS.map((pt, i) => (
                  <div key={pt.name}
                    className="flex items-center gap-3 rounded-xl p-3 transition-all duration-500"
                    style={{
                      background: i === patIdx ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                      border: i === patIdx ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.05)',
                      transform: i === patIdx ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-none"
                      style={{ background: pt.color }}>
                      {pt.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{pt.name}</p>
                      <p className="text-[10px] text-white/40">{pt.tag}</p>
                    </div>
                    {i === patIdx && <ChevronRight className="h-3.5 w-3.5 text-violet-400" />}
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] text-violet-400/50 mt-4 animate-pulse">Selecting {p.name}…</p>
            </div>
          )}

          {/* ── 1: Profile ── */}
          {step === 1 && (
            <div className="p-4 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: p.color }}>
                  {p.avatar}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white">{p.name}</p>
                  <p className="text-[11px] text-white/40">Age {p.age} · {p.tag}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {['Last session: 7 days ago', 'Today 3:00 PM · In-person', '12 sessions total'].map(l => (
                  <div key={l} className="flex items-center gap-2 text-[11px] text-white/50">
                    <div className="h-1 w-1 rounded-full bg-violet-400" />{l}
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3 mb-4 text-[11px] leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>
                Sleep anxiety, cognitive restructuring. Good response to thought records.
              </div>
              <button className="w-full rounded-xl py-3 text-[13px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 24px rgba(124,58,237,0.4)', animation: 'pulse-btn 2s ease-in-out infinite' }}>
                <Play className="h-4 w-4" /> Start Session
              </button>
              <style>{`@keyframes pulse-btn{0%,100%{box-shadow:0 0 24px rgba(124,58,237,.4)}50%{box-shadow:0 0 36px rgba(124,58,237,.7)}}`}</style>
            </div>
          )}

          {/* ── 2: Recording + Nebula ── */}
          {step === 2 && (
            <div className="animate-fade-in flex flex-col" style={{ height: 380 }}>
              {/* Nebula fills top 2/3 */}
              <div className="flex-1 relative" style={{ minHeight: 220 }}>
                <NebulaDemo active={nebulaActive} />
                {/* Listening label over nebula */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/90"
                      style={{ animation: `neb-pulse ${nebulaActive ? '0.9s' : '1.8s'} ease-in-out infinite` }} />
                    Listening
                  </span>
                  <style>{`@keyframes neb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}`}</style>
                </div>
              </div>
              {/* Live caption strip */}
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0a0a12' }}>
                <p className="text-[11px] text-white/40 mb-1">Live transcript</p>
                <p key={transcriptIdx} className="text-[12px] text-white/80 leading-relaxed animate-fade-in">
                  {TRANSCRIPTS[transcriptIdx]}
                </p>
              </div>
              <div className="px-4 pb-4 pt-2 flex justify-center">
                <button className="flex items-center gap-2 rounded-xl px-5 py-2 text-[12px] font-semibold text-red-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Square className="h-3.5 w-3.5" /> End Session
                </button>
              </div>
            </div>
          )}

          {/* ── 3: Generating ── */}
          {step === 3 && (
            <div className="p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet-400" style={{ animation: 'spin 2s linear infinite' }} />
                <p className="text-[13px] font-semibold text-white">Writing SOAP note…</p>
              </div>
              <div className="space-y-3.5">
                {NOTE_LINES.map((line, i) => (
                  <div key={line.label}
                    className="flex gap-2.5 transition-all duration-500"
                    style={{ opacity: i < noteIdx ? 1 : 0.15, transform: `translateY(${i < noteIdx ? 0 : 6}px)` }}>
                    <span className="text-[12px] font-bold mt-0.5 w-3.5 flex-none" style={{ color: line.color }}>{line.label}</span>
                    <div className="flex-1">
                      {i < noteIdx ? (
                        <p className="text-[12px] text-white/70 leading-relaxed">
                          {line.text}
                          {i === noteIdx - 1 && <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />}
                        </p>
                      ) : (
                        <div className="h-3 rounded-md animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: `${60 + i * 10}%` }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 4: Done ── */}
          {step === 4 && (
            <div className="p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-[13px] font-semibold text-white">Note ready · {fmt(elapsed + 52)}</p>
              </div>
              <div className="space-y-3 mb-4">
                {NOTE_LINES.map(line => (
                  <div key={line.label} className="flex gap-2.5">
                    <span className="text-[12px] font-bold mt-0.5 w-3.5 flex-none" style={{ color: line.color }}>{line.label}</span>
                    <p className="text-[12px] text-white/70 leading-relaxed">{line.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl py-2.5 text-[12px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  Approve & save
                </button>
                <button className="flex-1 rounded-xl py-2.5 text-[12px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 16 : 6,
                height: 6,
                background: i === step ? '#7c3aed' : 'rgba(255,255,255,0.15)',
              }} />
          ))}
        </div>
      </div>

      <p className="text-center mt-3 text-[11px] font-medium text-white/30">
        {['Selecting patient', 'Patient profile', 'Session recording', 'AI writing note', 'Note approved'][step]}
      </p>
    </div>
  );
}
