import { NextResponse } from 'next/server';

import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { verifyTurnstileToken } from '@/lib/server/turnstile';
import {
  clearTurnstileSessionCookie,
  createTurnstileSessionToken,
  getTurnstileSessionCookieName,
  getTurnstileSessionCookieOptions,
  hasValidTurnstileSession,
} from '@/lib/server/turnstile-session';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

export async function GET(req) {
  const verified = hasValidTurnstileSession(req);
  const response = NextResponse.json({ verified }, { headers: NO_STORE_HEADERS });

  if (!verified) {
    clearTurnstileSessionCookie(response);
  }

  return response;
}

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`turnstile:${clientIp}`, {
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Terlalu banyak percobaan verifikasi Turnstile. Coba lagi beberapa menit lagi.',
          code: 'turnstile-rate-limited',
        },
        { status: 429, headers: NO_STORE_HEADERS }
      );
    }

    const { token } = await req.json();
    const verification = await verifyTurnstileToken({
      token,
      remoteip: clientIp,
    });

    if (!verification.ok) {
      return NextResponse.json(
        {
          error: verification.error,
          details: verification.details,
          code: verification.code || null,
        },
        { status: verification.status, headers: NO_STORE_HEADERS }
      );
    }

    const sessionToken = createTurnstileSessionToken();
    if (!sessionToken) {
      console.error('Turnstile session token could not be created. Check TURNSTILE_SESSION_SECRET in deployment env.');

      return NextResponse.json(
        {
          error: 'Sesi akses belum siap.',
          code: 'turnstile-session-unavailable',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      { success: true, message: 'Verifikasi akses berhasil.' },
      { headers: NO_STORE_HEADERS }
    );
    response.cookies.set(
      getTurnstileSessionCookieName(),
      sessionToken,
      getTurnstileSessionCookieOptions()
    );

    return response;
  } catch (error) {
    if (error?.status) {
      return NextResponse.json(
        { error: error.message, code: error.code || null },
        { status: error.status, headers: NO_STORE_HEADERS }
      );
    }

    console.error('Turnstile route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', code: 'internal-error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
