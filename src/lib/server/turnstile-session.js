import { createHmac, timingSafeEqual } from 'node:crypto';

const TURNSTILE_SESSION_COOKIE = 'turnstile_session';
const TURNSTILE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function readConfiguredSecret(envName) {
  const value = process.env[envName]?.trim();
  if (!value || value.startsWith('masukkan_')) {
    return '';
  }
  return value;
}

function getSessionSecret() {
  const explicitSecret = readConfiguredSecret('TURNSTILE_SESSION_SECRET');
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return readConfiguredSecret('TURNSTILE_SECRET_KEY');
  }

  return '';
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function signPayload(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function isTurnstileSessionConfigured() {
  return Boolean(getSessionSecret());
}

export function getTurnstileSessionCookieName() {
  return TURNSTILE_SESSION_COOKIE;
}

export function createTurnstileSessionToken() {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload = JSON.stringify({
    v: 1,
    exp: Date.now() + TURNSTILE_SESSION_TTL_MS,
  });

  const encodedPayload = toBase64Url(payload);
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function readTurnstileSessionToken(token) {
  const secret = getSessionSecret();
  if (!secret || typeof token !== 'string') return { valid: false };

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) return { valid: false };

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    if (!payload?.exp || payload.exp <= Date.now()) {
      return { valid: false, expired: true };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function hasValidTurnstileSession(req) {
  const cookieName = getTurnstileSessionCookieName();
  const token = req.cookies.get(cookieName)?.value;
  return readTurnstileSessionToken(token).valid;
}

export function getTurnstileSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(TURNSTILE_SESSION_TTL_MS / 1000),
  };
}

export function clearTurnstileSessionCookie(response) {
  response.cookies.set(getTurnstileSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}