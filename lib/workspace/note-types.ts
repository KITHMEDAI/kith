/**
 * lib/workspace/note-types.ts
 *
 * Note types offered on the New note screen. Every type renders through the
 * same generic note shape (sections + action items + flags), so adding one is
 * a single entry here: `sections` tells the model which headings to use and
 * `guidance` how to write them.
 */
import type { FieldKey } from './fields';

export interface NoteTypeDef {
  key: string;
  label: string;
  hint: string;                 // one line under the label in the picker
  fields: FieldKey[] | 'all';   // which fields see this type
  sections: string[];           // headings the note should use (model may omit empty ones)
  guidance: string;
}

export const NOTE_TYPES: NoteTypeDef[] = [
  // ── Available to everyone ─────────────────────────────────────────────
  {
    key: 'general', label: 'General notes', hint: 'Clean summary of anything', fields: 'all',
    sections: ['Overview', 'Key points', 'Details'],
    guidance: 'Organise whatever was said or typed into a clear, skimmable note. Choose sensible section content; keep the speaker\'s meaning.',
  },
  {
    key: 'meeting_minutes', label: 'Meeting minutes', hint: 'Attendees, decisions, actions', fields: 'all',
    sections: ['Attendees', 'Agenda items discussed', 'Risks & issues'],
    guidance: 'Formal minutes. One entry per agenda item. Attribute positions to people/roles when stated. Decisions and action items must be explicit.',
  },
  {
    key: 'client_call', label: 'Client / stakeholder call', hint: 'Needs, commitments, next steps', fields: 'all',
    sections: ['Who & context', 'What they need', 'What we discussed', 'Commitments made'],
    guidance: 'Capture the other party\'s needs and concerns in their terms, what was agreed, and every follow-up with a date.',
  },
  {
    key: 'interview', label: 'Interview', hint: 'Q&A, observations, assessment', fields: 'all',
    sections: ['Candidate / interviewee', 'Questions & answers', 'Strengths', 'Concerns', 'Recommendation (as stated)'],
    guidance: 'Summarise answers faithfully. Only include a recommendation if the interviewer stated one.',
  },
  {
    key: 'daily_log', label: 'Daily log / handover', hint: 'What happened, what\'s next', fields: 'all',
    sections: ['Summary of the day/shift', 'Completed', 'Outstanding', 'Handover to next person'],
    guidance: 'Write for the next person picking up the work. Outstanding items need enough detail to act on.',
  },
  {
    key: 'incident_report', label: 'Incident report', hint: 'Facts, timeline, actions taken', fields: 'all',
    sections: ['What happened', 'When & where', 'People involved', 'Immediate actions taken', 'Witnesses', 'Follow-up required'],
    guidance: 'Strictly factual, chronological, no blame or speculation. Missing facts (time, location, names) must be listed as missing.',
  },
  {
    key: 'custom', label: 'Custom', hint: 'Describe the note you want', fields: 'all',
    sections: [],
    guidance: 'Follow the user\'s own description of the note they want.',
  },

  // ── Field-specific ───────────────────────────────────────────────────
  {
    key: 'medical_consult', label: 'Consult note (SOAP)', hint: 'Subjective, objective, assessment, plan', fields: ['healthcare', 'allied_health'],
    sections: ['Subjective', 'Objective', 'Assessment (as stated by clinician)', 'Plan'],
    guidance: 'Standard SOAP. Assessment and plan only as stated by the clinician; never add a diagnosis or treatment.',
  },
  {
    key: 'referral_letter', label: 'Referral letter', hint: 'Ready-to-send referral', fields: ['healthcare', 'allied_health'],
    sections: ['Reason for referral', 'Relevant history', 'Current medications & allergies', 'Request'],
    guidance: 'Concise, professional referral content. Mark anything not provided as missing rather than inventing it.',
  },
  {
    key: 'clinical_handover', label: 'Clinical handover (ISBAR)', hint: 'Identify, situation, background, assessment, request', fields: ['healthcare', 'aged_care'],
    sections: ['Identify', 'Situation', 'Background', 'Assessment', 'Recommendation / request'],
    guidance: 'ISBAR handover, as used in Australian clinical settings.',
  },
  {
    key: 'pharma_hcp_call', label: 'HCP call note', hint: 'Rep visit with a healthcare professional', fields: ['pharma'],
    sections: ['HCP & setting', 'Products / topics discussed', 'HCP questions & objections', 'Materials / samples provided', 'Agreed next steps'],
    guidance: 'Factual call record. No promotional claims. Any adverse event, side effect, product complaint or off-label question goes in flags for pharmacovigilance/medical review.',
  },
  {
    key: 'pharma_msl', label: 'MSL interaction', hint: 'Scientific exchange record', fields: ['pharma'],
    sections: ['HCP / KOL & context', 'Scientific topics discussed', 'Insights gathered', 'Unsolicited requests', 'Follow-up'],
    guidance: 'Medical-affairs record. Distinguish unsolicited requests. Flag adverse events and off-label discussion.',
  },
  {
    key: 'pharma_adverse_event', label: 'Adverse event capture', hint: 'Capture details for PV reporting', fields: ['pharma', 'healthcare'],
    sections: ['Reporter', 'Patient (de-identified details as given)', 'Product(s)', 'Event description', 'Onset & outcome', 'Missing information'],
    guidance: 'Capture the four minimum criteria (identifiable reporter, identifiable patient, suspect product, event) and list what is missing. Never assess causality. Always add a flag that this must go to pharmacovigilance within the company timeframe.',
  },
  {
    key: 'construction_site_inspection', label: 'Site inspection / walkthrough', hint: 'Progress, defects, hazards', fields: ['construction', 'property'],
    sections: ['Site & areas inspected', 'Progress observed', 'Defects / issues', 'Safety observations', 'Instructions given'],
    guidance: 'Location-specific: every defect/hazard tied to an area or level. Hazards also go in flags.',
  },
  {
    key: 'construction_toolbox', label: 'Toolbox talk (safety)', hint: 'Topic, attendees, hazards', fields: ['construction', 'agriculture'],
    sections: ['Topic', 'Attendees', 'Hazards & controls discussed', 'Worker questions / concerns'],
    guidance: 'WHS toolbox talk record suitable for site safety files.',
  },
  {
    key: 'construction_site_diary', label: 'Daily site diary', hint: 'Weather, labour, works, delays', fields: ['construction'],
    sections: ['Weather & conditions', 'Labour & trades on site', 'Works completed', 'Deliveries & plant', 'Delays & variations', 'Visitors'],
    guidance: 'Contemporaneous site diary entry; delays and variations need cause and impact if stated.',
  },
  {
    key: 'construction_defects', label: 'Defects / punch list', hint: 'Itemised defects with owners', fields: ['construction', 'property'],
    sections: ['Defects by location'],
    guidance: 'One line per defect: location, description, responsible trade (if stated). Each also becomes an action item.',
  },
  {
    key: 'ndis_progress_note', label: 'Shift / progress note', hint: 'Goal-linked, objective', fields: ['ndis'],
    sections: ['Supports provided', 'Participant\'s response & wellbeing', 'Progress towards goals', 'Concerns / changes noticed'],
    guidance: 'Objective, person-centred. Link to plan goals only when the input mentions them; otherwise list "goal link missing". Possible incidents or restrictive practices go in flags.',
  },
  {
    key: 'ndis_incident', label: 'NDIS incident report', hint: 'Possible reportable incident', fields: ['ndis', 'aged_care'],
    sections: ['What happened', 'When & where', 'People involved', 'Immediate actions & supports', 'Who was notified', 'Missing information'],
    guidance: 'Factual and chronological. Always flag whether it may be a reportable incident (generally 24 h to the NDIS Commission) for a supervisor to decide.',
  },
  {
    key: 'aged_care_note', label: 'Care note', hint: 'Care delivered and wellbeing', fields: ['aged_care'],
    sections: ['Care provided', 'Wellbeing & behaviour', 'Food, fluids & continence', 'Mobility & skin', 'Family / visitor contact'],
    guidance: 'Objective, person-centred. Falls, skin integrity, intake concerns and medication issues go in flags.',
  },
  {
    key: 'hospitality_shift_handover', label: 'Shift handover', hint: 'Trading, staff, stock, issues', fields: ['hospitality', 'retail'],
    sections: ['Trading summary', 'Staffing', 'Stock & suppliers', 'Equipment & maintenance', 'Customer feedback', 'For next shift'],
    guidance: 'Short, practical handover for the next manager.',
  },
  {
    key: 'hospitality_food_safety', label: 'Food-safety check', hint: 'Temps, cleaning, allergens', fields: ['hospitality'],
    sections: ['Temperature checks', 'Cleaning & sanitising', 'Allergen controls', 'Pest control', 'Corrective actions'],
    guidance: 'Food-safety program record. Any out-of-range temperature or gap needs a corrective action and a flag.',
  },
  {
    key: 'council_consultation', label: 'Community consultation', hint: 'Submissions, themes, responses', fields: ['council'],
    sections: ['Consultation details', 'Attendees / stakeholders', 'Key themes raised', 'Responses given', 'Matters for follow-up'],
    guidance: 'Neutral record of community views; attribute to stakeholder groups, not opinions of the writer.',
  },
  {
    key: 'agri_inspection', label: 'Farm inspection log', hint: 'Paddocks, stock, treatments', fields: ['agriculture'],
    sections: ['Location / paddock', 'Crop or livestock condition', 'Treatments & withholding periods', 'Equipment', 'Biosecurity observations'],
    guidance: 'Practical farm log; chemical rates and withholding periods exactly as stated.',
  },
];

export const NOTE_TYPE_MAP: Record<string, NoteTypeDef> = Object.fromEntries(NOTE_TYPES.map(t => [t.key, t]));

/** Types to show for a field: field-specific first, then the universal ones. */
export function noteTypesForField(field: string): NoteTypeDef[] {
  const specific = NOTE_TYPES.filter(t => t.fields !== 'all' && t.fields.includes(field as FieldKey));
  const universal = NOTE_TYPES.filter(t => t.fields === 'all');
  return [...specific, ...universal];
}
