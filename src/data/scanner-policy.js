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
    label: 'OWASP Juice Shop Demo',
    provider: 'OWASP',
    notes: 'Aplikasi demo modern yang sengaja rentan untuk latihan keamanan aplikasi web.',
  },
  {
    hostname: 'demo.testfire.net',
    label: 'Altoro Mutual Demo',
    provider: 'HCL AppScan Demo',
    notes: 'Target demo publik yang sering dipakai untuk validasi scanner dan pembelajaran AppSec.',
  },
  {
    hostname: 'testphp.vulnweb.com',
    label: 'Invicti PHP Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Aplikasi PHP demo yang sengaja disediakan untuk pengujian scanner secara legal.',
  },
  {
    hostname: 'testhtml5.vulnweb.com',
    label: 'Invicti HTML5 Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Target demo publik untuk aplikasi HTML5 yang memang dirancang sebagai bahan uji.',
  },
  {
    hostname: 'zero.webappsecurity.com',
    label: 'Zero WebAppSecurity Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Demo publik yang aman dipakai untuk edukasi security testing dan validasi baseline scanner.',
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
