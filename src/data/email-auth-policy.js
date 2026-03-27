export const emailAuthPolicy = {
  mode: 'allowlist_only',
  title: 'Passive DNS OSINT With Legal Gate',
  summary:
    'Engine email security analyzer hanya aktif otomatis untuk domain demonstrasi yang aman. Domain lain memerlukan permintaan izin manual.',
  rationale:
    'Secara teknis audit SPF dan DMARC hanya melakukan query DNS TXT pasif, tetapi kebijakan ini sengaja dipasang untuk menghindari penggunaan massal ke domain produksi tanpa otorisasi yang jelas.',
};

export const emailAuthAllowedTargets = [
  {
    hostname: 'example.com',
    label: 'RFC 2606 Example .com',
    provider: 'IANA Reserved Domain',
    notes: 'Domain contoh resmi yang dicadangkan untuk dokumentasi dan pengujian aman.',
  },
  {
    hostname: 'example.org',
    label: 'RFC 2606 Example .org',
    provider: 'IANA Reserved Domain',
    notes: 'Domain contoh resmi yang aman dipakai untuk demonstrasi passive DNS lookup.',
  },
  {
    hostname: 'example.net',
    label: 'RFC 2606 Example .net',
    provider: 'IANA Reserved Domain',
    notes: 'Domain contoh resmi yang aman untuk edukasi dan pengujian konfigurasi dasar.',
  },
];

const allowedHostnames = new Set(
  emailAuthAllowedTargets.map((target) => target.hostname.toLowerCase())
);

export function isEmailAuthAllowedHostname(hostname) {
  if (typeof hostname !== 'string') return false;
  return allowedHostnames.has(hostname.trim().toLowerCase());
}

export function getEmailAuthAllowedTargets() {
  return emailAuthAllowedTargets;
}

