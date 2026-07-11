/**
 * lib/patient-normalize.ts
 *
 * Turns raw spreadsheet rows + an AI/keyword column mapping into clean
 * PatientFields ready for matchOrCreatePatient(). Shared by the file-import
 * route and the Google Calendar sync so they behave identically.
 */

import type { ImportFieldKey } from './claude';
import type { PatientFields } from './patient-match';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

export function normalizeGender(v: string): string | null {
  const s = v.toLowerCase().trim();
  if (!s) return null;
  if (['m', 'male', 'man', 'boy'].includes(s)) return 'male';
  if (['f', 'female', 'woman', 'girl'].includes(s)) return 'female';
  if (['nb', 'non-binary', 'non binary', 'nonbinary', 'enby'].includes(s)) return 'non_binary';
  if (['prefer not to say', 'undisclosed', 'na', 'n/a'].includes(s)) return 'prefer_not_to_say';
  return 'other';
}

export function normalizeDate(v: string): string | null {
  if (!v) return null;
  if (/^\d{4,5}(\.\d+)?$/.test(v)) {
    const serial = parseInt(v, 10);
    const ms = (serial - 25569) * 86400 * 1000; // Excel epoch → Unix
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function normalizeFrequency(v: string): string | null {
  const s = v.toLowerCase().trim();
  if (!s) return null;
  if (s.includes('week') && (s.includes('bi') || s.includes('fort') || s.includes('2'))) return 'biweekly';
  if (s.includes('week')) return 'weekly';
  if (s.includes('month')) return 'monthly';
  if (s.includes('need') || s.includes('prn') || s.includes('ad hoc')) return 'as_needed';
  return null;
}

// Map one raw row → PatientFields using a field → sourceColumn mapping.
// Returns null when the row has no usable name.
export function rowToPatientFields(
  row: Record<string, unknown>,
  mapping: Partial<Record<ImportFieldKey, string>>,
  source: string,
): PatientFields | null {
  const pick = (field: ImportFieldKey): string => {
    const col = mapping[field];
    return col ? str(row[col]) : '';
  };

  const name = pick('display_name');
  if (!name) return null;

  const dob = normalizeDate(pick('date_of_birth'));
  let age: number | null = parseInt(pick('age'), 10);
  if (isNaN(age)) age = null;
  if (age === null && dob) {
    age = Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000));
  }

  const splitList = (raw: string): string[] => raw ? raw.split(/[,;/]/).map(s => s.trim()).filter(Boolean) : [];
  const diagnosis = splitList(pick('diagnosis'));
  const icdCodes = splitList(pick('icd_codes'));
  const therapyGoals = splitList(pick('therapy_goals'));

  const totalSessions = parseInt(pick('total_sessions'), 10);
  const feeRaw = pick('fee_per_session').replace(/[^0-9.]/g, '');
  const fee = feeRaw ? parseFloat(feeRaw) : NaN;

  return {
    display_name: name,
    nickname: pick('nickname') || null,
    date_of_birth: dob,
    age,
    gender: normalizeGender(pick('gender')),
    phone: pick('phone') || null,
    whatsapp_number: pick('whatsapp_number') || null,
    email: pick('email') || null,
    emergency_contact_name: pick('emergency_contact_name') || null,
    emergency_contact_phone: pick('emergency_contact_phone') || null,
    diagnosis,
    icd_codes: icdCodes,
    therapy_modality: pick('therapy_modality') || null,
    therapy_goals: therapyGoals,
    medications: pick('medications') || null,
    presenting_concerns: pick('presenting_concerns') || null,
    total_sessions: isNaN(totalSessions) ? null : totalSessions,
    session_frequency: normalizeFrequency(pick('session_frequency')),
    patient_id_number: pick('patient_id_number') || null,
    fee_per_session: isNaN(fee) ? null : fee,
    imported_from: source,
  };
}
