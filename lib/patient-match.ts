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
  icd_codes?: string[];
  therapy_modality?: string | null;
  therapy_goals?: string[];
  medications?: string | null;
  presenting_concerns?: string | null;
  total_sessions?: number | null;
  session_frequency?: string | null;
  patient_id_number?: string | null;
  fee_per_session?: number | null;
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

// Normalize a date-of-birth to YYYY-MM-DD for comparison across whatever
// format it arrived in (spreadsheet imports vary: "12/04/1990", ISO, etc.).
// Returns null for missing/unparseable input rather than throwing.
//
// Postgres `date` columns (existing.date_of_birth) always come back as
// YYYY-MM-DD already, so that path is a direct passthrough. For non-ISO
// input, `new Date(str)` parses in LOCAL time — reading it back out via
// toISOString() (UTC) can shift the date by one day depending on the
// server's timezone offset (e.g. IST midnight becomes the previous day in
// UTC). Reading the LOCAL components back out instead keeps the round-trip
// on the same calendar day it was parsed as.
function normalizeDob(d?: string | null): string | null {
  if (!d) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(d);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

interface ExistingPatient { id: string; diagnosis: string[] | null; icd_codes: string[] | null; therapy_goals: string[] | null; date_of_birth?: string | null }

async function findExisting(
  supabase: SupabaseClient,
  therapistId: string,
  fields: PatientFields,
): Promise<ExistingPatient | null> {
  const SELECT = 'id, diagnosis, icd_codes, therapy_goals, phone, date_of_birth';
  const base = supabase
    .from('patients')
    .select(SELECT)
    .eq('therapist_id', therapistId);

  // 1) email — most reliable unique-ish key
  if (fields.email) {
    const { data } = await base.ilike('email', fields.email).limit(1);
    if (data && data.length) return data[0] as unknown as ExistingPatient;
  }

  // 2) phone — compare on trailing digits to ignore formatting/country code
  const digits = phoneDigits(fields.phone);
  if (digits.length >= 7) {
    const { data } = await supabase
      .from('patients')
      .select(SELECT)
      .eq('therapist_id', therapistId)
      .not('phone', 'is', null);
    const hit = (data || []).find(r => phoneDigits(r.phone) === digits);
    if (hit) return hit as unknown as ExistingPatient;
  }

  // 3) exact name (case-insensitive) — a name match ALONE is not a reliable
  // signal that this is the same person: shared/common names (or two family
  // members sharing a surname search) happen. Without a corroborating date
  // of birth, treating a name match as "found" silently merges two
  // different people's records — their diagnoses and therapy goals get
  // unioned together into one patient. Require DOB to also match before
  // accepting a name-only match; otherwise fall through to creating a new
  // patient (a possible duplicate a therapist can notice and merge manually
  // is far safer than silently corrupted clinical data).
  if (fields.display_name) {
    const { data } = await supabase
      .from('patients')
      .select(SELECT)
      .eq('therapist_id', therapistId)
      .ilike('display_name', fields.display_name)
      .limit(5);
    const candidates = (data || []) as unknown as ExistingPatient[];
    const incomingDob = normalizeDob(fields.date_of_birth);
    if (incomingDob) {
      const confirmed = candidates.find(c => normalizeDob(c.date_of_birth) === incomingDob);
      if (confirmed) return confirmed;
    }
    // Name matched but DOB either wasn't provided or didn't corroborate it —
    // don't guess. Falls through to create a new patient below.
  }

  return null;
}

// Build an update payload containing only the fields that actually carry a value.
function nonEmptyUpdate(fields: PatientFields, existing: ExistingPatient): Record<string, unknown> {
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
  maybe('patient_id_number', fields.patient_id_number);
  if (typeof fields.total_sessions === 'number') out.total_sessions = fields.total_sessions;
  if (typeof fields.fee_per_session === 'number') out.fee_per_session = fields.fee_per_session;

  // Diagnosis / ICD codes / therapy goals: union of existing + incoming
  // (case-insensitive de-dupe) so re-importing the same source never blanks
  // out data recorded since the last import.
  const union = (existing: string[] | null | undefined, incoming: string[] | undefined) => {
    if (!incoming || !incoming.length) return null;
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const d of [...(existing || []), ...incoming]) {
      const key = d.trim().toLowerCase();
      if (d.trim() && !seen.has(key)) { seen.add(key); merged.push(d.trim()); }
    }
    return merged;
  };
  const diagnosisMerged = union(existing.diagnosis, fields.diagnosis);
  if (diagnosisMerged) out.diagnosis = diagnosisMerged;
  const icdMerged = union(existing.icd_codes, fields.icd_codes);
  if (icdMerged) out.icd_codes = icdMerged;
  const goalsMerged = union(existing.therapy_goals, fields.therapy_goals);
  if (goalsMerged) out.therapy_goals = goalsMerged;

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
    const update = pickExistingColumns(nonEmptyUpdate(fields, existing), columns);
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
