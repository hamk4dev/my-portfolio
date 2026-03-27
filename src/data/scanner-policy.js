export const scannerPolicy = {
  mode: 'allowlist_only',
  title: 'Legal Pentest Lab Only',
  summary:
    'Engine scanner dikunci hanya untuk domain lab yang memang dipublikasikan untuk pengujian keamanan legal dan edukatif.',
  rationale:
    'Pembatasan ini mencegah pemindaian pasif terhadap domain pihak ketiga tanpa izin dan menjaga tool tetap berada pada koridor penggunaan yang sah.',
};

export const scannerAllowedTargets = [
  {
    hostname: 'testphp.vulnweb.com',
    label: 'Acunetix PHP Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Aplikasi demo yang sengaja disediakan untuk latihan dan validasi scanner.',
  },
  {
    hostname: 'testasp.vulnweb.com',
    label: 'Acunetix ASP Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Target latihan resmi untuk pengujian aplikasi berbasis ASP klasik.',
  },
  {
    hostname: 'testaspnet.vulnweb.com',
    label: 'Acunetix ASP.NET Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Target latihan resmi untuk pengujian aplikasi berbasis ASP.NET.',
  },
  {
    hostname: 'testhtml5.vulnweb.com',
    label: 'Acunetix HTML5 Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Target latihan resmi untuk aplikasi demo HTML5 yang disengaja rentan.',
  },
  {
    hostname: 'zero.webappsecurity.com',
    label: 'Zero WebAppSecurity Demo',
    provider: 'Invicti / Acunetix',
    notes: 'Aplikasi demo publik untuk pengujian keamanan yang legal.',
  },
  {
    hostname: 'demo.testfire.net',
    label: 'Altoro Mutual Demo',
    provider: 'HCL AppScan Demo',
    notes: 'Aplikasi demo publik yang umum dipakai untuk edukasi security testing.',
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

