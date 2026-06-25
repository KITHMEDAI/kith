/**
 * lib/parse-patient-file.ts
 *
 * Browser-side parser for patient import files (.csv / .xlsx / .xls).
 * Both the dedicated Import page and the onboarding upload step use this so a
 * file always becomes the same { headers, rows } JSON shape the
 * /api/patients/import route expects.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow { [key: string]: unknown }
export interface ParsedFile { headers: string[]; rows: ParsedRow[] }

export function parsePatientFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (res) => resolve({ headers: (res.meta.fields || []).map(h => h.trim()), rows: res.data }),
        error: (err) => reject(err),
      });
    });
  }
  return file.arrayBuffer().then((buf) => {
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Read as a raw grid so we can locate the real header row — Excel sheets
    // often have a title or blank rows above the actual column headers, which
    // would otherwise become garbage column names and break the import.
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1, defval: '', raw: false, blankrows: false,
    });
    return gridToRows(grid as unknown[][]);
  });
}

// Turn a 2D grid into { headers, rows }, choosing the header row as the first
// row that has at least two non-empty cells (skips title/blank leading rows).
export function gridToRows(grid: unknown[][]): ParsedFile {
  const nonEmpty = (r: unknown[]) => r.filter(c => String(c ?? '').trim()).length;
  let headerIdx = grid.findIndex(r => nonEmpty(r) >= 2);
  if (headerIdx === -1) headerIdx = grid.findIndex(r => nonEmpty(r) >= 1);
  if (headerIdx === -1) return { headers: [], rows: [] };

  const headers = (grid[headerIdx] as unknown[]).map(h => String(h ?? '').trim());
  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i] as unknown[];
    if (!nonEmpty(cells)) continue;
    const obj: ParsedRow = {};
    headers.forEach((h, c) => { if (h) obj[h] = cells[c] ?? ''; });
    rows.push(obj);
  }
  return { headers: headers.filter(Boolean), rows };
}
