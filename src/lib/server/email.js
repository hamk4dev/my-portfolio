const EMAIL_TIMEOUT_MS = 10000;

export const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function sendSiteEmail({ subject, html, text, replyTo, userAgent = 'init-cv-mail/1.0' }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();

  if (!apiKey || !from || !to) {
    return {
      ok: false,
      status: 503,
      error: 'Layanan email belum dikonfigurasi di server.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Resend mail error:', response.status, errorBody);

    return {
      ok: false,
      status: 502,
      error: 'Layanan email sedang tidak tersedia.',
    };
  }

  return {
    ok: true,
    data: await response.json(),
  };
}

