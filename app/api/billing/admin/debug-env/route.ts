import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  const expected = process.env.INTERNAL_API_SECRET || 'kith-internal-dev';
  if (secret !== expected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? `set (${process.env.RAZORPAY_KEY_ID.slice(0, 10)}...)` : 'NOT SET',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? 'set' : 'NOT SET',
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 'set' : 'NOT SET',
  });
}
