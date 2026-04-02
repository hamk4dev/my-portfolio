import { createDirectory, createFile } from './helpers';

export const toolsDirectory = createDirectory({
  'webscan.app': createFile(
    `# Web Security Scanner\n\nAlat analisis keamanan web bawaan portofolio untuk pemeriksaan permukaan awal secara cepat dan terstruktur.\n\nPerintah terminal terkait: webscan <url>\n\nFitur utama:\n- Validasi resolusi DNS publik\n- Pemeriksaan redirect target\n- Inspeksi header keamanan HTTP dasar\n- Ringkasan skor dan grade hasil analisis`,
    { app: 'web-security-scanner' }
  ),
  'mailauth.app': createFile(
    `# Email Auth Analyzer\n\nAlat audit pasif untuk memeriksa konfigurasi SPF dan DMARC secara ringkas, cepat, dan relevan untuk domain publik.\n\nPerintah terminal terkait: mailauth <domain>\n\nFitur utama:\n- Query TXT DNS publik tanpa request HTTP ke target\n- Analisis SPF untuk mendeteksi +all, ?all, ~all, -all, atau record yang hilang\n- Analisis DMARC pada _dmarc.[domain] dengan evaluasi kebijakan p=\n- Bukti mentah TXT record untuk verifikasi manual\n- Audit pasif yang aman untuk kebutuhan review awal`,
    { app: 'email-auth-analyzer' }
  ),
});
