import { NextResponse } from 'next/server';

import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';

const MAX_PROMPT_LENGTH = 3000;
const MAX_SYSTEM_INSTRUCTION_LENGTH = 4000;

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = consumeRateLimit(`ai:${clientIp}`, {
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
    const model = process.env.GEMINI_MODEL?.trim();

    if (!apiKey || !model) {
      return NextResponse.json({ error: 'Layanan AI belum dikonfigurasi di server.' }, { status: 503 });
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
      const errorBody = await response.text();
      console.error('Gemini API error:', response.status, errorBody);
      return NextResponse.json({ error: 'Layanan AI sedang tidak tersedia.' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'AI tidak mengembalikan jawaban.' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
