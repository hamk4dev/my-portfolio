import { NextResponse } from 'next/server';

import { getClientIp, isPrivateOrLocalIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';

export async function GET(req) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = consumeRateLimit(`ip:${clientIp}`, {
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan pemeriksaan IP.' }, { status: 429 });
    }

    if (isPrivateOrLocalIp(clientIp)) {
       return NextResponse.json({ ip: clientIp, score: 0, isMalicious: false, country: null, provider: 'local' });
    }

    const apiKey = process.env.ABUSEIPDB_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ ip: clientIp, score: 0, isMalicious: false, country: null, provider: 'disabled' });
    }

    const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${clientIp}&maxAgeInDays=90`, {
      method: 'GET',
      headers: { Key: apiKey, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Gagal menghubungi layanan reputasi IP.' }, { status: 502 });
    }

    const data = await response.json();
    
    const confidenceScore = data.data.abuseConfidenceScore;
    return NextResponse.json({ 
       ip: clientIp, 
       score: confidenceScore, 
       isMalicious: confidenceScore > 50,
       country: data.data.countryCode,
       provider: 'abuseipdb',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
