export const scannerPolicy = {
  mode: 'allowlist_only',
  title: 'Curated Legal Web Labs',
  summary:
    'Engine scanner hanya aktif otomatis untuk target lab yang memang dipublikasikan untuk pengujian keamanan legal dan edukatif.',
  rationale:
    'Pembatasan ini menjaga scanner tetap berada pada koridor passive baseline assessment dan mencegah pemindaian web ke domain produksi pihak ketiga tanpa otorisasi yang jelas.',
};

export const scannerAllowedTargets = [
  {
    hostname: 'demo.owasp-juice.shop',
    label: 'Juice Shop',
    provider: 'OWASP Demo',
    notes: 'Aplikasi web demo modern untuk latihan keamanan aplikasi secara legal.',
    baselinePenalty: 8,
    contextNote: 'Lab ini memang dipublikasikan untuk latihan AppSec dan memuat permukaan uji yang sengaja tidak seketat domain produksi biasa.',
  },
  {
    hostname: 'demo.testfire.net',
    label: 'Altoro Mutual',
    provider: 'AppScan Demo',
    notes: 'Target demo publik yang sering dipakai untuk validasi scanner dan pembelajaran AppSec.',
    baselinePenalty: 9,
    contextNote: 'Target ini adalah aplikasi demo keamanan publik yang secara historis dipakai untuk latihan dan validasi scanner.',
  },
  {
    hostname: 'testphp.vulnweb.com',
    label: 'Invicti PHP',
    provider: 'Invicti Demo',
    notes: 'Aplikasi PHP demo yang disediakan khusus untuk pengujian scanner secara legal.',
    baselinePenalty: 12,
    contextNote: 'Target ini memang dibuat sebagai demo aplikasi rentan, jadi grade baseline disesuaikan agar tidak terlihat seperti domain produksi normal.',
  },
  {
    hostname: 'testhtml5.vulnweb.com',
    label: 'Invicti HTML5',
    provider: 'Invicti Demo',
    notes: 'Target HTML5 demo yang memang dirancang sebagai bahan uji keamanan.',
    baselinePenalty: 10,
    contextNote: 'Target HTML5 ini sengaja dipublikasikan sebagai bahan uji keamanan dan bukan baseline produksi normal.',
  },
  {
    hostname: 'zero.webappsecurity.com',
    label: 'Zero WebAppSecurity',
    provider: 'Invicti Demo',
    notes: 'Demo publik untuk edukasi security testing dan validasi baseline scanner.',
    baselinePenalty: 10,
    contextNote: 'Demo ini berada pada koridor edukasi security testing sehingga grade baseline disesuaikan dengan konteks lab.',
  },
];

const allowedHostnames = new Set(
  scannerAllowedTargets.map((target) => target.hostname.toLowerCase())
);

export function isScannerAllowedHostname(hostname) {
  if (typeof hostname !== 'string') return false;
  return allowedHostnames.has(hostname.trim().toLowerCase());
}

export function getScannerAllowedTargets() {
  return scannerAllowedTargets;
}
