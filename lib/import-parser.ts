import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseImportFile(file: File): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}> {
  if (file.name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({
            headers: results.meta.fields || [],
            rows: results.data as Record<string, string>[],
            totalRows: results.data.length,
          });
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  }

  // Excel
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows, totalRows: rows.length };
}

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  const fieldAliases: Record<string, string[]> = {
    display_name: ['name', 'patient name', 'full name', 'patient', 'client name', 'client'],
    phone: ['phone', 'phone no', 'phone number', 'mobile', 'contact', 'cell'],
    email: ['email', 'email address', 'e-mail'],
    age: ['age', 'patient age', 'years'],
    diagnosis: ['diagnosis', 'condition', 'disorder', 'presenting problem'],
    medications: ['medication', 'medications', 'meds', 'drugs', 'prescription'],
    therapy_modality: ['therapy', 'modality', 'treatment type', 'approach'],
    presenting_concerns: ['notes', 'concerns', 'issues', 'reason', 'chief complaint'],
    total_sessions: ['sessions', 'session count', 'no of sessions', 'number of sessions'],
    gender: ['gender', 'sex'],
    city: ['city', 'location'],
  };

  headers.forEach((header) => {
    const lower = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      if (aliases.some((alias) => lower.includes(alias))) {
        mappings[header] = field;
        break;
      }
    }
  });

  return mappings;
}

export const PATIENT_FIELDS = [
  { value: 'display_name', label: 'Full Name', required: true },
  { value: 'nickname', label: 'Preferred Name' },
  { value: 'age', label: 'Age' },
  { value: 'gender', label: 'Gender' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp_number', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'medications', label: 'Medications' },
  { value: 'therapy_modality', label: 'Therapy Modality' },
  { value: 'presenting_concerns', label: 'Presenting Concerns' },
  { value: 'total_sessions', label: 'Total Sessions' },
  { value: 'city', label: 'City' },
  { value: '', label: '— Skip this column —' },
];
