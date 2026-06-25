// Stub — this path should not exist. Real route is at /api/patients/[id]/latest-session-status/
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
