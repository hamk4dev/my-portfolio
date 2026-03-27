import { NextResponse } from 'next/server';

import { getConfiguredGeminiApiKeys, getConfiguredGeminiModels } from '@/lib/server/gemini';
import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

export const runtime = 'nodejs';

const MAX_PROMPT_LENGTH = 12000;
const MAX_SYSTEM_INSTRUCTION_LENGTH = 6000;

function createFailure(status, code, error) {
  return { status, code, error };
}

async function readGeminiFailure(response, model) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const upstreamMessage = payload?.error?.message || '';
  console.error('Gemini API error:', response.status, { model, upstreamMessage: upstreamMessage || payload });

  if (response.status === 400) {
    return createFailure(502, 'gemini-invalid-request', 'Permintaan ke layanan AI belum dapat diproses.');
  }

  if (response.status === 403) {
    if (/reported as leaked/i.test(upstreamMessage)) {
      return createFailure(503, 'gemini-api-key-rejected', 'Layanan AI sedang tidak tersedia saat ini.');
    }

    return createFailure(503, 'gemini-permission-denied', 'Layanan AI sedang tidak tersedia saat ini.');
  }

  if (response.status === 404) {
    return createFailure(503, 'gemini-model-unavailable', `Model AI "${model}" tidak tersedia.`);
  }

  if (response.status === 429) {
    return createFailure(429, 'gemini-provider-rate-limited', 'Layanan AI sedang padat. Coba lagi beberapa saat lagi.');
  }

  return createFailure(502, 'gemini-upstream-error', 'Layanan AI sedang tidak tersedia.');
}

async function requestGemini({ apiKey, model, prompt, systemInstruction }) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemInstruction
            ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
            : {}),
        }),
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        failure: await readGeminiFailure(response, model),
      };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return {
        ok: false,
        failure: createFailure(502, 'gemini-empty-response', 'AI tidak mengembalikan jawaban.'),
      };
    }

    return {
      ok: true,
      reply,
      model,
    };
  } catch (error) {
    const isTimeout = error?.name === 'AbortError' || error?.name === 'TimeoutError';
    console.error('Gemini request error:', { model, error: error?.message || error });

    return {
      ok: false,
      failure: createFailure(
        isTimeout ? 504 : 502,
        isTimeout ? 'gemini-timeout' : 'gemini-unreachable',
        isTimeout
          ? 'Layanan AI memerlukan waktu lebih lama dari biasanya.'
          : 'Layanan AI sedang tidak dapat dijangkau.'
      ),
    };
  }
}

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    if (!hasValidTurnstileSession(req)) {
      return NextResponse.json({ error: 'Akses situs belum diverifikasi oleh Turnstile.', code: 'access-not-verified' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`ai:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan AI. Coba lagi beberapa menit lagi.', code: 'ai-rate-limited' },
        { status: 429 }
      );
    }

    const { prompt, systemInstruction } = await req.json();
    const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    const normalizedSystemInstruction = typeof systemInstruction === 'string' ? systemInstruction.trim() : '';

    if (!normalizedPrompt) {
      return NextResponse.json({ error: 'Prompt wajib diisi.', code: 'prompt-required' }, { status: 400 });
    }

    if (normalizedPrompt.length > MAX_PROMPT_LENGTH || normalizedSystemInstruction.length > MAX_SYSTEM_INSTRUCTION_LENGTH) {
      return NextResponse.json({ error: 'Konten permintaan terlalu panjang.', code: 'prompt-too-long' }, { status: 413 });
    }

    const apiKeys = getConfiguredGeminiApiKeys();
    const candidateModels = getConfiguredGeminiModels();

    if (!apiKeys.length) {
      return NextResponse.json(
        { error: 'Layanan AI sedang tidak tersedia saat ini.', code: 'gemini-api-key-missing' },
        { status: 503 }
      );
    }

    let lastFailure = null;

    for (const apiKey of apiKeys) {
      for (const model of candidateModels) {
        const result = await requestGemini({
          apiKey,
          model,
          prompt: normalizedPrompt,
          systemInstruction: normalizedSystemInstruction,
        });

        if (result.ok) {
          return NextResponse.json({ reply: result.reply, model: result.model });
        }

        lastFailure = result.failure;

        if (lastFailure.code === 'gemini-model-unavailable') {
          continue;
        }

        if (
          lastFailure.code === 'gemini-api-key-rejected' ||
          lastFailure.code === 'gemini-permission-denied'
        ) {
          break;
        }

        return NextResponse.json(
          { error: lastFailure.error, code: lastFailure.code },
          { status: lastFailure.status }
        );
      }
    }

    const failure = lastFailure || createFailure(503, 'gemini-unavailable', 'Layanan AI sedang tidak tersedia saat ini.');
    return NextResponse.json({ error: failure.error, code: failure.code }, { status: failure.status });
  } catch (error) {
    if (error?.status) {
      return NextResponse.json({ error: error.message, code: error.code || 'request-error' }, { status: error.status });
    }

    console.error('AI route error:', error);
    return NextResponse.json({ error: 'Internal Server Error', code: 'internal-error' }, { status: 500 });
  }
}
