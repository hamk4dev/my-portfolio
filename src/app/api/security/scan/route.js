import { NextResponse } from 'next/server';

import { getScannerAllowedTargets, isScannerAllowedHostname, scannerPolicy } from '@/data/scanner-policy';
import { getClientIp, normalizePublicTargetUrl, resolvePublicAddresses } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';
import { assertJsonRequest, assertSameOriginRequest } from '@/lib/server/request-guards';
import { hasValidTurnstileSession } from '@/lib/server/turnstile-session';

const REQUEST_TIMEOUT_MS = 9000;
const DOCUMENT_REQUEST_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const HTML_CAPTURE_LIMIT = 150000;
const SCAN_INPUT_ERRORS = new Set([
  'URL target tidak valid.',
  'URL target wajib diisi.',
  'Hanya protokol HTTP/HTTPS yang diizinkan.',
  'Target localhost tidak diizinkan.',
  'Target private/internal IP diblokir.',
  'Gagal meresolusikan domain target.',
  'Terlalu banyak redirect.',
]);

function buildScanErrorResponse(error) {
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  if (SCAN_INPUT_ERRORS.has(message)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (/timeout/i.test(message)) {
    return NextResponse.json({ error: 'Target tidak merespons tepat waktu.' }, { status: 504 });
  }

  console.error('Web scanner route error:', error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

const createCategory = (id, name, maxScore) => ({
  id,
  name,
  maxScore,
  score: maxScore,
  checks: [],
});

const setCategoryScore = (category, nextScore) => {
  category.score = Math.max(0, Math.min(category.maxScore, nextScore));
};

const addCheck = (category, { status, severity = 'PASS', name, desc, penalty = 0, source }) => {
  category.checks.push({ status, severity, name, desc, source: source || category.name });

  if ((status === 'FAIL' || status === 'WARN') && penalty > 0) {
    category.score = Math.max(0, category.score - penalty);
  }
};

const finalizeCategory = (category) => {
  const hasFail = category.checks.some((check) => check.status === 'FAIL');
  const hasWarn = category.checks.some((check) => check.status === 'WARN');
  const hasOnlyInfo = category.checks.length > 0 && category.checks.every((check) => check.status === 'INFO');

  return {
    ...category,
    score: Math.max(0, Math.min(category.maxScore, category.score)),
    status: hasFail ? 'FAIL' : hasWarn || hasOnlyInfo ? 'WARN' : 'PASS',
  };
};

async function fetchWithRedirects(initialUrl, { method = 'HEAD', allowGetFallback = false, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response = await fetch(currentUrl, {
      method,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      headers:
        method === 'GET'
          ? {
              Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            }
          : undefined,
    });

    if (allowGetFallback && method === 'HEAD' && (response.status === 405 || response.status === 501)) {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
      });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        return { response, finalUrl: currentUrl, redirectCount };
      }

      const nextUrl = normalizePublicTargetUrl(new URL(location, currentUrl).toString());
      await resolvePublicAddresses(nextUrl.hostname);
      currentUrl = nextUrl.toString();
      continue;
    }

    return { response, finalUrl: currentUrl, redirectCount };
  }

  throw new Error('Terlalu banyak redirect.');
}

const parseCookies = (setCookieHeaders) =>
  setCookieHeaders
    .map((rawCookie) => {
      const [namePart] = rawCookie.split(';');
      const [name = 'cookie'] = namePart.split('=');
      return {
        name: name.trim(),
        raw: rawCookie,
        hasSecure: /;\s*secure(?:;|$)/i.test(rawCookie),
        hasHttpOnly: /;\s*httponly(?:;|$)/i.test(rawCookie),
        sameSite: rawCookie.match(/;\s*samesite=([^;]+)/i)?.[1]?.trim() || null,
      };
    })
    .filter((cookie) => cookie.name);

const analyzeHeadersCategory = (headersCategory, headers) => {
  const csp = headers['content-security-policy'];
  const xContentTypeOptions = headers['x-content-type-options'];
  const xFrameOptions = headers['x-frame-options'];
  const referrerPolicy = headers['referrer-policy'];
  const permissionsPolicy = headers['permissions-policy'];

  addCheck(headersCategory, {
    status: csp ? 'PASS' : 'FAIL',
    severity: csp ? 'PASS' : 'HIGH',
    name: 'Content-Security-Policy',
    desc: csp ? 'CSP aktif.' : 'Header CSP tidak ditemukan, mitigasi XSS dan isolasi konten melemah.',
    penalty: csp ? 0 : 8,
  });

  addCheck(headersCategory, {
    status: xContentTypeOptions ? 'PASS' : 'WARN',
    severity: xContentTypeOptions ? 'PASS' : 'MEDIUM',
    name: 'X-Content-Type-Options',
    desc: xContentTypeOptions ? 'Proteksi MIME sniffing aktif.' : 'Header X-Content-Type-Options tidak ditemukan.',
    penalty: xContentTypeOptions ? 0 : 4,
  });

  addCheck(headersCategory, {
    status: xFrameOptions || csp?.includes('frame-ancestors') ? 'PASS' : 'WARN',
    severity: xFrameOptions || csp?.includes('frame-ancestors') ? 'PASS' : 'MEDIUM',
    name: 'Frame Embedding Control',
    desc:
      xFrameOptions || csp?.includes('frame-ancestors')
        ? 'Kontrol clickjacking terdeteksi.'
        : 'Tidak ada X-Frame-Options atau frame-ancestors pada CSP.',
    penalty: xFrameOptions || csp?.includes('frame-ancestors') ? 0 : 5,
  });

  addCheck(headersCategory, {
    status: referrerPolicy ? 'PASS' : 'WARN',
    severity: referrerPolicy ? 'PASS' : 'MEDIUM',
    name: 'Referrer-Policy',
    desc: referrerPolicy ? `Referrer-Policy: ${referrerPolicy}` : 'Header Referrer-Policy tidak ditemukan.',
    penalty: referrerPolicy ? 0 : 4,
  });

  addCheck(headersCategory, {
    status: permissionsPolicy ? 'PASS' : 'WARN',
    severity: permissionsPolicy ? 'PASS' : 'MEDIUM',
    name: 'Permissions-Policy',
    desc: permissionsPolicy ? 'Pembatasan akses browser API terdeteksi.' : 'Header Permissions-Policy tidak ditemukan.',
    penalty: permissionsPolicy ? 0 : 4,
  });
};

const analyzeExposureCategory = (exposureCategory, headers, cookies) => {
  const xPoweredBy = headers['x-powered-by'];
  const serverHeader = headers.server;

  addCheck(exposureCategory, {
    status: xPoweredBy ? 'FAIL' : 'PASS',
    severity: xPoweredBy ? 'HIGH' : 'PASS',
    name: 'X-Powered-By Disclosure',
    desc: xPoweredBy ? `Header X-Powered-By membocorkan teknologi backend: ${xPoweredBy}` : 'Header X-Powered-By tidak terdeteksi.',
    penalty: xPoweredBy ? 6 : 0,
  });

  addCheck(exposureCategory, {
    status: serverHeader && /\d/.test(serverHeader) ? 'WARN' : 'PASS',
    severity: serverHeader && /\d/.test(serverHeader) ? 'MEDIUM' : 'PASS',
    name: 'Server Version Disclosure',
    desc:
      serverHeader && /\d/.test(serverHeader)
        ? `Header Server memuat versi yang dapat dipakai untuk fingerprinting: ${serverHeader}`
        : 'Header Server tidak membocorkan versi detail.',
    penalty: serverHeader && /\d/.test(serverHeader) ? 4 : 0,
  });

  if (!cookies.length) {
    addCheck(exposureCategory, {
      status: 'INFO',
      severity: 'PASS',
      name: 'Cookie Session',
      desc: 'Tidak ada cookie yang dikirim pada response awal, jadi unit cookie tidak diberi penalti.',
    });
    return;
  }

  const insecureCookies = cookies.filter(
    (cookie) => !cookie.hasSecure || !cookie.hasHttpOnly || !cookie.sameSite
  );

  if (!insecureCookies.length) {
    addCheck(exposureCategory, {
      status: 'PASS',
      severity: 'PASS',
      name: 'Cookie Security Attributes',
      desc: 'Cookie yang dikirim sudah memiliki atribut Secure, HttpOnly, dan SameSite.',
    });
    return;
  }

  const cookieSummary = insecureCookies
    .map((cookie) => {
      const missing = [];
      if (!cookie.hasSecure) missing.push('Secure');
      if (!cookie.hasHttpOnly) missing.push('HttpOnly');
      if (!cookie.sameSite) missing.push('SameSite');
      return `${cookie.name} (${missing.join(', ')})`;
    })
    .join('; ');

  addCheck(exposureCategory, {
    status: 'FAIL',
    severity: 'HIGH',
    name: 'Cookie Security Attributes',
    desc: `Cookie tanpa atribut proteksi lengkap terdeteksi: ${cookieSummary}`,
    penalty: Math.min(10, 4 + insecureCookies.length * 2),
  });
};

const analyzeTransportCategory = (transportCategory, { httpStatus, finalTarget, targetUrl, headers }) => {
  addCheck(transportCategory, {
    status: httpStatus >= 200 && httpStatus < 400 ? 'PASS' : httpStatus < 500 ? 'WARN' : 'FAIL',
    severity: httpStatus >= 200 && httpStatus < 400 ? 'PASS' : httpStatus < 500 ? 'MEDIUM' : 'HIGH',
    name: 'HTTP Response Status',
    desc: `Target merespons dengan status HTTP ${httpStatus}.`,
    penalty: httpStatus >= 200 && httpStatus < 400 ? 0 : httpStatus < 500 ? 6 : 12,
  });

  addCheck(transportCategory, {
    status: finalTarget.hostname === targetUrl.hostname ? 'PASS' : 'WARN',
    severity: finalTarget.hostname === targetUrl.hostname ? 'PASS' : 'MEDIUM',
    name: 'Redirect Host Consistency',
    desc:
      finalTarget.hostname === targetUrl.hostname
        ? 'Redirect akhir tetap berada pada host yang sama.'
        : `Target diarahkan ke host lain: ${finalTarget.hostname}`,
    penalty: finalTarget.hostname === targetUrl.hostname ? 0 : 5,
  });

  addCheck(transportCategory, {
    status: finalTarget.protocol === 'https:' ? 'PASS' : 'FAIL',
    severity: finalTarget.protocol === 'https:' ? 'PASS' : 'HIGH',
    name: 'HTTPS Final Transport',
    desc:
      finalTarget.protocol === 'https:'
        ? 'Transport akhir memakai HTTPS.'
        : 'Target akhir tidak memakai HTTPS.',
    penalty: finalTarget.protocol === 'https:' ? 0 : 15,
  });

  addCheck(transportCategory, {
    status: headers['strict-transport-security'] ? 'PASS' : 'WARN',
    severity: headers['strict-transport-security'] ? 'PASS' : 'MEDIUM',
    name: 'Strict-Transport-Security',
    desc: headers['strict-transport-security']
      ? `HSTS aktif: ${headers['strict-transport-security']}`
      : 'Header HSTS tidak ditemukan.',
    penalty: headers['strict-transport-security'] ? 0 : 5,
  });
};

const analyzeContentCategory = (contentCategory, html, finalTarget, headers) => {
  if (!html) {
    addCheck(contentCategory, {
      status: 'INFO',
      severity: 'PASS',
      name: 'HTML Snapshot',
      desc: 'Body HTML tidak dianalisis karena konten bukan text/html atau body tidak tersedia.',
    });
    return;
  }

  const csp = headers['content-security-policy'];
  const mixedContentMatches =
    finalTarget.protocol === 'https:'
      ? html.match(/\b(?:src|href|action)=["']http:\/\//gi) || []
      : [];
  const inlineScriptCount = (html.match(/<script\b(?![^>]*\bsrc=)[^>]*>/gi) || []).length;
  const inlineEventHandlerCount = (html.match(/\son[a-z]+\s*=/gi) || []).length;
  const passwordFieldCount = (html.match(/<input[^>]+type=["']password["'][^>]*>/gi) || []).length;
  const isDirectoryListing = /<title>\s*Index of\s*\//i.test(html);

  addCheck(contentCategory, {
    status: mixedContentMatches.length ? 'FAIL' : 'PASS',
    severity: mixedContentMatches.length ? 'HIGH' : 'PASS',
    name: 'Mixed Content',
    desc: mixedContentMatches.length
      ? `Ditemukan ${mixedContentMatches.length} referensi HTTP pada halaman HTTPS.`
      : 'Tidak ada mixed content yang terdeteksi pada snapshot HTML.',
    penalty: mixedContentMatches.length ? 10 : 0,
  });

  addCheck(contentCategory, {
    status: inlineScriptCount > 0 && !csp ? 'WARN' : 'PASS',
    severity: inlineScriptCount > 0 && !csp ? 'MEDIUM' : 'PASS',
    name: 'Inline Script Without CSP',
    desc:
      inlineScriptCount > 0 && !csp
        ? `Terdapat ${inlineScriptCount} inline script tanpa proteksi CSP.`
        : 'Tidak ada kombinasi inline script berisiko yang terdeteksi.',
    penalty: inlineScriptCount > 0 && !csp ? 4 : 0,
  });

  addCheck(contentCategory, {
    status: inlineEventHandlerCount > 0 && !csp ? 'WARN' : 'PASS',
    severity: inlineEventHandlerCount > 0 && !csp ? 'MEDIUM' : 'PASS',
    name: 'Inline Event Handler Without CSP',
    desc:
      inlineEventHandlerCount > 0 && !csp
        ? `Terdapat ${inlineEventHandlerCount} inline event handler tanpa proteksi CSP.`
        : 'Tidak ada inline event handler berisiko yang terdeteksi.',
    penalty: inlineEventHandlerCount > 0 && !csp ? 3 : 0,
  });

  addCheck(contentCategory, {
    status: passwordFieldCount > 0 && finalTarget.protocol !== 'https:' ? 'FAIL' : 'PASS',
    severity: passwordFieldCount > 0 && finalTarget.protocol !== 'https:' ? 'HIGH' : 'PASS',
    name: 'Password Form Transport',
    desc:
      passwordFieldCount > 0 && finalTarget.protocol !== 'https:'
        ? 'Form password ditemukan pada halaman tanpa HTTPS.'
        : 'Tidak ada form password berisiko pada snapshot HTML.',
    penalty: passwordFieldCount > 0 && finalTarget.protocol !== 'https:' ? 10 : 0,
  });

  addCheck(contentCategory, {
    status: isDirectoryListing ? 'FAIL' : 'PASS',
    severity: isDirectoryListing ? 'HIGH' : 'PASS',
    name: 'Directory Listing Exposure',
    desc: isDirectoryListing
      ? 'Halaman menyerupai directory listing publik.'
      : 'Tidak ada indikasi directory listing publik pada snapshot HTML.',
    penalty: isDirectoryListing ? 6 : 0,
  });
};

export async function POST(req) {
  try {
    assertSameOriginRequest(req);
    assertJsonRequest(req);

    if (!hasValidTurnstileSession(req)) {
      return NextResponse.json({ error: 'Akses situs belum diverifikasi oleh Turnstile.' }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit(`scan:${clientIp}`, {
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan scan. Coba lagi beberapa menit lagi.' }, { status: 429 });
    }

    const { url } = await req.json();
    const targetUrl = normalizePublicTargetUrl(url);

    if (!isScannerAllowedHostname(targetUrl.hostname)) {
      return NextResponse.json(
        {
          error: `Domain ${targetUrl.toString()} tidak berada dalam daftar aman. Untuk mencegah pemindaian ilegal, engine ini dikunci. Apakah Anda pemilik domain ini dan ingin mengujinya?`,
          code: 'DOMAIN_NOT_ALLOWED',
          blockedTarget: targetUrl.toString(),
          requestedHost: targetUrl.hostname,
          policy: {
            ...scannerPolicy,
            allowedTargets: getScannerAllowedTargets(),
          },
        },
        { status: 403 }
      );
    }

    const allowedTargets = getScannerAllowedTargets();
    const targetProfile = allowedTargets.find((target) => target.hostname === targetUrl.hostname);

    const dnsCategory = createCategory('dns', 'DNS & Target Validation', 10);
    const transportCategory = createCategory('transport', 'Transport & Redirect', 25);
    const headersCategory = createCategory('headers', 'Browser Security Headers', 25);
    const exposureCategory = createCategory('exposure', 'Exposure & Cookies', 20);
    const contentCategory = createCategory('content', 'Content Risk Signals', 20);

    const resolvedAddresses = await resolvePublicAddresses(targetUrl.hostname);
    addCheck(dnsCategory, {
      status: 'PASS',
      severity: 'PASS',
      name: 'Public DNS Resolution',
      desc: `Domain mengarah ke alamat publik: ${resolvedAddresses.join(', ')}`,
    });

    if (targetProfile?.contextNote) {
      addCheck(dnsCategory, {
        status: 'WARN',
        severity: 'MEDIUM',
        name: 'Known Demo Lab Context',
        desc: targetProfile.contextNote,
        penalty: 2,
      });
    }

    let finalTarget = targetUrl;
    let headers = {};
    let html = '';
    let httpStatus = null;
    let redirectCount = 0;
    let contentType = '';
    let cookiesSeen = 0;
    let coverageNote = '';

    try {
      const documentResult = await fetchWithRedirects(targetUrl.toString(), {
        method: 'GET',
        timeoutMs: DOCUMENT_REQUEST_TIMEOUT_MS,
      });
      const documentHeaders = Object.fromEntries(documentResult.response.headers.entries());
      const documentContentType = documentHeaders['content-type'] || '';
      const setCookieHeaders =
        typeof documentResult.response.headers.getSetCookie === 'function'
          ? documentResult.response.headers.getSetCookie()
          : [];

      finalTarget = new URL(documentResult.finalUrl);
      headers = documentHeaders;
      httpStatus = documentResult.response.status;
      redirectCount = documentResult.redirectCount;
      contentType = documentContentType;
      cookiesSeen = setCookieHeaders.length;

      analyzeTransportCategory(transportCategory, { httpStatus, finalTarget, targetUrl, headers });
      analyzeHeadersCategory(headersCategory, headers);

      if (documentContentType.includes('text/html')) {
        html = (await documentResult.response.text()).slice(0, HTML_CAPTURE_LIMIT);
      }

      analyzeExposureCategory(exposureCategory, headers, parseCookies(setCookieHeaders));
      analyzeContentCategory(contentCategory, html, finalTarget, headers);
    } catch (documentError) {
      console.warn('Web scanner document fetch limited:', documentError instanceof Error ? documentError.message : documentError);

      try {
        const headerResult = await fetchWithRedirects(targetUrl.toString(), {
          method: 'HEAD',
          allowGetFallback: true,
          timeoutMs: REQUEST_TIMEOUT_MS,
        });

        finalTarget = new URL(headerResult.finalUrl);
        headers = Object.fromEntries(headerResult.response.headers.entries());
        httpStatus = headerResult.response.status;
        redirectCount = headerResult.redirectCount;
        contentType = headers['content-type'] || '';
        cookiesSeen = 0;
        coverageNote =
          'Sebagian unit lanjutan belum tersedia pada target ini. Hasil saat ini difokuskan pada transport, header, dan sinyal dasar yang berhasil dibaca.';

        analyzeTransportCategory(transportCategory, { httpStatus, finalTarget, targetUrl, headers });
        analyzeHeadersCategory(headersCategory, headers);
        analyzeExposureCategory(exposureCategory, headers, []);
        analyzeContentCategory(contentCategory, '', finalTarget, headers);
      } catch (fallbackError) {
        console.warn('Web scanner target fetch failed:', fallbackError instanceof Error ? fallbackError.message : fallbackError);

        setCategoryScore(transportCategory, 0);
        setCategoryScore(headersCategory, 0);
        setCategoryScore(exposureCategory, 0);
        setCategoryScore(contentCategory, 0);
        coverageNote = 'Target belum dapat dianalisis sepenuhnya saat ini. Coba target legal lain atau ulangi beberapa saat lagi.';

        addCheck(transportCategory, {
          status: 'FAIL',
          severity: 'HIGH',
          name: 'Target Reachability',
          desc: 'Target belum memberikan response yang cukup untuk analisis lanjutan.',
          penalty: 25,
        });

        addCheck(headersCategory, {
          status: 'INFO',
          severity: 'PASS',
          name: 'Header Analysis',
          desc: 'Unit header belum dapat dinilai pada percobaan ini.',
        });

        addCheck(exposureCategory, {
          status: 'INFO',
          severity: 'PASS',
          name: 'Exposure Analysis',
          desc: 'Unit exposure dan cookie belum dapat dinilai pada percobaan ini.',
        });

        addCheck(contentCategory, {
          status: 'INFO',
          severity: 'PASS',
          name: 'Content Snapshot',
          desc: 'Snapshot HTML belum tersedia sehingga analisis konten dilewati.',
        });
      }
    }

    if (targetProfile?.baselinePenalty) {
      addCheck(exposureCategory, {
        status: 'WARN',
        severity: 'MEDIUM',
        name: 'Training Lab Risk Baseline',
        desc:
          targetProfile.contextNote ||
          'Target ini adalah lab uji yang memang disiapkan untuk demonstrasi keamanan, sehingga grade baseline diturunkan agar mencerminkan konteks sebenarnya.',
        penalty: targetProfile.baselinePenalty,
      });
    }

    const categories = [
      finalizeCategory(dnsCategory),
      finalizeCategory(transportCategory),
      finalizeCategory(headersCategory),
      finalizeCategory(exposureCategory),
      finalizeCategory(contentCategory),
    ];

    const issues = categories.flatMap((category) =>
      category.checks
        .filter((check) => check.status === 'PASS' || check.status === 'WARN' || check.status === 'FAIL')
        .map((check) => ({
          severity: check.severity,
          name: check.name,
          desc: check.desc,
          source: category.name,
        }))
    );

    const score = categories.reduce((total, category) => total + category.score, 0);
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
    const assessedCategories = categories.filter((category) =>
      category.checks.some((check) => check.status !== 'INFO')
    ).length;
    const coverageLabel = coverageNote
      ? `Parsial (${assessedCategories}/${categories.length} unit)`
      : `Penuh (${assessedCategories}/${categories.length} unit)`;

    return NextResponse.json({
      target: finalTarget.hostname,
      score,
      grade,
      summary: coverageNote
        ? 'Ini adalah passive baseline assessment parsial. Sebagian unit belum tersedia, tetapi hasil utama untuk transport dan header tetap ditampilkan.'
        : 'Ini adalah passive baseline assessment. Scanner tidak melakukan exploit aktif atau verifikasi kerentanan mendalam.',
      methodology: [
        'DNS & Target Validation memeriksa apakah host mengarah ke alamat publik yang aman untuk dipindai.',
        'Transport & Redirect memeriksa HTTPS, status response, redirect, dan HSTS.',
        'Browser Security Headers memeriksa header yang relevan untuk isolasi browser.',
        'Exposure & Cookies memeriksa kebocoran teknologi dan atribut keamanan cookie.',
        'Content Risk Signals menganalisis snapshot HTML untuk sinyal risiko dasar, bukan exploit aktif.',
      ],
      analysisContext: {
        inputTarget: targetUrl.toString(),
        finalUrl: finalTarget.toString(),
        httpStatus,
        redirectCount,
        contentType,
        cookiesSeen,
        htmlCaptured: Boolean(html),
        coverageLabel,
        coverageNote,
      },
      categories,
      issues,
      highCount: issues.filter((issue) => issue.severity === 'HIGH').length,
      medCount: issues.filter((issue) => issue.severity === 'MEDIUM').length,
      lowCount: issues.filter((issue) => issue.severity === 'PASS').length,
    });
  } catch (error) {
    return buildScanErrorResponse(error);
  }
}



