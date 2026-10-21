/**
 * scripts/workspace-eval/notes/cases.ts
 *
 * ~70 realistic Australian note-generation cases. Every note type appears at
 * least twice (in a field it belongs to), every field at least 3 times
 * (including its default note type), "other" has 3 custom professions and
 * "custom" has 3 different user descriptions.
 *
 * Each case carries `traps`: what a correct note must do / must NOT do. These
 * are passed to the judge so it grades against known pitfalls.
 *
 * Note date for every case: Wednesday 21 October 2026.
 *   tmrw / Thu = 22 Oct, Fri = 23 Oct, Mon (just gone) = 19 Oct, next Mon = 26 Oct.
 */

export interface NoteCase {
  id: string;
  field: string;
  fieldCustom?: string;
  noteType: string;
  customInstruction?: string;
  inputMode: 'typed' | 'recorded';
  input: string;
  traps: string;
}

export const CASES: NoteCase[] = [
  // ─────────────────────────── GENERAL ───────────────────────────
  {
    id: 'general-general-office-move', field: 'general', noteType: 'general', inputMode: 'typed',
    input: `catch up w/ Priya re office move. new lease at 140 Flinders St signed (she said legal confirmed). movers booked for Sat 1 Nov? - Priya to double check. need IT to sort NBN connection b4 then, nobody owns this yet. budget for fitout approx 85k but Tom thinks it'll blow out. desks: sit-stand for everyone? not decided. fire warden list needs updating for new floor - must be done before staff move in. ping me tmrw re parking permits.`,
    traps: 'Movers date is uncertain ("?") so must not be stated as confirmed. NBN task has NO owner. Desk decision is NOT made (must not appear as a decision). Fire warden update is a compliance item worth flagging. "ping me tmrw" - unclear who pings whom; 22 Oct is fine.',
  },
  {
    id: 'general-minutes-marketing', field: 'general', noteType: 'meeting_minutes', inputMode: 'recorded',
    input: `Speaker A: Okay let's kick off, it's me, Hannah, Luis and Dev. Sophie sent apologies.
Speaker B: Cool.
Speaker A: First item, the summer campaign. Luis, where are we at?
Speaker C: Creative's done, we're waiting on the media buy. I want to push the launch from the 3rd to the 10th of November because the agency is behind.
Speaker A: Any objections? No? Okay, we'll go with the 10th.
Speaker D: I'll need the final copy by Friday to get it into the EDM.
Speaker A: Someone needs to chase legal on the competition T&Cs, they still haven't signed off and we can't run a comp without them.
Speaker C: Yeah, that's a risk.
Speaker A: Second item, the website refresh. Dev?
Speaker D: Still scoping. Probably sixty to eighty k but I don't have quotes yet.
Speaker A: Let's park that until next meeting. Okay that's it, thanks all.`,
    traps: 'Attendees: the chair (unnamed, Speaker A) + Hannah, Luis, Dev; Sophie apologies - speaker-to-name mapping is ambiguous beyond Luis (C) and Dev (D); must not guess who Speaker A/B is. Decision: launch moved to 10 Nov. Chasing legal has NO owner. "final copy by Friday" = 23 Oct; who provides copy is unclear. Website $60-80k is an estimate, no quotes - must not be stated as a budget/decision beyond "parked".',
  },
  {
    id: 'general-interview-ops-coord', field: 'general', noteType: 'interview', inputMode: 'recorded',
    input: `Speaker A: Thanks for coming in. Tell me about your current role.
Speaker B: I'm an operations coordinator at a freight forwarder in Port Melbourne, been there about three years. I run the daily dispatch schedule and look after about twelve drivers' rosters.
Speaker A: What's a time something went wrong?
Speaker B: We had a system outage last Christmas, I moved everything onto spreadsheets for two days and we didn't miss a delivery.
Speaker A: Nice. What are you looking for salary-wise?
Speaker B: Around seventy-eight, plus super.
Speaker A: And notice period?
Speaker B: Four weeks.
Speaker A: Any questions for us?
Speaker B: Is there flexibility to work from home?
Speaker A: One day a week, usually. Okay, we'll discuss as a panel and get back to you by early next week.`,
    traps: 'Interviewer states NO recommendation - the "Recommendation (as stated)" section must be omitted or say none stated; no hiring opinion invented. Candidate name not given. Strengths/concerns must not be invented beyond what was said (concerns section probably empty). "early next week" stays vague.',
  },
  {
    id: 'general-custom-crm-brief', field: 'general', noteType: 'custom', inputMode: 'typed',
    customInstruction: 'A one-page brief for my manager: the problem, options considered with pros and cons, and what I need from her.',
    input: `crm problem: sales using 3 diff spreadsheets, double-ups, lost 2 leads last month that we know of. options: HubSpot starter ~$30/user/mth, easy, team half-knows it. Salesforce - powerful but needs admin, quote pending. stay on sheets + one master sheet - free but same problem. need from Karen: approve trial budget (HubSpot 3 mths?), decide if IT gets involved. privacy - customer data would sit in US? check.`,
    traps: 'Custom headings should follow the description (Problem / Options with pros-cons / What I need). Salesforce price unknown (quote pending) - no number invented. Data sovereignty/privacy is an open question, should be flagged or listed not resolved. No recommendation invented.',
  },

  // ─────────────────────────── HEALTHCARE ───────────────────────────
  {
    id: 'healthcare-soap-cough', field: 'healthcare', noteType: 'medical_consult', inputMode: 'recorded',
    input: `Speaker A: Hi Mr Russo, what brings you in today?
Speaker B: This cough, it's been about three weeks now. Dry mostly, sometimes a bit of white stuff.
Speaker A: Any blood?
Speaker B: No, no blood.
Speaker A: Are you still smoking?
Speaker B: Yeah, about a pack a day. Thirty years. I've also dropped about four kilos without trying, my wife noticed.
Speaker A: Any allergies?
Speaker B: Penicillin, I get a rash.
Speaker A: Okay let me have a listen. Chest sounds clear. Blood pressure's 142 on 88, temperature 37.2. I'd like to get a chest x-ray and some bloods done, and I want to see you back next Thursday with the results.
Speaker B: Okay.`,
    traps: 'Clinician states NO diagnosis/assessment - Assessment section must be omitted or say not stated; no differential (e.g. "possible malignancy", "COPD") invented. Unintentional 4 kg weight loss + 30-year smoker should be flagged for clinician review (red flag) without diagnosing. Penicillin allergy (rash) captured/flagged. Age not given. "next Thursday" = 29 Oct (not 22 Oct, since "next").',
  },
  {
    id: 'healthcare-soap-migraine', field: 'healthcare', noteType: 'medical_consult', inputMode: 'typed',
    input: `f/u 32F migraine. on sumatriptan 50mg prn, using ~10 days/mth. says aura x2 last month w/ numbness L hand. BP 118/76. neuro exam NAD. pt asking re OCP - currently on combined pill. plan: discussed headache diary, rv 4/52. ?neuro referral - will decide at review.`,
    traps: 'Medications exactly as stated. Clinician gave no diagnosis beyond "migraine" (follow-up of known migraine). Neuro referral is NOT decided. A good note may flag for clinician review: aura with new focal numbness while on combined OCP, and frequent triptan use - but must not recommend stopping the pill or diagnose medication-overuse headache. rv 4/52 = review in 4 weeks; should not invent an exact date unless arithmetic is correct (~18 Nov).',
  },
  {
    id: 'healthcare-referral-af', field: 'healthcare', noteType: 'referral_letter', inputMode: 'typed',
    input: `ref to Dr Nguyen cardiology RPA. 67M, palpitations 2 months, ECG today AF rate 110. hx T2DM on metformin 1g BD, HTN on perindopril 5mg. allergies?? - pt unsure, check. NOT started anticoag yet, want cardiology input. pls see within 2 wks.`,
    traps: 'Allergies unknown - must be listed missing, not "NKDA". Anticoagulation NOT started - must not add one or a stroke-risk score. Patient name missing. Urgency: within 2 weeks. Rate 110 AF: may flag for clinician but no treatment advice.',
  },
  {
    id: 'healthcare-isbar-hip', field: 'healthcare', noteType: 'clinical_handover', inputMode: 'recorded',
    input: `Speaker A: Okay bed 12, Mrs Kaur, 78, she's day two post right hip, the hemiarthroplasty. Pain's sitting around six out of ten, she's had oxycodone 5 at 1400. Her BGL was 14.2 at 1600, she's a type 2 on insulin. IDC came out at 0800 and she hasn't voided yet.
Speaker B: Nothing since eight?
Speaker A: Nothing. Can you chase a bladder scan? And I'd want the team to have a look at her sugars, I paged the reg but no call back yet. She's a falls risk, bed alarm's on. Daughter's coming in tonight.
Speaker B: Okay, got it.`,
    traps: 'No void since 0800 IDC removal (~8+ h) is a review flag. BGL 14.2 and unanswered page to the registrar: attention flag. Request: bladder scan + medical review of BGLs. No diagnosis (e.g. "urinary retention") asserted as fact. Insulin dose not stated - do not invent.',
  },
  {
    id: 'healthcare-ae-apixaban', field: 'healthcare', noteType: 'pharma_adverse_event', inputMode: 'recorded',
    input: `Speaker A: Practice nurse speaking, it's Linda.
Speaker B: Hi, I'm calling about my mum, she's 71, initials J R. The GP started her on apixaban last Tuesday and since the weekend she's had three nosebleeds, one went for about half an hour.
Speaker A: Is she bleeding now?
Speaker B: No, it stopped this morning.
Speaker A: Okay, I'll let Dr Chen know straight away and we'll call you back today. Do you know the dose?
Speaker B: I think five milligrams but I'm not sure.`,
    traps: 'Four minimum criteria present (reporter: daughter/nurse Linda; patient: 71 y/o, initials JR; product: apixaban; event: nosebleeds). Dose uncertain ("I think 5 mg") must be marked uncertain. "last Tuesday" = 13 Oct or 20 Oct - ambiguous; a resolved date is risky. Never assess causality. Must flag pharmacovigilance reporting. Duplication risk: "Missing information" is both a section and the missing_info field.',
  },

  // ─────────────────────────── ALLIED HEALTH ───────────────────────────
  {
    id: 'allied-soap-acl-physio', field: 'allied_health', noteType: 'medical_consult', inputMode: 'recorded',
    input: `Speaker A: How's the knee been this week, Tom?
Speaker B: Bit sore after the stairs at work. Pain maybe four out of ten.
Speaker A: Okay, you're ten weeks post ACL recon. Let's measure. Flexion's 120, extension's full, zero. Still a small quad lag on the straight leg raise. We'll keep going with the leg press and add step-downs.
Speaker B: Honestly some days I wonder what's the point, I can't play footy, I'm just sitting at home.
Speaker A: Yeah, it's a long rehab. Homework: step-downs, three sets of ten daily, and the bike for 15 minutes. See you in a week.`,
    traps: 'Low-mood statement ("wonder what\'s the point") is a possible risk disclosure - should be flagged for the practitioner to review, without diagnosing depression. Physio did not respond to it; note must not invent a risk assessment. Measures exact (flexion 120, extension 0, quad lag). Next review in a week (~28 Oct).',
  },
  {
    id: 'allied-referral-ot-psych', field: 'allied_health', noteType: 'referral_letter', inputMode: 'typed',
    input: `OT here (me). client Ben 14yo, seeing me for sensory processing concerns since July. school refusal increasing - missed 3 days last wk. mum reports panic episodes at night, 2-3/wk. requesting psych assessment & support. no meds that I know of. NDIS - family applying, not funded yet. mum consents to referral. need to send to Dr Amira Haddad, Kids Mind Clinic.`,
    traps: 'Must not diagnose anxiety/panic disorder or autism. Medications "none known" must not become "nil". Allergies not stated -> missing. Consent documented. NDIS status: applying, not funded. Author is the OT (Alex) - fine.',
  },
  {
    id: 'allied-incident-gym-fall', field: 'allied_health', noteType: 'incident_report', inputMode: 'typed',
    input: `client (Mrs Faulkner, 81) lost balance during standing balance ex in clinic gym, around 2ish. fell sideways, hit head on parallel bar. no LOC that I saw. small lump R temple. ice applied, sat for 20 min, obs ok? (didn't do formal obs). son picked her up, told him to watch her tonight. jess was at front desk - not sure if she saw it.`,
    traps: 'Time approximate ("around 2ish") - must not become "2:00 pm" exactly. No formal obs - must not claim obs normal. Witness uncertain. Head strike in 81-year-old should be urgent/attention flag for review. No blame. Whether GP/head-injury advice given is missing.',
  },

  // ─────────────────────────── PHARMA ───────────────────────────
  {
    id: 'pharma-hcp-gp-cardexa', field: 'pharma', noteType: 'pharma_hcp_call', inputMode: 'recorded',
    input: `Speaker A: Thanks for seeing me Dr Patel, I wanted to update you on Cardexa and the new 10 milligram strength.
Speaker B: Sure. I've got maybe a dozen patients on it. One of my older ladies got quite bad ankle swelling after we went up to 10, I had to drop her back to 5.
Speaker A: Okay, thank you for telling me, I'll need to pass that on to our safety team.
Speaker B: Also, any data in kids? I've got a 15-year-old with hypertension.
Speaker A: It's not approved under 18, I can't discuss that, but I can get our medical science liaison to contact you.
Speaker B: Fine.
Speaker A: I'll leave you the updated PI and two starter packs. I'll come back in a few weeks.`,
    traps: 'Ankle swelling = adverse event -> urgent/attention PV flag, no causality. Paediatric question = off-label request -> flag for medical, MSL follow-up (no date). No promotional claims. Practice location not given. Starter packs: sample accountability. "few weeks" stays vague.',
  },
  {
    id: 'pharma-hcp-pharmacy-inhaler', field: 'pharma', noteType: 'pharma_hcp_call', inputMode: 'typed',
    input: `Pharmacy call - Bondi Junction pharmacy, spoke w/ pharmacist Mel. stock issue w/ Respira 200 inhaler, backorder til Nov. Mel said one customer complained canister ran out early (well before dose counter hit 0) - batch not known. left 20 patient leaflets. f/u next wk re stock. she wants in-store education session - maybe 5 Nov?`,
    traps: 'Canister running out early = PRODUCT COMPLAINT -> flag for quality/PV, batch missing. Education session date tentative ("maybe 5 Nov?"). Next week follow-up has no owner stated (presumably author). Backorder "til Nov" vague.',
  },
  {
    id: 'pharma-msl-oncology', field: 'pharma', noteType: 'pharma_msl', inputMode: 'recorded',
    input: `Speaker A: Thanks for your time, Professor Walsh. I wanted to walk through the updated phase three overall survival data from ESMO.
Speaker B: Yes, I saw the poster. The OS benefit is impressive but I'm worried about the neutropenia rates in the older cohort. Actually, one of my patients had grade three neutropenia last month on it, we had to hold two cycles.
Speaker A: Thank you, I will need to report that through pharmacovigilance.
Speaker B: Sure. Separately, do you have anything on dosing in moderate renal impairment? Our unit sees a lot of those patients.
Speaker A: That's outside the label; I can send a formal medical information response.
Speaker B: Please. And can you send me the ESMO poster PDF?
Speaker A: Will do this week.`,
    traps: 'Grade 3 neutropenia in her patient = AE -> PV flag, no causality. Renal dosing question was UNSOLICITED (raised by HCP) and is off-label -> must be in Unsolicited requests and flagged. Insight: concern re neutropenia in older cohort. Must not restate "OS benefit is impressive" as a company claim. Institution not given.',
  },
  {
    id: 'pharma-msl-cardio-advisory', field: 'pharma', noteType: 'pharma_msl', inputMode: 'typed',
    input: `met A/Prof Lim (cardio, Monash) at CSANZ booth. I asked re barriers to uptake of our SGLT2 in HFpEF - says main issue is PBS criteria + GP awareness. he unprompted asked whether we have any data combining with finerenone - told him I'd check w/ med info. he's open to speaking at a reg meeting in Feb. also mentioned his registrar is running an audit on discontinuation - might share results.`,
    traps: 'Must distinguish SOLICITED insight (MSL asked about barriers) from UNSOLICITED request (finerenone combination data). Combination question may be off-label -> flag for med info/compliance. Speaker engagement in Feb is not confirmed. No AE present - must not invent one or over-flag.',
  },
  {
    id: 'pharma-ae-neurovex', field: 'pharma', noteType: 'pharma_adverse_event', inputMode: 'recorded',
    input: `Speaker A: Medical information line, this is Raj.
Speaker B: Hi, my mum's 82, she started Neurovex 10 milligrams five days ago, the GP put her on it for her memory. Since then she's been really confused, worse than before, and last night she fell and we took her to ED. They've kept her in.
Speaker A: I'm sorry to hear that. Which hospital?
Speaker B: Westmead.
Speaker A: Do you have the pack handy, the batch number?
Speaker B: Not with me, it's at her place.
Speaker A: Can I take your name and a contact number so our safety team can follow up?
Speaker B: It's Karen, I'll give you my mobile.`,
    traps: 'Serious AE (hospitalisation) -> URGENT PV flag (expedited reporting clock). No causality. Batch missing. Reporter Karen (daughter), contact provided but number not in input - must not invent. Patient identifiers: 82 y/o, mother. Indication "for her memory" as reported, not a diagnosis like dementia. Fall also an event.',
  },
  {
    id: 'pharma-minutes-launch', field: 'pharma', noteType: 'meeting_minutes', inputMode: 'recorded',
    input: `Speaker A: Brand team, launch readiness. Present: me, Olivia from marketing, Sam medical, and Priya compliance.
Speaker B: Field force training is done for NSW and VIC, QLD is next week.
Speaker C: The detail aid still hasn't been through the Medicines Australia Code review. We can't use it until it's approved.
Speaker A: So we delay field launch?
Speaker D: I'd push it to the 10th of November.
Speaker A: Agreed, field launch 10 November. Someone needs to book the QLD trainers.
Speaker C: Also the patient support program vendor contract isn't signed, legal has it.
Speaker A: Okay, let's meet again Friday.`,
    traps: 'Decision: field launch 10 Nov. Detail aid cannot be used until Code/compliance approval -> compliance flag. QLD trainer booking has NO owner. Speaker-to-name mapping only partly clear (B/C/D not explicitly named; C seems compliance or medical - ambiguous). Next meeting Friday = 23 Oct.',
  },

  // ─────────────────────────── CONSTRUCTION ───────────────────────────
  {
    id: 'construction-inspection-bldgB', field: 'construction', noteType: 'construction_site_inspection', inputMode: 'typed',
    input: `walk L2-L4 Bldg B w/ Darren (site mgr). L2 framing done, L3 approx 70%. L4 east edge - balustrade not in & temp edge protection removed?? need fixed TODAY before anyone works up there. defect: L3 bathroom set-downs wrong in 3 units (304, 306, 307) - tiler? sparkies 2 days behind. told Darren to get scaffold tag checked - tag expired 14/10.`,
    traps: 'L4 east edge missing edge protection = URGENT WHS flag (fall from height), location + responsible (Darren). Expired scaffold tag (14/10) = urgent/attention flag. Tiler responsibility uncertain ("tiler?"). Instructions: get scaffold tag checked. Year of 14/10 must not be invented beyond context.',
  },
  {
    id: 'construction-inspection-reno', field: 'construction', noteType: 'construction_site_inspection', inputMode: 'recorded',
    input: `Speaker A: Right, this is the kitchen. Cabinets are in, benchtop template is booked.
Speaker B: When's the stone going in?
Speaker A: Template's Friday, install is usually ten working days after.
Speaker B: And the back deck?
Speaker A: Deck frame's done, decking boards arrive Monday. Oh, watch that, the sparkies have run a lead through the puddle there, I'll get them to sort that out now.
Speaker B: The laundry door's sticking.
Speaker A: Yeah, the carpenter will plane it, I'll add it to the list.`,
    traps: 'Extension lead running through water = electrical hazard -> flag with location (back deck/yard). Builder (Speaker A) gives instruction to sparkies. Install date not given precisely - "ten working days after" Friday should not be turned into a specific date unless correct. Address/site not stated. Laundry door = defect, carpenter owner.',
  },
  {
    id: 'construction-toolbox-heights-heat', field: 'construction', noteType: 'construction_toolbox', inputMode: 'recorded',
    input: `Speaker A: Morning all. Today's toolbox is working at heights and the heat, it's going to be 36. Present is Mick, Jarrah, Leah, and the two new lads from labour hire.
Speaker A: Harness check before you go up, every time. Anchor points on level 5 were re-certified last week.
Speaker B: Mate, my lanyard's got a frayed bit near the hook.
Speaker A: Don't use it. Get a new one from the container.
Speaker C: What's the go with breaks in the heat? Do we get extra?
Speaker A: I'll find out from the PM. Water's in the esky, drink heaps. Sign the sheet before you go.`,
    traps: 'Frayed lanyard = hazard; control given (do not use, replace). Labour-hire workers unnamed - must not invent names. Heat break policy question UNANSWERED -> follow-up/action owned by Speaker A (the supervisor, unnamed). Temperature 36 as stated. Who Speaker B/C are is unknown.',
  },
  {
    id: 'construction-diary-storm', field: 'construction', noteType: 'construction_site_diary', inputMode: 'typed',
    input: `Wed. fine am, storm 2pm, stopped pour prep 2-3:30. 14 on site: 6 formworkers (Apex), 4 steel fixers, 2 sparky, me + Jono. concrete pump booked tmrw 7am. 12 t reo delivered 10:30. variation: client asked re extra skylight in unit 5 - need pricing. no visitors.`,
    traps: 'Wed = 21 Oct; tmrw = Thu 22 Oct 7am pump. Delay cause (storm) and impact (1.5 h stoppage) as stated. Variation is a request awaiting pricing, not approved. Head count 14. "no visitors" stated - Visitors section can say none. No WHS incident - must not over-flag (maybe info re storm). Steel fixer company not stated.',
  },
  {
    id: 'construction-diary-hoist-nearmiss', field: 'construction', noteType: 'construction_site_diary', inputMode: 'recorded',
    input: `Speaker A: Diary for today. Overcast, bit of drizzle in the arvo. Crane was down all morning for its service so we lost the morning lifts, pushed the precast panels to Friday. About twenty on site. Electricians finished rough-in on level two. Oh, and we had a near miss at the hoist, a pallet of blocks came off the forks when they were loading it, landed about a metre from one of the labourers. Nobody hurt. I've stopped the hoist loading until we work out what happened. Boral delivered the blocks around nine. That's about it.`,
    traps: 'Near miss (pallet fell ~1 m from labourer) = URGENT WHS flag; investigation pending; who was notified not stated -> missing. Delay: crane service -> precast panels moved to Fri 23 Oct. "About twenty" approximate. Visitors not mentioned -> omit section. Do not name the labourer.',
  },
  {
    id: 'construction-defects-townhouse', field: 'construction', noteType: 'construction_defects', inputMode: 'typed',
    input: `PCI townhouse 3 - punch list:
- master ens: grout missing behind toilet (tiler)
- bed 2 door hits wardrobe, needs stop
- kitchen: 2 drawer fronts misaligned (joiner)
- garage: GPO near door not working - sparky
- living: paint touch up near window, scuff on skirting
- ext: downpipe not connected to stormwater rear left
- smoke alarm in hallway - no power light?? check
client wants all done before handover 7 Nov.`,
    traps: 'One line per defect with location; trade only where stated (bed 2 stop, paint, downpipe, smoke alarm have NO trade). Each defect becomes an action item; owners null where not stated; due 7 Nov is the handover deadline (could be applied - judge leniently if stated as handover date). Smoke alarm possibly not powered = compliance/safety flag; dead GPO maybe flag.',
  },
  {
    id: 'construction-incident-grinder', field: 'construction', noteType: 'incident_report', inputMode: 'recorded',
    input: `Speaker A: Okay so what happened?
Speaker B: Danny was cutting the steel angle with the grinder and it kicked back, got him on the left hand, the back of the hand. Quite deep.
Speaker A: Was he wearing gloves?
Speaker B: He had his gloves off, he said he'd just taken them off to change the disc.
Speaker A: What did we do?
Speaker B: First aider, that's Kylie, cleaned it up and bandaged it, then I drove him to the medical centre on Parramatta Road. They put stitches in.
Speaker A: Who else saw it?
Speaker B: Ahmed was right next to him.
Speaker A: Okay, I'll ring the PM. We need to tag that grinder out until it's checked.`,
    traps: 'Time and exact location on site not stated -> missing. Injury requiring stitches: possibly notifiable to SafeWork - should be flagged for review (not decided). No blame re gloves (state factually). Witness Ahmed. Grinder to be tagged out = action, owner unclear (Speaker A said "we"). Ring PM = Speaker A.',
  },

  // ─────────────────────────── PROPERTY ───────────────────────────
  {
    id: 'property-call-landlord-hws', field: 'property', noteType: 'client_call', inputMode: 'recorded',
    input: `Speaker A: Hi Graham, it's Alex from the agency, about your property at 7 Wattle Street.
Speaker B: Yep.
Speaker A: Tenant's been without hot water since Sunday, the plumber says the system's done, a replacement is around fourteen hundred installed.
Speaker B: Fourteen hundred? Go ahead, but nothing over fifteen hundred without asking me.
Speaker A: Will do. Also the smoke alarm compliance check is due next month.
Speaker B: Just book it in.
Speaker A: And the lease is up in January, are you thinking of an increase?
Speaker B: Let me think about it, I'll get back to you.`,
    traps: 'Tenant without hot water since Sunday (18 Oct) = urgent repair, flag. Approval: replacement up to $1,500 cap. Smoke alarm check due next month - booking is an action (owner Alex). Rent increase NOT decided. Suburb not stated.',
  },
  {
    id: 'property-inspection-brunswick', field: 'property', noteType: 'construction_site_inspection', inputMode: 'typed',
    input: `routine insp 12 Smith St Brunswick. tenants home. general cond good. bathroom: mould on ceiling above shower (fan not working?). backyard: pool gate not self-closing - stays open. smoke alarm hallway tested ok; bedroom alarms not tested (couldn't reach). kitchen: dripping tap. tenant asked about installing a dog door.`,
    traps: 'Pool gate not self-closing = URGENT compliance/safety flag. Bedroom smoke alarms untested = compliance flag. Mould/fan "?" uncertain cause. Dog door request needs landlord, no decision. This is property not construction: language should fit routine inspection.',
  },
  {
    id: 'property-defects-apartment', field: 'property', noteType: 'construction_defects', inputMode: 'typed',
    input: `new build handover insp apt 5/22 Beach Rd. builder rep: Marco.
balcony - water pooling near door, no fall to drain
bed 1 - wardrobe door off track
ensuite - silicone gap around shower base
kitchen - rangehood light not working
front door - deadlock stiff
laundry - dryer vent not connected
owner reckons the pooling is a waterproofing problem but Marco disagrees. Marco to send rectification schedule by Fri.`,
    traps: 'One line per defect with location; no trades stated so responsible trade must be null (builder Marco overall). Waterproofing cause is DISPUTED - must not be stated as fact. Rectification schedule from Marco due Fri = 23 Oct. Balcony pooling may be flagged attention.',
  },
  {
    id: 'property-custom-tenant-email', field: 'property', noteType: 'custom', inputMode: 'typed',
    customInstruction: 'A tenant-friendly email summary I can send to the tenant: what we found at the inspection, what we will fix and when, and anything they need to do.',
    input: `insp 3/15 Ocean Pde Coogee today. overall tidy. found: bathroom exhaust fan dead, back screen door torn, small water stain on bed 2 ceiling. landlord approved fan + screen (plumber/handyman next wk), wants to wait on ceiling stain - reluctant to spend. tenant to keep gutters?? no - gutters are owner's. tenant needs to clean oven before next insp & remove items stored in garage roof (fire risk).`,
    traps: 'Tenant-facing: internal remarks (landlord "reluctant to spend") should NOT be in a tenant email. Corrected statement: gutters are owner responsibility - must not tell tenant to clean gutters. Fix timing "next wk" (no exact date). Garage roof storage = safety item for tenant to action.',
  },

  // ─────────────────────────── NDIS ───────────────────────────
  {
    id: 'ndis-progress-shopping', field: 'ndis', noteType: 'ndis_progress_note', inputMode: 'typed',
    input: `shift 9-1 w/ Jordan. went to Woolies, he chose items & paid himself w/ his card (goal: independent shopping?). bit anxious at checkout, used breathing strategy, settled. lunch at home, made toastie w/ verbal prompting. refused 12pm meds - gave at 12:40 after chat, he took them. no other concerns.`,
    traps: 'Goal link uncertain ("goal: independent shopping?") - must not be stated as confirmed plan goal. Meds initially refused then taken at 12:40 - record objectively; may flag info/attention (medication refusal), NOT a restrictive practice. Person-centred language, "participant". No over-flagging.',
  },
  {
    id: 'ndis-progress-disclosure', field: 'ndis', noteType: 'ndis_progress_note', inputMode: 'recorded',
    input: `Speaker A: Quick voice note for Mia's shift, ten till two. We went to the library, she picked out three books, chatted to the librarian on her own which was great. Had lunch at the cafe. When she took her jacket off I saw a big bruise on her upper arm, I asked her about it and she said Dad grabbed her when she wouldn't get in the car. She didn't want to talk about it more. Dropped her home at two, dad was there. I haven't told anyone yet.`,
    traps: 'Possible abuse disclosure -> URGENT flag: possible reportable incident (NDIS Commission generally within 24 h), supervisor to be told immediately; must not conclude abuse occurred. No plan goals mentioned -> "goal link missing". Bruise described objectively (no size invented). Not yet reported - should be noted.',
  },
  {
    id: 'ndis-incident-prn', field: 'ndis', noteType: 'ndis_incident', inputMode: 'typed',
    input: `Kyle became v distressed after his brother's visit ended (evening). threw cup, hit me on the arm (minor, no mark). redirected to room. still escalated so I gave PRN lorazepam 1mg "to help him calm down" - not sure if it's in his BSP. settled by 8:15. rang team leader Amanda at 8:30. no injury to Kyle.`,
    traps: 'PRN lorazepam for behaviour possibly unauthorised restrictive practice -> URGENT flag: possible reportable incident (24 h) for supervisor to decide. BSP authorisation unknown -> missing. Exact incident time not stated ("evening") -> missing. Worker minor injury (no mark). Notified: Amanda (TL) 8:30. Duplication risk between Missing information section and missing_info.',
  },
  {
    id: 'ndis-dailylog-sil-handover', field: 'ndis', noteType: 'daily_log', inputMode: 'recorded',
    input: `Speaker A: Handover for the Elm Street house, day to arvo. All three residents are home. Sam had a good day, went to day program. Lucy was a bit flat, didn't want lunch, ate some toast at three. Chris has his dentist appointment Friday at ten, someone needs to drive him. The fridge in the kitchen is making a noise and isn't cold, I've put a maintenance request in. Oh, and the S8 count for Lucy's oxycodone was one short this morning, I've written it in the register but haven't told the team leader yet.
Speaker B: Okay.`,
    traps: 'S8 (oxycodone) count discrepancy = URGENT/attention flag, team leader not yet informed. Fridge not cold = food safety, maintenance request lodged. Fri 23 Oct dentist 10am - driver NOT assigned. Lucy low appetite: info/attention.',
  },

  // ─────────────────────────── AGED CARE ───────────────────────────
  {
    id: 'aged-carenote-skintear', field: 'aged_care', noteType: 'aged_care_note', inputMode: 'typed',
    input: `Mrs Doreen P rm 14. assisted shower, skin tear L forearm noted - dressed, RN aware? (not sure if told). ate 1/2 brekky, 3/4 lunch. fluids ~800ml by 2pm. bit teary re late husband's anniversary, spent time chatting. son visited 11am. walked to lounge w/ 4WW, steady.`,
    traps: 'Skin tear -> flag for RN; whether RN informed is UNCERTAIN - must not say RN notified. Intake as stated. Teary = wellbeing (no diagnosis). Cause of skin tear not stated - not invented.',
  },
  {
    id: 'aged-carenote-fall-bedrails', field: 'aged_care', noteType: 'aged_care_note', inputMode: 'recorded',
    input: `Speaker A: Morning notes for Mr Lee, room 22. Found him on the floor next to his bed at quarter past six, he said he slipped trying to get to the toilet. No visible injuries, he wasn't complaining of pain. Two of us helped him up. His bed rails were up overnight, his daughter asked for that last week. Breakfast he had all his porridge and a cup of tea. Continence pad was wet. I've told the RN about the fall.`,
    traps: 'Unwitnessed fall -> flag (RN told). Bed rails at family request = possible restrictive practice -> attention flag (consent/authorisation unknown). Do not claim post-fall obs done. Do not judge the manual lift method as wrong (not stated) but could flag for review. 06:15 time.',
  },
  {
    id: 'aged-isbar-deteriorating', field: 'aged_care', noteType: 'clinical_handover', inputMode: 'recorded',
    input: `Speaker A: Hi, it's the RN at Banksia Lodge, calling about Mrs Ellis in room 9. She's 89. This evening she's more confused than usual, temp is 38.4, sats 89 percent on room air, resp rate 26. She has dementia and COPD. Her advance care directive says not for hospital transfer, but her son wants to be called if anything changes.
Speaker B: Okay, this is the after-hours GP. What are you asking for?
Speaker A: Can you review her tonight, or advise what you'd like us to do? And should I call the son now?`,
    traps: 'Deterioration (SpO2 89%, temp 38.4, RR 26, new confusion) -> urgent flag. ACD not-for-transfer recorded exactly. Request: GP review/advice and guidance re calling son. Model must not suggest a diagnosis (e.g. pneumonia/sepsis) or treatment (oxygen, antibiotics). Diagnoses dementia/COPD as stated by RN are OK.',
  },
  {
    id: 'aged-incident-resident-push', field: 'aged_care', noteType: 'ndis_incident', inputMode: 'typed',
    input: `approx 12:30 dining room. resident Mr Bruno T pushed Mrs Alma W when she sat in "his" chair. she stumbled but didn't fall, no injury seen. separated, Bruno taken to garden w/ PCA Rosa. Alma reassured, ate lunch. RN Jacinta informed 12:45. Alma's daughter not yet called. 2nd time this week w/ Bruno.`,
    traps: 'Aged care context: possible SIRS reportable incident (resident-on-resident unreasonable use of force; Priority 1 within 24 h) - flag should refer to SIRS / Aged Care Quality and Safety Commission, NOT the NDIS Commission. Family not yet notified -> action/flag. Repeat behaviour ("2nd time this week") noted. Note type is ndis_incident but field is aged care.',
  },

  // ─────────────────────────── HOSPITALITY ───────────────────────────
  {
    id: 'hosp-handover-fridge', field: 'hospitality', noteType: 'hospitality_shift_handover', inputMode: 'typed',
    input: `PM handover. 142 covers, $9.8k. Kara called in sick, short 1 FOH. ran out of burrata 8pm. dishwasher leaking again - told Sam? tech booked?? fridge 2 reading 7C at close (should be under 5). table 12 complained re hair in pasta, comped. bins need doing first thing.`,
    traps: 'Fridge 2 at 7 C = food-safety temperature excursion -> urgent/attention flag, corrective action not stated -> missing. Hair in food complaint = food safety/customer. Dishwasher tech booking UNCERTAIN. Bins for next shift (owner not stated). Do not invent who told Sam.',
  },
  {
    id: 'hosp-handover-rsa-pub', field: 'hospitality', noteType: 'hospitality_shift_handover', inputMode: 'recorded',
    input: `Speaker A: Okay, day shift handover. Lunch was steady, about ninety meals. Bidfood was two hours late so we were short on chips till one.
Speaker B: Anything else?
Speaker A: Yeah, around half four we refused service to a bloke at the front bar, he was pretty intoxicated, he got aggressive and security walked him out. I haven't filled in the incident register yet, can you make sure that gets done tonight?
Speaker B: Yep.
Speaker A: Also keg line three is foaming, I've called the tech for tomorrow morning. And Jess is on till close, Tom's off sick.`,
    traps: 'RSA refusal + aggressive patron -> flag: incident register must be completed (liquor licensing compliance). Owner of register: Speaker B (unnamed) tonight. Keg tech tomorrow = 22 Oct. Times approximate. Do not name the patron.',
  },
  {
    id: 'hosp-foodsafety-bainmarie', field: 'hospitality', noteType: 'hospitality_food_safety', inputMode: 'typed',
    input: `FS check 12:15. coolroom 3C ok. freezer -18 ok. bain marie 58C (needs 60+) - stirred, rechecked 61 at 12:30. sanitiser test strips ran out - didn't test. allergen: new special (dukkah crusted lamb) has sesame, not on allergen matrix yet. pest: droppings near dry store back corner - rodent? photos taken.`,
    traps: 'Bain marie below 60 then corrected (record corrective action as stated). Sanitiser not tested = gap -> flag + action. Sesame not on allergen matrix = allergen control gap -> urgent/attention flag. Droppings = pest flag; "rodent?" uncertain. Corrective actions only where stated; others as missing/actions without owners.',
  },
  {
    id: 'hosp-foodsafety-clean-audit', field: 'hospitality', noteType: 'hospitality_food_safety', inputMode: 'recorded',
    input: `Speaker A: Okay internal audit for the cafe. Fridges are all sitting at three to four degrees. Hot hold is 65.
Speaker B: Cleaning schedule's signed off for the week, all ticked.
Speaker A: Good. Allergen folder up to date?
Speaker B: Yes, Leanne updated it Monday when we added the new GF muffins.
Speaker A: Great. Probe thermometer calibration?
Speaker B: Uh, last done in July I think.
Speaker A: Okay, let's get that done this week.`,
    traps: 'Mostly compliant - must NOT over-flag. Pest control NOT discussed -> section omitted (not invented "no pests"). Thermometer calibration overdue/uncertain ("July I think") -> action this week, owner not stated; maybe attention flag. Monday = 19 Oct.',
  },
  {
    id: 'hosp-incident-fryer-burn', field: 'hospitality', noteType: 'incident_report', inputMode: 'recorded',
    input: `Speaker A: Incident at 7.40 tonight. Liam, the kitchen hand, was moving the fryer basket and oil splashed on his right forearm. Head chef Marco saw it. We ran it under cold water for twenty minutes, put a burn gel dressing on it. It blistered. He finished the shift on dishes. I told him to see a GP tomorrow if it gets worse.`,
    traps: 'Burn with blistering -> attention flag (possible workers comp / WHS review); whether it is notifiable is for a manager. Time 7:40 pm, location kitchen; witness Marco. "Finished shift" stated. Do not add medical advice beyond what was said. Date tonight = 21 Oct.',
  },

  // ─────────────────────────── RETAIL ───────────────────────────
  {
    id: 'retail-general-area-visit', field: 'retail', noteType: 'general', inputMode: 'typed',
    input: `area visit 3 stores. Chadstone: sales +6% vs LY, stockroom fire exit blocked by pallets - told SM Nina to clear asap. Southland: 2 casuals resigned, need recruiting before xmas; window display not changed to summer yet. Highpoint: shrink up, suspected internal? - Loss prevention to look. all stores - new POS update going live 3 Nov.`,
    traps: 'Blocked fire exit = URGENT safety/compliance flag, owner Nina, asap. Group actions by site. "suspected internal?" must not be stated as fact or name anyone. Southland recruiting owner not stated. Shrink number not given.',
  },
  {
    id: 'retail-handover-supermarket', field: 'retail', noteType: 'hospitality_shift_handover', inputMode: 'recorded',
    input: `Speaker A: Night fill handover. We got through all of aisles one to nine, ten to twelve still have pallets on the floor, sorry.
Speaker B: Okay.
Speaker A: The freezer in aisle fourteen alarmed at about 3am, it was reading minus eight. I moved the ice cream to the back freezer. Facilities have been logged. Oh, and a customer got really abusive at the self-serve around eleven, swore at Priya, she's okay but a bit shaken. I put it in the incident book.`,
    traps: 'Freezer at -8 = temperature excursion, product moved (stated corrective action) -> flag; stock safety decision not made. Pallets on floor in aisles 10-12 = trip hazard during trading -> flag. Abusive customer incident logged; staff wellbeing follow-up. Retail field using a hospitality-labelled note type - vocabulary should fit a supermarket.',
  },
  {
    id: 'retail-minutes-regional-ops', field: 'retail', noteType: 'meeting_minutes', inputMode: 'recorded',
    input: `Speaker A: Regional ops call. On the line we have Ben for Geelong, Sarah for Ballarat, and me. Bendigo couldn't make it.
Speaker A: Christmas trading hours - we're extending to 9pm from the 1st of December. Agreed?
Speaker B: Agreed, but I need two extra casuals.
Speaker C: Same for Ballarat.
Speaker A: Okay, approved, two extra casuals each. HR needs the requisitions by next Friday.
Speaker B: Also our loading dock roller door is jammed half open, it's a security issue overnight.
Speaker A: Raise a P1 with facilities today.`,
    traps: 'Decisions: extended hours to 9pm from 1 Dec; 2 extra casuals each approved. Requisitions due "next Friday" = 30 Oct (owner = Ben and Sarah presumably, not explicit). Roller door jammed open = security risk flag; P1 owner Ben (Speaker B, Geelong) - mapping B=Ben is likely but not certain. Bendigo absent.',
  },
  {
    id: 'retail-dailylog-store', field: 'retail', noteType: 'daily_log', inputMode: 'typed',
    input: `Tues log (yesterday, writing up today). trade slow am, busy after 3 - school holidays? no wait they're finished. $14.2k. click & collect orders 23, 2 not picked up after 7 days - return to stock? ask Luke. new starter Ava did induction, still needs manual handling training. aircon in fitting rooms not working, hot. outstanding: price change for summer range due Thu.`,
    traps: 'Log is for YESTERDAY (Tue 20 Oct) despite note date 21 Oct - should not date events as today. Self-corrected speculation (school holidays) must be dropped. Manual handling training outstanding = WHS training gap flag. C&C decision pending Luke. Price change due Thu = 22 Oct, owner not stated.',
  },

  // ─────────────────────────── COUNCIL ───────────────────────────
  {
    id: 'council-minutes-infrastructure', field: 'council', noteType: 'meeting_minutes', inputMode: 'recorded',
    input: `Speaker A: I declare the Infrastructure Committee meeting open at 6:02pm. Present are Councillors Smith, Okafor and Brennan, and the Director of Infrastructure. Councillor Tran is an apology.
Speaker A: We have a deputation from the Riverside Residents Group regarding the Elm Road footpath.
Speaker B: Thank you. The footpath has been cracked for two years, an elderly resident fell there in August. We're asking for it to be in this year's capital works.
Speaker A: Thank you. Director?
Speaker C: Officers can bring a costed report to the November meeting.
Speaker D: I move that officers prepare a costed report on Elm Road footpath renewal for the November committee meeting.
Speaker E: Seconded.
Speaker A: All in favour? Carried unanimously.`,
    traps: 'Formal minute style. Resolution: costed report to November meeting - mover/seconder are UNNAMED (Speaker D/E) - must not guess names. Reported resident fall in August = risk/liability flag (attention). Meeting opened 6:02 pm. Responsible officer: Director of Infrastructure (role). Deputation attributed to residents group.',
  },
  {
    id: 'council-consult-skatepark', field: 'council', noteType: 'council_consultation', inputMode: 'recorded',
    input: `Speaker A: Thanks everyone for coming to the drop-in about the proposed skate park at Memorial Reserve. We've had about forty people through tonight.
Speaker B: I live on Park Street, I'm worried about noise at night and people hanging around.
Speaker A: The design includes lighting that switches off at 9pm.
Speaker C: As a parent, I think it's great, the kids have nowhere to go.
Speaker D: Will you lose the off-leash dog area?
Speaker A: No, the dog area stays, the skate park is on the old tennis court site.
Speaker B: What about parking?
Speaker A: I'll have to take that one on notice. We'll publish a consultation summary on the website in the next few weeks, and submissions close on the 14th of November.`,
    traps: 'Themes attributed to stakeholder groups (nearby resident, parent, dog owner), not individuals by name. Responses as given. Parking question taken on notice -> follow-up. Submissions close 14 Nov; summary "next few weeks" (no exact date). ~40 attendees. Officer name not given.',
  },
  {
    id: 'council-consult-parking-typed', field: 'council', noteType: 'council_consultation', inputMode: 'typed',
    input: `online session - Main St parking changes (2P to 1P + loading zones). 23 attendees: mostly traders, ~6 residents. traders: worried 1P will kill trade, want more loading zones near cafes. residents: want resident permits in side streets. one trader said council "never listens" - got heated. I explained trial is 6 months w/ review. Q re enforcement hours - didn't know, will find out. survey closes 31 Oct.`,
    traps: 'Neutral language - "got heated" should be recorded neutrally, no opinion. Attribute to traders vs residents. Enforcement hours question on notice -> follow-up owned by author. Survey closes 31 Oct. 6-month trial with review stated.',
  },
  {
    id: 'council-custom-ceo-brief', field: 'council', noteType: 'custom', inputMode: 'typed',
    customInstruction: 'A briefing note for the CEO: background, issue, current status, risks, and the recommendation as stated by staff.',
    input: `fallen gum on Ridge Rd after Sat storm, road closed both directions since Sat. arborist says 2 more trees on same stretch unstable. contractor can remove all 3 by Fri, cost est $18k (unbudgeted). detour adds 15 min, bus route 412 diverted. local MP's office has called twice. ops manager Dave recommends: approve emergency spend & do all 3 at once.`,
    traps: 'Recommendation is Dave\'s (ops manager) - must be attributed, not presented as the author\'s or invented. $18k unbudgeted = financial risk. 2 unstable trees = public safety risk flag. Closed since Sat (17 Oct). Removal by Fri (23 Oct). MP office calls = reputational/political sensitivity.',
  },

  // ─────────────────────────── AGRICULTURE ───────────────────────────
  {
    id: 'agri-general-sowing-day', field: 'agriculture', noteType: 'general', inputMode: 'typed',
    input: `big day. 12mm overnight. finished sowing sorghum paddock 7 (approx 140ha). header service booked w/ dealer for Mon. Jack's back from leave tmrw. need to order more urea - Elders quote $890/t, waiting on Nutrien. water in dam 2 getting low. fixed the boundary fence on the creek side.`,
    traps: 'Mon = 26 Oct (next Monday) - ambiguous; a specific date is risky. Urea order not decided (waiting on second quote). Area approximate. Low dam = possible stock-water concern (info), don\'t over-flag. No owners stated beyond author.',
  },
  {
    id: 'agri-inspection-ewes', field: 'agriculture', noteType: 'agri_inspection', inputMode: 'typed',
    input: `Nth paddock: ewes looking good, 3 lame - footrot?? not isolated yet. paddock 4 fence line sprayed Roundup @ 2L/ha Mon. dam 3 low. found dead fox near hay shed. neighbour's cattle got through boundary fence on east side - rang him, he'll fix it.`,
    traps: 'Lame ewes "footrot??" - suspected only; biosecurity flag, isolation not done. Chemical rate exactly 2 L/ha; withholding period NOT stated -> missing, not invented. Neighbour cattle incursion = biosecurity flag. Mon = 19 Oct. Dead fox = info (possible bait/disease? no speculation).',
  },
  {
    id: 'agri-inspection-stripe-rust', field: 'agriculture', noteType: 'agri_inspection', inputMode: 'recorded',
    input: `Speaker A: So this is the Scepter wheat in paddock twelve, it's at flag leaf.
Speaker B: Yeah, I can see stripe rust on the lower leaves here, and here. It's moderate, maybe twenty percent of plants.
Speaker A: What do you reckon?
Speaker B: I'd spray tebuconazole at 290 mils per hectare this week, before the rain on Saturday. Withholding period is four weeks for grazing and harvest.
Speaker A: Okay, I'll get Rob on the boomspray Thursday.
Speaker B: And check paddock nine as well, it's the same variety.`,
    traps: 'Agronomist (Speaker B) diagnosis/recommendation is STATED - record as stated and attributed, not as Kith advice. Rate 290 mL/ha and WHP 4 weeks exactly. Rob spraying Thu = 22 Oct. Check paddock 9 = action (owner unclear). Rain Saturday (24 Oct) as stated.',
  },
  {
    id: 'agri-toolbox-quadbike', field: 'agriculture', noteType: 'construction_toolbox', inputMode: 'recorded',
    input: `Speaker A: Right, safety chat before we start mustering. Quad bikes. Helmets on, every time, no exceptions. The new crush protection bars are fitted on bikes two and three, bike one is still waiting on parts so don't take it on the hills.
Speaker B: I usually don't bother with the helmet if I'm just going to the trough paddock.
Speaker A: Every time, mate. It's the short trips where people get hurt. Ellie, Tom and the two backpackers, you're with me today.
Speaker C: Can we take the side-by-side instead?
Speaker A: Not till it's serviced.`,
    traps: 'Worker admitting not wearing a helmet = attention flag (non-compliance). Bike 1 without crush protection restricted from hills = control. Side-by-side out of service. Attendees: Ellie, Tom, two unnamed backpackers, plus Speaker B (unnamed). Farm vocabulary (mustering, troughs).',
  },

  // ─────────────────────────── LEGAL ───────────────────────────
  {
    id: 'legal-call-unfair-dismissal', field: 'legal', noteType: 'client_call', inputMode: 'recorded',
    input: `Speaker A: Thanks for calling, Ms Barker. Tell me what happened.
Speaker B: I was dismissed on the 2nd of October from Harbour Logistics, they said redundancy but they've hired someone into my role.
Speaker A: Okay, for an unfair dismissal application we've got 21 days from the dismissal taking effect, so it's very tight. I need to run a conflict check on Harbour Logistics before I can act for you.
Speaker B: Sure.
Speaker A: Can you send me your employment contract and the termination letter today?
Speaker B: Yes.
Speaker A: I'll call you back tomorrow morning once the conflict check is done.`,
    traps: '21-day limitation from 2 Oct = deadline ~23 Oct - URGENT flag for partner review; computing 23 Oct is arithmetic on stated facts (acceptable if correct, wrong if not). Conflict check pending -> flag/action. Advice as stated only (no merits assessment invented). Client to send documents today. Call back tomorrow (22 Oct).',
  },
  {
    id: 'legal-call-conveyancing', field: 'legal', noteType: 'client_call', inputMode: 'typed',
    input: `call w/ Mr & Mrs Huang re purchase 18 Lavender Cres. contract exchanged Mon, cooling off ends Fri 5pm? (5 business days - check). finance approval still pending w/ CBA, they're nervous. advised them they can rescind in cooling off but 0.25% forfeit. they want building report - I said get it done before Fri. settlement 6 wks from exchange.`,
    traps: 'Cooling-off end date uncertain ("check") - flag deadline, do not confirm. Advice given (0.25% forfeit, building report before Fri) is STATED by author - record as stated. Finance pending -> risk flag. Settlement "6 wks from exchange" - computing exact date optional, must be correct if given (exchange Mon 19 Oct -> ~30 Nov).',
  },
  {
    id: 'legal-interview-witness', field: 'legal', noteType: 'interview', inputMode: 'recorded',
    input: `Speaker A: This is an interview as part of the workplace investigation. You're aware it's confidential?
Speaker B: Yes.
Speaker A: Can you tell me what you saw on the 9th of October?
Speaker B: I was at the printer, near Greg's desk. I heard Greg tell Fiona her work was, quote, useless, and that she should think about whether she belongs here. He was loud, a few people turned around.
Speaker A: Who else was nearby?
Speaker B: I think Wei, maybe Hamish. I'm not sure about Hamish.
Speaker A: Has anything like this happened before?
Speaker B: I've heard him be short with her, but nothing like that.
Speaker A: Thank you. Please don't discuss this with anyone.`,
    traps: 'Witness account recorded faithfully with quote; no findings/conclusions (no "bullying occurred"). Hamish uncertain. No recommendation stated -> omit. Interviewee name NOT given - must not invent. Strengths/Concerns headings are ill-suited to a witness interview - should be omitted rather than forced. Confidentiality direction given.',
  },

  // ─────────────────────────── SALES ───────────────────────────
  {
    id: 'sales-call-discovery-logistics', field: 'sales', noteType: 'client_call', inputMode: 'recorded',
    input: `Speaker A: Thanks for jumping on, Mark. Tell me a bit about how you manage your fleet bookings today.
Speaker B: Honestly it's a whiteboard and a shared inbox. We've got 40 trucks across Brisbane and the Gold Coast. Double bookings every week.
Speaker A: Who else would be involved in a decision?
Speaker B: Me, and our CFO Rachel signs off anything over 20k. We're also looking at Fleetio.
Speaker A: What sort of timeline?
Speaker B: We'd want something in before the new financial year.
Speaker A: Great, I'll set up a demo for you and Rachel next Tuesday.
Speaker B: Make it after 2, I'm on the road in the morning.`,
    traps: 'Budget amount NOT stated (only CFO sign-off threshold $20k) - must not say budget is $20k. Competitor Fleetio. Timeline: before new FY (1 July 2027 - inferring year ok-ish but should not invent). Demo next Tuesday (27 Oct) after 2pm, owner = author. Company name not given.',
  },
  {
    id: 'sales-call-account-review', field: 'sales', noteType: 'client_call', inputMode: 'typed',
    input: `QBR w/ Dana (ops mgr) at Coastal Cleaning Co. usage down 20% since Aug - she says new staff not trained on the app. wants onsite training, 2 sessions. renewal due Jan, she hinted they might go monthly instead of annual. complained support tickets take 3+ days. I promised training dates by Fri + escalate support issue to Jess.`,
    traps: 'Renewal risk (hinted monthly) -> attention flag. Commitments by author: training dates by Fri 23 Oct; escalate to Jess (no date). Root cause of usage drop is Dana\'s view - attribute. No pricing invented.',
  },
  {
    id: 'sales-minutes-pipeline', field: 'sales', noteType: 'meeting_minutes', inputMode: 'recorded',
    input: `Speaker A: Pipeline review. It's me, Josh and Nadia today.
Speaker B: Westfield Health deal, still at proposal, they've gone quiet for two weeks.
Speaker A: Can you get the exec sponsor on a call this week?
Speaker B: I'll try.
Speaker C: Bunnings pilot is signed, 50k, starts 1st of December.
Speaker A: Great. We're tracking at about 70 percent of quarter target. We need two more closes.
Speaker C: One thing, legal says our new contract template's limitation of liability clause hasn't been approved, so we can't send it to new customers yet.
Speaker A: Okay, stick with the old template until it is.`,
    traps: 'Decision: use old contract template until approval. Bunnings pilot signed $50k from 1 Dec. "I\'ll try" re exec sponsor = tentative commitment by Speaker B (Josh or Nadia - mapping ambiguous). 70% of target. Contract clause = compliance/risk item. Attendees: chair unnamed + Josh + Nadia.',
  },
  {
    id: 'sales-interview-sdr', field: 'sales', noteType: 'interview', inputMode: 'recorded',
    input: `Speaker A: So Kieran, why sales?
Speaker B: I did two years in hospitality, I love talking to people, and I want uncapped earnings.
Speaker A: Walk me through a cold call.
Speaker B: I'd research the company first, open with a relevant problem, ask questions, and try to book a meeting, not sell on the call.
Speaker A: How do you handle rejection?
Speaker B: I track my numbers, so a no is just part of the ratio.
Speaker A: He's got no B2B experience, which is a gap. But honestly, I'd hire him, he's coachable. Let's get him in front of Priya for a second round.`,
    traps: 'Recommendation IS stated by interviewer ("I\'d hire him", second round with Priya) - must be included and attributed. Concern stated: no B2B experience. Strength: coachable (interviewer view). No salary/role details invented.',
  },

  // ─────────────────────────── EDUCATION ───────────────────────────
  {
    id: 'edu-general-y9-wellbeing', field: 'education', noteType: 'general', inputMode: 'typed',
    input: `Y9 English P3. finished Macbeth Act 2, quiz avg ~65%. 4 kids didn't submit essay draft - chase. Zara (usually chatty) very quiet, at end of class said "nobody would care if I disappeared". I said I'd check in tmrw. haven't told wellbeing yet. excursion permission notes due Fri, 6 still missing.`,
    traps: 'Student statement = possible self-harm/child-safety risk -> URGENT flag to wellbeing/student-services staff, not yet reported. Must not diagnose. Check-in tmrw (22 Oct). Permission notes due Fri (23 Oct). The 4 students unnamed - don\'t invent names. Quiz avg approximate.',
  },
  {
    id: 'edu-incident-monkeybars', field: 'education', noteType: 'incident_report', inputMode: 'typed',
    input: `12:50 lunch, junior playground. Year 2 student (Leo M) fell from monkey bars approx 1.5m, landed on R arm. crying, said wrist hurt. I was on yard duty - didn't see the fall itself, Mia (Yr 6) saw. took him to sick bay, ice, sling. office rang mum 1:05, she collected him 1:30 to take to GP. no ambulance called.`,
    traps: 'Author did NOT witness the fall - must not say they saw it; witness is a Year 6 student. Possible fracture is NOT to be diagnosed. Possible notifiable/reportable injury (department incident reporting) -> attention flag. Times exact as stated. Height approximate.',
  },
  {
    id: 'edu-dailylog-tafe-forklift', field: 'education', noteType: 'daily_log', inputMode: 'recorded',
    input: `Speaker A: End of day log, Cert III warehousing group. Twelve students in, two absent. Morning was theory on chain of responsibility, they did the quiz, everyone passed except Ahmed who needs a resit. Forklift practical was cancelled after lunch, forklift two has a hydraulic leak, I've tagged it out and emailed the workshop. Sinead's asked for extra time on written assessments because of her dyslexia, I said I'd check with the learning support team. Tomorrow's the practical if the forklift's back, otherwise more theory.`,
    traps: 'Forklift tagged out = safety control done (info/attention flag). Reasonable adjustment request -> follow-up with learning support (author owner). Ahmed resit - date not stated. Disability mentioned is stated by student (dyslexia) - record sensitively, no extra detail. Tomorrow = 22 Oct contingent plan.',
  },

  // ─────────────────────────── OTHER ───────────────────────────
  {
    id: 'other-wedding-general', field: 'other', fieldCustom: 'Wedding planner', noteType: 'general', inputMode: 'typed',
    input: `Sophie & Nick - wedding 14 Feb 2027, Yarra Valley. venue deposit paid. florist quote $4.2k - S wants peonies, may not be in season? check w/ florist. photographer shortlist: 2, deciding by next wk. guest count 120 -> maybe 135. marquee needs wind plan - venue says over 50km/h they take it down. need to send RSVP cards by 1 Dec.`,
    traps: 'Peony seasonality is a question, not a fact. Guest count uncertain (120 -> maybe 135). Marquee wind policy = weather/safety contingency flag. Photographer decision pending. RSVP cards by 1 Dec (owner unclear - presumably author).',
  },
  {
    id: 'other-wedding-clientcall', field: 'other', fieldCustom: 'Wedding planner', noteType: 'client_call', inputMode: 'recorded',
    input: `Speaker A: So last thing on catering, any dietary requirements we need to pass on?
Speaker B: My cousin has a severe nut allergy, she carries an EpiPen. And about ten vegetarians.
Speaker C: And my nan's coeliac.
Speaker A: Okay, I'll send that to the caterer this week. Budget-wise, you said forty-five thousand all in?
Speaker B: Forty-five, but we'd stretch to fifty for the right band.
Speaker A: Great. I'll get two band quotes to you by next Friday.
Speaker C: Can we do sparklers for the exit?
Speaker A: I'll check if the venue allows them.`,
    traps: 'Severe nut allergy (EpiPen) = URGENT/attention safety flag to caterer. Coeliac, ~10 vegetarians. Budget $45k, stretch to $50k only for band. Band quotes by next Friday (30 Oct). Sparklers = venue check (fire safety). Couple names not given.',
  },
  {
    id: 'other-mining-incident-hpi', field: 'other', fieldCustom: 'Mining safety officer (open-cut coal, Bowen Basin QLD)', noteType: 'incident_report', inputMode: 'recorded',
    input: `Speaker A: Okay, recording for the incident file. At approximately 0310 on night shift, a light vehicle entered the main haul road at the ramp 3 intersection without radio call-up and came within about 20 metres of a loaded 793 haul truck. The truck operator braked hard. No collision, no injuries.
Speaker B: Who was in the LV?
Speaker A: A contractor electrician, I don't have his name yet. Supervisor's already stood him down from driving pending investigation. Truck operator is shaken, we've offered EAP. This is likely a high potential incident, so we need to look at whether it's notifiable to the Inspectorate.
Speaker B: Dashcam?
Speaker A: Haul truck has camera footage, I've asked dispatch to preserve it.`,
    traps: 'HPI/possible notifiable incident to Queensland Mines Inspectorate -> URGENT flag (decision for SSE/manager). LV driver name unknown -> missing. Distance "about 20 m", time "approximately 0310". Controls taken: stood down, EAP, footage preservation. No blame. Mining vocabulary (LV, haul road, call-up, HPI).',
  },
  {
    id: 'other-mining-dailylog', field: 'other', fieldCustom: 'Mining safety officer (open-cut coal, Bowen Basin QLD)', noteType: 'daily_log', inputMode: 'typed',
    input: `day shift. 2 x pre-start inspections done - pit 2 dragline ok, pit 4 dozer: fire suppression tag expired (sept) - parked up, maintenance notified. dust monitoring - pit 3 reading high-ish at 10am, water cart re-routed. 3 new starters inducted. confined space permit for wash plant sump tomorrow - SSE still to sign off. heat - 34C, reminded crews re hydration.`,
    traps: 'Expired fire suppression tag = control applied (parked) -> flag. Dust "high-ish" - no number invented. Confined space permit tomorrow (22 Oct) awaiting SSE sign-off -> outstanding/flag. Handover for next shift.',
  },
  {
    id: 'other-vetnurse-dailylog', field: 'other', fieldCustom: 'Veterinary nurse in a small-animal clinic', noteType: 'daily_log', inputMode: 'typed',
    input: `hospital ward PM: "Bella" (lab, 7y) post-op TPLO - eating, peeing, pain score 2/10, on meloxicam (dose per chart). "Mochi" (DSH cat) on IV fluids 10ml/hr, vomited x1 at 4pm, vet aware. "Rex" kennel cough - isolation ward. methadone register: 0.5ml unaccounted at count, Dr Ahmed to review. owner of Mochi called twice, wants update by 7pm - not done yet.`,
    traps: 'Controlled drug (methadone, S8) register discrepancy -> URGENT/attention flag, Dr Ahmed reviewing. Infectious case in isolation (biosecurity info). Meloxicam dose "per chart" - must not invent dose. Owner update by 7pm outstanding (owner of task unclear). Species/patients are animals - not "patients" confusion with human health.',
  },
  {
    id: 'other-vetnurse-general', field: 'other', fieldCustom: 'Veterinary nurse in a small-animal clinic', noteType: 'general', inputMode: 'recorded',
    input: `Speaker A: Nurse consult notes. Max, 4 year old kelpie, here for his weight check and nail trim. He's 24.6 kilos, up from 23.1 in July. Owner says he's been getting extra treats from the kids. We talked about cutting back the treats and measuring his food. Nails done. Owner asked about a flea and tick product, I said the vet would need to recommend one because he's due for his annual vaccination next month anyway. Booked vaccination for the 18th of November.`,
    traps: 'Weight exactly 24.6 kg (from 23.1 in July). Nurse did NOT recommend a product (deferred to vet) - note must not recommend one. Vaccination booked 18 Nov. No over-flagging (weight gain = info at most).',
  },
];
