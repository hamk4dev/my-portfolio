import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
     status: 'ok',
     services: {
       ai: Boolean(process.env.GEMINI_API_KEY?.trim()),
       turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && !process.env.TURNSTILE_SECRET_KEY.startsWith('masukkan_')),
       ipReputation: Boolean(process.env.ABUSEIPDB_API_KEY?.trim()),
     },
     timestamp: new Date().toISOString(),
  });
}
