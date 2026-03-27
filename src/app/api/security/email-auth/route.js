import { NextResponse } from 'next/server';

import { emailAuthPolicy, getEmailAuthAllowedTargets, isEmailAuthAllowedHostname } from '@/data/email-auth-policy';
import { normalizeDomainName } from '@/lib/server/domain';
import { resolveTxtRecords } from '@/lib/server/dns';
import { getClientIp } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

const TXT_TIMEOUT_MS = 7000;
const EMAIL_AUTH_INPUT_ERRORS = new Set([
  'Nama domain tidak valid.',
  'Nama domain wajib diisi.',
  'Masukkan nama domain saja tanpa http:// atau https://.',
  'Masukkan nama domain saja, tanpa path atau spasi tambahan.',
  'Masukkan nama domain, bukan alamat IP.',
  'Domain harus memiliki nama host dan TLD, misalnya example.com.',
  'Format nama domain tidak valid.',
]);

function buildEmailAuthErrorResponse(error) {
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  if (EMAIL_AUTH_INPUT_ERRORS.has(message)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (/timeout/i.test(message)) {
    return NextResponse.json({ error: 'Query DNS tidak selesai tepat waktu.' }, { status: 504 });
  }

  if (error?.status) {
    return NextResponse.json({ error: message }, { status: error.status });
  }

  console.error('Email auth route error:', error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

function createBadge(status, severity, summary, rawRecord, extras = {}) {
  return {
    status,
    severity,
    summary,
    rawRecord,
    ...extras,
  };
}

async function resolveMainTxtRecords(domain) {
  try {
    const result = await resolveTxtRecords(domain, { timeoutMs: TXT_TIMEOUT_MS });
    return {
      ok: true,
      records: result.records,
      resolver: result.resolver,
    };
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTIMP') {
      return {
        ok: true,
        records: [],
        resolver: 'system',
      };
    }

    if (error.code === 'ENOTFOUND') {
      return {
        ok: false,
        status: 404,
        error: 'Domain tidak ditemukan di DNS publik. Pastikan nama domain benar.',
      };
    }

    if (
      error.code === 'ETIMEOUT' ||
      error.code === 'EAI_AGAIN' ||
      error.code === 'SERVFAIL' ||
      error.code === 'ESERVFAIL' ||
      error.code === 'REFUSED' ||
      error.code === 'ECONNREFUSED'
    ) {
      return {
        ok: false,
        status: 504,
        error: 'Server DNS tidak merespons tepat waktu. Coba lagi beberapa saat lagi.',
      };
    }

    return {
      ok: false,
      status: 502,
      error: 'Query DNS gagal diselesaikan dengan aman.',
    };
  }
}

async function resolveDmarcTxtRecords(domain) {
  const queryDomain = `_dmarc.${domain}`;

  try {
    const result = await resolveTxtRecords(queryDomain, { timeoutMs: TXT_TIMEOUT_MS });
    return {
      ok: true,
      queryDomain,
      records: result.records,
      resolver: result.resolver,
    };
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND' || error.code === 'ENOTIMP') {
      return {
        ok: true,
        queryDomain,
        records: [],
        resolver: 'system',
      };
    }

    if (
      error.code === 'ETIMEOUT' ||
      error.code === 'SERVFAIL' ||
      error.code === 'ESERVFAIL' ||
      error.code === 'REFUSED' ||
      error.code === 'ECONNREFUSED'
    ) {
      return {
        ok: false,
        status: 504,
        error: 'Lookup DNS untuk subdomain DMARC timeout atau ditolak server DNS.',
      };
    }

    return {
      ok: false,
      status: 502,
      error: 'Lookup DNS untuk DMARC gagal diselesaikan dengan aman.',
    };
  }
}

function analyzeSpf(records) {
  const spfRecords = records.filter((record) => /^v=spf1\b/i.test(record.trim()));

  if (!spfRecords.length) {
    return createBadge(
      'KRITIS',
      'HIGH',
      'Tidak ditemukan record SPF. Domain lebih mudah dipalsukan karena tidak ada kebijakan pengirim resmi.',
      null,
      { verdict: 'SPF Missing' }
    );
  }

  if (spfRecords.length > 1) {
    return createBadge(
      'KRITIS',
      'HIGH',
      'Ditemukan lebih dari satu record SPF. Ini dapat memicu SPF permerror dan membuat validasi email tidak andal.',
      spfRecords[0],
      { verdict: 'Multiple SPF Records', rawMatches: spfRecords }
    );
  }

  const selectedRecord = spfRecords[0].trim();
  const tokens = selectedRecord.toLowerCase().split(/\s+/).filter(Boolean);
  const allMechanism = [...tokens].reverse().find((token) => /^[+?~-]?all$/i.test(token)) || null;

  if (allMechanism === '+all' || allMechanism === 'all' || allMechanism === '?all') {
    return createBadge(
      'KRITIS',
      'HIGH',
      'Record SPF mengizinkan atau menetralkan semua pengirim. Ini sangat rentan terhadap spoofing.',
      selectedRecord,
      { verdict: 'Allow All / Neutral SPF', mechanism: allMechanism }
    );
  }

  if (allMechanism === '~all') {
    return createBadge(
      'PERINGATAN',
      'MEDIUM',
      'SPF memakai softfail. Domain masih berisiko karena email spoofing belum diblokir secara tegas.',
      selectedRecord,
      { verdict: 'Softfail SPF', mechanism: allMechanism }
    );
  }

  if (allMechanism === '-all') {
    return createBadge(
      'AMAN',
      'PASS',
      'SPF memakai hard fail. Pengirim di luar kebijakan resmi akan ditolak lebih tegas.',
      selectedRecord,
      { verdict: 'Strict SPF', mechanism: allMechanism }
    );
  }

  return createBadge(
    'PERINGATAN',
    'MEDIUM',
    'Record SPF ditemukan, tetapi mekanisme all tidak jelas. Evaluasi manual tetap disarankan.',
    selectedRecord,
    { verdict: 'Unclear SPF Enforcement', mechanism: allMechanism }
  );
}

function parseDmarcPolicy(record) {
  const match = record.match(/(?:^|;)\s*p=([^;\s]+)/i);
  return match ? match[1].trim().toLowerCase() : null;
}

function analyzeDmarc(records) {
  const dmarcRecords = records.filter((record) => /^v=dmarc1\b/i.test(record.trim()));

  if (!dmarcRecords.length) {
    return createBadge(
      'KRITIS',
      'HIGH',
      'Tidak ditemukan record DMARC. Domain tidak memiliki kebijakan anti-spoofing tingkat domain.',
      null,
      { verdict: 'DMARC Missing' }
    );
  }

  const selectedRecord = dmarcRecords[0].trim();
  const policy = parseDmarcPolicy(selectedRecord);

  if (!policy) {
    return createBadge(
      'KRITIS',
      'HIGH',
      'Record DMARC ada, tetapi parameter p= tidak ditemukan sehingga kebijakan penegakan tidak jelas.',
      selectedRecord,
      { verdict: 'DMARC Policy Missing', policy: null }
    );
  }

  if (policy === 'none') {
    return createBadge(
      'RENTAN',
      'HIGH',
      'DMARC masih pada mode monitoring (p=none). Email palsu dapat lolos karena tidak ada tindakan blokir.',
      selectedRecord,
      { verdict: 'Monitoring Only', policy }
    );
  }

  if (policy === 'quarantine' || policy === 'reject') {
    return createBadge(
      'AMAN',
      'PASS',
      `DMARC memakai kebijakan ${policy}. Domain memiliki tindakan proteksi terhadap email spoofing.`,
      selectedRecord,
      { verdict: 'Enforced DMARC', policy }
    );
  }

  return createBadge(
    'PERINGATAN',
    'MEDIUM',
    'Record DMARC ditemukan, tetapi nilai p= tidak umum dan perlu verifikasi manual.',
    selectedRecord,
    { verdict: 'Unknown DMARC Policy', policy }
  );
}

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    if (!hasValidTurnstileSession(req)) {
      return NextResponse.json({ error: 'Akses situs belum diverifikasi oleh Turnstile.' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`email-auth:${clientIp}`, {
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak analisis DNS dalam waktu singkat. Coba lagi beberapa menit lagi.' },
        { status: 429 }
      );
    }

    const { domain } = await req.json();
    const normalizedDomain = normalizeDomainName(domain);

    if (!isEmailAuthAllowedHostname(normalizedDomain)) {
      return NextResponse.json(
        {
          error: `Domain ${normalizedDomain} tidak berada dalam daftar aman analyzer email. Untuk menjaga penggunaan tetap legal dan terkontrol, engine ini dikunci. Apakah Anda pemilik domain ini dan ingin mengauditnya?`,
          code: 'DOMAIN_NOT_ALLOWED',
          blockedTarget: normalizedDomain,
          requestedHost: normalizedDomain,
          policy: {
            ...emailAuthPolicy,
            allowedTargets: getEmailAuthAllowedTargets(),
          },
        },
        { status: 403 }
      );
    }

    const mainRecordsResult = await resolveMainTxtRecords(normalizedDomain);

    if (!mainRecordsResult.ok) {
      return NextResponse.json({ error: mainRecordsResult.error }, { status: mainRecordsResult.status });
    }

    const dmarcRecordsResult = await resolveDmarcTxtRecords(normalizedDomain);

    if (!dmarcRecordsResult.ok) {
      return NextResponse.json({ error: dmarcRecordsResult.error }, { status: dmarcRecordsResult.status });
    }

    const spf = analyzeSpf(mainRecordsResult.records);
    const dmarc = analyzeDmarc(dmarcRecordsResult.records);

    return NextResponse.json({
      domain: normalizedDomain,
      summary:
        'Engine ini melakukan passive DNS OSINT secara real-time. Resolver utama memakai dns.promises.resolveTxt, lalu otomatis beralih ke DNS-over-HTTPS hanya jika resolver runtime menolak atau timeout. Tidak ada request HTTP ke aplikasi target dan tidak ada simulasi pengiriman email.',
      methodology: [
        'SPF dianalisis dari record TXT pada domain utama yang diawali v=spf1.',
        'DMARC dianalisis dari TXT pada subdomain _dmarc.[domain].',
        'Bukti mentah ditampilkan apa adanya agar hasil dapat diverifikasi secara manual.',
      ],
      resolvers: {
        spf: mainRecordsResult.resolver,
        dmarc: dmarcRecordsResult.resolver,
      },
      spf,
      dmarc,
      rawDnsRecords: {
        spfQuery: normalizedDomain,
        spfTxtRecords: mainRecordsResult.records,
        dmarcQuery: dmarcRecordsResult.queryDomain,
        dmarcTxtRecords: dmarcRecordsResult.records,
      },
    });
  } catch (error) {
    return buildEmailAuthErrorResponse(error);
  }
}
