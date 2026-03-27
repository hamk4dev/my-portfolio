export async function verifyTurnstileToken({ token, remoteip }) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secretKey || secretKey.startsWith('masukkan_')) {
    return {
      ok: false,
      status: 503,
      error: 'Turnstile belum dikonfigurasi di server.',
      details: ['missing-secret'],
    };
  }

  if (typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'Token Turnstile wajib diisi.',
      details: ['missing-token'],
    };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token.trim());

  if (remoteip) {
    formData.append('remoteip', remoteip);
  }

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    body: formData,
  });

  if (!verifyRes.ok) {
    return {
      ok: false,
      status: 502,
      error: 'Gagal menghubungi layanan Turnstile.',
      details: ['turnstile-unreachable'],
    };
  }

  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    return {
      ok: false,
      status: 403,
      error: 'Verifikasi bot gagal.',
      details: verifyData['error-codes'] || [],
    };
  }

  return {
    ok: true,
    status: 200,
    data: verifyData,
  };
}
