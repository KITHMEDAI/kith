import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, message } = await req.json();
  if (!to || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return NextResponse.json({ sid: result.sid });
  } catch (err) {
    return NextResponse.json({ error: 'SMS send failed' }, { status: 500 });
  }
}
