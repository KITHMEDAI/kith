/**
 * NDIS format eval: do generated notes look like notes an NDIS provider's
 * auditor would accept? Realistic dictated / typed / rough inputs → note
 * writer (ndis_progress_note / ndis_incident) → judged against what NDIS
 * guidance expects (sources in docs/product/real-data-findings.md):
 *
 *  Progress / shift note: date, shift times, participant, worker, location,
 *  specific supports delivered, objective observations (no labels), the
 *  participant's own words in quotes, link to a plan goal ONLY if one was
 *  stated, level of support / prompting, incidents ("none" if none),
 *  handover / follow-up, missing items flagged rather than invented.
 *
 *  Incident report: date / time / place, people involved, factual timeline,
 *  injury / harm, immediate actions incl. first aid / medical, who was
 *  notified and when, witnesses, contributing factors, prevention, and a
 *  correct call on whether it may be a reportable incident (24 h / 5 business
 *  days) without over- or under-calling it.
 *
 *   npx tsx scripts/workspace-eval/ndis-format/run.ts
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { setup, judge, pool, REPORT_DIR } from '../harness';

interface Case { id: string; noteType: 'ndis_progress_note' | 'ndis_incident'; inputMode: 'typed' | 'recorded'; input: string; expect: string }

const CASES: Case[] = [
  {
    id: 'dictated-shift-handover', noteType: 'ndis_progress_note', inputMode: 'recorded',
    input: `Speaker A: G'day Liam, just doing my handover for Darren's shift this arvo, from one till five.
Speaker B: No worries Jess, go for it.
Speaker A: So we went down to the Parramatta pool for his hydrotherapy goal. He did about twenty minutes in the water and walked the full length of the shallow end twice with the noodle, which is more than last week.
Speaker B: Good on him. Any issues with his knee?
Speaker A: He said it was a bit sore after, about a four out of ten. I gave him his Panadol at three fifteen, two tablets, five hundred milligrams each, and wrote it in the medication chart.
Speaker B: Righto. Did he eat?
Speaker A: He had a ham and cheese toastie and a flat white at the servo on the way back. Paid with his own card, eleven dollars fifty, receipt's in the folder.
Speaker B: And mood wise?
Speaker A: Pretty chuffed, honestly. He reckons he wants to try the deep end next Thursday. Only thing is he got a bit frustrated at the bus stop when the 545 was twenty minutes late, but he calmed down with his breathing exercises after a couple of minutes.
Speaker B: Okay, worth noting. Anything for next shift?
Speaker A: Yeah, his mum asked us to remind him about the Centrelink appointment on Monday at ten, and we're nearly out of the knee gel, so someone needs to grab Voltaren from the chemist.`,
    expect: 'Participant Darren (not a speaker); worker Jess, Liam is team leader. 1-5pm, Parramatta pool, hydrotherapy goal stated, 20 min, 2 lengths with noodle (progress vs last week), knee pain 4/10, Panadol 2x500mg at 3:15pm recorded in chart, $11.50 own card receipt in folder, frustration at late 545 bus settled with breathing exercises, wants to try deep end next Thursday, Centrelink Monday 10am reminder, Voltaren needed. No incidents (pain is not an incident).',
  },
  {
    id: 'typed-rough-shift', noteType: 'ndis_progress_note', inputMode: 'typed',
    input: `JM 9-1130 home. personal care + brekkie prep. made toast himself, 1 prompt for the toaster. said "i'm feeling heaps better than last week". didnt take bp, cuff flat. tidied kitchen together. next shift - grocery shop thurs, need new bp cuff batteries`,
    expect: 'Participant JM, 9:00-11:30 at home, personal care + breakfast prep, made toast with 1 prompt (support level), quote preserved, BP not taken because cuff battery flat (should be followed up), kitchen tidied together, handover: grocery shop Thursday, batteries. No goal stated (must not invent one). Worker name and date missing → flagged, not invented.',
  },
  {
    id: 'typed-judgemental', noteType: 'ndis_progress_note', inputMode: 'typed',
    input: `Shift with Mark 7am-10am. He was being really difficult and lazy this morning, refused his shower at first. After 3 prompts he had it. Kitchen was a pigsty, he just doesn't care. Took meds 8am (Endep 10mg). Watched TV rest of shift.`,
    expect: 'Must rewrite labels ("difficult", "lazy", "pigsty", "doesn\'t care") into observable facts (declined shower initially, showered after 3 prompts, kitchen untidy) without inventing reasons; Endep 10mg at 8am; watched TV. No goal stated. Worker name/date missing → flagged.',
  },
  {
    id: 'dictated-community-access-goal', noteType: 'ndis_progress_note', inputMode: 'recorded',
    input: `Okay, shift note for Aisha, Tuesday, ten till two. We worked on her goal of catching the bus to TAFE on her own. She tapped on with her Opal card by herself and found the right stop with one reminder from me at Central. At TAFE she went to the library and borrowed two books. She said, quote, I want to do this without you next week, unquote. She got a bit overwhelmed in the crowd at Central, covered her ears, and we stepped aside for about five minutes until she was ready. No incidents. Next shift, practise the trip with me walking a few metres behind her.`,
    expect: 'Aisha, Tuesday 10am-2pm, goal (bus to TAFE independently) stated and linked, tapped Opal independently, one reminder at Central (support level), library 2 books, quote preserved, overwhelmed in crowd at Central → covered ears → 5 min break (objective), no incidents, next step: worker walks a few metres behind.',
  },
  {
    id: 'dictated-fall-incident', noteType: 'ndis_incident', inputMode: 'recorded',
    input: `Speaker A: Priya, I need to report something from the Woolloongabba house this morning.
Speaker B: Okay Tom, take your time. What happened?
Speaker A: At about seven forty, Sam was getting out of the shower and slipped on the wet tiles. He landed on his left hip and hit his elbow on the vanity.
Speaker B: Was he hurt?
Speaker A: He had a graze on his left elbow, about three centimetres, and he said his hip was sore, maybe six out of ten. I cleaned the graze, put a dressing on, and helped him sit down. He didn't hit his head and he was talking normally the whole time.
Speaker B: Did you call anyone?
Speaker A: I called his GP clinic at eight o'clock, Dr Mehta's practice, and they said to watch for swelling and bring him in if the pain gets worse. I also rang his sister Leanne at eight fifteen and let her know.
Speaker B: Was the non-slip mat in the shower?
Speaker A: No, it had been taken out to be washed yesterday and nobody put it back. That's on us. I've put it back now and put a sign on the bathroom door.
Speaker B: Alright, we'll log it today. Did anyone else see it?
Speaker A: Kylie was on shift too, she came in straight after she heard him fall.`,
    expect: 'Fall ~7:40am Woolloongabba house bathroom, participant Sam, reported by Tom to coordinator Priya; injuries graze L elbow 3cm, L hip pain 6/10, no head strike, alert; first aid (cleaned, dressing, seated); GP clinic (Dr Mehta) called 8:00 – monitor swelling, bring in if worse; sister Leanne called 8:15; contributing factor: non-slip mat removed for washing and not replaced; prevention: mat replaced, sign on door; witness: Kylie arrived right after. Reportable? A fall with minor injury is generally NOT a reportable incident unless it is a serious injury or results from neglect — the note should not assert it IS reportable; may suggest the provider assess (possible neglect angle due to mat) without overclaiming.',
  },
  {
    id: 'typed-late-medication', noteType: 'ndis_incident', inputMode: 'typed',
    input: `Med incident - Ben's 8pm meds (Epilim 500mg) given at 9:15pm, 75 min late, because I was dealing with another resident's fall. Ben fine, no side effects observed, checked at 9:45. Told TL Rachel at 9:30, recorded in MAR with late reason. Pharmacy said one-off delay not a concern.`,
    expect: 'Late medication (Epilim 500mg, 75 min late, reason), no harm, monitored 9:45, TL Rachel informed 9:30, MAR updated, pharmacy advice. Should NOT claim it is a reportable incident to the NDIS Commission (no harm, internal incident) — an internal incident record is correct.',
  },
  {
    id: 'typed-restrictive-practice', noteType: 'ndis_incident', inputMode: 'typed',
    input: `Around 4:30pm today Josh started hitting his head on the wall in his room. I held both his wrists for about a minute to stop him hurting himself, then he calmed down and sat on the bed. He has a red mark on his forehead, no bleeding. Holding wrists is not in his behaviour support plan. Told house manager Deb at 4:45.`,
    expect: 'Self-injury 4:30pm, worker held both wrists ~1 min (physical restraint) NOT in the behaviour support plan → unauthorised restrictive practice → MUST be flagged as a likely reportable incident to the NDIS Commission (harm/possible harm → 24 hours; otherwise 5 business days). Red mark on forehead, no bleeding; told house manager Deb at 4:45; needs follow-up with behaviour support practitioner. Must stay factual, not judge the worker.',
  },
];

const PROGRESS_CRITERIA = {
  required_fields: 'Has (or clearly flags as missing, never invents) date, shift times, participant, worker, location, supports delivered, observations, incidents (states none if none) and handover/follow-up.',
  objectivity: 'Observable, neutral language; judgemental labels in the input are rewritten as facts; participant\'s own words kept in quotation marks.',
  goals_and_support: 'Links to a plan goal ONLY if one was stated in the input (inventing a goal is a serious error); records the level of support / prompting when given.',
  faithfulness: 'No facts, times, names, goals or advice beyond the input.',
  audit_ready: 'An NDIS auditor or team leader could rely on this note as written (clear, specific, complete, usable for billing evidence).',
};
const INCIDENT_CRITERIA = {
  required_fields: 'Has (or flags as missing) date/time, place, people involved, factual description/timeline, injury or harm, immediate actions incl. first aid/medical, who was notified and when, witnesses, contributing factors, prevention/follow-up.',
  reportable_call: 'Correct call on NDIS Commission reportable incidents: flags a likely reportable incident when the input shows one (e.g. unauthorised restrictive practice, serious injury, abuse/neglect) with the right timeframe (24 h, or 5 business days for unauthorised restrictive practice without harm), and does NOT claim an ordinary minor incident is reportable.',
  objectivity: 'Factual, chronological, no blame or speculation about causes beyond what was said.',
  faithfulness: 'No facts, times, names or actions beyond the input.',
  audit_ready: 'A provider\'s incident manager could use this as the internal record / basis for a Commission notification without rewriting it.',
};

(async () => {
  await setup();
  const { generateNote, noteToText } = await import('../../../lib/workspace/generate');
  const rows = await pool(CASES, 3, async c => {
    let text: string;
    try {
      const note = await generateNote({ input: c.input, inputMode: c.inputMode, noteType: c.noteType, field: 'ndis', userName: 'Me', date: '21 October 2026', dateISO: '2026-10-21T15:00:00+11:00' });
      text = noteToText(note);
    } catch (e) {
      // In the app this is "We couldn't write this note".
      console.log(`${c.id}: GENERATION FAILED ${(e as Error).message.slice(0, 120)}`);
      return { ...c, note: '', scores: {} as Record<string, number>, pass: false, issues: [`GENERATION FAILED (user would see "We couldn't write this note"): ${(e as Error).message.slice(0, 200)}`] };
    }
    const j = await judge(
      `You are an NDIS provider's quality and compliance lead reviewing an AI-drafted ${c.noteType === 'ndis_incident' ? 'incident report' : 'shift / progress note'} before a support worker signs it. The note was dated 21 October 2026 by the system. List every missing or wrong element as an issue.`,
      c.noteType === 'ndis_incident' ? INCIDENT_CRITERIA : PROGRESS_CRITERIA,
      `INPUT (what the worker said or typed):\n${c.input}\n\nWHAT A GOOD NOTE MUST GET RIGHT (reviewer's key):\n${c.expect}\n\nAI-DRAFTED NOTE:\n${text}`);
    console.log(`${c.id}: ${JSON.stringify(j.scores)} ${j.pass ? 'PASS' : 'FAIL'}`);
    return { ...c, note: text, scores: j.scores, pass: j.pass, issues: j.issues };
  });

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const md = [
    `# Eval: NDIS note format (${stamp})`, '',
    'Realistic dictated / typed NDIS inputs → note writer → judged as an NDIS quality & compliance lead would, against what NDIS guidance expects of shift/progress notes and incident reports.', '',
    `**${rows.filter(r => r.pass).length}/${rows.length} passed**`, '',
    '| Case | Type | Scores | Pass |', '|---|---|---|---|',
    ...rows.map(r => `| ${r.id} | ${r.noteType === 'ndis_incident' ? 'incident' : 'progress'} | ${Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(', ')} | ${r.pass ? '✓' : '✗'} |`),
    '', '## Issues and the generated notes', '',
    ...rows.flatMap(r => [`### ${r.id} ${r.pass ? '✓' : '✗'}`, ...r.issues.map(i => `- ${i}`), '', '<details><summary>Generated note</summary>', '', '```', r.note, '```', '</details>', '']),
  ].join('\n');
  const out = path.join(REPORT_DIR, `ndis-format-${stamp}`);
  writeFileSync(`${out}.md`, md);
  writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
  console.log(`\n${rows.filter(r => r.pass).length}/${rows.length} passed → ${out}.md`);
})().catch(e => { console.error(e); process.exit(1); });
