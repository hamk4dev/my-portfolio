import { createDirectory, createFile } from './helpers';

export const toolsDirectory = createDirectory({
  'webscan.app': createFile(
    `# Web Security Scanner\n\nAplikasi scanner keamanan bawaan Init.CV.\n\nCommand terminal terkait: webscan <url>\n\nFitur utama:\n- Validasi resolusi DNS publik\n- Pemeriksaan redirect target\n- Inspeksi header keamanan HTTP dasar\n- Ringkasan skor dan grade hasil scan`,
    { app: 'web-security-scanner' }
  ),
  'mailauth.app': createFile(
    `# Email Auth Analyzer\n\nEngine passive DNS OSINT untuk audit SPF dan DMARC secara real-time.\n\nCommand terminal terkait: mailauth <domain>\n\nFitur utama:\n- Query TXT DNS nyata tanpa request HTTP ke target\n- Analisis SPF untuk mendeteksi +all, ?all, ~all, -all, atau record hilang\n- Analisis DMARC pada _dmarc.[domain] dengan evaluasi policy p=\n- Bukti mentah TXT record untuk verifikasi manual\n- Policy legal gate untuk domain di luar daftar demonstrasi aman`,
    { app: 'email-auth-analyzer' }
  ),
});
