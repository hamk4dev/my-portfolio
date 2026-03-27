import { NextResponse } from 'next/server';

import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

const MAX_PROMPT_LENGTH = 12000;
const MAX_SYSTEM_INSTRUCTION_LENGTH = 6000;

async function readGeminiFailure(response, model) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const upstreamMessage = payload?.error?.message || '';
  console.error('Gemini API error:', response.status, upstreamMessage || payload);

  if (response.status === 400) {
    return {
      status: 502,
      error: 'Permintaan ke Gemini ditolak. Periksa format payload yang dikirim server.',
    };
  }

  if (response.status === 403) {
    if (/reported as leaked/i.test(upstreamMessage)) {
      return {
        status: 503,
        error: 'API key Gemini ditolak karena terdeteksi bocor oleh Google. Buat key baru lalu perbarui GEMINI_API_KEY.',
      };
    }

    return {
      status: 503,
      error: 'API key Gemini ditolak oleh Google. Periksa kredensial dan izin model yang digunakan.',
    };
  }

  if (response.status === 404) {
    return {
      status: 503,
      error: `Model Gemini \"${model}\" tidak tersedia untuk API key ini.`,
    };
  }

  if (response.status === 429) {
    return {
      status: 429,
      error: 'Quota Gemini sedang habis atau rate limit provider tercapai. Coba lagi beberapa saat lagi.',
    };
  }

  return {
    status: 502,
    error: 'Layanan AI sedang tidak tersedia.',
  };
}

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    if (!hasValidTurnstileSession(req)) {
      return NextResponse.json({ error: 'Akses situs belum diverifikasi oleh Turnstile.' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`ai:${clientIp}`, {
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan AI. Coba lagi beberapa menit lagi.' }, { status: 429 });
    }

    const { prompt, systemInstruction } = await req.json();
    const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    const normalizedSystemInstruction = typeof systemInstruction === 'string' ? systemInstruction.trim() : '';

    if (!normalizedPrompt) {
      return NextResponse.json({ error: 'Prompt wajib diisi.' }, { status: 400 });
    }

    if (normalizedPrompt.length > MAX_PROMPT_LENGTH || normalizedSystemInstruction.length > MAX_SYSTEM_INSTRUCTION_LENGTH) {
      return NextResponse.json({ error: 'Konten permintaan terlalu panjang.' }, { status: 413 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    if (!apiKey) {
      return NextResponse.json({ error: 'Layanan AI belum dikonfigurasi. GEMINI_API_KEY belum tersedia di server.' }, { status: 503 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: normalizedPrompt }] }],
          ...(normalizedSystemInstruction
            ? { systemInstruction: { parts: [{ text: normalizedSystemInstruction }] } }
            : {}),
        }),
      }
    );

    if (!response.ok) {
      const failure = await readGeminiFailure(response, model);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'AI tidak mengembalikan jawaban.' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('AI route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
