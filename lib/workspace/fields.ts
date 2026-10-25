/**
 * lib/workspace/fields.ts
 *
 * The professional fields a Workspace user can pick at onboarding. Each one
 * carries a short "profile" that is injected into every note prompt so the
 * same engine writes like a site supervisor for construction and like a rep
 * for pharma. "general" is the default; "other" means the user typed their own
 * field and the AI writes a profile for it once (see generate.ts).
 */

export type FieldKey =
  | 'general' | 'healthcare' | 'pharma' | 'construction' | 'ndis' | 'aged_care'
  | 'allied_health' | 'hospitality' | 'retail' | 'council' | 'agriculture'
  | 'legal' | 'sales' | 'education' | 'property' | 'other';

export interface FieldDef {
  key: FieldKey;
  label: string;
  /** Injected into the note prompt: vocabulary, what matters, compliance cautions. */
  profile: string;
  /** Note type pre-selected on the New note screen. */
  defaultNoteType: string;
}

export const FIELDS: FieldDef[] = [
  {
    key: 'general', label: 'General (any work)', defaultNoteType: 'general',
    profile: 'General professional context. Write clear, neutral business notes that any colleague could follow. Prioritise decisions, action items with owners and dates, and open questions. Flag only genuine safety, legal, privacy or compliance risks.',
  },
  {
    key: 'healthcare', label: 'Healthcare / medical', defaultNoteType: 'medical_consult',
    profile: 'Clinical/healthcare setting. Use accurate medical terminology as spoken; record symptoms, findings, medications (name, dose, frequency) exactly as stated. Never add a diagnosis, differential or treatment the clinician did not state. Flag red-flag symptoms, allergies and safety concerns for the clinician to review.',
  },
  {
    key: 'pharma', label: 'Pharma / life sciences', defaultNoteType: 'pharma_hcp_call',
    profile: 'Pharmaceutical / life-sciences commercial or medical-affairs context (reps, MSLs, KAMs). Capture the healthcare professional, products discussed, key messages, objections, questions requiring follow-up, samples/materials and commitments. Keep promotional claims out of the note. Any mention of a side effect, adverse event, product complaint or off-label use must be flagged for pharmacovigilance/compliance review within the required timeframe; never assess causality.',
  },
  {
    key: 'construction', label: 'Construction / trades', defaultNoteType: 'construction_site_inspection',
    profile: 'Construction and trades site context. Record location/area, trades and subcontractors involved, progress against program, defects, materials and deliveries, variations, RFIs, weather and delays. Safety is paramount: flag any hazard, near miss, incident or non-compliance (WHS) explicitly with location and responsible person.',
  },
  {
    key: 'ndis', label: 'NDIS & disability support', defaultNoteType: 'ndis_progress_note',
    profile: 'Australian NDIS disability-support context. Say "participant", not "patient". Write objective, person-centred notes that link supports delivered to the participant\'s NDIS plan goals where the input mentions them. Flag possible reportable incidents (serious injury, abuse/neglect, unauthorised restrictive practice such as PRN for behaviour, unlawful contact, death) for a supervisor; reportable incidents are due to the NDIS Commission within 24 hours (5 business days for unauthorised restrictive practice with no harm). A minor injury treated with first aid, or a late dose with no harm, is an internal incident, not a reportable one. Never invent goal links or details.',
  },
  {
    key: 'aged_care', label: 'Aged care', defaultNoteType: 'aged_care_note',
    profile: 'Australian aged-care context (residential or Support at Home). Say "resident" or "client". Person-centred, objective notes: care delivered, wellbeing, food/fluid intake, mobility, skin, continence, behaviour, family contact. Flag falls, pressure injuries/skin tears, weight loss, medication issues, restrictive practices (including bed rails and PRN for behaviour; consent/authorisation status) and any possible serious incident under the Serious Incident Response Scheme (SIRS) for the RN/manager. Priority 1 incidents are generally due to the Aged Care Quality and Safety Commission within 24 hours. Never refer to the NDIS Commission for aged-care residents.',
  },
  {
    key: 'allied_health', label: 'Allied health & therapy', defaultNoteType: 'medical_consult',
    profile: 'Allied health / therapy context (psychology, OT, physio, speech). Record presenting concerns, interventions used, client response, measures mentioned, and plan/homework. Never add diagnoses or treatment not stated by the practitioner. Flag risk disclosures (self-harm, harm to others) for the practitioner.',
  },
  {
    key: 'hospitality', label: 'Hospitality & food service', defaultNoteType: 'hospitality_shift_handover',
    profile: 'Hospitality / food-service operations (cafes, restaurants, venues, kitchens). Capture covers/trading, staffing, stock and suppliers, equipment issues, customer feedback and complaints. Food safety matters: flag temperature excursions, allergen issues, pest sightings, cleaning/sanitising gaps and any illness/injury.',
  },
  {
    key: 'retail', label: 'Retail & multi-site operations', defaultNoteType: 'general',
    profile: 'Retail / multi-site operations. Capture site or store, sales and KPIs mentioned, staffing/rostering, stock and merchandising, customer issues, maintenance and compliance. Group actions by site with owners and due dates.',
  },
  {
    key: 'council', label: 'Local government / councils', defaultNoteType: 'meeting_minutes',
    profile: 'Australian local government context. Formal, neutral minute-style language. Record attendees and roles, agenda items, resolutions/decisions, community concerns raised, and actions with responsible officer and due date. Avoid opinion; attribute statements to roles.',
  },
  {
    key: 'agriculture', label: 'Agriculture & farming', defaultNoteType: 'general',
    profile: 'Agricultural / farm operations. Capture paddock or location, crop/livestock, conditions and weather, treatments (product, rate, withholding period as stated), equipment, biosecurity observations and labour. Flag biosecurity concerns, chemical-safety issues and animal-welfare concerns.',
  },
  {
    key: 'legal', label: 'Legal & professional services', defaultNoteType: 'client_call',
    profile: 'Legal / professional-services context. Precise, neutral file-note style: who said what, instructions received, advice given (as stated, not invented), deadlines, documents and next steps. Flag limitation dates, conflicts and anything requiring partner review.',
  },
  {
    key: 'sales', label: 'Sales & client meetings', defaultNoteType: 'client_call',
    profile: 'Sales / account-management context. Capture the client, needs and pain points, budget/timeline/decision-makers mentioned, objections, competitors, agreed next steps and commitments with dates.',
  },
  {
    key: 'education', label: 'Education & training', defaultNoteType: 'general',
    profile: 'Education / training context. Capture learners or cohort, topics covered, progress and concerns, adjustments, communication with families, and follow-ups. Flag wellbeing or child-safety concerns for the appropriate staff member. Child-safety or self-harm risk statements are always urgent flags for the wellbeing/child-safety lead; the note never assesses the risk itself.',
  },
  {
    key: 'property', label: 'Real estate & property', defaultNoteType: 'client_call',
    profile: 'Real estate / property-management context. Capture property address, parties, inspection findings, maintenance issues, lease or sale terms discussed, and actions with dates. Flag safety hazards and compliance items (smoke alarms, pool fencing).',
  },
  {
    key: 'other', label: 'Other: type your own', defaultNoteType: 'general',
    profile: '', // replaced by the AI-written profile stored on the user's profile
  },
];

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(FIELDS.map(f => [f.key, f]));

export function fieldLabel(key: string, custom?: string | null): string {
  if (key === 'other' && custom) return custom;
  return FIELD_MAP[key]?.label ?? 'General';
}
