import { NextResponse } from 'next/server';

import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { escapeHtml, sendSiteEmail } from '@/lib/server/email';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2500;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePayload(payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const website = typeof payload.website === 'string' ? payload.website.trim() : '';
  if (website) {
    return { ok: false, status: 400, error: 'Permintaan ditolak.' };
  }

  if (!name || !email || !message) {
    return { ok: false, status: 400, error: 'Nama, email, dan pesan wajib diisi.' };
  }

  if (!emailRegex.test(email)) {
    return { ok: false, status: 400, error: 'Format email tidak valid.' };
  }

  if (
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    subject.length > MAX_SUBJECT_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return { ok: false, status: 413, error: 'Pesan terlalu panjang.' };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      subject: subject || 'Pesan baru dari Contact Hub',
      message,
    },
  };
}

async function sendContactEmail({ name, email, subject, message }) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Pesan Baru Dari Contact Hub</h2>
      <p><strong>Nama:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subjek:</strong> ${escapeHtml(subject)}</p>
      <hr />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  const text = `Pesan Baru Dari Contact Hub\n\nNama: ${name}\nEmail: ${email}\nSubjek: ${subject}\n\n${message}`;

  const result = await sendSiteEmail({
    subject,
    html,
    text,
    replyTo: email,
    userAgent: 'init-cv-contact/1.0',
  });

  if (!result.ok && result.status === 503) {
    return {
      ok: false,
      status: 503,
      error: 'Layanan kontak belum dikonfigurasi di server.',
    };
  }

  return result;
}

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    if (!hasValidTurnstileSession(req)) {
      return NextResponse.json({ error: 'Akses situs belum diverifikasi oleh Turnstile.' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`contact:${clientIp}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak pengiriman pesan. Coba lagi beberapa menit lagi.' }, { status: 429 });
    }

    const payload = await req.json();
    const validated = validatePayload(payload);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const result = await sendContactEmail(validated.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dikirim.',
      id: result.data?.id || null,
    });
  } catch (error) {
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Contact route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
