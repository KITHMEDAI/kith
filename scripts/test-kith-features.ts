/**
 * scripts/test-kith-features.ts
 *
 * Reusable integration test suite for Kith's AI clinical pipeline — covers
 * every feature built this cycle running TOGETHER, through the real
 * production code paths (runNoteGeneration, embedAndStoreNote, the
 * search_session_notes RPC), not isolated function calls:
 *
 *   - All 4 note formats: SOAP, EMDR, DAP, BIRP
 *   - Continuity-aware generation (recent-session-history injection)
 *   - Field-completeness + highlighting validation (retry loop)
 *   - Hybrid semantic+keyword search, including CROSS-PATIENT discrimination
 *     (does a search actually rank the right patient's session first out of
 *     several unrelated ones, not just within one patient's own history)
 *
 * Creates 4 throwaway patients under an existing test therapist account —
 * one per format, each with a realistic multi-session history plus one
 * "live" session generated for real — then deletes everything it created.
 * Cleanup runs in a finally block, so it leaves no residue even on failure.
 * Safe to re-run any time; makes real Claude + Voyage API calls (~4 full
 * note generations), so it costs a little and takes a few minutes.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/test-kith-features.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runNoteGeneration } from '@/lib/process-notes';
import { embedQuery } from '@/lib/embeddings';
import type { NoteFormat } from '@/types';
import type { TranscriptSegment } from '@/types';

const THERAPIST_ID = '0d4649f3-56e4-44b5-b4bb-c4172d258e0f'; // "Dr. Test User" — existing test-only account

// ── Reporting ────────────────────────────────────────────────────────────
const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? `: ${detail}` : ''}`);
}

// ── Shared helpers ───────────────────────────────────────────────────────
function seg(speaker: string, text: string, start: number, end: number): TranscriptSegment {
  return { speaker, text, start_ms: start, end_ms: end, confidence: 0.93, is_partial: false };
}

function everyBulletHighlightedOnce(note: Record<string, unknown>): boolean {
  for (const val of Object.values(note)) {
    for (const point of String(val).split(/\s*•\s*/).filter(Boolean)) {
      if ((point.match(/\*\*/g) || []).length !== 2) return false;
    }
  }
  return true;
}

// ── Test data: 4 patients, one per format, 4 distinct clinical topics ────
// (distinct topics matter for the cross-patient search checks below — each
// patient's live session should be findable by topic without the other
// three's sessions outranking it.)

interface PatientScenario {
  format: NoteFormat;
  displayName: string;
  diagnosis: string[];
  therapyModality: string;
  history: { sessionNumber: number; daysAgo: number; summary: string; homework: string; nextPlan: string }[];
  liveSessionNumber: number;
  liveTranscript: TranscriptSegment[];
  requiredFieldKeys: string[];
  searchQuery: string; // should retrieve THIS patient's live session, ranked above the other 3 patients'
}

const SCENARIOS: PatientScenario[] = [
  {
    format: 'soap',
    displayName: 'QA-SOAP Work Anxiety (delete me)',
    diagnosis: ['Generalized Anxiety Disorder'],
    therapyModality: 'CBT',
    history: [
      {
        sessionNumber: 8, daysAgo: 14,
        summary: 'Identified catastrophic thinking pattern around workplace presentations. Introduced thought-record technique.',
        homework: 'Complete one thought record per day for presentation-related worry',
        nextPlan: 'Review thought records, apply technique to upcoming job interview anxiety',
      },
      {
        sessionNumber: 9, daysAgo: 7,
        summary: 'Escalating anticipatory anxiety about an upcoming job interview next Friday, rated 8/10.',
        homework: 'Daily thought record specifically for interview-related catastrophic thoughts',
        nextPlan: 'Review thought record entries and run a mock-interview role play before the real interview',
      },
    ],
    liveSessionNumber: 10,
    liveTranscript: [
      seg('A', 'How did the interview go on Friday?', 0, 3000),
      seg('B', 'It actually went fine — I got an offer. But now I have this performance review coming up next week and I am already spiraling about it.', 3000, 10000),
      seg('A', 'That is a big shift from the interview worry. What is coming up specifically?', 10000, 14000),
      seg('B', 'My manager wants to discuss my first quarter goals and I am convinced she is going to say I have not done enough.', 14000, 21000),
      seg('A', 'Have you had a chance to look at the thought records from this week?', 21000, 25000),
      seg('B', 'Honestly no, I have not touched them since the interview. I just moved straight to worrying about this new thing.', 25000, 32000),
      seg('A', 'Let us apply the same technique to this new worry right now.', 32000, 35000),
      seg('B', 'Okay — "she is going to say I have not done enough."', 35000, 39000),
      seg('A', 'What is the evidence against that?', 39000, 41000),
      seg('B', 'I hit both of my Q1 targets and she has not raised any concerns so far.', 41000, 46000),
    ],
    requiredFieldKeys: ['subjective', 'objective', 'assessment', 'plan'],
    searchQuery: 'anxious about upcoming performance review at work',
  },
  {
    format: 'emdr',
    displayName: 'QA-EMDR Car Accident (delete me)',
    diagnosis: ['PTSD'],
    therapyModality: 'EMDR',
    history: [
      {
        sessionNumber: 4, daysAgo: 14,
        summary: 'Continued reprocessing of car accident memory (highway collision, 8 months ago). SUD 8 -> 4 by session end. NC "I am not safe" still partially activated.',
        homework: 'Notice and log any intrusive images or driving-related anxiety between sessions',
        nextPlan: 'Continue desensitization phase on the same target, reassess SUD at session open',
      },
      {
        sessionNumber: 5, daysAgo: 7,
        summary: 'SUD reduced further, 6 -> 3 by end of session. PC "I survived it, I am safe now" strengthening. No new intrusive images logged.',
        homework: 'Continue logging any driving-related distress',
        nextPlan: 'Reassess SUD; move toward installation phase if stable at or below 3',
      },
    ],
    liveSessionNumber: 6,
    liveTranscript: [
      seg('A', 'Where is your SUD today when you bring the memory to mind?', 0, 3000),
      seg('B', 'Around a 3, similar to last time. Though I did have one moment this week — I drove past the intersection where it happened.', 3000, 10000),
      seg('A', 'What happened when you drove past it?', 10000, 12000),
      seg('B', 'My heart started racing for a few seconds but it passed once I was through the light.', 12000, 17000),
      seg('A', 'Let us continue processing the same target today. Bring up the image, notice the SUD, and follow my fingers.', 17000, 22000),
      seg('B', 'Okay. It feels a bit less sharp than before.', 22000, 25000),
      seg('A', 'After that set, where is the SUD now?', 25000, 27000),
      seg('B', 'Maybe a 2. And "I am safe now" feels more true than it did — like a 6 out of 7.', 27000, 33000),
    ],
    requiredFieldKeys: ['target', 'sud_voc', 'cognitions', 'phase_plan'],
    searchQuery: 'processing a car accident memory, driving past the crash site',
  },
  {
    format: 'dap',
    displayName: 'QA-DAP Insomnia (delete me)',
    diagnosis: ['Insomnia Disorder'],
    therapyModality: 'CBT-I',
    history: [
      {
        sessionNumber: 2, daysAgo: 14,
        summary: 'Reported fragmented sleep, waking 3-4 times nightly. Sleep hygiene psychoeducation provided.',
        homework: 'Keep a daily sleep diary (bedtime, wake time, number of awakenings)',
        nextPlan: 'Review sleep diary, introduce stimulus control technique',
      },
      {
        sessionNumber: 3, daysAgo: 7,
        summary: 'Sleep diary reviewed — average 2.5 awakenings/night, latency ~40 min. Introduced stimulus control (bed only for sleep, leave room if awake >20 min).',
        homework: 'Apply stimulus control technique nightly, continue sleep diary',
        nextPlan: 'Assess stimulus control adherence and effect on sleep latency',
      },
    ],
    liveSessionNumber: 4,
    liveTranscript: [
      seg('A', 'How did the stimulus control technique go this week?', 0, 3000),
      seg('B', 'Mixed. I did leave the room a few nights when I could not sleep, and it helped some — down to about 2 wake-ups instead of 3 or 4.', 3000, 11000),
      seg('A', 'That is real progress. What do you think is still driving the remaining wake-ups?', 11000, 15000),
      seg('B', 'I think it might be my afternoon coffee. I usually have one around 4pm.', 15000, 20000),
      seg('A', 'Caffeine has a long half-life, so that timing could definitely be contributing.', 20000, 24000),
      seg('B', 'I did not realize it would still be affecting me that many hours later.', 24000, 28000),
      seg('A', 'Let us set a caffeine cutoff and keep the stimulus control going.', 28000, 31000),
      seg('B', 'Okay, I can try cutting it off by noon.', 31000, 34000),
    ],
    requiredFieldKeys: ['data', 'assessment', 'plan'],
    searchQuery: 'trouble sleeping, waking up multiple times at night',
  },
  {
    format: 'birp',
    displayName: 'QA-BIRP Couple Finances (delete me)',
    diagnosis: ['Relationship Distress'],
    therapyModality: 'Couples CBT',
    history: [
      {
        sessionNumber: 5, daysAgo: 14,
        summary: 'Recurring argument pattern about household finances — spending disagreements escalate quickly. Introduced "time-out" de-escalation technique.',
        homework: 'Use the time-out technique (pause 20 min, self-soothe, return to discuss) at the first sign of escalation',
        nextPlan: 'Review any use of the time-out technique this week',
      },
      {
        sessionNumber: 6, daysAgo: 7,
        summary: 'Successfully used the time-out technique once during a budgeting disagreement — both partners reported it prevented escalation.',
        homework: 'Continue using the time-out technique consistently',
        nextPlan: 'Explore underlying beliefs about money (money scripts) driving the recurring conflict',
      },
    ],
    liveSessionNumber: 7,
    liveTranscript: [
      seg('A', 'How has the week been since our last session?', 0, 3000),
      seg('B', 'Honestly rough. We had a big fight about finances again on Tuesday and I completely forgot to use the time-out technique.', 3000, 10000),
      seg('A', 'What happened in the moment?', 10000, 12000),
      seg('B', 'It escalated so fast I did not even think of it until afterward. I felt like we regressed.', 12000, 18000),
      seg('A', 'One missed instance is not a regression — it is useful information about when the technique is hardest to remember.', 18000, 25000),
      seg('B', 'That helps to hear. It just felt discouraging after the win last week.', 25000, 29000),
      seg('A', 'Let us rehearse noticing the early physical cue that signals escalation, before words even start.', 29000, 34000),
      seg('B', 'Okay — I think my jaw tightens right before I raise my voice. I could use that as my cue.', 34000, 40000),
    ],
    requiredFieldKeys: ['behavior', 'intervention', 'response', 'plan'],
    searchQuery: 'couple arguing about money and finances',
  },
];

async function main() {
  const service = createServiceRoleClient();
  const { data: originalTherapist } = await service
    .from('therapists').select('note_format').eq('id', THERAPIST_ID).single();
  const originalFormat = originalTherapist?.note_format ?? 'soap';

  const createdPatientIds: string[] = [];
  const liveSessionIdByFormat: Partial<Record<NoteFormat, string>> = {};

  try {
    for (const scenario of SCENARIOS) {
      console.log(`\n--- ${scenario.format.toUpperCase()}: ${scenario.displayName} ---`);

      const { data: patient, error: patErr } = await service.from('patients').insert({
        therapist_id: THERAPIST_ID,
        display_name: scenario.displayName,
        diagnosis: scenario.diagnosis,
        therapy_modality: scenario.therapyModality,
        consent_recording: true,
        consent_ai_notes: true,
        status: 'active',
      }).select('id').single();
      if (patErr || !patient) throw new Error(`patient insert failed (${scenario.displayName}): ${patErr?.message}`);
      createdPatientIds.push(patient.id);

      const { error: histErr } = await service.from('sessions').insert(
        scenario.history.map(h => ({
          therapist_id: THERAPIST_ID, patient_id: patient.id, session_number: h.sessionNumber, status: 'completed',
          started_at: new Date(Date.now() - h.daysAgo * 86400000).toISOString(),
          session_summary: h.summary, homework_assigned: h.homework, next_session_plan: h.nextPlan,
          risk_level: 'low',
        }))
      );
      if (histErr) throw new Error(`history insert failed (${scenario.displayName}): ${histErr.message}`);

      await service.from('therapists').update({ note_format: scenario.format }).eq('id', THERAPIST_ID);

      const { data: liveSession, error: liveErr } = await service.from('sessions').insert({
        therapist_id: THERAPIST_ID, patient_id: patient.id, session_number: scenario.liveSessionNumber, status: 'processing',
        started_at: new Date().toISOString(), ended_at: new Date().toISOString(),
        transcript_raw: scenario.liveTranscript,
      }).select('id').single();
      if (liveErr || !liveSession) throw new Error(`live session insert failed (${scenario.displayName}): ${liveErr?.message}`);
      liveSessionIdByFormat[scenario.format] = liveSession.id;

      const genResult = await runNoteGeneration(liveSession.id);
      check(`${scenario.format}: generation succeeded`, genResult.ok === true, JSON.stringify(genResult));

      const { data: row } = await service.from('sessions')
        .select('status, soap_note, ai_suggestions, embedding').eq('id', liveSession.id).single();

      check(`${scenario.format}: status completed`, row?.status === 'completed', String(row?.status));

      const presentKeys = row?.soap_note ? Object.keys(row.soap_note) : [];
      check(`${scenario.format}: all required fields present`,
        scenario.requiredFieldKeys.every(k => presentKeys.includes(k)), JSON.stringify(presentKeys));

      check(`${scenario.format}: highlighting valid`,
        row?.soap_note ? everyBulletHighlightedOnce(row.soap_note) : false, '');

      let embeddingDense = false;
      try {
        const vec = JSON.parse(row?.embedding ?? '[]');
        embeddingDense = Array.isArray(vec) && vec.filter((v: number) => v !== 0).length > 900;
      } catch { /* stays false */ }
      check(`${scenario.format}: real dense embedding stored`, embeddingDense, '');
    }

    // Continuity spot-checks — format-specific phrasing, so keep these loose
    // (substring match on plausible themes) rather than exact wording.
    const soapRow = await service.from('sessions').select('ai_suggestions').eq('id', liveSessionIdByFormat.soap).single();
    check('SOAP continuity: flags un-reviewed thought-record homework',
      (soapRow.data?.ai_suggestions ?? []).some((s: string) => /thought record|homework|interview/i.test(s)),
      JSON.stringify(soapRow.data?.ai_suggestions));

    const birpRow = await service.from('sessions').select('ai_suggestions,soap_note').eq('id', liveSessionIdByFormat.birp).single();
    const birpText = JSON.stringify(birpRow.data);
    check('BIRP continuity: references the missed time-out technique',
      /time-out|technique/i.test(birpText), '');

    // Cross-patient search — each query should surface ITS OWN patient's
    // live session ranked above the other three, out of a genuinely mixed
    // multi-topic, multi-format pool (all 4 test patients belong to the
    // same therapist, same as a real multi-patient practice).
    for (const scenario of SCENARIOS) {
      const queryEmbedding = await embedQuery(scenario.searchQuery);
      const { data: ranked, error: rpcErr } = await service.rpc('search_session_notes', {
        p_therapist_id: THERAPIST_ID, p_query_embedding: queryEmbedding,
        p_query_text: scenario.searchQuery, p_patient_id: null, p_limit: 5,
      });
      const topId = ranked?.[0]?.id;
      const expectedId = liveSessionIdByFormat[scenario.format];
      check(`Search "${scenario.searchQuery}" ranks ${scenario.format} session first`,
        !rpcErr && topId === expectedId,
        rpcErr ? rpcErr.message : `top=${topId} expected=${expectedId} (score ${ranked?.[0]?.score})`);
    }

  } finally {
    await service.from('therapists').update({ note_format: originalFormat }).eq('id', THERAPIST_ID);
    if (createdPatientIds.length) {
      await service.from('patients').delete().in('id', createdPatientIds); // cascades sessions
    }
    console.log(`\nCleaned up ${createdPatientIds.length} test patient(s) (cascades sessions), restored note_format='${originalFormat}'`);
  }

  const failed = results.filter(r => !r.pass);
  console.log(`\n${'='.repeat(60)}\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
