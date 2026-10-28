import type { FieldKey } from './fields';

// Public landing pages for Kith Workspace (/ and /for/<slug>). Each use case
// maps to a field, so "Start free" pre-selects that field at onboarding.
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
  field: FieldKey;
  name: string;
  headline: string;
  sub: string;
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
];

export const USE_CASE_MAP: Record<string, UseCase> = Object.fromEntries(USE_CASES.map(u => [u.slug, u]));
