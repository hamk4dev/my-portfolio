import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { token } = await req.json();
    const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

    if (!secretKey || secretKey.startsWith('masukkan_')) {
      return NextResponse.json({ error: 'Turnstile belum dikonfigurasi di server.' }, { status: 503 });
    }

    if (typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Token Turnstile wajib diisi.' }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      body: formData,
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Gagal menghubungi layanan Turnstile.' }, { status: 502 });
    }

    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      return NextResponse.json({ success: true, message: 'Verifikasi human berhasil.' });
    }

    return NextResponse.json({ error: 'Verifikasi bot gagal.', details: verifyData['error-codes'] || [] }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
