import type { Guide } from './guides';

// Second batch of public guides (added 2026-11-07), aimed at the long-tail
// searches Search Console showed work.kith.space getting impressions for
// ("ndis progress notes software", "activities of daily living progress
// notes") and their neighbours: examples/templates, ADLs, ABC charts, aged
// care SIRS, workplace incident reports, toolbox talks and AI for notes.
// Same rules as guides.ts: rules only where an official source says so,
// sources listed, made-up people and details, real note-type headings.

const D = '2026-11-07';

export const MORE_GUIDES: Guide[] = [
  {
    slug: 'ndis-progress-notes-examples',
    useCase: 'ndis',
    title: 'NDIS progress notes examples (and a free template)',
    seoTitle: 'NDIS Progress Notes Examples + Free Template (2026) | Kith',
    seoDescription: 'Five real-world NDIS progress note examples (personal care, community access, SIL sleepover, declined support, behaviour) and a copy-and-paste template.',
    published: D,
    updated: D,
    summary: 'Every good NDIS progress note answers the same questions: when and where was the shift, what support did you give, how did the participant respond, did it relate to a plan goal, were there any incidents, and what does the next worker need to know. Below are five short examples for common shifts and a template you can copy.',
    sections: [
      {
        heading: 'Copy-and-paste NDIS progress note template',
        bullets: [
          'Shift details: date, start and finish time, participant, support worker, location, support type.',
          'Supports provided: what you did, in order, with the level of prompting or help.',
          'Participant’s response & wellbeing: what they did and said, mood as observed, their own words in quotes.',
          'Goal link: the plan goal the support related to, and what happened towards it (or “not applicable this shift”).',
          'Incidents: describe, or write “No incidents”.',
          'Concerns / changes noticed: health, mood, sleep, appetite, equipment, home environment.',
          'Handover: what the next worker needs to know or do.',
        ],
        after: ['Use the same headings every shift. Readers learn where to look, and gaps stand out before an audit does.'],
      },
      {
        heading: 'Example 1: morning personal care',
        paras: [
          'Shift details: 12 November, 7am to 9am, participant Ravi, support worker Hannah, Ravi’s home, personal care.',
          'Supports provided: Supported Ravi to shower using the shower chair; he washed his upper body independently and Hannah washed his back and legs. Ravi chose his clothes and dressed with help with buttons. Prompted Ravi to take his 8am medication from the Webster pack; he took it with water.',
          'Response & wellbeing: Ravi was chatty and said “I slept heaps better”. Ate two pieces of toast and a coffee.',
          'Goal link: Dressing independently: did everything except buttons, with one verbal prompt.',
          'Incidents: No incidents. Handover: Shower chair leg is loose; reported to the team leader.',
        ],
      },
      {
        heading: 'Example 2: community access',
        paras: [
          'Shift details: 12 November, 10am to 1pm, participant Chloe, support worker Ben, Penrith shops, community access.',
          'Supports provided: Drove Chloe to Penrith. Chloe used her shopping list to buy groceries; Ben prompted her twice to check prices. Chloe paid using her own card.',
          'Response & wellbeing: Chloe was smiling and said “I found everything on my list”. She covered her ears in the busy food court and asked to eat outside, which we did.',
          'Goal link: Shopping independently: completed the list with two prompts (last week: four prompts).',
          'Incidents: No incidents. Handover: Chloe prefers to avoid the food court at lunchtime.',
        ],
      },
      {
        heading: 'Example 3: SIL sleepover shift',
        paras: [
          'Shift details: 12–13 November, 10pm to 6am sleepover, participants Tom and Jai, support worker Leila, SIL house in Blacktown.',
          'Supports provided: Supported both residents with their evening routine. Tom woke at 2:10am and asked for water; Leila brought water and he returned to bed at 2:20am. Jai slept through.',
          'Response & wellbeing: Tom said he had a “bad dream” and settled after talking for a few minutes.',
          'Goal link: Not applicable this shift. Incidents: No incidents.',
          'Handover: Tom woke once overnight. Bread and milk running low.',
        ],
      },
      {
        heading: 'Example 4: participant declined support',
        paras: [
          'Shift details: 12 November, 3pm to 5pm, participant Grace, support worker Ana, Grace’s home, domestic assistance and meal preparation.',
          'Supports provided: Offered to cook dinner together as planned. Grace declined and said “I’m not hungry, I’ll have something later”. Ana offered again at 4:30pm; Grace declined. Ana cleaned the kitchen and left a sandwich in the fridge with Grace’s agreement.',
          'Response & wellbeing: Grace stayed in her room watching TV and said she felt “a bit flat”.',
          'Goal link: Cooking skills: not worked on; Grace declined. Incidents: No incidents.',
          'Concerns: Third shift this week Grace has declined a meal. Handover: Check whether Grace ate the sandwich; team leader informed of reduced appetite.',
        ],
        after: ['A declined support is still a note. Record what was offered, what the person said, and what you did instead: it shows choice and control were respected and gives the team leader a pattern to act on.'],
      },
      {
        heading: 'Example 5: behaviour of concern',
        paras: [
          'Shift details: 12 November, 1pm to 5pm, participant Noah, support worker Sione, Noah’s home, in-home support.',
          'Supports provided: At about 3pm the TV remote batteries went flat during Noah’s show. Noah shouted and threw the remote at the wall for about 30 seconds. Sione used the strategy in Noah’s behaviour support plan (calm voice, offered his headphones and the iPad). Noah settled within five minutes.',
          'Response & wellbeing: After settling Noah said “sorry, I was angry”. He was calm for the rest of the shift.',
          'Incidents: Behaviour as above; no one was hurt; no damage except a small mark on the wall. Logged in the incident register and an ABC chart completed. No restrictive practice used.',
          'Handover: Spare AA batteries are needed.',
        ],
        after: ['When a behaviour of concern happens, the progress note says what happened briefly and objectively, and the detail goes on the ABC chart and incident register. See the ABC chart guide for how to record it.'],
      },
      {
        heading: 'Phrases that make notes stronger',
        table: {
          head: ['Vague', 'Specific'],
          rows: [
            ['Helped with shower', 'Supported to shower using the shower chair; washed upper body independently'],
            ['Was upset', 'Cried for about five minutes and said “I miss Mum”'],
            ['Good day', 'Laughed during the game and asked to play again next week'],
            ['Took meds', 'Took 8am Webster pack medication with one verbal prompt'],
          ],
        },
      },
    ],
    exampleIntro: 'This is what Kith writes from a 40-second voice note after a personal care shift. The worker didn’t mention a goal, so the goal link is marked rather than invented.',
    example: {
      title: 'Morning personal care',
      input: '“Morning shift with Ravi, 7 till 9. Helped him shower with the chair, he did his top half himself. Dressed himself except buttons. Took his 8 o’clock meds from the Webster pack with a reminder. Said he slept heaps better. Shower chair leg’s loose, told Priya.”',
      sections: [
        { heading: 'Shift details', lines: ['Date: 12 November 2026', 'Shift time: 7am to 9am', 'Participant: Ravi', 'Support worker: note author', 'Location: Not stated', 'Support type: personal care'] },
        { heading: 'Supports provided', lines: ['Supported Ravi to shower using the shower chair; Ravi washed his upper body himself.', 'Ravi dressed himself; help given with buttons.', '8am Webster pack medication taken with 1 reminder.'] },
        { heading: 'Participant’s response & wellbeing', lines: ['Said he “slept heaps better”.'] },
        { heading: 'Goal link', lines: ['Not stated'] },
        { heading: 'Incidents', lines: ['None reported by the worker: confirm before signing'] },
        { heading: 'Handover', lines: ['Shower chair leg is loose; Priya informed.'] },
      ],
    },
    faq: [
      { q: 'Is there an official NDIS progress note template?', a: 'No. The NDIS Commission expects accurate, up-to-date records for each participant but doesn’t prescribe a template. Most providers use headings like the ones above; follow your organisation’s format if it has one.' },
      { q: 'What should I write if nothing happened on the shift?', a: 'Something always happens: write what support you gave and how the participant was. “Routine shift, no incidents, no concerns” is fine as a line, but not as the whole note.' },
      { q: 'How soon after a shift should I write the note?', a: 'Before you leave or as soon as possible after. Notes written days later are less accurate and carry less weight in an audit or investigation.' },
      { q: 'Can I reuse a previous note and change the date?', a: 'No. Copy-paste notes are a common audit finding and can look like the support wasn’t delivered as described. Every note should describe that shift.' },
    ],
    sources: [
      { label: 'NDIS Commission: NDIS Practice Standards and Quality Indicators', url: 'https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf' },
      { label: 'NDIS Commission: Behaviour support and restrictive practices', url: 'https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices' },
    ],
  },
  {
    slug: 'activities-of-daily-living-progress-notes',
    useCase: 'aged-care',
    title: 'Activities of daily living (ADL) progress notes: how to write them',
    seoTitle: 'Activities of Daily Living (ADL) Progress Notes + Examples | Kith',
    seoDescription: 'How to document activities of daily living in progress notes: the ADLs and IADLs, levels of assistance, objective wording and worked examples for aged care and NDIS.',
    published: D,
    updated: D,
    summary: 'An ADL progress note records which everyday activities the person did, how much help they needed for each (independent, supervision, prompting, physical assistance or full assistance), and anything that changed. The level of assistance is the most important detail: it is what shows improvement, decline and whether the care plan still fits.',
    sections: [
      {
        heading: 'What counts as an activity of daily living',
        paras: ['ADLs are the basic self-care tasks. Instrumental ADLs (IADLs) are the tasks needed to live independently at home. Care plans and assessments usually cover both.'],
        table: {
          head: ['ADLs (personal care)', 'IADLs (living at home)'],
          rows: [
            ['Showering and bathing', 'Shopping'],
            ['Dressing and grooming', 'Preparing meals'],
            ['Toileting and continence', 'Housework and laundry'],
            ['Transfers (bed, chair, toilet)', 'Managing medication'],
            ['Walking and mobility', 'Managing money'],
            ['Eating and drinking', 'Transport and getting around'],
          ],
        },
      },
      {
        heading: 'Describe the level of assistance',
        paras: ['“Assisted with shower” tells the reader almost nothing. Say how much help, using the same scale every time:'],
        bullets: [
          'Independent: did it without help or prompting.',
          'Supervision / set-up: you set things up or stayed nearby, but they did it.',
          'Verbal or gestural prompt: they did it after a reminder or a gesture (say how many).',
          'Physical assistance: you helped with part of the task (say which part).',
          'Full assistance: you did the task for them.',
        ],
        after: ['If your organisation uses a different scale, use theirs, but be consistent: a change from “one prompt” to “physical assistance” over a fortnight is exactly what a nurse or care manager needs to see.'],
      },
      {
        heading: 'Record changes, not just routine',
        paras: ['ADL notes are how decline is noticed early. Write down anything new or different: needing more help than usual, a near-fall, new pain, skin changes, eating or drinking less, a change in continence, or the person saying a task has become hard. Then say who you told.'],
      },
      {
        heading: 'Keep it objective and respectful',
        table: {
          head: ['Instead of', 'Write'],
          rows: [
            ['Wouldn’t cooperate with shower', 'Declined a shower at 8am and said “too cold”; accepted a wash at the basin'],
            ['Wet herself again', 'Pad changed at 10am and 1pm; both were wet'],
            ['Unsteady', 'Held the rail and walked slowly to the bathroom; no loss of balance'],
            ['Ate well', 'Ate all of the sandwich and half the soup; drank two cups of tea'],
          ],
        },
      },
    ],
    exampleIntro: 'A home care worker talks through an afternoon visit. Kith sorts it into the care-note headings and keeps the level of assistance for each task.',
    example: {
      title: 'Home care visit: ADLs',
      input: '“Visit with Joan, 1 to 3. She showered herself, I just set up the chair and stayed close. Needed help with her socks and shoes. Walked to the letterbox with her frame, slower than last week, had to stop twice. Ate all her lunch, two cups of tea. Pad dry at 2. Small red patch on her left heel, I told the RN, Mark.”',
      sections: [
        { heading: 'Care provided', lines: ['Shower: independent with set-up (shower chair) and supervision.', 'Dressing: physical assistance with socks and shoes.', 'Walked to the letterbox with her frame.'] },
        { heading: 'Food, fluids & continence', lines: ['Ate all of her lunch; 2 cups of tea.', 'Pad dry at 2pm.'] },
        { heading: 'Mobility & skin', lines: ['Walking slower than last week; stopped twice on the way to the letterbox.', 'Small red patch on left heel.'] },
        { heading: 'Wellbeing & behaviour', lines: ['Not stated'] },
      ],
      flag: 'Change noticed: slower walking and a new red patch on the left heel. RN (Mark) informed.',
    },
    faq: [
      { q: 'What is the difference between ADLs and IADLs?', a: 'ADLs are basic self-care such as showering, dressing, toileting, transfers, mobility and eating. IADLs are the more complex tasks needed to live at home, such as shopping, cooking, cleaning, medication and money.' },
      { q: 'Do I need to write about every ADL on every visit?', a: 'Write about the ones you supported or observed on that visit, plus anything that changed. The care plan says which supports are expected.' },
      { q: 'How do I record that someone refused help?', a: 'Record what you offered, what they said (in their words if you can), and what happened instead. Refusing is their right; the note shows it was respected and lets the team see patterns.' },
    ],
    sources: [
      { label: 'Aged Care Quality and Safety Commission: Strengthened Aged Care Quality Standards', url: 'https://www.agedcarequality.gov.au/providers/quality-standards/strengthened-quality-standards' },
      { label: 'NDIS Commission: NDIS Practice Standards and Quality Indicators', url: 'https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf' },
    ],
  },
  {
    slug: 'abc-behaviour-chart',
    useCase: 'ndis',
    title: 'ABC behaviour charts: how to fill one in (with an example)',
    seoTitle: 'ABC Behaviour Chart: How to Fill It In (+ Example) | Kith',
    seoDescription: 'How support workers complete an ABC chart (antecedent, behaviour, consequence) for behaviours of concern, what to write in each column, and a worked NDIS example.',
    published: D,
    updated: D,
    summary: 'An ABC chart records three things about a behaviour of concern: the Antecedent (what was happening just before), the Behaviour (exactly what the person did, and for how long) and the Consequence (what happened straight after, including how others responded). Behaviour support practitioners use the pattern across many charts to work out what the behaviour is communicating and to update the behaviour support plan.',
    sections: [
      {
        heading: 'A: Antecedent',
        paras: ['Write what was happening just before: the time, place, who was there, the activity, and anything that changed (noise, a request, a transition, being told “no”, waiting, pain or tiredness you noticed). Stick to what you saw and heard.'],
      },
      {
        heading: 'B: Behaviour',
        paras: ['Describe the behaviour so that someone who wasn’t there could picture it: what the person did, how long it lasted, how intense it was, and who or what it was directed at. “Hit the table with an open hand three times” is useful. “Had a meltdown” is not.'],
      },
      {
        heading: 'C: Consequence',
        paras: ['Write what happened straight after: what you and others did, which strategy from the behaviour support plan you used, how the person responded, and how long until they were settled. Include whether anyone was hurt, any damage, and whether any restrictive practice was used.'],
        after: ['If a restrictive practice was used that isn’t authorised in the person’s behaviour support plan, it may be a reportable incident: tell your supervisor straight away. See the guide to NDIS reportable incidents.'],
      },
      {
        heading: 'Tips for useful ABC data',
        bullets: [
          'Fill it in as soon as everyone is safe, while details are fresh.',
          'Record every occurrence, not just the big ones: patterns come from frequency.',
          'Be specific about time and place; practitioners look for patterns by time of day and setting.',
          'Don’t guess why it happened in the behaviour column. If you have an idea, add it separately as “worker’s observation”.',
          'Record what worked to help the person settle as clearly as what didn’t.',
        ],
      },
    ],
    exampleIntro: 'Kith can write an ABC record from a spoken description using a custom note type with the three ABC headings. Here is the result.',
    example: {
      title: 'ABC record: afternoon at home',
      input: '“About 3pm at Noah’s place, his show was on and the remote batteries went flat so the TV wouldn’t change. Noah shouted and threw the remote at the wall, maybe 30 seconds. I used his plan, calm voice, offered headphones and the iPad. Settled in about five minutes, said sorry. Nobody hurt, small mark on the wall. No restrictive practice.”',
      sections: [
        { heading: 'Antecedent', lines: ['About 3pm, Noah’s home, watching his show.', 'TV remote batteries went flat; Noah couldn’t change the TV.'] },
        { heading: 'Behaviour', lines: ['Shouted and threw the remote at the wall, about 30 seconds.'] },
        { heading: 'Consequence', lines: ['Worker used the behaviour support plan strategy: calm voice, offered headphones and the iPad.', 'Noah settled in about 5 minutes and said sorry.', 'No one hurt; small mark on the wall. No restrictive practice used.'] },
      ],
    },
    faq: [
      { q: 'Who reads ABC charts?', a: 'Usually the behaviour support practitioner, team leader and anyone reviewing the behaviour support plan. They look across many charts for patterns, so consistent, specific entries matter more than long ones.' },
      { q: 'Is an ABC chart the same as an incident report?', a: 'No. An ABC chart is data for understanding behaviour. If someone was hurt, property was damaged, or a restrictive practice was used, an incident report is also needed under your organisation’s procedure.' },
      { q: 'Should I write what I think caused the behaviour?', a: 'Keep the A, B and C columns to facts. If you have a view, add it as a separate observation so the practitioner can weigh it.' },
    ],
    sources: [
      { label: 'NDIS Commission: Behaviour support and restrictive practices', url: 'https://www.ndiscommission.gov.au/rules-and-standards/behaviour-support-and-restrictive-practices' },
      { label: 'NDIS Commission: Reportable incidents', url: 'https://www.ndiscommission.gov.au/rules-and-standards/reportable-incidents-and-incident-management/reportable-incidents' },
    ],
  },
  {
    slug: 'aged-care-sirs-reporting',
    useCase: 'incident-reports',
    title: 'Aged care SIRS reporting: Priority 1 vs Priority 2',
    seoTitle: 'SIRS Aged Care: Priority 1 vs Priority 2 Reporting Times | Kith',
    seoDescription: 'The Serious Incident Response Scheme (SIRS) for aged care explained: the 8 incident types, Priority 1 (24 hours) vs Priority 2 (30 days), and how to write the record.',
    published: D,
    updated: D,
    summary: 'Under the Serious Incident Response Scheme (SIRS), aged care providers must report serious incidents to the Aged Care Quality and Safety Commission. Priority 1 incidents must be reported within 24 hours of becoming aware. All other reportable incidents are Priority 2 and must be reported within 30 days.',
    sections: [
      {
        heading: 'The eight SIRS incident types',
        bullets: [
          'Unreasonable use of force.',
          'Unlawful sexual contact or inappropriate sexual conduct.',
          'Psychological or emotional abuse.',
          'Unexpected death.',
          'Stealing or financial coercion by a staff member.',
          'Neglect.',
          'Inappropriate use of restrictive practices.',
          'Unexplained absence from care.',
        ],
      },
      {
        heading: 'Priority 1 vs Priority 2',
        table: {
          head: ['Priority', 'When it applies', 'Report to the Commission'],
          rows: [
            ['Priority 1', 'The incident caused, or could reasonably have been expected to cause, physical or psychological injury or discomfort needing medical or psychological treatment; or there are reasonable grounds to report it to police; or it is unlawful sexual contact, an unexpected death, or an unexplained absence from care', 'Within 24 hours of becoming aware'],
            ['Priority 2', 'Any other reportable incident that doesn’t meet the Priority 1 criteria', 'Within 30 days of becoming aware'],
          ],
        },
        after: ['Where there are reasonable grounds to believe an incident is unlawful, it must also be reported to police. Check the Commission’s current SIRS guidance, which sets out the full criteria and any exceptions.'],
      },
      {
        heading: 'What staff need to do',
        bullets: [
          'Make sure the person is safe and get any medical help needed.',
          'Tell your supervisor or the person responsible for incidents straight away: the clock starts when the provider becomes aware.',
          'Write down what you saw and heard, in order, as soon as you can.',
          'Don’t investigate on your own or question the people involved beyond what is needed for safety.',
        ],
      },
      {
        heading: 'Writing the incident record',
        paras: ['A SIRS-ready record has the date, time and place, the people involved (by name or role), what happened in order, injuries described exactly, immediate actions and first aid, who was notified and when, and what is known about causes. Use plain, objective language and quote what people said. Avoid labels like “victim” or “perpetrator”.'],
      },
    ],
    exampleIntro: 'A care worker describes a fall in a residential home. Kith writes the incident record and flags a possible SIRS category for the supervisor to decide on.',
    example: {
      title: 'Unwitnessed fall overnight',
      input: '“Found Margaret on the floor next to her bed at about 2:30am, room 14. She said she was trying to get to the toilet. Small cut on her right forearm, cleaned and dressed it. She said her hip hurts, 6 out of 10. Called RN Sarah at 2:35, she assessed and called the ambulance at 2:50. Call bell was out of reach on the chair.”',
      sections: [
        { heading: 'Incident details', lines: ['Date: Not stated', 'Time: about 2:30am', 'Location: room 14', 'Participant / resident: Margaret', 'Reported by: care worker (note author)'] },
        { heading: 'What happened', lines: ['Margaret was found on the floor next to her bed.', 'She said she was trying to get to the toilet.'] },
        { heading: 'Injury / harm', lines: ['Small cut on right forearm.', 'Margaret reported hip pain, 6/10.'] },
        { heading: 'Immediate actions & first aid', lines: ['Cut cleaned and dressed.', 'RN Sarah called at 2:35am; assessed Margaret and called an ambulance at 2:50am.'] },
        { heading: 'Contributing factors (as stated)', lines: ['Call bell was out of reach on the chair.'] },
      ],
      flag: 'Possible SIRS Priority 1 (neglect): injury needing medical treatment, and the call bell was out of reach. Supervisor to assess; if Priority 1, report within 24 hours.',
    },
    faq: [
      { q: 'Does SIRS apply to home care?', a: 'Yes. SIRS has applied to in-home aged care as well as residential care since December 2022, and continues under the new Aged Care Act. Check the Commission’s guidance for your service type.' },
      { q: 'Is every fall a SIRS incident?', a: 'No. A fall is reportable under SIRS when it fits one of the incident types, for example when it resulted from neglect. Every fall should still be recorded and reviewed under your incident management system.' },
      { q: 'Who decides if an incident is Priority 1?', a: 'The provider, usually through the person responsible for incident management. Staff should report every incident promptly with the facts so that decision can be made within the timeframe.' },
    ],
    sources: [
      { label: 'Aged Care Quality and Safety Commission: Serious Incident Response Scheme', url: 'https://www.agedcarequality.gov.au/providers/serious-incident-response-scheme' },
    ],
  },
  {
    slug: 'how-to-write-an-incident-report',
    useCase: 'incident-reports',
    title: 'How to write an incident report at work (Australia)',
    seoTitle: 'How to Write an Incident Report at Work (Australia, WHS) | Kith',
    seoDescription: 'Step-by-step guide to writing a workplace incident report in Australia: what to include, objective wording, notifiable incidents under WHS law, and an example.',
    published: D,
    updated: D,
    summary: 'A workplace incident report records what happened, when and where, who was involved and who saw it, any injury, what was done straight away, and what follow-up is needed. Write it as soon as everyone is safe, stick to facts, and quote what people said. Under WHS law, deaths, serious injuries or illnesses and dangerous incidents must also be notified to the regulator immediately.',
    sections: [
      {
        heading: 'What to include',
        bullets: [
          'When and where: date, time and exact location.',
          'What happened: the events in order, from just before the incident to just after.',
          'People involved: names or roles of everyone involved and anyone injured.',
          'Injuries or damage: exactly what, where on the body, and how serious.',
          'Immediate actions: first aid, making the area safe, who was called.',
          'Witnesses: who saw it, with contact details if your form asks.',
          'Follow-up required: what needs to happen next and who owns it.',
        ],
      },
      {
        heading: 'Notifiable incidents under WHS law',
        paras: ['In every Australian jurisdiction, a business must notify the WHS regulator immediately after becoming aware of a notifiable incident: the death of a person, a serious injury or illness (for example one needing immediate inpatient hospital treatment), or a dangerous incident (for example an uncontrolled gas leak, fire or collapse of a structure). The site must not be disturbed until an inspector arrives or directs otherwise, apart from making it safe and helping injured people. Records of notifiable incidents must be kept for at least 5 years.'],
      },
      {
        heading: 'Write it objectively',
        table: {
          head: ['Instead of', 'Write'],
          rows: [
            ['He was being careless', 'He was carrying two boxes that blocked his view of the floor'],
            ['The floor was dangerous', 'There was a puddle of water about 1 metre wide near the sink; no wet-floor sign'],
            ['She was badly hurt', 'She had a 3 cm cut on her left palm that was bleeding'],
          ],
        },
        after: ['Don’t assign blame or guess at causes in the facts. If a cause is known, record it as known; if you have a theory, say it is your opinion.'],
      },
      {
        heading: 'Near misses count too',
        paras: ['A near miss is an incident where no one was hurt but could have been. Reporting them is one of the cheapest ways to prevent the next injury, and most organisations’ procedures require it.'],
      },
    ],
    exampleIntro: 'A café supervisor describes a slip during service. Kith writes the incident report with the standard headings and leaves missing details marked.',
    example: {
      title: 'Slip behind the counter',
      input: '“About 12:40 today behind the counter, Jess slipped on milk that had spilled near the coffee machine. She landed on her right wrist, it’s swollen. Gave her an ice pack, she went to the GP at 1:15. Tom saw it. Spill wasn’t cleaned up, we were slammed. Need to get a rubber mat there.”',
      sections: [
        { heading: 'When & where', lines: ['Today, about 12:40pm.', 'Behind the counter, near the coffee machine.'] },
        { heading: 'What happened', lines: ['Jess slipped on spilled milk and landed on her right wrist.'] },
        { heading: 'People involved', lines: ['Jess (staff member, injured).'] },
        { heading: 'Immediate actions taken', lines: ['Ice pack applied; right wrist swollen.', 'Jess went to the GP at 1:15pm.'] },
        { heading: 'Witnesses', lines: ['Tom.'] },
        { heading: 'Follow-up required', lines: ['Install a rubber mat near the coffee machine.', 'Review spill clean-up during busy periods.'] },
      ],
    },
    faq: [
      { q: 'How soon should an incident report be written?', a: 'As soon as the area is safe and anyone injured has been looked after, ideally the same shift. Notifiable incidents must be reported to the regulator immediately.' },
      { q: 'Who should write the incident report?', a: 'Usually the person who saw it or was in charge at the time. Witnesses may write their own statements. Follow your organisation’s procedure.' },
      { q: 'Do I need to report a near miss?', a: 'Most workplaces require it, and it is good practice. Near misses show hazards before someone is hurt.' },
    ],
    sources: [
      { label: 'Safe Work Australia: Incident reporting', url: 'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/incident-reporting' },
      { label: 'Safe Work Australia: Model WHS Act', url: 'https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws/model-whs-act' },
    ],
  },
  {
    slug: 'toolbox-talk-record',
    useCase: 'construction',
    title: 'Toolbox talks: how to run and record one',
    seoTitle: 'Toolbox Talk Template & Record: What to Write Down | Kith',
    seoDescription: 'How to run a toolbox talk on an Australian site, what to record (topic, attendees, hazards and controls, worker concerns), WHS consultation duties and an example.',
    published: D,
    updated: D,
    summary: 'A toolbox talk is a short safety meeting on site, usually before work starts. Record the date, site, who ran it, the topic, everyone who attended, the hazards and controls discussed, and any questions or concerns workers raised, with what will be done about them. A signed record is evidence that workers were consulted on health and safety.',
    sections: [
      {
        heading: 'Why record toolbox talks',
        paras: ['Under the model WHS laws, a business must consult, so far as reasonably practicable, with workers who are likely to be directly affected by a health and safety matter. Toolbox talks are one of the most common ways to do it on site. The law doesn’t require a toolbox talk by name, but if there is ever an incident, a record of what was discussed and who was there shows consultation happened.'],
      },
      {
        heading: 'What to record',
        bullets: [
          'Date, time, site and the person who ran the talk.',
          'Topic: the task or hazard (for example working at heights, a new SWMS, hot weather, a recent near miss).',
          'Attendees: names and companies, with signatures if your system uses them.',
          'Hazards & controls discussed: what could go wrong and what is in place to stop it.',
          'Worker questions / concerns: what was raised and what will be done, by whom.',
        ],
      },
      {
        heading: 'Tips for talks people actually listen to',
        bullets: [
          'Keep it to 10–15 minutes and to one topic.',
          'Make it about today’s work on this site, not a generic script.',
          'Ask questions and let workers talk: they often know the hazards best.',
          'Close the loop: start the next talk by saying what happened to last week’s concerns.',
        ],
      },
    ],
    exampleIntro: 'A site supervisor records a 30-second voice note after the morning toolbox talk. Kith writes the record with the toolbox-talk headings.',
    example: {
      title: 'Toolbox talk: scaffold changes',
      input: '“Toolbox this morning at 6:45, Harris Park site. Topic was the scaffold being modified on the east side today. Present: me, Dave and Kim from the formwork crew, Luis the sparky, two from Coastal Scaffolding. Covered exclusion zone under the scaffold, no access till it’s tagged. Luis asked about getting power to level 2 while it’s down, we agreed he uses the west stair and temp board.”',
      sections: [
        { heading: 'Topic', lines: ['Modification of the east-side scaffold today (Harris Park site, 6:45am).'] },
        { heading: 'Attendees', lines: ['Site supervisor (note author)', 'Dave and Kim (formwork crew)', 'Luis (electrician)', 'Two workers from Coastal Scaffolding'] },
        { heading: 'Hazards & controls discussed', lines: ['Exclusion zone under the scaffold while it is modified.', 'No access to the east scaffold until it is re-tagged.'] },
        { heading: 'Worker questions / concerns', lines: ['Luis asked how to get power to level 2 while the scaffold is down: agreed he uses the west stair and the temporary board.'] },
      ],
    },
    faq: [
      { q: 'Are toolbox talks a legal requirement?', a: 'Not by name. The WHS laws require consultation with workers on health and safety matters, and toolbox talks are a common, practical way to meet that duty. Your principal contractor or client may require them contractually.' },
      { q: 'How often should toolbox talks be held?', a: 'Many sites run them daily or weekly, and whenever the work, hazards or SWMS change. Follow your site’s safety management plan.' },
      { q: 'Do attendees need to sign?', a: 'It isn’t required by law, but a sign-on sheet or digital sign-off is good evidence of who attended. Kith records the attendee list from what you say.' },
    ],
    sources: [
      { label: 'Safe Work Australia: Consultation', url: 'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/consultation' },
      { label: 'Safe Work Australia: Model Code of Practice: Work health and safety consultation, cooperation and coordination', url: 'https://www.safeworkaustralia.gov.au/doc/model-code-practice-work-health-and-safety-consultation-cooperation-and-coordination' },
    ],
  },
  {
    slug: 'ai-for-ndis-progress-notes',
    useCase: 'ndis',
    title: 'Using AI for NDIS progress notes: what’s allowed and what to check',
    seoTitle: 'AI for NDIS Progress Notes: Is It Allowed? What to Check | Kith',
    seoDescription: 'Can NDIS support workers use AI to write progress notes? What the rules say, privacy questions to ask, the risks (made-up details) and how to choose NDIS notes software.',
    published: D,
    updated: D,
    summary: 'No NDIS rule bans AI for writing progress notes. What matters is that the note is accurate, the worker checks and signs it, participants’ personal information is handled under the Privacy Act and your organisation’s policies, and the tool doesn’t add things that didn’t happen. Ask your provider before using any tool with participant information.',
    sections: [
      {
        heading: 'What the rules require',
        paras: ['The NDIS Practice Standards require providers to keep accurate, up-to-date records and to manage participants’ information securely, with consent. Those obligations apply however the note is written. The worker who signs the note is still responsible for it being true.'],
      },
      {
        heading: 'The real risk: invented details',
        paras: ['General-purpose AI chatbots are good at producing plausible text, and that is the problem in a progress note. They can add a plan goal that wasn’t discussed, smooth over an incident, or fill in a time that wasn’t said. In an audit or investigation, a confident note that is wrong is worse than a short note that is right.'],
        bullets: [
          'Does the tool only write what you said, and mark missing details instead of guessing?',
          'Does it keep exact times, amounts, pain scores and quotes as you said them?',
          'Does it avoid linking goals unless you named one?',
          'Does it say “no incidents” only when you did?',
        ],
      },
      {
        heading: 'Privacy questions to ask',
        bullets: [
          'Where are notes stored, and are they encrypted?',
          'Where is the AI processing done, and is your data used to train models?',
          'Are recordings kept or deleted after transcription?',
          'Can your organisation export or delete the data?',
          'Does the tool’s privacy policy say all of this plainly?',
        ],
        after: ['Pasting participant details into a free consumer chatbot is very different from using a tool your provider has approved. If in doubt, ask your team leader or privacy officer first.'],
      },
      {
        heading: 'What good NDIS notes software looks like',
        bullets: [
          'Works on a phone after the shift, with nothing to install.',
          'Writes in the progress-note format your provider uses: shift details, supports, response, goal link, incidents, handover.',
          'Understands Australian accents and words.',
          'Lets you review and edit every note before it is used.',
          'Flags possible reportable incidents for a supervisor rather than deciding for you.',
        ],
      },
    ],
    exampleIntro: 'Here is a rough voice note and what Kith writes from it. The worker didn’t give a location, a goal or an incidents line, so those are left for the worker to fill in rather than made up.',
    example: {
      title: 'In-home support: afternoon',
      input: '“Afternoon with Lily, 2 till 6. We baked muffins, she measured everything herself with me reading the recipe. Helped her fold washing. She was in a great mood, said “can we make choc chip next time”. Needs more flour.”',
      sections: [
        { heading: 'Shift details', lines: ['Date: Not stated', 'Shift time: 2pm to 6pm', 'Participant: Lily', 'Support worker: note author', 'Location: Not stated', 'Support type: Not stated'] },
        { heading: 'Supports provided', lines: ['Baked muffins with Lily; worker read the recipe and Lily measured the ingredients herself.', 'Supported Lily to fold washing.'] },
        { heading: 'Participant’s response & wellbeing', lines: ['Said “can we make choc chip next time”.'] },
        { heading: 'Goal link', lines: ['Not stated'] },
        { heading: 'Incidents', lines: ['None reported by the worker: confirm before signing'] },
        { heading: 'Handover', lines: ['More flour needed.'] },
      ],
    },
    faq: [
      { q: 'Does the NDIS Commission allow AI-written progress notes?', a: 'There is no rule against it. The Practice Standards require accurate records and secure, consented handling of information, and those apply whatever tool you use. Your provider’s policies decide which tools are approved.' },
      { q: 'Can I use ChatGPT to write my NDIS notes?', a: 'Check with your provider first. Putting participant information into a consumer chatbot may breach your organisation’s privacy policy, and general chatbots can add details that didn’t happen. If you use any AI, check every line before you sign.' },
      { q: 'What is the best NDIS progress notes software?', a: 'The one your team will use on a phone after a shift, that writes in your format, stores data securely in Australia, and never invents details. Try a few with a real (de-identified) shift note and compare what each one adds that you didn’t say.' },
    ],
    sources: [
      { label: 'NDIS Commission: NDIS Practice Standards and Quality Indicators', url: 'https://www.ndiscommission.gov.au/sites/default/files/2024-10/ndis-practice-standards-and-quality-indicators.pdf' },
      { label: 'OAIC: Australian Privacy Principles', url: 'https://www.oaic.gov.au/privacy/australian-privacy-principles' },
      { label: 'OAIC: Guidance on privacy and the use of commercially available AI products', url: 'https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products' },
    ],
  },
];
