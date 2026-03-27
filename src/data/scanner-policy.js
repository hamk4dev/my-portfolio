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
  },
  {
    hostname: 'demo.testfire.net',
    label: 'Altoro Mutual',
    provider: 'AppScan Demo',
    notes: 'Target demo publik yang sering dipakai untuk validasi scanner dan pembelajaran AppSec.',
  },
  {
    hostname: 'testphp.vulnweb.com',
    label: 'Invicti PHP',
    provider: 'Invicti Demo',
    notes: 'Aplikasi PHP demo yang disediakan khusus untuk pengujian scanner secara legal.',
  },
  {
    hostname: 'testhtml5.vulnweb.com',
    label: 'Invicti HTML5',
    provider: 'Invicti Demo',
    notes: 'Target HTML5 demo yang memang dirancang sebagai bahan uji keamanan.',
  },
  {
    hostname: 'zero.webappsecurity.com',
    label: 'Zero WebAppSecurity',
    provider: 'Invicti Demo',
    notes: 'Demo publik untuk edukasi security testing dan validasi baseline scanner.',
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
