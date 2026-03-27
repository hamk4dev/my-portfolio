export async function verifyTurnstileToken({ token, remoteip }) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secretKey || secretKey.startsWith('masukkan_')) {
    return {
      ok: false,
      status: 503,
      code: 'turnstile-missing-secret',
      error: 'Pemeriksaan akses belum tersedia di server.',
      details: ['missing-secret'],
    };
  }

  if (typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'turnstile-missing-token',
      error: 'Token pemeriksaan akses wajib diisi.',
      details: ['missing-token'],
    };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token.trim());

  if (remoteip) {
    formData.append('remoteip', remoteip);
  }

  let verifyRes;

  try {
    verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      body: formData,
    });
  } catch (error) {
    const timeout = error?.name === 'AbortError' || error?.name === 'TimeoutError';

    return {
      ok: false,
      status: timeout ? 504 : 502,
      code: timeout ? 'turnstile-timeout' : 'turnstile-unreachable',
      error: timeout
        ? 'Layanan pemeriksaan akses memerlukan waktu lebih lama dari biasanya.'
        : 'Gagal menghubungi layanan pemeriksaan akses.',
      details: [timeout ? 'timeout' : 'unreachable'],
    };
  }

  if (!verifyRes.ok) {
    return {
      ok: false,
      status: 502,
      code: 'turnstile-unreachable',
      error: 'Gagal menghubungi layanan pemeriksaan akses.',
      details: ['turnstile-unreachable'],
    };
  }

  let verifyData = null;

  try {
    verifyData = await verifyRes.json();
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'turnstile-invalid-response',
      error: 'Respons layanan pemeriksaan akses tidak valid.',
      details: ['invalid-response'],
    };
  }

  if (!verifyData.success) {
    return {
      ok: false,
      status: 403,
      code: 'turnstile-verification-failed',
      error: 'Verifikasi akses belum berhasil.',
      details: verifyData['error-codes'] || [],
    };
  }

  return {
    ok: true,
    status: 200,
    data: verifyData,
  };
}
