/**
 * lib/workspace/keyterms.ts
 *
 * Vocabulary boosted in transcription (Deepgram keyterm prompting), live and
 * in the polish pass: the field's jargon ("SWMS", "PRN"), plus the user's own
 * "names & terms" from their profile (clients, places, colleagues), which is
 * the biggest win for names. Deepgram caps the total keyterm budget, so the
 * merged list is capped at MAX_KEYTERMS, user terms first.
 */
const COMMON = ["G'day", 'action item', 'follow up', 'deadline', 'invoice', 'quote'];

/**
 * Everyday Australian words that STT mishears in care notes (real-data test
 * 2026-10-25: Voltaren → "Voltran"; Coversyl, Weet-Bix, Woolies misheard).
 */
const AU_CARE = [
  // Common medicine brands
  'Panadol', 'Panadeine', 'Nurofen', 'Voltaren', 'Coversyl', 'Endep', 'Epilim', 'Endone', 'Targin', 'Lyrica',
  'Somac', 'Nexium', 'Lipitor', 'Crestor', 'Norvasc', 'Micardis', 'Avapro', 'Atacand', 'Xarelto', 'Eliquis',
  'Warfarin', 'Lasix', 'Movicol', 'Coloxyl', 'Seroquel', 'Risperdal', 'Zyprexa', 'Valium', 'Ventolin', 'Seretide',
  'Ostelin', 'Metformin', 'Webster-pak',
  // Services and everyday places
  'Centrelink', 'Medicare', 'My Aged Care', 'Opal', 'myki', 'go card', 'TAFE', 'Woolies', 'Coles', 'Aldi',
  'Kmart', 'Bunnings', 'Chemist Warehouse', 'servo', 'Weet-Bix', 'Milo', 'Vegemite',
];

const BY_FIELD: Record<string, string[]> = {
  healthcare: ['GP', 'referral', 'pathology', 'blood pressure', 'mg', 'twice daily', 'ISBAR', 'discharge', 'allergy'],
  pharma: ['HCP', 'MSL', 'adverse event', 'pharmacovigilance', 'off-label', 'PBS', 'TGA', 'formulary', 'sample'],
  construction: ['SWMS', 'WHS', 'RFI', 'variation', 'formwork', 'slab', 'pour', 'rough-in', 'scaffold', 'defect', 'subbie', 'sparky', 'chippy'],
  ndis: ['NDIS', 'participant', 'SIL', 'PRN', 'restrictive practice', 'behaviour support', 'support worker', 'plan manager', 'support coordinator', 'hydrotherapy', 'MAR', ...AU_CARE],
  aged_care: ['resident', 'RN', 'SIRS', 'pressure injury', 'continence', 'falls', 'Support at Home', 'care plan', 'MAR', ...AU_CARE],
  allied_health: ['OT', 'physio', 'speechie', 'NDIS', 'Medicare', 'care plan', 'assessment'],
  hospitality: ['covers', 'FOH', 'BOH', 'allergen', 'food safety', 'temperature log', 'supplier', 'roster'],
  retail: ['SKU', 'stocktake', 'planogram', 'roster', 'shrinkage', 'KPI'],
  council: ['councillor', 'resolution', 'agenda item', 'submission', 'planning permit', 'CEO'],
  agriculture: ['paddock', 'withholding period', 'biosecurity', 'livestock', 'header', 'spray rig'],
  legal: ['matter', 'affidavit', 'conveyancing', 'counsel', 'limitation date'],
  sales: ['pipeline', 'proposal', 'renewal', 'decision maker', 'procurement'],
  education: ['student', 'parent', 'IEP', 'NCCD', 'term'],
  property: ['tenant', 'landlord', 'lease', 'bond', 'routine inspection', 'smoke alarm'],
};

/** Deepgram's keyterm budget is about 500 tokens per request; 100 short terms stays well inside it. */
export const MAX_KEYTERMS = 100;
/** Most "names & terms" a user can save on their profile. */
export const MAX_USER_TERMS = 40;
const MAX_TERM_CHARS = 40;

/**
 * Parses the user's "names & terms" text (comma or line separated) into a
 * clean list: trimmed, de-duplicated, no control characters, bounded.
 */
export function parseUserTerms(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const t = part.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TERM_CHARS);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= MAX_USER_TERMS) break;
  }
  return out;
}

/** Field vocabulary plus the user's own terms (first, so they survive the cap). */
export function keytermsForField(field: string, userTerms: string[] = []): string[] {
  const seen = new Set<string>();
  return [...userTerms.slice(0, MAX_USER_TERMS), ...(BY_FIELD[field] ?? []), ...COMMON]
    .filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, MAX_KEYTERMS);
}
