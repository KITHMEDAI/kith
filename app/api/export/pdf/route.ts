import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface SessionRow {
  id: string;
  session_number: number;
  started_at: string;
  ended_at: string | null;
  soap_note: SOAPNote | null;
  key_points: string[] | null;
  session_summary: string | null;
  homework_assigned: string | null;
  patient: { display_name: string; diagnosis: string[]; date_of_birth: string | null } | null;
  therapist_info: { display_name: string; designation: string; license_number: string; clinic_name: string } | null;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 422 });

  const { data: therapist } = await supabase
    .from('therapists')
    .select('id, display_name, designation, license_number, clinic_name')
    .eq('user_id', user.id)
    .single();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, session_number, started_at, ended_at, soap_note, key_points, session_summary, homework_assigned, patient:patients(display_name, diagnosis, date_of_birth)')
    .eq('id', sessionId)
    .eq('therapist_id', therapist!.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const s = session as unknown as SessionRow;
  const t = therapist!;
  const p = s.patient;
  const soap = s.soap_note || {};
  const sessionDate = new Date(s.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Notes come back as short points joined by ' • '. Render multi-point fields
  // as a bullet list; single points stay as a plain line.
  const body = (text?: string) => {
    if (!text) return '';
    const parts = text.split(/\s*•\s*|\n/).map(p => p.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
    if (parts.length <= 1) return `<div class="section-body">${text}</div>`;
    return `<ul class="key-points">${parts.map(p => `<li>${p}</li>`).join('')}</ul>`;
  };

  // Generate clean HTML and use the browser's print-to-PDF
  // Since we can't run puppeteer server-side easily, we return HTML that the client can print
  // For production, use puppeteer or a PDF microservice
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Session Note — ${p?.display_name || 'Patient'}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a2e; max-width: 800px; margin: 0 auto; padding: 40px 48px; }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; color: #0D9488; margin: 0 0 4px; }
    .header .sub { color: #6b7280; font-size: 11px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
    .meta-item { }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 2px; }
    .meta-value { font-size: 12px; font-weight: 600; color: #1a1a2e; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0D9488; border-left: 3px solid #0D9488; padding-left: 8px; margin-bottom: 8px; }
    .section-body { font-size: 12px; line-height: 1.6; color: #374151; white-space: pre-wrap; }
    .key-points { list-style: none; padding: 0; margin: 0; }
    .key-points li { padding: 4px 0; padding-left: 14px; position: relative; }
    .key-points li::before { content: '●'; color: #0D9488; position: absolute; left: 0; font-size: 8px; top: 6px; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 32px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Kith — Clinical Session Note</h1>
    <div class="sub">${t.clinic_name || ''} · ${t.display_name}, ${t.designation || ''} · Lic: ${t.license_number || 'N/A'}</div>
  </div>

  <div class="meta">
    <div class="meta-item"><div class="meta-label">Patient</div><div class="meta-value">${p?.display_name || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Session #</div><div class="meta-value">${s.session_number}</div></div>
    <div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">${sessionDate}</div></div>
    <div class="meta-item"><div class="meta-label">Diagnosis</div><div class="meta-value">${p?.diagnosis?.join(', ') || '—'}</div></div>
  </div>

  ${soap.subjective ? `<div class="section"><div class="section-title">Subjective</div>${body(soap.subjective)}</div>` : ''}
  ${soap.objective ? `<div class="section"><div class="section-title">Objective</div>${body(soap.objective)}</div>` : ''}
  ${soap.assessment ? `<div class="section"><div class="section-title">Assessment</div>${body(soap.assessment)}</div>` : ''}
  ${soap.plan ? `<div class="section"><div class="section-title">Plan</div>${body(soap.plan)}</div>` : ''}

  ${s.key_points?.length ? `
  <div class="section">
    <div class="section-title">Key Points</div>
    <ul class="key-points">
      ${s.key_points.map(p => `<li>${p}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${s.homework_assigned ? `<div class="section"><div class="section-title">Homework Assigned</div>${body(s.homework_assigned)}</div>` : ''}

  <div class="footer">
    <span>Generated by Kith AI Clinical Workspace · Confidential PHI — Do not distribute</span>
    <span>${new Date().toLocaleString('en-IN')}</span>
  </div>
</body>
</html>`;

  // Return as inline HTML — browser opens it in a new tab and the user can print → Save as PDF
  // This avoids a server-side PDF library dependency while producing clean printable output
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline',
    },
  });
}
