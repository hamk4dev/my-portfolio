import { NextResponse } from 'next/server';

import { isEmailAuthAllowedHostname } from '@/data/email-auth-policy';
import { isScannerAllowedHostname } from '@/data/scanner-policy';
import { normalizeDomainName } from '@/lib/server/domain';
import { sendSiteEmail, escapeHtml } from '@/lib/server/email';
import { getClientIp, normalizePublicTargetUrl } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

const MAX_NAME_LENGTH = 80;
const MAX_CONTACT_LENGTH = 200;
const MAX_REASON_LENGTH = 1500;
const MAX_TOOL_NAME_LENGTH = 120;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLinkedInReference(value) {
  try {
    const normalizedValue =
      /^https?:\/\//i.test(value) || /^linkedin\.com\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalizedValue);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    return hostname === 'linkedin.com' && /^\/(in|company)\//i.test(url.pathname);
  } catch {
    return false;
  }
}

function validatePayload(payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const contact = typeof payload.contact === 'string' ? payload.contact.trim() : '';
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  const website = typeof payload.website === 'string' ? payload.website.trim() : '';
  const targetType = payload.targetType === 'domain' ? 'domain' : 'url';
  const toolName = typeof payload.toolName === 'string' ? payload.toolName.trim() : 'Security Analyzer';

  if (website) {
    return { ok: false, status: 400, error: 'Permintaan ditolak.' };
  }


  if (!name || !contact || !reason) {
    return { ok: false, status: 400, error: 'Nama, kontak, dan pesan wajib diisi.' };
  }

  if (
    name.length > MAX_NAME_LENGTH ||
    contact.length > MAX_CONTACT_LENGTH ||
    reason.length > MAX_REASON_LENGTH ||
    toolName.length > MAX_TOOL_NAME_LENGTH
  ) {
    return { ok: false, status: 413, error: 'Form permintaan terlalu panjang.' };
  }

  const isEmail = emailRegex.test(contact);
  const isLinkedIn = isLinkedInReference(contact);

  if (!isEmail && !isLinkedIn) {
    return {
      ok: false,
      status: 400,
      error: 'Kontak harus berupa email valid atau URL profil LinkedIn yang valid.',
    };
  }

  let targetValue;
  let targetHost;

  try {
    if (targetType === 'domain') {
      targetValue = normalizeDomainName(payload.targetUrl);
      targetHost = targetValue;
    } else {
      targetValue = normalizePublicTargetUrl(payload.targetUrl);
      targetHost = targetValue.hostname;
    }
  } catch (error) {
    return { ok: false, status: 400, error: error.message || 'Target yang dimasukkan tidak valid.' };
  }

  if (targetType === 'domain' && isEmailAuthAllowedHostname(targetHost)) {
    return {
      ok: false,
      status: 400,
      error: 'Domain ini sudah tersedia untuk pengujian langsung dari analyzer ini.',
    };
  }

  if (targetType === 'url' && isScannerAllowedHostname(targetHost)) {
    return {
      ok: false,
      status: 400,
      error: 'Domain ini sudah tersedia untuk pengujian langsung dari tool ini.',
    };
  }

  return {
    ok: true,
    data: {
      name,
      contact,
      reason,
      toolName: toolName || 'Security Analyzer',
      targetType,
      targetValue,
      targetHost,
      isEmail,
    },
  };
}

async function sendScanAccessRequest({ name, contact, reason, toolName, targetType, targetValue, targetHost, isEmail, clientIp }) {
  const subject = `Permintaan Akses Pengujian Penuh untuk ${targetHost}`;
  const timestamp = new Date().toISOString();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Permintaan Akses Pengujian Penuh</h2>
      <p>Pengguna meminta akses pengujian penuh untuk target yang belum tersedia langsung dari tool.</p>
      <p><strong>Tool:</strong> ${escapeHtml(toolName)}</p>
      <p><strong>Nama:</strong> ${escapeHtml(name)}</p>
      <p><strong>Kontak:</strong> ${escapeHtml(contact)}</p>
      <p><strong>Jenis Target:</strong> ${escapeHtml(targetType)}</p>
      <p><strong>Target:</strong> ${escapeHtml(targetType === 'domain' ? targetValue : targetValue.toString())}</p>
      <p><strong>Host:</strong> ${escapeHtml(targetHost)}</p>
      <p><strong>IP Pengirim:</strong> ${escapeHtml(clientIp)}</p>
      <p><strong>Waktu UTC:</strong> ${escapeHtml(timestamp)}</p>
      <hr />
      <p><strong>Pesan:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(reason)}</p>
    </div>
  `;

  const text = [
    'Permintaan Akses Pengujian Penuh',
    '',
    'Pengguna meminta akses pengujian penuh untuk target yang belum tersedia langsung dari tool.',
    `Tool: ${toolName}`,
    `Nama: ${name}`,
    `Kontak: ${contact}`,
    `Jenis Target: ${targetType}`,
    `Target: ${targetType === 'domain' ? targetValue : targetValue.toString()}`,
    `Host: ${targetHost}`,
    `IP Pengirim: ${clientIp}`,
    `Waktu UTC: ${timestamp}`,
    '',
    'Pesan:',
    reason,
  ].join('\n');

  const result = await sendSiteEmail({
    subject,
    html,
    text,
    replyTo: isEmail ? contact : undefined,
    userAgent: 'init-cv-scan-access/1.0',
  });

  if (!result.ok && result.status === 503) {
    return {
      ok: false,
      status: 503,
      error: 'Layanan email belum tersedia di server.',
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
    const rateLimit = await consumeRateLimit(`scan-access-request:${clientIp}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak pesan permintaan. Coba lagi nanti.' },
        { status: 429 }
      );
    }

    const payload = await req.json();
    const validated = validatePayload(payload);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const result = await sendScanAccessRequest({
      ...validated.data,
      clientIp,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan akses pengujian penuh berhasil dikirim.',
      id: result.data?.id || null,
    });
  } catch (error) {
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Scan access request route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
