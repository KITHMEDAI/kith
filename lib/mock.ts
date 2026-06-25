/**
 * lib/mock.ts — Placeholder responses for all external APIs.
 * When NEXT_PUBLIC_USE_MOCK=true (or API keys are absent), every
 * external call returns realistic stub data so the app runs fully
 * in demo mode without spending credits.
 *
 * Replace each function body with the real implementation once
 * you add the API keys to .env.local.
 */

import type { SessionNotes, TranscriptSegment } from '@/types';

export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ── AssemblyAI ──────────────────────────────────────────────────────────────

/** Returns a fake WebSocket token — the hook will connect to a mock WS server */
export function mockRealtimeToken(): string {
  return 'mock_token_' + Math.random().toString(36).slice(2);
}

/** Simulated diarized transcript for post-session processing */
export function mockTranscript(): TranscriptSegment[] {
  return [
    { speaker: 'doctor', text: 'How have you been feeling since our last session?', start_ms: 0, end_ms: 4200, confidence: 0.98, is_partial: false },
    { speaker: 'patient', text: 'Better overall. The breathing exercises really helped with the panic episodes.', start_ms: 4500, end_ms: 9800, confidence: 0.97, is_partial: false },
    { speaker: 'doctor', text: 'That is great progress. How many episodes did you have this week?', start_ms: 10200, end_ms: 14500, confidence: 0.99, is_partial: false },
    { speaker: 'patient', text: 'Only two, down from five last week. And they were much shorter.', start_ms: 15000, end_ms: 19300, confidence: 0.96, is_partial: false },
    { speaker: 'doctor', text: 'Excellent. Let us talk about the work-related triggers you mentioned.', start_ms: 19800, end_ms: 24100, confidence: 0.98, is_partial: false },
    { speaker: 'patient', text: 'Yes, the deadline pressure is still very overwhelming. I start catastrophising.', start_ms: 24600, end_ms: 30200, confidence: 0.95, is_partial: false },
    { speaker: 'doctor', text: 'We will work on cognitive restructuring for that today. Tell me about a specific moment.', start_ms: 30700, end_ms: 36000, confidence: 0.97, is_partial: false },
    { speaker: 'patient', text: 'Last Tuesday, I had a presentation and I kept thinking everything would go wrong.', start_ms: 36500, end_ms: 42800, confidence: 0.96, is_partial: false },
    { speaker: 'doctor', text: 'And what actually happened?', start_ms: 43200, end_ms: 44800, confidence: 0.99, is_partial: false },
    { speaker: 'patient', text: 'It went well actually. My manager even complimented me.', start_ms: 45200, end_ms: 49000, confidence: 0.97, is_partial: false },
  ];
}

// ── Claude / Notes Generation ───────────────────────────────────────────────

export function mockSessionNotes(patientName: string, diagnosis: string[]): SessionNotes {
  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const dx = diagnosis.join(', ') || 'GAD';

  return {
    soap_note: {
      subjective: `${initials}. reports improvement in panic episode frequency (2 this week vs 5 last week). Breathing exercises described as effective. Ongoing cognitive distortions related to workplace performance noted. Patient acknowledges successful presentation outcome despite anticipatory anxiety.`,
      objective: `Affect: calm, engaged. Speech: clear, organised. Thought process: linear. No psychotic features. Eye contact maintained throughout. Posture relaxed. Demonstrated insight into cognitive patterns when questioned.`,
      assessment: `${initials}. continues to make measurable progress with ${dx}. Panic frequency reduced 60% week-on-week. Homework compliance high. Catastrophising remains active in occupational contexts. CBT interventions are producing positive outcomes. Session quality: good therapeutic alliance.`,
      plan: `1. Continue diaphragmatic breathing — daily 10-minute practice. 2. Introduce thought record worksheet for work-related cognitions. 3. Cognitive restructuring exercise: evidence-for / evidence-against. 4. Review progress on panic diary at next session. 5. Schedule follow-up in 7 days.`,
    },
    key_points: [
      'Panic episodes reduced from 5 to 2 this week — 60% improvement',
      'Breathing techniques working effectively in acute moments',
      'Catastrophising still active around work deadlines and presentations',
      'Successful presentation outcome not integrated into self-schema yet',
      'High homework compliance — strong therapeutic engagement',
      'Cognitive restructuring to be introduced this session',
    ],
    session_summary: `${initials}. showed significant improvement in panic frequency and reports high compliance with breathing exercises. Primary focus this session was cognitive distortions around workplace performance. CBT thought records introduced for homework.`,
    ai_suggestions: [
      'Introduce behavioural experiments to test catastrophic predictions at work',
      'Consider exposure hierarchy for performance-related situations',
      'Explore origin of perfectionism schema — may be driving catastrophising',
      'Add sleep hygiene review — anxiety often disrupts sleep architecture',
    ],
    resource_suggestions: {
      books: [
        { title: 'Feeling Good: The New Mood Therapy', author: 'Dr. David D. Burns', reason: 'Practical CBT techniques for cognitive distortions, directly applicable to work anxiety' },
        { title: 'The Anxiety and Worry Workbook', author: 'Clark & Beck', reason: 'Evidence-based exercises for GAD management and panic reduction' },
      ],
      movies: [
        { title: 'The Secret Life of Walter Mitty', year: 2013, reason: 'Explores overcoming fear-based avoidance through action — resonates with performance anxiety themes' },
      ],
      exercises: [
        { name: '4-7-8 Breathing', description: 'Inhale 4s, hold 7s, exhale 8s. Activates parasympathetic response during panic onset.', frequency: '3× daily + during episodes' },
        { name: 'Thought Record', description: 'Write the triggering situation, automatic thought, emotion, evidence for/against, balanced thought.', frequency: 'Daily when work anxiety spikes' },
      ],
      apps: [
        { name: 'Calm', platform: 'iOS/Android', reason: 'Structured breathing and body-scan meditations to complement session work' },
        { name: 'Woebot', platform: 'iOS/Android', reason: 'CBT-based chatbot for between-session support and mood tracking' },
      ],
    },
    risk_flags: {
      level: 'low',
      indicators: [],
      action_required: false,
      recommended_action: null,
    },
    homework_assigned: 'Complete thought record worksheet for at least 3 work-related anxiety triggers. Continue daily breathing practice. Note panic episodes with duration and intensity in diary.',
    next_session_plan: 'Review thought records. Advance cognitive restructuring — behavioural experiment design. Assess sleep quality. Consider introducing activity scheduling if avoidance patterns emerge.',
  };
}

// ── Live update (lighter, 5-min interval) ──────────────────────────────────

export function mockLiveUpdate() {
  return {
    key_points: [
      'Patient reporting improvement in panic frequency',
      'Breathing exercises proving effective',
      'Work-related catastrophising remains active',
    ],
    risk_level: 'low',
    suggested_questions: [
      'Can you describe what specifically triggers the catastrophising thoughts at work?',
      'How have you been using the breathing exercises — any particular times of day?',
      'What would it look like for you if the anxiety were reduced by half?',
    ],
    treatment_suggestions: [
      'Continue CBT thought-challenging for work-related catastrophising — consider adding a thought record worksheet.',
      'Panic frequency improvement noted — may be worth reviewing medication efficacy with prescribing psychiatrist if patient is on an SSRI.',
    ],
    mindfulness_suggestions: [
      '4-7-8 breathing: inhale 4s, hold 7s, exhale 8s — ideal before high-stress work situations.',
      'Body scan meditation (10 min) before bed to reduce residual tension from work anxiety.',
    ],
  };
}

// ── Google Calendar ─────────────────────────────────────────────────────────

export function mockCalendarEvents() {
  const now = new Date();
  return [
    {
      id: 'mock_evt_1',
      summary: 'Therapy — Rohan Sinha',
      start: { dateTime: new Date(now.getTime() + 3600000).toISOString() },
      end: { dateTime: new Date(now.getTime() + 6600000).toISOString() },
    },
    {
      id: 'mock_evt_2',
      summary: 'Therapy — Ananya Mehta',
      start: { dateTime: new Date(now.getTime() + 86400000).toISOString() },
      end: { dateTime: new Date(now.getTime() + 89400000).toISOString() },
    },
  ];
}

// ── Notifications ───────────────────────────────────────────────────────────

export function mockNotifyResult() {
  return { email: true, sms: true, whatsapp: true };
}
