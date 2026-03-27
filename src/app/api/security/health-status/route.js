import { NextResponse } from 'next/server';

import { hasConfiguredGeminiApiKey } from '@/lib/server/gemini';
import { getRateLimitBackendMode } from '@/lib/server/rate-limit';
import { isTurnstileSessionConfigured } from '@/lib/server/turnstile-session';

export async function GET() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const abuseIpDbApiKey = process.env.ABUSEIPDB_API_KEY?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const contactFromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  const contactToEmail = process.env.CONTACT_TO_EMAIL?.trim();

  const turnstileConfigured = Boolean(
    turnstileSiteKey &&
      turnstileSecret &&
      !turnstileSecret.startsWith('masukkan_') &&
      isTurnstileSessionConfigured()
  );

  const response = NextResponse.json(
    {
      status: 'ok',
      services: {
        ai: hasConfiguredGeminiApiKey(),
        turnstile: turnstileConfigured,
        ipReputation: Boolean(abuseIpDbApiKey),
        contact: Boolean(resendApiKey && contactFromEmail && contactToEmail),
      },
      infrastructure: {
        rateLimitBackend: getRateLimitBackendMode(),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );

  return response;
}
