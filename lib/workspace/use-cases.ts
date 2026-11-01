import type { FieldKey } from './fields';

// Public landing pages for Kith Workspace (/ and /for/<slug>). Each use case
// maps to a field, so "Start free" pre-selects that field at onboarding.
// seoTitle / seoDescription / intro / faq target what people actually search
// for ("NDIS progress notes", "site diary app"…); every FAQ is shown on the
// page as well as in the FAQPage structured data (lib/workspace/site.ts).
// Example notes are illustrative (made-up people and details), written in the
// same format the real note types produce.

export interface ExampleNote {
  title: string;
  input: string;
  sections: { heading: string; lines: string[] }[];
  flag?: string;
}

export interface UseCase {
  slug: string;
  field?: FieldKey;             // pre-selected at sign-up (none for cross-field pages)
  name: string;
  headline: string;
  sub: string;
  seoTitle: string;             // <title>, ~60 characters, leads with the search phrase
  seoDescription: string;       // meta description, ~150 characters
  intro: string;                // plain-language paragraph under the hero
  faq: { q: string; a: string }[];
  pains: string[];
  noteTypes: string[];
  example: ExampleNote;
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'ndis',
    field: 'ndis',
    name: 'NDIS & disability support',
    headline: 'Shift notes in 2 minutes, not 20',
    sub: 'Talk through the shift on your phone. Kith writes the NDIS progress note: shift details, supports, goal link, incidents and handover, ready for you to check and sign.',
    seoTitle: "NDIS Progress Notes & Shift Notes, Written by AI | Kith",
    seoDescription: "Talk through the shift for two minutes and get an NDIS progress note with shift details, supports, goal link, incidents and handover. Free during early access.",
    intro: "Kith is an AI note taker for NDIS support workers, team leaders and providers. Record a short voice note after the shift (or type rough notes) and Kith writes the progress note in a consistent, objective format: shift details, supports provided, the participant’s response in their own words, a goal link only when you name a goal, an incidents line and the handover. Anything you didn’t say is marked “Not stated” so you can fill it in before you sign.",
    faq: [
      { q: "What should an NDIS progress note include?", a: "The date and shift times, the participant, the support worker, the location and type of support, what supports were provided, how the participant responded (in objective language, with their own words where useful), any link to a plan goal, incidents (or a clear “none”), and handover for the next shift. Kith writes every one of these lines and marks the ones you didn’t mention." },
      { q: "Will Kith make up goals or details?", a: "No. Kith links a plan goal only when you name one, keeps your times and words as you said them, and never adds advice or tasks you didn’t mention. Judgemental words in rough notes (like “difficult” or “lazy”) are rewritten as the facts you described." },
      { q: "Does it help with reportable incidents?", a: "Yes. The incident report checks your description against the NDIS Commission’s reportable incident categories and flags the likely timeframe (24 hours, or 5 business days for an unauthorised restrictive practice where no one was harmed), so a supervisor can decide. A no-harm event like a late dose is marked as an internal incident only." },
      { q: "Can support workers use it on their phone?", a: "Yes. It works in the phone’s browser with nothing to install, and understands Australian accents, slang (“arvo”, “servo”) and common medicine brands." },
    ],
    pains: [
      'Notes written in the car at the end of a long shift',
      'Every worker writes in a different format',
      'Missing times, goals or incident details when the audit comes',
    ],
    noteTypes: ['Shift / progress note', 'Incident report with a reportable-incident check (24 hours / 5 business days)', 'Meeting minutes and handovers'],
    example: {
      title: 'Community access: pool session',
      input: '“Took Sam to Parramatta pool this arvo, 1 to 4. He swam two laps with one verbal prompt, said “that was heaps fun”. Paid for his own lunch. No incidents. Next shift, he needs new goggles.”',
      sections: [
        { heading: 'Shift details', lines: ['Date: 21 October 2026 (worker said “this arvo”)', 'Shift time: 1pm to 4pm', 'Participant: Sam', 'Support worker: Alex (note author)', 'Location: community: Parramatta pool', 'Support type: community access'] },
        { heading: 'Supports provided', lines: ['Took Sam to the pool; 1 verbal prompt during his laps.'] },
        { heading: 'Participant’s response & wellbeing', lines: ['Swam two laps.', 'Paid for his own lunch.', 'Said “that was heaps fun”.'] },
        { heading: 'Goal link', lines: ['Not stated'] },
        { heading: 'Incidents', lines: ['None (worker stated no incidents)'] },
        { heading: 'Handover', lines: ['Sam needs new goggles.'] },
      ],
    },
  },
  {
    slug: 'aged-care',
    field: 'aged_care',
    name: 'Aged care & Support at Home',
    headline: 'Care notes that write themselves after every visit',
    sub: 'For home care and residential care workers. Speak for a minute after a visit; Kith writes a clear care note and flags falls, skin, intake and medication issues for your coordinator.',
    seoTitle: "Aged Care Progress Notes & Home Care Notes with AI | Kith",
    seoDescription: "Speak for a minute after a visit and get a clear aged care or Support at Home note. Falls, skin, intake and medication issues are flagged, with a SIRS priority check.",
    intro: "Kith helps home care and residential aged care workers write progress notes without the after-hours typing. Speak for a minute after each visit and Kith writes the care note: care provided, wellbeing, food and fluids, mobility and skin, and family contact. Falls, skin integrity, intake and medication concerns are flagged for your coordinator or RN, and incident reports include a Serious Incident Response Scheme (SIRS) priority check.",
    faq: [
      { q: "What goes into a good aged care progress note?", a: "What care was given, how the person was (mood, behaviour, what they said), food and fluid intake, continence, mobility and skin, and any contact with family or other services, written objectively. Kith uses these headings and leaves out anything you didn’t say." },
      { q: "Does Kith tell me whether an incident is SIRS Priority 1 or 2?", a: "It flags whether the incident may be reportable under SIRS and the likely priority (Priority 1 generally within 24 hours, Priority 2 within 30 days) for your RN or manager to decide. It doesn’t make the decision for you." },
      { q: "Does it work for Support at Home visits?", a: "Yes. It suits short home visits as well as residential shifts, and works in the browser on a phone between visits." },
      { q: "Is resident information kept private?", a: "Notes are stored in Sydney and encrypted, recordings are deleted after transcription, and AI processing runs with model training switched off. See the Privacy page for details." },
    ],
    pains: [
      'Back-to-back visits with no time to write',
      'Care notes that miss the detail a coordinator needs',
      'Working out whether an incident is SIRS Priority 1 or 2',
    ],
    noteTypes: ['Care note', 'Incident report with a SIRS priority check', 'Clinical handover (ISBAR)'],
    example: {
      title: 'Home visit: morning care',
      input: '“Morning visit with Margaret, helped her shower and dress. She ate half her porridge, drank a cup of tea. Small red patch on her left heel, told her daughter. She was chatty, talking about the grandkids.”',
      sections: [
        { heading: 'Care provided', lines: ['Assisted Margaret to shower and dress.'] },
        { heading: 'Wellbeing & behaviour', lines: ['Chatty; talked about her grandchildren.'] },
        { heading: 'Food, fluids & continence', lines: ['Ate half her porridge; drank one cup of tea.'] },
        { heading: 'Mobility & skin', lines: ['Small red patch on left heel.'] },
        { heading: 'Family / visitor contact', lines: ['Worker told Margaret’s daughter about the red patch.'] },
      ],
      flag: 'Skin integrity: small red patch on left heel. Coordinator to review.',
    },
  },
  {
    slug: 'construction',
    field: 'construction',
    name: 'Construction & trades',
    headline: 'Walk the site, talk, and the report is done',
    sub: 'Site inspections, daily diaries, toolbox talks and defect lists from a voice note on site. Hazards and safety defects are flagged automatically.',
    seoTitle: "Site Diary & Site Inspection Report App (Voice to Report) | Kith",
    seoDescription: "Walk the site, talk, and get the site diary, inspection report, toolbox talk record or defect list. Hazards are flagged with location. Free during early access.",
    intro: "Kith is a voice-to-report app for builders, site supervisors and trades. Talk while you walk the site and Kith writes the daily site diary, site inspection report, toolbox talk record or defects and punch list, with every defect and hazard tied to a location. Safety issues are flagged so nothing gets lost between the site and the office.",
    faq: [
      { q: "What should a daily site diary include?", a: "Weather and conditions, labour and trades on site, works completed, deliveries and plant, delays and variations (with cause and impact), and visitors. Kith writes these sections from what you say on site." },
      { q: "Can it write a defects list?", a: "Yes. Say each defect as you walk and Kith writes one line per defect by location, with the responsible trade if you name it. Safety-related defects such as missing smoke alarms, electrical or fall hazards are also flagged." },
      { q: "Does it record toolbox talks?", a: "Yes. Kith records the topic, attendees, hazards and controls discussed and any worker concerns, in a format suited to WHS site files." },
      { q: "Does it work with noise on site?", a: "Transcription was tested with background chatter and traffic noise with little change in accuracy. Speaking close to the phone helps on very loud sites." },
    ],
    pains: [
      'Site diaries written up at night from memory',
      'Defects scattered across texts and photos',
      'Toolbox talks with no record of who attended',
    ],
    noteTypes: ['Site inspection / walkthrough', 'Daily site diary', 'Toolbox talk', 'Defects / punch list'],
    example: {
      title: 'Level 3 walkthrough',
      input: '“Level 3: plasterers finished the east units, sparky still to fit off unit 302. Missing smoke alarm in 304. Edge protection loose on the north balcony, told the foreman.”',
      sections: [
        { heading: 'Progress', lines: ['Plastering complete in the east units.', 'Electrical fit-off outstanding in unit 302.'] },
        { heading: 'Defects', lines: ['Unit 304: smoke alarm missing.'] },
        { heading: 'Hazards', lines: ['North balcony: edge protection loose; foreman told.'] },
      ],
      flag: 'Safety: loose edge protection on the north balcony and a missing smoke alarm in unit 304.',
    },
  },
  {
    slug: 'hospitality',
    field: 'hospitality',
    name: 'Hospitality & food service',
    headline: 'Shift handovers and food-safety logs, spoken not typed',
    sub: 'Close the shift with a 1-minute voice note. Kith writes the handover for the next manager and the food-safety record, and flags anything out of range.',
    seoTitle: "Shift Handover & Food Safety Log, Spoken Not Typed | Kith",
    seoDescription: "Close the shift with a one-minute voice note. Kith writes the manager handover and food-safety record and flags out-of-range temperatures. Free during early access.",
    intro: "Kith helps restaurant, café, bar and retail managers hand over between shifts without long group-chat threads. Record a quick voice note at close and Kith writes the shift handover (trading, staffing, stock, equipment, customer feedback and what the next shift needs to do) and the food-safety check, flagging any temperature or cleaning issue.",
    faq: [
      { q: "What should a shift handover include?", a: "A trading summary, staffing, stock and supplier issues, equipment and maintenance problems, customer feedback, and a clear list of what the next shift needs to do. Kith writes each of these from your voice note." },
      { q: "Can it keep food-safety records?", a: "Yes. The food-safety check records temperature checks, cleaning and sanitising, allergen controls, pest control and corrective actions, and flags any out-of-range temperature (for example a fridge above 5°C)." },
      { q: "Is it quicker than typing?", a: "Talking for a minute at close is much faster than typing it up, and every handover comes out in the same format, so the next manager knows where to look." },
      { q: "Does the next manager need an account?", a: "You can copy, print or share the finished note however your team already works, such as email or your group chat." },
    ],
    pains: [
      'Handovers lost in group chats',
      'Temperature logs filled in after the fact',
      'Issues the next shift never hears about',
    ],
    noteTypes: ['Shift handover', 'Food-safety check', 'Incident report'],
    example: {
      title: 'Friday close handover',
      input: '“Busy night, 140 covers. Walk-in fridge reading 7 degrees at 9pm, moved the dairy to the bar fridge. We’re low on oat milk. Next shift: call the fridge tech.”',
      sections: [
        { heading: 'Trading summary', lines: ['Busy night: 140 covers.'] },
        { heading: 'Equipment & maintenance', lines: ['Walk-in fridge read 7°C at 9pm; dairy moved to the bar fridge.'] },
        { heading: 'Stock & suppliers', lines: ['Low on oat milk.'] },
        { heading: 'For next shift', lines: ['Call the fridge technician.'] },
      ],
      flag: 'Food safety: walk-in fridge at 7°C (above 5°C).',
    },
  },
  {
    slug: 'meetings',
    field: 'general',
    name: 'Meetings & client calls',
    headline: 'Record the meeting. Get the minutes.',
    sub: 'In the room or online (Teams, Meet, Zoom in your browser). Kith writes the minutes: decisions, action items with owners, and open questions.',
    seoTitle: "AI Meeting Minutes & Notes for Teams, Meet and Zoom | Kith",
    seoDescription: "Record a meeting in the room or online and get the minutes: decisions, action items with owners and due dates, and open questions. Built in Australia.",
    intro: "Kith is an AI meeting note taker that works in the browser, with no bot joining your call. Record a meeting in the room on your phone, or record an online meeting in Teams, Google Meet or Zoom in your browser, and Kith writes the minutes: who attended, what was discussed, the decisions made, action items with owners and dates, and open questions.",
    faq: [
      { q: "How does Kith record online meetings?", a: "Open your meeting in the browser and start a recording in Kith. It captures your microphone and the meeting tab’s audio, with no bot joining the call. Everyone being recorded should agree first." },
      { q: "Will the minutes say who is doing what?", a: "Yes. Action items list the owner and due date when someone says them. If an owner or date wasn’t clear, Kith leaves it blank and lists it as a follow-up rather than guessing." },
      { q: "Can I get a format other than minutes?", a: "Yes. Choose client call, interview or custom and describe the note you want, for example a summary for a client." },
      { q: "How long can a recording be?", a: "Long meetings and workshops of several hours are written in sections and combined, so nothing is dropped." },
    ],
    pains: [
      'Nobody wants to take the minutes',
      'Actions agreed in the meeting and then forgotten',
      'Notes that don’t say who decided what',
    ],
    noteTypes: ['Meeting minutes', 'Client / stakeholder call', 'Interview', 'Custom: describe your own format'],
    example: {
      title: 'Website launch planning',
      input: 'A 25-minute team meeting, recorded in the browser.',
      sections: [
        { heading: 'Decisions', lines: ['Launch moves to 14 November.', 'Budget for paid ads capped at $2,000.'] },
        { heading: 'Action items', lines: ['Priya: final copy by Friday.', 'Tom: book the photographer.'] },
        { heading: 'Open questions', lines: ['Who signs off the privacy page?'] },
      ],
    },
  },
  {
    slug: 'incident-reports',
    name: 'Incident reports',
    headline: 'Incident reports that say what happened, and whether it’s reportable',
    sub: 'Describe the incident in your own words. Kith writes a factual, chronological report and checks it against the NDIS Commission’s reportable incident rules or the aged care SIRS priorities, for a supervisor to decide.',
    seoTitle: 'Incident Report Writing with AI: NDIS, SIRS & WHS | Kith',
    seoDescription: 'Describe what happened and get a factual incident report with injuries, actions, notifications and witnesses, plus an NDIS reportable-incident or SIRS priority check.',
    intro: 'Writing an incident report straight after an incident is hard. With Kith you describe what happened, by voice or typed, and get a clear, blame-free report: date, time and place, a factual timeline, injury or harm, first aid and immediate actions, who was notified and when, witnesses, contributing factors and prevention. Anything you didn’t mention is marked “Not stated” rather than guessed.',
    faq: [
      { q: 'What is a reportable incident under the NDIS?', a: 'Reportable incidents include the death of a person with disability, serious injury, abuse or neglect, unlawful sexual or physical contact or assault, sexual misconduct, and the use of a restrictive practice that is unauthorised or not in line with the behaviour support plan. Most must be notified to the NDIS Commission within 24 hours; an unauthorised restrictive practice where no one was harmed has 5 business days.' },
      { q: 'Does Kith decide whether an incident is reportable?', a: 'No. Kith adds one clear flag (likely reportable, needs assessment, or internal incident only) with the reason and timeframe, so a supervisor can make the decision quickly. A minor injury treated with first aid or a late dose with no harm is not called reportable on that ground.' },
      { q: 'Does it work for aged care SIRS and workplace (WHS) incidents?', a: 'Yes. In aged care it checks Serious Incident Response Scheme priorities (Priority 1 within 24 hours, Priority 2 within 30 days). In other workplaces it flags serious injuries or dangerous incidents that may need to go to the WHS regulator.' },
      { q: 'How does Kith keep reports objective?', a: 'It records what happened in order, uses names and roles instead of labels like “perpetrator”, keeps admissions in the words used, and doesn’t speculate about causes you didn’t give.' },
    ],
    pains: [
      'Writing the report while still shaken up',
      'Not sure whether it has to go to the Commission, or how fast',
      'Reports that blame, guess or leave out who was told',
    ],
    noteTypes: ['NDIS / aged care incident report (reportable-incident and SIRS check)', 'Workplace incident report (WHS)', 'Follow-up and handover notes'],
    example: {
      title: 'Slip in the bathroom',
      input: '“About 7:40 this morning Sam slipped getting out of the shower, landed on his left hip, grazed his elbow on the vanity. Cleaned and dressed the graze, he didn’t hit his head. Rang the GP clinic at 8 and his sister at 8:15. The non-slip mat had been taken out to wash and not put back; it’s back now.”',
      sections: [
        { heading: 'Incident details', lines: ['Date: 21 October 2026 (worker said “this morning”)', 'Time: about 7:40am', 'Location: bathroom', 'Participant / resident: Sam', 'Reported by: Alex'] },
        { heading: 'Injury / harm', lines: ['Graze to left elbow; sore left hip. Did not hit his head.'] },
        { heading: 'Immediate actions & first aid', lines: ['Graze cleaned and dressed.'] },
        { heading: 'Who was notified', lines: ['GP clinic at 8:00am; Sam’s sister at 8:15am.'] },
        { heading: 'Contributing factors (as stated)', lines: ['Non-slip mat removed for washing and not replaced.'] },
        { heading: 'Prevention / follow-up (as stated)', lines: ['Non-slip mat put back.'] },
      ],
      flag: 'Not a serious injury as described, so not reportable on that ground. Supervisor to assess whether the mat not being replaced could amount to neglect.',
    },
  },
];

export const USE_CASE_MAP: Record<string, UseCase> = Object.fromEntries(USE_CASES.map(u => [u.slug, u]));
