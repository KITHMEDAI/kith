/**
 * lib/workspace/keyterms.ts
 *
 * Vocabulary boosted in live transcription (Deepgram keyterm prompting) per
 * field, so jargon like "SWMS" or "PRN" is heard correctly. Kept short:
 * Deepgram caps the total keyterm budget.
 */
const COMMON = ["G'day", 'action item', 'follow up', 'deadline', 'invoice', 'quote'];

const BY_FIELD: Record<string, string[]> = {
  healthcare: ['GP', 'referral', 'pathology', 'blood pressure', 'mg', 'twice daily', 'ISBAR', 'discharge', 'allergy'],
  pharma: ['HCP', 'MSL', 'adverse event', 'pharmacovigilance', 'off-label', 'PBS', 'TGA', 'formulary', 'sample'],
  construction: ['SWMS', 'WHS', 'RFI', 'variation', 'formwork', 'slab', 'pour', 'rough-in', 'scaffold', 'defect', 'subbie', 'sparky', 'chippy'],
  ndis: ['NDIS', 'participant', 'SIL', 'PRN', 'restrictive practice', 'behaviour support', 'support worker', 'plan manager', 'support coordinator'],
  aged_care: ['resident', 'RN', 'SIRS', 'pressure injury', 'continence', 'falls', 'Support at Home', 'care plan'],
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

export function keytermsForField(field: string): string[] {
  return [...COMMON, ...(BY_FIELD[field] ?? [])];
}
