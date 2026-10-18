/**
 * lib/copilot/rules.ts
 *
 * Instant (no-AI, <1 ms) cards for the live call copilot:
 *   - GLOSSARY: plain-English definitions when the other side uses a term
 *   - RED_LINES: our agreed position when a sensitive topic comes up
 * Source of truth: docs/partnerships/steve-agi-c51/{glossary,decisions,money-plan}.md
 */

export type GlossaryEntry = { term: string; match: RegExp; def: string };
export type RedLine = { id: string; match: RegExp; say: string };

const w = (s: string) => new RegExp(`\\b(${s})\\b`, 'i');

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'NDIS', match: w('NDIS'), def: 'National Disability Insurance Scheme: govt funding for disability supports (~700k people).' },
  { term: 'NDIA', match: w('NDIA'), def: 'Agency that RUNS the NDIS: approves people, funds plans.' },
  { term: 'NDIS Commission', match: w('commission|quality and safeguards'), def: 'The REGULATOR: registers/audits providers, gets incident reports.' },
  { term: 'Participant', match: w('participants?'), def: 'Person with disability on the NDIS. Never say "patient".' },
  { term: 'Provider', match: w('registered providers?|unregistered'), def: 'Registered = audited, strict rules, most paperwork → best target.' },
  { term: 'SIL', match: w('SIL|supported independent living'), def: 'Supported Independent Living: 24/7 support in shared houses. Registration deadline 1 Oct 2026 → first audits now.' },
  { term: 'SDA', match: w('SDA|specialist disability accommodation'), def: 'Specialist Disability Accommodation: the housing itself.' },
  { term: 'STA', match: w('STA|respite|short term accommodation'), def: 'Short Term Accommodation / respite stays.' },
  { term: 'Support worker', match: w('support workers?'), def: 'Frontline staff; write shift notes on phones. Our "raw notes" user.' },
  { term: 'Support coordinator', match: w('support coordinat(or|ors|ion)'), def: 'Helps participants use their plan; writes reports.' },
  { term: 'Plan manager', match: w('plan manag(er|ers|ed|ement)'), def: 'Handles participant invoices/payments.' },
  { term: 'LAC', match: w('LAC|local area coordinator'), def: 'Local Area Coordinator: community partner helping with plans.' },
  { term: 'Plan review', match: w('plan review|reassessment|progress reports?'), def: 'NDIA re-checks plan; provider reports = evidence for funding.' },
  { term: 'Goal-linked notes', match: w('goals?|goal[- ]linked'), def: 'Notes must tie to plan goals; "helped with shopping" alone fails audit.' },
  { term: 'Case / progress notes', match: w('case notes?|progress notes?|shift notes?'), def: 'Record after each shift/session. Same thing, different names.' },
  { term: 'Incident report', match: w('incidents?|reportable'), def: 'Most reportable incidents → Commission within 24 h; follow-up within 5 business days.' },
  { term: 'Restrictive practices', match: w('restrictive practices?|restraint|seclusion'), def: 'Restraint/seclusion/locking things: heavily regulated, reported monthly.' },
  { term: 'PRN', match: w('PRN'), def: '"As needed" medication. Given for agitation → may be a chemical restraint.' },
  { term: 'Behaviour support', match: w('behaviour support|BSP|behaviours? of concern'), def: 'Specialists writing Behaviour Support Plans.' },
  { term: 'Practice Standards', match: w('practice standards?|quality indicators?'), def: 'The NDIS audit rulebook. Failure = "non-conformity".' },
  { term: 'Verification / certification', match: w('verification|certification audit'), def: 'Light audit vs full audit (SIL, behaviour support get full).' },
  { term: 'Non-conformity', match: w('non[- ]?conformit(y|ies)'), def: 'An audit failure finding. Providers dread these.' },
  { term: 'Worker screening', match: w('worker screening'), def: 'Background check every NDIS worker needs.' },
  { term: 'Allied health', match: w('allied health'), def: 'Psychologists, OTs, speech, physio. Kith\'s home turf.' },
  { term: 'OT', match: w('OTs?|occupational therap(y|ist|ists)'), def: 'Occupational therapist: big in NDIS.' },
  { term: 'Speechie', match: w('speechies?|speech path(ologist|ology)'), def: 'Speech pathologist.' },
  { term: 'Ahpra', match: w('ahpra'), def: 'Registers health practitioners; AI-scribe guidance: consent + practitioner checks notes.' },
  { term: 'AI scribe', match: w('scribes?|heidi|lyrebird'), def: 'AU term for AI note-takers (Heidi, Lyrebird). Kith = AI scribe.' },
  { term: 'Aged care', match: w('aged care|support at home'), def: 'Elderly care; new Aged Care Act + Support at Home since late 2025.' },
  { term: 'Privacy Act / APPs', match: w('privacy act|APPs?|australian privacy principles?'), def: 'AU privacy law + 13 principles; health info = sensitive.' },
  { term: 'APP 8', match: w('APP ?8|cross[- ]border|offshore|overseas'), def: 'Sending data overseas: provider stays liable → why AU hosting matters.' },
  { term: 'Data sovereignty', match: w('sovereignty|residency|onshore'), def: '"Is the data stored in Australia?"' },
  { term: 'OAIC / NDB', match: w('OAIC|notifiable data breach(es)?|NDB'), def: 'Privacy regulator / mandatory breach reporting.' },
  { term: 'PIA', match: w('PIA|privacy impact assessment'), def: 'Privacy Impact Assessment: offer one for the pilot.' },
  { term: 'Essential Eight', match: w('essential eight|essential 8|E8'), def: 'ASD\'s 8 baseline cyber controls. Plan: self-assessment for pilot.' },
  { term: 'ISO 27001 / SOC 2', match: w('ISO ?27001|SOC ?2'), def: 'Security certifications. Kith has none yet; say so.' },
  { term: 'IRAP', match: w('IRAP'), def: 'Govt security assessment. Only for selling to government.' },
  { term: 'TGA', match: w('TGA|medical device|SaMD'), def: 'AU FDA. Software that diagnoses/suggests treatment = medical device. Kith only documents.' },
  { term: 'DPA', match: w('DPA|data processing agreement'), def: 'Contract on how a vendor handles customer data.' },
  { term: 'Go-to-market', match: w('go[- ]to[- ]market|GTM|route to market'), def: 'Plan for reaching and selling to customers.' },
  { term: 'PMF', match: w('PMF|product[- ]market fit'), def: 'People will actually pay. Kith doesn\'t have it yet.' },
  { term: 'Discovery', match: w('discovery'), def: 'Interviewing customers about problems BEFORE building.' },
  { term: 'Qualified opportunity', match: w('qualified (lead|leads|opportunit(y|ies))'), def: 'Lead with confirmed need, budget, authority.' },
  { term: 'Pipeline', match: w('pipeline'), def: 'All potential deals in progress.' },
  { term: 'Heads of agreement', match: w('heads of agreement|HOA'), def: 'AU term for a short non-binding term sheet.' },
  { term: 'MOU', match: w('MOU|memorandum'), def: 'Non-binding written statement of intent.' },
  { term: 'Term sheet', match: w('term sheet'), def: 'Key deal terms before a full contract.' },
  { term: 'Channel partner', match: w('reseller|channel partner'), def: 'Sells your product for a cut.' },
  { term: 'Pty Ltd / ABN', match: w('pty ltd|ABN|ACN'), def: 'AU company / business no. Steve\'s: KAPAGI Consulting Pty Ltd.' },
  { term: 'GST', match: w('GST'), def: 'AU 10% goods & services tax.' },
  { term: 'Across it', match: w('across (it|that|this)'), def: 'Aussie: familiar with / on top of it.' },
  { term: 'Arvo', match: w('arvo'), def: 'Aussie: afternoon.' },
  { term: 'Reckon', match: w('reckon'), def: 'Aussie: I think.' },
];

export const RED_LINES: RedLine[] = [
  { id: 'exclusive', match: /exclusiv/i, say: 'Exclusivity ONLY with milestones (pilot signed by X, N paying customers by Y). Never open-ended.' },
  { id: 'ip', match: /\b(jointly|joint|co-?)\s*own|own(ership)?\s+(of\s+)?(the\s+)?(engine|platform|code|tech|ip)|intellectual property|\bIP\b/i, say: 'Core engine stays Kith\'s (licensed to C51). NDIS-specific work shared, in writing. Don\'t agree engine ownership on the call.' },
  { id: 'fees', match: /upfront|retainer|onboarding fee|assessment fee|market access program|\bfees?\b/i, say: 'No upfront fees either way. Revenue share on cash actually collected.' },
  { id: 'invoice', match: /invoic|bill (the|them)|payment flow|who (gets )?pa(id|ys)|collect(s|ing)? (the )?(money|payment)/i, say: 'Kith invoices the customer and pays C51 its share.' },
  { id: 'split', match: /(revenue|profit)[- ]?(share|split)|percent|per cent|\d+\s*%|\bsplit\b|commission/i, say: 'Principles only today. Numbers go in the heads of agreement after pilot scope.' },
  { id: 'brand', match: /white[- ]?label|our brand|under (our|c51|the c51)|rebrand/i, say: 'Open to it; decide branding in the structure. Aim: "Powered by Kith".' },
  { id: 'equity', match: /\bequity\b|shares in|stake/i, say: 'No equity talk now. Park it.' },
  { id: 'timeline', match: /how (long|soon|quickly|fast)|timeline|timeframe|by when|deadline|ready by/i, say: '~2 wks discovery + ~6 wks build → something to see ~wk 6, live ~wk 8. Don\'t over-promise.' },
  { id: 'team', match: /full[- ]time|your team|who else|developers?|\bhire\b|part[- ]time|bandwidth|capacity/i, say: 'Solo founder, part-time, 15–20 hrs/wk. Judge delivery by what already exists. Scale with revenue.' },
  { id: 'hosting', match: /hosted|hosting|where.*data|data.*(live|stored|sit)|server|aws|azure|region|sovereign|residency/i, say: 'Today: outside Australia (mainly US). Pilot: separate AU instance in Sydney. Typed notes first.' },
  { id: 'e2e', match: /end[- ]to[- ]end|e2e/i, say: 'NEVER say end-to-end encrypted. "Encrypted in transit and at rest, access-controlled."' },
  { id: 'certs', match: /certif|iso|soc ?2|pen ?test|compliant/i, say: 'No certifications yet. Plan: audit log + PIA + Essential Eight self-assessment for the pilot.' },
  { id: 'audit', match: /\baudits?\b|auditor/i, say: 'Never promise audit outcomes. Don\'t switch on right before their audit.' },
  { id: 'sign', match: /\bsign(ed|ing)?\b|contract|\bmou\b|heads of agreement|\bnda\b|agreement/i, say: 'Nothing agreed or signed on the call. Next: mutual NDA → principles → heads of agreement (we draft).' },
  { id: 'customers', match: /customers?|clients?|traction|users?|revenue so far/i, say: 'Honest: no paying customers yet. Product works; distribution is the gap.' },
  { id: 'clinical', match: /diagnos|treatment|clinical decision|recommend (meds|medication)/i, say: 'Kith documents; it never diagnoses or recommends treatment (TGA).' },
];

export function matchGlossary(text: string): GlossaryEntry[] {
  return GLOSSARY.filter(g => g.match.test(text));
}

export function matchRedLines(text: string): RedLine[] {
  return RED_LINES.filter(r => r.match.test(text));
}
