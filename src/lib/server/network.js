import dns from 'node:dns/promises';
import net from 'node:net';

const LOCAL_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

export function getClientIp(req) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const candidate = forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || '127.0.0.1';

  return candidate.replace(/^\[|\]$/g, '');
}

export function isPrivateOrLocalIp(ip) {
  if (!ip) return true;

  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');

  if (normalized === '::1' || normalized === '0.0.0.0') return true;

  if (net.isIPv4(normalized)) {
    return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(normalized);
  }

  if (net.isIPv6(normalized)) {
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.') ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  return true;
}

export function normalizePublicTargetUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    throw new Error('URL target tidak valid.');
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl) {
    throw new Error('URL target wajib diisi.');
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const parsedUrl = new URL(targetUrl);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Hanya protokol HTTP/HTTPS yang diizinkan.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error('Target localhost tidak diizinkan.');
  }

  if (net.isIP(hostname) && isPrivateOrLocalIp(hostname)) {
    throw new Error('Target private/internal IP diblokir.');
  }

  return parsedUrl;
}

export async function resolvePublicAddresses(hostname) {
  const normalizedHostname = hostname.toLowerCase();

  if (net.isIP(normalizedHostname)) {
    if (isPrivateOrLocalIp(normalizedHostname)) {
      throw new Error('Target private/internal IP diblokir.');
    }

    return [normalizedHostname];
  }

  const records = await dns.lookup(normalizedHostname, { all: true, verbatim: true });

  if (!records.length) {
    throw new Error('Gagal meresolusikan domain target.');
  }

  const addresses = records.map((record) => record.address);

  if (addresses.some(isPrivateOrLocalIp)) {
    throw new Error('Target private/internal IP diblokir.');
  }

  return addresses;
}
