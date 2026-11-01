import type { ExampleNote } from './use-cases';
import type { Faq } from './site';

// Public guides for Kith Workspace (/guides and /guides/<slug>): how-to
// articles that answer what people search before they look for a tool
// ("how to write NDIS progress notes", "what goes in a site diary").
// Rules are stated only where an official source says so, and each source is
// listed on the page. Example notes use the headings the real note types
// produce (lib/workspace/note-types.ts) and made-up people and details.
// Bump `updated` whenever a guide's text changes.

export interface GuideSection {
  heading: string;
  paras?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  after?: string[];             // paragraphs after the bullets / table
}

export interface Guide {
  slug: string;
  useCase: string;              // matching /for/<slug> page
  title: string;                // <h1>
  seoTitle: string;             // <title>, ~60 characters
  seoDescription: string;       // meta description, ~150 characters
  published: string;
  updated: string;
  summary: string;              // short answer under the title
  sections: GuideSection[];
  example: ExampleNote;
  exampleIntro: string;
  faq: Faq[];
  sources: { label: string; url: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-write-ndis-progress-notes',
    useCase: 'ndis',
    title: 'How to write NDIS progress notes (with an example)',
    seoTitle: 'How to Write NDIS Progress Notes (with Examples) | Kith',
    seoDescription: 'What to include in an NDIS progress note, how to keep it objective, the words to avoid, and a worked example of a shift note a team leader can rely on.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'A good NDIS progress note records the shift details, what support you gave, how the participant responded, any progress towards a plan goal you can name, incidents (or a clear “none”) and what the next shift needs to know. Write it soon after the shift, in plain and objective language, and only write what you saw, did and heard.',
    sections: [
      {
        heading: 'Why progress notes matter',
        paras: [
          'A progress note is the record that a support was delivered. Team leaders use it to plan the next shift, behaviour support practitioners and allied health use it to see patterns, and auditors and the NDIA can ask for it as evidence that what was claimed was delivered. Under the NDIS Practice Standards, providers are expected to keep accurate, up-to-date records for each participant and to manage that information securely.',
          'If it isn’t written down, from an audit point of view it didn’t happen. A short, accurate note written on the day is worth more than a long one written from memory a week later.',
        ],
      },
      {
        heading: 'What to include in every note',
        bullets: [
          'Shift details: date, start and finish time, participant, support worker, location (home or the place in the community) and the type of support.',
          'Supports provided: what you did, in order, with the level of help or prompting (for example “one verbal prompt”, “hand over hand”, “independently”).',
          'The participant’s response and wellbeing: what they did and said, their mood as you observed it, and their own words in quotation marks when you remember them exactly.',
          'Goal link: progress towards a goal in the participant’s plan, but only when the support actually related to a goal you can name.',
          'Incidents: describe any incident, or write “no incidents”. Don’t leave this blank.',
          'Concerns or changes: anything new or different, such as a change in appetite, sleep, mood or health.',
          'Handover: what the next worker needs to know or do.',
        ],
      },
      {
        heading: 'Keep it objective',
        paras: [
          'Write what you observed, not your opinion of it. “Refused to get out of bed until 10am and said “I’m too tired”” tells the reader something. “Was lazy” doesn’t, and labels like that can be hurtful when a participant or their family reads the file, which they have the right to do.',
        ],
        table: {
          head: ['Instead of', 'Write'],
          rows: [
            ['Sam was difficult today', 'Sam declined to leave the house twice and said “I don’t want to go”'],
            ['Had a great day', 'Sam smiled and laughed during the pool session and said “that was heaps fun”'],
            ['Behaved badly at the shops', 'Sam raised his voice at the checkout for about two minutes, then settled when we went outside'],
            ['Worked on independence', 'Sam paid for his lunch with his own card, with no prompting'],
          ],
        },
        after: [
          'Use person-first, respectful language and write as though the participant is reading over your shoulder. Keep pain scores, times and amounts exactly as they were (“pain 4/10”), without softening or exaggerating them.',
        ],
      },
      {
        heading: 'Linking to goals without making them up',
        paras: [
          'Goal links are where notes most often go wrong. Paying for lunch is not automatically a “financial independence goal”. Only link a support to a goal that is actually in the participant’s plan or support plan, and say briefly what happened towards it. If the shift didn’t relate to a goal, it is fine to say so.',
        ],
      },
      {
        heading: 'When something goes wrong',
        paras: [
          'If there was an incident, the progress note should say so briefly and the incident goes into your organisation’s incident report as well. Some incidents are reportable to the NDIS Commission, with a 24-hour clock that starts when key personnel become aware. See the guide to NDIS reportable incidents for what counts and the timeframes.',
        ],
      },
      {
        heading: 'Tips for writing notes quickly',
        bullets: [
          'Write the note before you leave, or straight after. Details fade fast.',
          'Follow the same headings every time so nothing gets missed and readers know where to look.',
          'Note times as you go (arrival, meds, outings, incidents).',
          'If you didn’t see it, say who told you (“Mum said he slept badly”).',
          'Read it back once before you sign: would a stranger understand exactly what happened?',
        ],
      },
    ],
    exampleIntro: 'Here is a short spoken note after a community access shift and the progress note Kith writes from it. Anything the worker didn’t say is marked “Not stated” rather than guessed.',
    example: {
      title: 'Community access: library and lunch',
      input: '“Tuesday, picked Mia up at 10, back home at 2. We caught the bus to Blacktown library, she tapped her own Opal card with one reminder, that’s her goal of using public transport on her own. Borrowed two books, said “I want the next one in the series”. Had lunch at the food court. A bit quiet on the bus home, said she was tired. No incidents. Next shift, the library books are due back on the 18th.”',
      sections: [
        { heading: 'Shift details', lines: ['Date: Tuesday (note written 21 October 2026)', 'Shift time: 10am to 2pm', 'Participant: Mia', 'Support worker: Jordan (note author)', 'Location: community: Blacktown library and food court', 'Support type: community access'] },
        { heading: 'Supports provided', lines: ['Travelled with Mia by bus to Blacktown library; 1 reminder to tap her Opal card.', 'Supported Mia to borrow two books and have lunch at the food court.'] },
        { heading: 'Participant’s response & wellbeing', lines: ['Tapped her own Opal card.', 'Said “I want the next one in the series”.', 'Quiet on the bus home; said she was tired.'] },
        { heading: 'Goal link', lines: ['Goal (as stated): using public transport on her own.', 'Tapped her Opal card with 1 reminder.'] },
        { heading: 'Incidents', lines: ['None (worker stated no incidents)'] },
        { heading: 'Handover', lines: ['Library books are due back on the 18th.'] },
      ],
    },
    faq: [
      { q: 'How long should an NDIS progress note be?', a: 'Long enough that someone who wasn’t there understands what support was given and how the participant went. For a routine shift that is often a short paragraph under each heading. Length matters less than accuracy and the required details being present.' },
      { q: 'Can I use abbreviations in progress notes?', a: 'Keep them to ones your organisation has agreed on. Participants, families, auditors and other providers may read the note, so plain words are safer.' },
      { q: 'Should progress notes be written in first or third person?', a: 'Either is common; follow your organisation’s policy. What matters is that it is clear who did what, so name the participant and the worker in the shift details.' },
      { q: 'Can I write progress notes with AI?', a: 'Yes, as long as the note is accurate, you check it before signing, and your organisation’s privacy rules allow the tool. Kith writes only what you said, marks missing details as “Not stated”, and never invents goals, times or incidents.' },
    ],
    sources: [
      { label: 'NDIS Commission: NDIS Practice Standards and Quality Indicators', url: 'https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf' },
      { label: 'NDIS Commission: Reportable incidents', url: 'https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents' },
    ],
  },
  {
    slug: 'ndis-reportable-incidents',
    useCase: 'incident-reports',
    title: 'NDIS reportable incidents: what to report and when',
    seoTitle: 'NDIS Reportable Incidents: 24 Hours vs 5 Business Days | Kith',
    seoDescription: 'Which incidents must be reported to the NDIS Commission, when the 24-hour and 5-business-day timeframes apply, and how to write the incident report.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'Registered NDIS providers must notify the NDIS Commission of reportable incidents: the death of a person with disability, serious injury, abuse or neglect, unlawful sexual or physical contact or assault, sexual misconduct, and the unauthorised use of a restrictive practice. Most must be notified within 24 hours of key personnel becoming aware. An unauthorised restrictive practice that caused no harm is reported within 5 business days.',
    sections: [
      {
        heading: 'What counts as a reportable incident',
        paras: ['A reportable incident is one of the following that happened, or is alleged to have happened, in connection with NDIS supports or services:'],
        bullets: [
          'The death of a person with disability.',
          'Serious injury of a person with disability (for example a fracture, burns, deep cuts, extensive bruising, concussion, or an injury needing hospital treatment).',
          'Abuse or neglect of a person with disability.',
          'Unlawful sexual or physical contact with, or assault of, a person with disability.',
          'Sexual misconduct committed against, or in the presence of, a person with disability, including grooming.',
          'The use of a restrictive practice in relation to a person with disability, other than where it is authorised (however described) under state or territory law and used in line with their behaviour support plan.',
        ],
        after: ['Allegations count too. You don’t need to be sure something happened before it is reported: the provider’s job is to report and then investigate.'],
      },
      {
        heading: 'Timeframes: 24 hours vs 5 business days',
        table: {
          head: ['Incident', 'Notify the NDIS Commission'],
          rows: [
            ['Death, serious injury, abuse or neglect, unlawful sexual or physical contact or assault, sexual misconduct', 'Within 24 hours of key personnel becoming aware, followed by more detail within 5 business days'],
            ['Unauthorised restrictive practice where a person with disability was harmed', 'Within 24 hours'],
            ['Unauthorised restrictive practice with no harm', 'Within 5 business days'],
          ],
        },
        after: [
          'The clock starts when the provider’s key personnel become aware of the incident, not when the worker finishes the paperwork, so tell your supervisor straight away. The Commission may also ask for a final report.',
          'Since 12 October 2026, incidents are notified through the new NDIS Commission Portal, and an unauthorised restrictive practice with no harm needs only the 5-day form. Always check the Commission’s current guidance, because forms and processes change.',
        ],
      },
      {
        heading: 'What makes a restrictive practice “unauthorised”',
        paras: ['Restrictive practices include seclusion and chemical, mechanical, physical and environmental restraint. A practice is unauthorised when it isn’t in the person’s behaviour support plan, hasn’t been authorised under the state or territory process, or is used differently from the plan. A PRN medication given to manage behaviour outside those conditions is chemical restraint.'],
      },
      {
        heading: 'What is usually not reportable',
        paras: [
          'A minor injury treated with first aid, such as a graze or a small bruise, is not a serious injury. A late or missed dose with no effect on the person is generally an internal incident. These still go in your incident register and should be reviewed, and a pattern of them, or a failure of care behind them, could amount to neglect. When unsure, escalate: the supervisor or incident manager decides.',
        ],
      },
      {
        heading: 'How to write the incident report',
        bullets: [
          'Write it as soon as you are safe and any immediate needs are dealt with.',
          'Record the date, time and exact place, who was involved and who saw it.',
          'Describe what happened in order, using what you saw and heard. Quote what people said.',
          'Describe injuries exactly (site, size, pain score, whether they hit their head).',
          'Record first aid and immediate actions, and who was notified, when, and what they advised.',
          'Only record causes and prevention steps that are known. Don’t guess motives and don’t use labels like “perpetrator” or “victim”: use names or roles.',
        ],
      },
    ],
    exampleIntro: 'A worker describes an incident in their own words. Kith writes the incident record and adds one flag with its reportable-incident assessment, for the supervisor to decide.',
    example: {
      title: 'Restraint during community outing',
      input: '“About 3:15 this afternoon at Westfield, Liam ran towards the road. I held both his wrists for maybe a minute until he calmed down. Holding isn’t in his behaviour support plan. No one was hurt, no marks on his wrists. Told Priya the team leader at 3:40.”',
      sections: [
        { heading: 'Incident details', lines: ['Date: 21 October 2026 (worker said “this afternoon”)', 'Time: about 3:15pm', 'Location: Westfield (outside, near the road)', 'Participant / resident: Liam', 'Reported by: support worker (note author)'] },
        { heading: 'What happened', lines: ['Liam ran towards the road.', 'The worker held both of Liam’s wrists for about one minute until he calmed down.'] },
        { heading: 'Injury / harm', lines: ['No injury or harm observed; no marks on Liam’s wrists. No one else hurt.'] },
        { heading: 'People involved & witnesses', lines: ['Liam (participant); support worker.', 'Witnesses: not stated'] },
        { heading: 'Who was notified', lines: ['Priya (team leader) at 3:40pm.'] },
        { heading: 'Contributing factors (as stated)', lines: ['Not stated'] },
        { heading: 'Prevention / follow-up (as stated)', lines: ['Not stated'] },
      ],
      flag: 'Likely reportable incident: physical restraint not in Liam’s behaviour support plan. No one was harmed, so NDIS Commission notification is due within 5 business days; supervisor to confirm.',
    },
    faq: [
      { q: 'Who has to report incidents to the NDIS Commission?', a: 'Registered NDIS providers must notify the Commission of reportable incidents. Workers must tell their provider straight away, following its incident management procedure. Anyone can also make a complaint to the Commission.' },
      { q: 'When does the 24-hour clock start?', a: 'When the provider’s key personnel become aware of the incident. That is why workers should tell a supervisor immediately rather than waiting until the report is written.' },
      { q: 'Do I report a fall with only a graze?', a: 'A graze or minor bruise treated with first aid is not a serious injury, so it isn’t reportable on that ground. Record it in the incident register. If the fall happened because of a failure of care, the supervisor should consider whether it could be neglect.' },
      { q: 'What if I’m not sure whether it’s reportable?', a: 'Report it to your supervisor or incident manager with the facts. Deciding is their job, and it is better to assess an incident that turns out not to be reportable than to miss one.' },
    ],
    sources: [
      { label: 'NDIS Commission: Reportable incidents', url: 'https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents' },
      { label: 'NDIS Commission: Rules for implementing providers (restrictive practices)', url: 'https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices/rules-implementing-providers' },
      { label: 'NDIS (Incident Management and Reportable Incidents) Rules 2018', url: 'https://www.legislation.gov.au/F2018L00633/latest/text' },
    ],
  },
  {
    slug: 'aged-care-progress-notes',
    useCase: 'aged-care',
    title: 'Aged care progress notes: what to include',
    seoTitle: 'Aged Care Progress Notes: What to Include (+ Example) | Kith',
    seoDescription: 'What to write in aged care and Support at Home progress notes, objective wording, when to escalate, how SIRS fits in, and a worked example of a care note.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'An aged care progress note records the care you gave, how the older person was, food and fluids, continence, mobility and skin, and any contact with family or other services, plus anything that has changed. Write it objectively, soon after the visit or shift, and pass changes and concerns on to the RN or coordinator straight away rather than leaving them in the note.',
    sections: [
      {
        heading: 'Why progress notes matter in aged care',
        paras: [
          'Progress notes are how the care team knows what happened between visits and shifts. The strengthened Aged Care Quality Standards, in force since 1 November 2025 under the Aged Care Act 2024, expect providers to plan care around each person, notice and respond to changes, and share the right information with the people who need it. Clear progress notes are a big part of how that is done and shown.',
        ],
      },
      {
        heading: 'What to include',
        bullets: [
          'Care provided: personal care, medication support as per your role, meals, outings, appointments.',
          'Wellbeing and behaviour: mood, what the person said, how they engaged, sleep.',
          'Food, fluids and continence: how much was eaten and drunk, any change, continence care.',
          'Mobility and skin: walking aids used, falls or near misses, redness, wounds, pressure areas.',
          'Family and visitor contact: who visited or was contacted, and what was passed on.',
          'Changes and concerns: anything different from usual, and who you told.',
        ],
      },
      {
        heading: 'Write what you saw, not what you assume',
        table: {
          head: ['Instead of', 'Write'],
          rows: [
            ['Margaret was confused', 'Margaret asked twice where her husband was and said it was 1975'],
            ['Ate well', 'Ate all of her lunch and drank two cups of tea'],
            ['Aggressive during shower', 'Pushed my hand away and said “stop it” when I washed her hair; finished the shower without washing her hair'],
            ['Skin OK', 'No redness or broken skin seen on heels, hips or sacrum'],
          ],
        },
        after: ['Use the person’s name, keep their own words in quotation marks, and record amounts and times exactly. A note should be respectful enough that the older person or their supporters could read it.'],
      },
      {
        heading: 'Changes you should escalate, not just document',
        paras: ['Some things need to reach the RN, coordinator or family the same day, in person or by phone, as well as being written down:'],
        bullets: [
          'A fall, or a new injury, bruise, skin tear or pressure area.',
          'Eating or drinking much less than usual, or signs of dehydration.',
          'A sudden change in confusion, mobility, breathing or alertness.',
          'Refused, missed or wrong medication.',
          'Anything that suggests abuse, neglect or the person being unsafe.',
        ],
      },
      {
        heading: 'Where SIRS fits in',
        paras: [
          'Serious incidents involving older people receiving aged care, including in their own home under Support at Home, are reported to the Aged Care Quality and Safety Commission under the Serious Incident Response Scheme (SIRS). Priority 1 incidents, such as those causing harm that needs medical or psychological treatment, an unexpected death, an unexplained absence, or ones that should be reported to police, are reported within 24 hours of the provider becoming aware. Priority 2 incidents are reported within 30 days. Your provider decides and lodges the report, so tell your RN or manager straight away and write the incident up in an incident report as well as the progress note.',
        ],
      },
    ],
    exampleIntro: 'A home care worker records a one-minute voice note after a visit. Kith writes the care note and flags the skin change for the coordinator.',
    example: {
      title: 'Home visit: afternoon support',
      input: '“Afternoon visit with Joan, two till three. Helped her change and made a cuppa and a sandwich, she ate about half. Said her hip was sore, about 3 out of 10, she’s taken her Panadol already she said. Noticed a bruise on her right forearm about the size of a 50 cent coin, she doesn’t know how she got it. Rang the coordinator, Lisa, at 3:10.”',
      sections: [
        { heading: 'Care provided', lines: ['Visit 2pm to 3pm.', 'Assisted Joan to change; made her a cup of tea and a sandwich.'] },
        { heading: 'Wellbeing & behaviour', lines: ['Joan said her hip was sore (3/10) and that she had already taken her Panadol.'] },
        { heading: 'Food, fluids & continence', lines: ['Ate about half of her sandwich; one cup of tea.'] },
        { heading: 'Mobility & skin', lines: ['Bruise on right forearm, about the size of a 50 cent coin. Joan does not know how it happened.'] },
        { heading: 'Family / visitor contact', lines: ['Worker rang Lisa (coordinator) at 3:10pm about the bruise.'] },
      ],
      flag: 'Skin integrity: unexplained bruise on right forearm. Coordinator told at 3:10pm.',
    },
    faq: [
      { q: 'How often should aged care progress notes be written?', a: 'Follow your provider’s policy. In home care it is usually after every visit; in residential care, every shift and whenever something changes.' },
      { q: 'Do Support at Home workers need to write progress notes?', a: 'Providers need records of the services delivered and of any changes they notice, and most require a note after each visit. Check your provider’s requirements.' },
      { q: 'What is the difference between a progress note and an incident report?', a: 'A progress note records routine care and how the person was. An incident report records a specific event, such as a fall or an allegation of harm, in detail so it can be assessed, including under SIRS. A serious event usually needs both.' },
      { q: 'Can I record a voice note instead of typing?', a: 'With Kith, yes: speak for a minute and it writes the care note under these headings for you to check. Notes are stored in Sydney and encrypted, and recordings are deleted after transcription.' },
    ],
    sources: [
      { label: 'Aged Care Quality and Safety Commission: Serious Incident Response Scheme', url: 'https://www.agedcarequality.gov.au/providers/serious-incident-response-scheme' },
      { label: 'Aged Care Quality and Safety Commission: Reportable incidents and SIRS, changes from 1 November 2025', url: 'https://www.agedcarequality.gov.au/resource-library/reportable-incidents-and-sirs-quick-guide-changes-1-nov-2025' },
      { label: 'Aged Care Quality and Safety Commission: Strengthened Quality Standards', url: 'https://www.agedcarequality.gov.au/providers/quality-standards/strengthened-aged-care-quality-standards' },
    ],
  },
  {
    slug: 'daily-site-diary',
    useCase: 'construction',
    title: 'Daily site diary: what to record',
    seoTitle: 'Daily Site Diary: What to Record (with Example) | Kith',
    seoDescription: 'What to write in a construction site diary every day: weather, labour, works, deliveries, delays, variations, visitors and safety, with a worked example.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'A daily site diary records, for every working day, the weather and site conditions, who was on site, what work was done, deliveries and plant, delays and variations with their cause, visitors and inspections, and safety matters. Write it on the day, keep it factual, and it becomes your best evidence for extension of time claims, variations and disputes.',
    sections: [
      {
        heading: 'Why keep a site diary',
        paras: [
          'Most building contracts don’t make a site diary optional in practice: when a delay, variation or defect is disputed months later, the party with clear records made at the time is usually in the stronger position. A diary also shows who was on site and what safety issues were raised and dealt with, which supports your work health and safety duties.',
        ],
      },
      {
        heading: 'What to record every day',
        bullets: [
          'Date, site and the person writing the diary.',
          'Weather and conditions: rain, wind, heat, and whether work stopped (with times).',
          'Labour and trades on site: companies and head counts.',
          'Works completed: what was done and where (level, unit, grid line).',
          'Deliveries and plant: what arrived, what was missing or damaged, plant on and off hire.',
          'Delays and variations: what happened, the cause, who instructed it, and the likely impact.',
          'Visitors and inspections: certifiers, inspectors, clients, consultants.',
          'Safety: hazards found, incidents and near misses, toolbox talks held, and what was done about them.',
        ],
      },
      {
        heading: 'Writing entries that hold up later',
        bullets: [
          'Write it the same day. Notes made at the time carry more weight than ones written up later.',
          'Be specific: “Rain from 11am, pour postponed to Thursday” beats “wet day”.',
          'Record instructions with who gave them and when, especially anything that may be a variation.',
          'Stick to facts. Don’t blame or speculate in the diary; record what happened and who was told.',
          'Back it up with photos and keep the diary somewhere the office can see it.',
        ],
      },
      {
        heading: 'Safety incidents and the regulator',
        paras: [
          'Under the model Work Health and Safety laws, a death, a serious injury or illness, or a dangerous incident is a notifiable incident. The person conducting the business or undertaking must notify the WHS regulator in their state or territory immediately, by the fastest possible means, and preserve the site until an inspector arrives or directs otherwise. A record of each notifiable incident must be kept for at least 5 years. The site diary should note the incident and who was told, alongside the formal incident report.',
        ],
      },
    ],
    exampleIntro: 'A site supervisor talks through the day at knock-off. Kith writes the site diary with each section and flags the safety issue.',
    example: {
      title: 'Site diary: Harris Park townhouses',
      input: '“Fine in the morning, rain from about 1, stopped the roofers at 1:30. Six from Coastline Framing, two roofers, one sparky. Frame finished on townhouse 3, roofers got half the sarking on townhouse 2. Truss delivery for townhouse 4 didn’t turn up, supplier says Friday. Certifier came at 10 for the frame inspection on townhouse 1, passed. Scaffold tie missing on the east side of townhouse 2, told the scaffolder, he’s fixing it first thing.”',
      sections: [
        { heading: 'Weather & conditions', lines: ['Fine in the morning; rain from about 1pm.', 'Roofers stopped at 1:30pm because of rain.'] },
        { heading: 'Labour & trades on site', lines: ['Coastline Framing: 6', 'Roofers: 2', 'Electrician: 1'] },
        { heading: 'Works completed', lines: ['Townhouse 3: frame complete.', 'Townhouse 2: about half of the sarking installed.'] },
        { heading: 'Deliveries & plant', lines: ['Townhouse 4 truss delivery did not arrive; supplier says Friday.'] },
        { heading: 'Delays & variations', lines: ['Roofing stopped at 1:30pm (rain).', 'Townhouse 4 trusses delayed to Friday (supplier).'] },
        { heading: 'Visitors', lines: ['Certifier at 10am: frame inspection, townhouse 1, passed.'] },
      ],
      flag: 'Safety: scaffold tie missing on the east side of townhouse 2. Scaffolder told; fixing first thing tomorrow.',
    },
    faq: [
      { q: 'Is a site diary a legal requirement in Australia?', a: 'There is no single law requiring every builder to keep one, but many contracts, principals and head contractors require daily records, and a diary is often the key evidence in delay and variation claims. Check your contract.' },
      { q: 'How long should I keep site diaries?', a: 'At least as long as claims about the work could be made, which for building work can be many years. Follow your company’s records policy, and keep notifiable incident records for at least 5 years under WHS law.' },
      { q: 'Should the site diary include photos?', a: 'Photos are good supporting evidence. Note in the diary what each set of photos shows and where they are stored.' },
      { q: 'Can I do the site diary by voice?', a: 'Yes. With Kith you talk through the day on your phone and it writes the diary under these headings, with hazards flagged, ready for you to check.' },
    ],
    sources: [
      { label: 'Safe Work Australia: Incident notification', url: 'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/incident-reporting' },
      { label: 'Safe Work Australia: Construction incident reporting duties', url: 'https://www.safeworkaustralia.gov.au/duties-tool/construction/duties-information/incident-reporting' },
    ],
  },
  {
    slug: 'restaurant-shift-handover',
    useCase: 'hospitality',
    title: 'Shift handover template for restaurants and cafés',
    seoTitle: 'Restaurant & Café Shift Handover Template (Free) | Kith',
    seoDescription: 'A simple shift handover template for restaurants, cafés and bars: trading, staffing, stock, equipment, food safety, customer feedback and tasks for the next shift.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'A good shift handover tells the next manager how the shift traded, who worked, what stock or supplier issues came up, what equipment needs attention, any food-safety problems and what was done about them, customer feedback, and a clear list of what the next shift needs to do. Use the same headings every time so nothing gets lost in the group chat.',
    sections: [
      {
        heading: 'Why handovers go wrong',
        paras: [
          'Most handover problems come from the same place: the closing manager is tired, the message goes into a busy group chat, and the opening manager finds out about the broken dishwasher at 7am. A short handover in a fixed format fixes most of this.',
        ],
      },
      {
        heading: 'Shift handover template',
        bullets: [
          'Trading summary: covers or sales, how busy it was, anything unusual.',
          'Staffing: who worked, no-shows, early finishes, staff issues to follow up.',
          'Stock and suppliers: what ran out or is low, deliveries missing or wrong, orders placed.',
          'Equipment and maintenance: anything broken or playing up, and whether a technician was called.',
          'Food safety: temperature readings out of range, cleaning not done, allergen issues, pests, and what was done about each.',
          'Customer feedback: complaints, compliments, refunds, bookings to know about.',
          'For next shift: the specific jobs the next manager needs to do, with times if they matter.',
        ],
        after: ['Copy these headings into your handover book or app, or record a one-minute voice note at close and let Kith write it in this format.'],
      },
      {
        heading: 'Food safety in the handover',
        paras: [
          'Potentially hazardous food needs to be kept at 5°C or below, or 60°C or above. If a fridge, cool room or bain-marie is out of range, the handover should say what the reading was, when it was taken and what was done with the food, so the next shift can follow up.',
          'Under Food Standards Code Standard 3.2.2A, in force since 8 December 2023, most food service businesses that handle unpackaged, potentially hazardous food must have a certified food safety supervisor and trained food handlers. Category 1 businesses, such as restaurants and cafés that make food from raw ingredients, must also keep records showing key food-safety controls, including temperatures, are being managed, and keep those records for at least 3 months. A handover can point to those records, but it doesn’t replace your food-safety log.',
        ],
      },
      {
        heading: 'Tips',
        bullets: [
          'Do the handover before you leave, not at home later.',
          'Put tasks at the end, one per line, so they read like a checklist.',
          'Say what you already did, so the next shift doesn’t repeat it.',
          'Keep it to the facts; personal staff issues go to the owner or manager privately.',
        ],
      },
    ],
    exampleIntro: 'A closing manager records a quick voice note. Kith writes the handover and flags the food-safety issue.',
    example: {
      title: 'Saturday close handover',
      input: '“Big Saturday, about 210 covers, sold out of the lamb by 8. Jess called in sick so we were one down on the floor. Bain-marie was only reading 55 at 2pm, threw out the soup and reheated a new batch. Dishwasher is leaking again. Table of six complained about the wait, gave them free desserts. Next shift: order more lamb and call the dishwasher guy Monday.”',
      sections: [
        { heading: 'Trading summary', lines: ['Busy Saturday: about 210 covers.', 'Lamb sold out by 8pm.'] },
        { heading: 'Staffing', lines: ['Jess called in sick; one short on the floor.'] },
        { heading: 'Equipment & maintenance', lines: ['Bain-marie reading 55°C at 2pm; soup thrown out and a new batch reheated.', 'Dishwasher leaking again.'] },
        { heading: 'Customer feedback', lines: ['Table of six complained about the wait; given free desserts.'] },
        { heading: 'For next shift', lines: ['Order more lamb.', 'Call the dishwasher technician on Monday.'] },
      ],
      flag: 'Food safety: bain-marie at 55°C at 2pm (below 60°C). Soup discarded and a new batch reheated.',
    },
    faq: [
      { q: 'What should a shift handover include?', a: 'Trading, staffing, stock and suppliers, equipment, food-safety issues and what was done, customer feedback, and a clear list of tasks for the next shift.' },
      { q: 'Is a shift handover a legal requirement?', a: 'Not in itself. But food-safety records are required for Category 1 businesses under Standard 3.2.2A, and a handover is a good way to make sure problems are passed on and followed up.' },
      { q: 'How long should a handover take?', a: 'A minute or two. If it takes longer, it probably has things in it that belong in a separate report.' },
      { q: 'Can the next manager see it without an account?', a: 'With Kith you can copy, print or share the finished handover however your team already works, such as email or your group chat.' },
    ],
    sources: [
      { label: 'Food Standards Australia New Zealand: Food safety management tools (Standard 3.2.2A)', url: 'https://www.foodstandards.gov.au/business/food-safety/standard-322a-food-safety-management-tools' },
      { label: 'Food Standards Australia New Zealand: Keeping food at the right temperature', url: 'https://www.foodstandards.gov.au/business/food-safety/keeping-food-at-the-right-temperature' },
    ],
  },
  {
    slug: 'how-to-write-meeting-minutes',
    useCase: 'meetings',
    title: 'How to write meeting minutes',
    seoTitle: 'How to Write Meeting Minutes (with Example and Template) | Kith',
    seoDescription: 'How to take meeting minutes people actually use: what to record, how to write decisions and action items with owners and dates, and a worked example.',
    published: '2026-11-01',
    updated: '2026-11-01',
    summary: 'Good minutes record who attended, what was discussed under each agenda item, the decisions made, and the action items with an owner and a due date. They are a short, accurate summary, not a transcript. Send them within a day or two while people still remember the meeting.',
    sections: [
      {
        heading: 'What to record',
        bullets: [
          'Meeting details: name, date, time, place or platform.',
          'Attendees and apologies, with roles where useful, and who chaired.',
          'Agenda items: a short summary of what was discussed and the main points raised.',
          'Decisions: what was agreed, in a sentence each. If there were votes, the outcome (and movers and seconders, if your organisation records them).',
          'Action items: the task, the owner and the due date.',
          'Open questions and items carried over to the next meeting.',
        ],
      },
      {
        heading: 'Decisions and actions are the point',
        paras: [
          'Most people only read minutes to find out what was decided and what they have to do. Put decisions and action items where they are easy to find, and make each action specific: “Priya to send the final copy to Tom by Friday 14 November” works; “copy to be finalised” doesn’t, because nobody owns it.',
          'If no owner or date was agreed, say so and raise it, rather than filling one in yourself.',
        ],
      },
      {
        heading: 'Summarise, don’t transcribe',
        paras: [
          'Minutes should capture the substance, not every word. Record what was said under each item and who raised it where that matters, and leave out side conversations. Be neutral: record views as views (“Tom raised concerns about the budget”), not as the minute-taker’s opinion.',
        ],
      },
      {
        heading: 'Company and committee meetings',
        paras: [
          'Some meetings have formal rules. Under section 251A of the Corporations Act 2001, companies must record minutes of meetings of members and directors in their minute books within one month, and have them signed within a reasonable time. Associations, owners corporations and committees usually have rules about minutes in their constitution or by-laws. For those meetings, check the rules first.',
        ],
      },
      {
        heading: 'Recording meetings',
        paras: [
          'Recording a meeting makes accurate minutes much easier, but tell everyone and get their agreement first: recording laws differ between states and territories, and recording people without consent can be unlawful.',
        ],
      },
    ],
    exampleIntro: 'A 30-minute meeting is recorded in the room on a phone. Kith writes the minutes, keeping decisions and action items separate from the discussion.',
    example: {
      title: 'Clinic fit-out progress meeting',
      input: 'A 30-minute meeting recorded in the room, with the practice manager, the builder and the IT contractor.',
      sections: [
        { heading: 'Attendees', lines: ['Anna (practice manager), Dave (builder), Raj (IT contractor)'] },
        { heading: 'Agenda items discussed', lines: ['Fit-out progress: Dave reported the consult rooms are painted and flooring starts Monday.', 'IT cabling: Raj raised that the data points in room 3 are in the wrong place.'] },
        { heading: 'Decisions', lines: ['Move the room 3 data points to the north wall.', 'Opening date stays 1 December.'] },
        { heading: 'Action items', lines: ['Dave: quote for moving the data points, by Wednesday.', 'Anna: confirm the furniture delivery date.'] },
        { heading: 'Risks & issues', lines: ['Flooring supplier has not confirmed the delivery date.'] },
      ],
    },
    faq: [
      { q: 'Who should take the minutes?', a: 'Someone who isn’t running the meeting, so they can concentrate. Or record it and have the minutes written for you, then have someone check them.' },
      { q: 'How soon should minutes be sent?', a: 'Within a day or two, while people remember the meeting and before the first action items are due.' },
      { q: 'Should minutes name who said what?', a: 'Only where it matters, for example who raised a concern or who agreed to a task. Most discussion can be summarised without names.' },
      { q: 'Can AI write meeting minutes?', a: 'Yes. Kith records in the room or from Teams, Meet or Zoom in your browser, with no bot joining the call, and writes the minutes with decisions and action items. If an owner or date wasn’t clear, it leaves it blank rather than guessing.' },
    ],
    sources: [
      { label: 'Corporations Act 2001 (Cth), section 251A', url: 'https://www.legislation.gov.au/C2004A00818/latest/text' },
    ],
  },
];

export const GUIDE_MAP: Record<string, Guide> = Object.fromEntries(GUIDES.map(g => [g.slug, g]));

export const guidesFor = (useCase: string) => GUIDES.filter(g => g.useCase === useCase);
