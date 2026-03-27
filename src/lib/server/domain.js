import net from 'node:net';
import { domainToASCII } from 'node:url';

const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeDomainName(rawValue) {
  if (typeof rawValue !== 'string') {
    throw new Error('Nama domain tidak valid.');
  }

  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    throw new Error('Nama domain wajib diisi.');
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    throw new Error('Masukkan nama domain saja tanpa http:// atau https://.');
  }

  if (trimmedValue.includes('/') || /\s/.test(trimmedValue)) {
    throw new Error('Masukkan nama domain saja, tanpa path atau spasi tambahan.');
  }

  const normalizedValue = trimmedValue.replace(/\.$/, '').toLowerCase();

  if (net.isIP(normalizedValue)) {
    throw new Error('Masukkan nama domain, bukan alamat IP.');
  }

  const asciiDomain = domainToASCII(normalizedValue);

  if (!asciiDomain) {
    throw new Error('Nama domain tidak valid.');
  }

  const labels = asciiDomain.split('.');

  if (labels.length < 2) {
    throw new Error('Domain harus memiliki nama host dan TLD, misalnya example.com.');
  }

  if (asciiDomain.length > 253 || labels.some((label) => !DOMAIN_LABEL_REGEX.test(label))) {
    throw new Error('Format nama domain tidak valid.');
  }

  return asciiDomain;
}
