const readError = async (response, fallbackMessage) => {
  try {
    const data = await response.json();
    return data.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

export const callGemini = async (prompt, systemInstruction) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Koneksi AI gagal.'));
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
    throw new Error(await readError(response, 'API Scanner Backend tidak merespons.'));
  }

  return response.json();
};

export const checkIPReputationOnBackend = async () => {
  const response = await fetch('/api/security/ip-reputation', { method: 'GET' });

  if (!response.ok) {
    throw new Error(await readError(response, 'IP API unreachable.'));
  }

  return response.json();
};
