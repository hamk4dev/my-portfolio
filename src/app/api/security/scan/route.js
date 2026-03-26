import { NextResponse } from 'next/server';

import { getClientIp, normalizePublicTargetUrl, resolvePublicAddresses } from '@/lib/server/network';
import { consumeRateLimit } from '@/lib/server/rate-limit';

async function fetchHeadersWithRedirects(initialUrl, maxRedirects = 3) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    let response = await fetch(currentUrl, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        return { response, finalUrl: currentUrl };
      }

      const nextUrl = normalizePublicTargetUrl(new URL(location, currentUrl).toString());
      await resolvePublicAddresses(nextUrl.hostname);
      currentUrl = nextUrl.toString();
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error('Terlalu banyak redirect.');
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = consumeRateLimit(`scan:${clientIp}`, {
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan scan. Coba lagi beberapa menit lagi.' }, { status: 429 });
    }

    const { url } = await req.json();
    const targetUrl = normalizePublicTargetUrl(url);
    const resolvedAddresses = await resolvePublicAddresses(targetUrl.hostname);

    let score = 100;
    const issues = [
      {
        severity: 'PASS',
        name: 'Resolusi DNS Aman',
        desc: `Domain mengarah ke ${resolvedAddresses.join(', ')}`,
        source: 'DNS Validator',
      },
    ];

    try {
      const { response, finalUrl } = await fetchHeadersWithRedirects(targetUrl.toString());
      const headers = Object.fromEntries(response.headers.entries());
      const finalTarget = new URL(finalUrl);

      if (finalTarget.hostname !== targetUrl.hostname) {
        issues.push({
          severity: 'MEDIUM',
          name: 'Redirect Antar Host',
          desc: `Target mengarahkan ke host lain: ${finalTarget.hostname}`,
          source: 'Redirect Validator',
        });
        score -= 10;
      }

      if (finalTarget.protocol !== 'https:') {
        issues.push({
          severity: 'HIGH',
          name: 'HTTPS Tidak Aktif',
          desc: 'Target akhir tidak menggunakan HTTPS.',
          source: 'Transport Scanner',
        });
        score -= 25;
      }

      if (!headers['strict-transport-security']) {
        issues.push({
          severity: 'HIGH',
          name: 'HSTS Tidak Aktif',
          desc: 'Rentan terhadap downgrade dan MitM.',
          source: 'Header Scanner',
        });
        score -= 20;
      }

      if (!headers['content-security-policy']) {
        issues.push({
          severity: 'MEDIUM',
          name: 'CSP Tidak Ditemukan',
          desc: 'Mitigasi XSS di browser menjadi lebih lemah.',
          source: 'Header Scanner',
        });
        score -= 15;
      }

      if (!headers['x-content-type-options']) {
        issues.push({
          severity: 'MEDIUM',
          name: 'X-Content-Type-Options Tidak Ditemukan',
          desc: 'Browser dapat melakukan MIME sniffing.',
          source: 'Header Scanner',
        });
        score -= 10;
      }
    } catch (error) {
      issues.push({
        severity: 'MEDIUM',
        name: 'Koneksi Ditolak',
        desc: 'Gagal mengambil header dari target dalam batas waktu yang aman.',
        source: 'Header Scanner',
      });
      score -= 10;
    }

    const normalizedScore = Math.max(0, score);
    const grade = normalizedScore >= 85 ? 'A' : normalizedScore >= 70 ? 'B' : normalizedScore >= 50 ? 'C' : 'F';

    return NextResponse.json({
      target: targetUrl.hostname,
      score: normalizedScore,
      grade,
      issues,
      highCount: issues.filter((issue) => issue.severity === 'HIGH').length,
      medCount: issues.filter((issue) => issue.severity === 'MEDIUM').length,
      lowCount: issues.filter((issue) => issue.severity === 'PASS').length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'API Error' }, { status: 400 });
  }
}
