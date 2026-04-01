import { createDirectory, createFile } from './helpers';

export const projectsDirectory = createDirectory({
  'mikrotik-voucher.md': createFile(
    `# Mikrotik Voucher Tester\nURL: https://github.com/hamk4dev/Mikrotik-voucher-tester\n\nPengembangan alat bantu sederhana untuk pengujian voucher jaringan berbasis Mikrotik dalam rangka mendukung efisiensi pengelolaan jaringan.`
  ),
  'web-perpustakaan.md': createFile(
    `# Website Perpustakaan (Prototype)\n\nPengembangan sistem informasi perpustakaan sederhana sebagai sarana pembelajaran mandiri di bidang pengembangan web.`
  ),
  'portofolio-web.md': createFile(
    `# Pengembangan Website dan Portofolio\n\nPembuatan berbagai website sebagai media eksplorasi dan peningkatan kompetensi teknis (Eksperimen Mandiri), termasuk sistem Init.CV ini.`
  ),
  'recycle-center.md': createFile(
    `# Aplikasi Desktop Recycle Center\n\nPerancangan sistem pengelolaan data untuk mendukung operasional pusat daur ulang (dalam tahap pengembangan konsep).`
  ),
});
