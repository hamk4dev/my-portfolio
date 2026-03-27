const readError = async (response, fallbackMessage) => {
  try {
    const data = await response.json();
    return {
      message: data.error || fallbackMessage,
      data,
    };
  } catch {
    return {
      message: fallbackMessage,
      data: null,
    };
  }
};

const createApiError = async (response, fallbackMessage) => {
  const { message, data } = await readError(response, fallbackMessage);
  const error = new Error(message);

  error.status = response.status;
  error.code = data?.code || null;
  error.data = data;

  return error;
};

const fetchWithTimeout = async (input, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Permintaan memerlukan waktu lebih lama dari biasanya.');
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const callGemini = async (prompt, systemInstruction) => {
  const response = await fetchWithTimeout('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Koneksi AI gagal.');
  }

  const data = await response.json();
  return data.reply;
};

export const runBackendWebScan = async (targetUrl) => {
  const response = await fetch('/api/security/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'API Scanner Backend tidak merespons.');
  }

  return response.json();
};

export const runEmailAuthAnalysis = async (domain) => {
  const response = await fetch('/api/security/email-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'API analyzer email tidak merespons.');
  }

  return response.json();
};

export const checkIPReputationOnBackend = async () => {
  const response = await fetch('/api/security/ip-reputation', { method: 'GET' });

  if (!response.ok) {
    throw await createApiError(response, 'IP API unreachable.');
  }

  return response.json();
};

export const getSystemHealthOnBackend = async () => {
  const response = await fetch('/api/security/health-status', { method: 'GET' });

  if (!response.ok) {
    throw await createApiError(response, 'Health API unreachable.');
  }

  return response.json();
};

export const getTurnstileSessionStatus = async () => {
  const response = await fetchWithTimeout('/api/security/turnstile', { method: 'GET' });

  if (!response.ok) {
    throw await createApiError(response, 'Gagal memeriksa status Turnstile.');
  }

  return response.json();
};

export const verifyTurnstileSiteAccess = async (token) => {
  const response = await fetchWithTimeout('/api/security/turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Verifikasi Turnstile gagal.');
  }

  return response.json();
};

export const submitContactMessage = async (payload) => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Pesan gagal dikirim.');
  }

  return response.json();
};

export const submitScanAccessRequest = async (payload) => {
  const response = await fetch('/api/security/scan-access-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Permintaan izin domain gagal dikirim.');
  }

  return response.json();
};

