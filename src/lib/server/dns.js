import dns from 'node:dns/promises';

const DEFAULT_TXT_TIMEOUT_MS = 7000;
const DNS_OVER_HTTPS_URL = 'https://dns.google/resolve';

function createDnsError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function flattenSystemTxtRecords(records) {
  return records.map((entry) => entry.join(''));
}

function normalizeDohTxtValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const quotedParts = [...value.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quotedParts.length) {
    return quotedParts.join('');
  }

  return value.replace(/^"|"$/g, '');
}

function isRecoverableResolverError(error) {
  return new Set(['ECONNREFUSED', 'EAI_AGAIN', 'ETIMEOUT', 'SERVFAIL', 'ESERVFAIL', 'REFUSED']).has(
    error?.code
  );
}

async function resolveTxtWithSystemResolver(hostname, timeoutMs) {
  let timeoutHandle;

  try {
    const records = await Promise.race([
      dns.resolveTxt(hostname),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(createDnsError('ETIMEOUT', 'DNS query timeout'));
        }, timeoutMs);
      }),
    ]);

    return {
      records: flattenSystemTxtRecords(records),
      resolver: 'system',
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function resolveTxtWithDoh(hostname, timeoutMs) {
  try {
    const response = await fetch(
      `${DNS_OVER_HTTPS_URL}?name=${encodeURIComponent(hostname)}&type=TXT&cd=false&do=false`,
      {
        headers: {
          Accept: 'application/dns-json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!response.ok) {
      throw createDnsError('EDOHHTTP', `DNS-over-HTTPS request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const status = Number(payload?.Status ?? 0);

    if (status === 3) {
      throw createDnsError('ENOTFOUND', 'DNS name does not exist');
    }

    if (status === 2) {
      throw createDnsError('SERVFAIL', 'DNS server failure');
    }

    if (status === 5) {
      throw createDnsError('REFUSED', 'DNS query refused');
    }

    if (status !== 0) {
      throw createDnsError('EDOHSTATUS', `Unexpected DNS-over-HTTPS status ${status}`);
    }

    const records = (payload?.Answer || [])
      .filter((answer) => answer?.type === 16)
      .map((answer) => normalizeDohTxtValue(answer?.data))
      .filter(Boolean);

    return {
      records,
      resolver: 'dns-over-https',
    };
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw createDnsError('ETIMEOUT', 'DNS-over-HTTPS timeout');
    }

    if (error?.code) {
      throw error;
    }

    throw createDnsError('EDOHFETCH', error?.message || 'DNS-over-HTTPS request failed');
  }
}

export async function resolveTxtRecords(hostname, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TXT_TIMEOUT_MS;

  try {
    return await resolveTxtWithSystemResolver(hostname, timeoutMs);
  } catch (error) {
    if (!isRecoverableResolverError(error)) {
      throw error;
    }

    return resolveTxtWithDoh(hostname, timeoutMs);
  }
}
