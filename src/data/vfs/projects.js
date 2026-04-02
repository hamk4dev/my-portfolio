import { createDirectory, createFile } from './helpers';

export const projectsDirectory = createDirectory({
  'mikrotik-voucher.md': createFile(
    `# Mikrotik Voucher Tester\nURL: https://github.com/hamk4dev/Mikrotik-voucher-tester\n\nPengembangan alat bantu untuk pengujian voucher jaringan berbasis Mikrotik secara lebih cepat, terukur, dan efisien dalam konteks operasional jaringan.`
  ),
  'web-perpustakaan.md': createFile(
    `# Website Perpustakaan (Prototype)\n\nPerancangan prototipe sistem informasi perpustakaan sebagai media pembelajaran mandiri untuk alur data, antarmuka pengguna, dan pengembangan aplikasi berbasis web.`
  ),
  'portofolio-web.md': createFile(
    `# Pengembangan Website dan Portofolio\n\nPengembangan berbagai website sebagai sarana eksplorasi desain antarmuka, implementasi fitur, dan peningkatan kompetensi teknis, termasuk sistem portofolio interaktif Init.CV ini.`
  ),
  'recycle-center.md': createFile(
    `# Aplikasi Desktop Recycle Center\n\nPerancangan konsep aplikasi desktop untuk mendukung pengelolaan data operasional pusat daur ulang secara lebih terstruktur dan mudah dipantau.`
  ),
});
