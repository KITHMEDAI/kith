/**
 * lib/patient-match.ts
 *
 * Shared "match-or-create" logic used by every patient ingest path:
 *   - file import (drag-drop .xlsx/.csv)
 *   - Google Calendar event sync
 *
 * Matching priority: email → phone → exact name (case-insensitive), all
 * scoped to the therapist. On a match we UPDATE only the fields that arrived
 * with a value (never blanking existing data) and UNION diagnosis arrays, so
 * re-syncing the same source keeps records fresh without creating duplicates.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PatientFields {
  display_name: string;
  nickname?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  diagnosis?: string[];
  therapy_modality?: string | null;
  medications?: string | null;
  presenting_concerns?: string | null;
  total_sessions?: number | null;
  session_frequency?: string | null;
  imported_from?: string | null;
}

export type MatchAction = 'created' | 'updated';

export interface MatchResult {
  action: MatchAction;
  id: string;
  display_name: string;
}

// Normalize a phone to its digits so "+91 98765 43210" matches "9876543210".
function phoneDigits(p?: string | null): string {
  return (p || '').replace(/\D/g, '').slice(-10);
}

// ── Schema-aware writes ───────────────────────────────────────────────────────
// The AI maps a sheet's columns onto our patient fields, but the live `patients`
// table may not have a column for every field. Rather than let one unknown column
// fail the whole insert ("Could not find the 'x' column … in the schema cache"),
// we discover the real columns once and drop any extras before writing.
let cachedPatientColumns: Set<string> | null = null;

async function getPatientColumns(supabase: SupabaseClient): Promise<Set<string> | null> {
  if (cachedPatientColumns) return cachedPatientColumns;
  const { data } = await supabase.from('patients').select('*').limit(1);
  if (data && data.length) {
    cachedPatientColumns = new Set(Object.keys(data[0]));
    return cachedPatientColumns;
  }
  return null; // empty table — can't introspect; write everything and let it surface
}

// Keep only the keys that exist as real columns (no-op when columns unknown).
function pickExistingColumns(
  payload: Record<string, unknown>,
  columns: Set<string> | null,
): Record<string, unknown> {
  if (!columns) return payload;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (columns.has(k)) out[k] = v;
  }
  return out;
}

async function findExisting(
  supabase: SupabaseClient,
  therapistId: string,
  fields: PatientFields,
): Promise<{ id: string; diagnosis: string[] | null } | null> {
  const base = supabase
    .from('patients')
    .select('id, diagnosis, phone')
    .eq('therapist_id', therapistId);

  // 1) email — most reliable unique-ish key
  if (fields.email) {
    const { data } = await base.ilike('email', fields.email).limit(1);
    if (data && data.length) return { id: data[0].id, diagnosis: data[0].diagnosis };
  }

  // 2) phone — compare on trailing digits to ignore formatting/country code
  const digits = phoneDigits(fields.phone);
  if (digits.length >= 7) {
    const { data } = await supabase
      .from('patients')
      .select('id, diagnosis, phone')
      .eq('therapist_id', therapistId)
      .not('phone', 'is', null);
    const hit = (data || []).find(r => phoneDigits(r.phone) === digits);
    if (hit) return { id: hit.id, diagnosis: hit.diagnosis };
  }

  // 3) exact name (case-insensitive)
  if (fields.display_name) {
    const { data } = await supabase
      .from('patients')
      .select('id, diagnosis, phone')
      .eq('therapist_id', therapistId)
      .ilike('display_name', fields.display_name)
      .limit(1);
    if (data && data.length) return { id: data[0].id, diagnosis: data[0].diagnosis };
  }

  return null;
}

// Build an update payload containing only the fields that actually carry a value.
function nonEmptyUpdate(fields: PatientFields, existingDiagnosis: string[] | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const maybe = (key: keyof PatientFields, val: unknown) => {
    if (val !== undefined && val !== null && val !== '') out[key as string] = val;
  };
  maybe('nickname', fields.nickname);
  maybe('date_of_birth', fields.date_of_birth);
  maybe('age', fields.age);
  maybe('gender', fields.gender);
  maybe('phone', fields.phone);
  maybe('whatsapp_number', fields.whatsapp_number);
  maybe('email', fields.email);
  maybe('emergency_contact_name', fields.emergency_contact_name);
  maybe('emergency_contact_phone', fields.emergency_contact_phone);
  maybe('therapy_modality', fields.therapy_modality);
  maybe('medications', fields.medications);
  maybe('presenting_concerns', fields.presenting_concerns);
  maybe('session_frequency', fields.session_frequency);
  if (typeof fields.total_sessions === 'number') out.total_sessions = fields.total_sessions;

  // Diagnosis: union of existing + incoming (case-insensitive de-dupe)
  if (fields.diagnosis && fields.diagnosis.length) {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const d of [...(existingDiagnosis || []), ...fields.diagnosis]) {
      const key = d.trim().toLowerCase();
      if (d.trim() && !seen.has(key)) { seen.add(key); merged.push(d.trim()); }
    }
    out.diagnosis = merged;
  }
  return out;
}

export async function matchOrCreatePatient(
  supabase: SupabaseClient,
  therapistId: string,
  fields: PatientFields,
): Promise<MatchResult> {
  const columns = await getPatientColumns(supabase);
  const existing = await findExisting(supabase, therapistId, fields);

  if (existing) {
    const update = pickExistingColumns(nonEmptyUpdate(fields, existing.diagnosis), columns);
    if (Object.keys(update).length) {
      await supabase.from('patients').update(update).eq('id', existing.id);
    }
    return { action: 'updated', id: existing.id, display_name: fields.display_name };
  }

  const insert: Record<string, unknown> = {
    therapist_id: therapistId,
    display_name: fields.display_name,
    nickname: fields.nickname ?? null,
    date_of_birth: fields.date_of_birth ?? null,
    age: fields.age ?? null,
    gender: fields.gender ?? null,
    phone: fields.phone ?? null,
    whatsapp_number: fields.whatsapp_number ?? null,
    email: fields.email ?? null,
    emergency_contact_name: fields.emergency_contact_name ?? null,
    emergency_contact_phone: fields.emergency_contact_phone ?? null,
    diagnosis: fields.diagnosis ?? [],
    therapy_modality: fields.therapy_modality ?? null,
    medications: fields.medications ?? null,
    presenting_concerns: fields.presenting_concerns ?? null,
    total_sessions: fields.total_sessions ?? 0,
    session_frequency: fields.session_frequency ?? 'weekly',
    risk_level: 'low',
    status: 'active',
    imported_from: fields.imported_from ?? null,
  };

  const { data, error } = await supabase
    .from('patients')
    .insert(pickExistingColumns(insert, columns))
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  return { action: 'created', id: data.id, display_name: fields.display_name };
}
