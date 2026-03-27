export const emailAuthPolicy = {
  mode: 'public_dns_passive',
  title: 'Passive Public DNS Audit',
  summary:
    'Analyzer ini membaca TXT DNS publik secara real-time untuk mengevaluasi SPF dan DMARC tanpa mengirim request HTTP ke target.',
  rationale:
    'Karena engine hanya melakukan query TXT DNS publik dan tidak menyentuh aplikasi web target, analyzer ini dapat dipakai untuk domain publik umum dengan rate limit dan validasi input yang tetap ketat.',
};

export const emailAuthSuggestedTargets = [
  {
    hostname: 'cloudflare.com',
    label: 'Cloudflare',
    provider: 'Public Domain Example',
    notes: 'Contoh domain publik dengan konfigurasi email yang biasanya jelas untuk demonstrasi analisis SPF/DMARC.',
  },
  {
    hostname: 'openai.com',
    label: 'OpenAI',
    provider: 'Public Domain Example',
    notes: 'Contoh domain publik lain yang relevan untuk melihat kebijakan email tingkat organisasi.',
  },
  {
    hostname: 'proton.me',
    label: 'Proton',
    provider: 'Public Domain Example',
    notes: 'Cocok untuk demonstrasi karena domain publik ini memang berfokus pada layanan email dan keamanan.',
  },
];

export const emailAuthAllowedTargets = emailAuthSuggestedTargets;

export function isEmailAuthAllowedHostname(hostname) {
  return typeof hostname === 'string' && Boolean(hostname.trim());
}

export function getEmailAuthAllowedTargets() {
  return emailAuthSuggestedTargets;
}
