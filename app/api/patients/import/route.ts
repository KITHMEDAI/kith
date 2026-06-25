import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { inferImportMapping } from '@/lib/claude';
import { rowToPatientFields } from '@/lib/patient-normalize';
import { matchOrCreatePatient } from '@/lib/patient-match';

export async function POST(req: NextRequest) {
  // Identify the therapist with the user's own (RLS-bound) session…
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: therapist } = await supabase
    .from('therapists').select('id').eq('user_id', user.id).single();
  if (!therapist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // …then read/write patient rows with the service-role client (same as the
  // Patients page), so a one-time bulk import can never be silently blocked by
  // a row-level-security policy on insert.
  const db = createServiceRoleClient();

  const body = await req.json().catch(() => ({}));
  const headers: string[] = Array.isArray(body.headers) ? body.headers : [];
  const rows: Record<string, unknown>[] = Array.isArray(body.rows) ? body.rows : [];
  const fileName: string = body.fileName || 'import';

  if (!rows.length) return NextResponse.json({ error: 'No rows found in file' }, { status: 400 });
  if (rows.length > 200) return NextResponse.json({ error: 'Maximum 200 patients per import' }, { status: 400 });

  // ── AI figures out which column is which (one call for the whole file) ──
  const mapping = await inferImportMapping(headers, rows);
  if (!mapping.display_name) {
    return NextResponse.json(
      { error: "Couldn't find a name column in this file. Make sure one column holds the patient's full name." },
      { status: 422 },
    );
  }

  // ── Match-or-create each row (re-importing updates instead of duplicating) ──
  let created = 0, updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const fields = rowToPatientFields(rows[i], mapping, fileName);
    if (!fields) { errors.push(`Row ${i + 1}: missing name`); continue; }
    try {
      const res = await matchOrCreatePatient(db, therapist.id, fields);
      if (res.action === 'created') created++; else updated++;
    } catch (e) {
      errors.push(`${fields.display_name}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  const imported = created + updated;
  const failed = rows.length - imported;

  // Best-effort batch log (table may not exist — ignored if so)
  await db.from('import_batches').insert({
    therapist_id: therapist.id,
    file_name: fileName,
    total_records: rows.length,
    imported_count: imported,
    failed_count: failed,
    status: failed === 0 ? 'completed' : 'partial',
  });

  return NextResponse.json({
    imported, created, updated, failed,
    total: rows.length,
    mapping,
    errors: errors.slice(0, 15),
  });
}
