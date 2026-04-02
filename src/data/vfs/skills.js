import { createDirectory, createFile } from './helpers';

export const skillsDirectory = createDirectory({
  'hard-skills.md': createFile(
    `- Microsoft Office (Word, Excel, PowerPoint)\n- Pengolahan dan analisis data administrasi\n- Pemrograman dasar Python dan Golang\n- Jaringan komputer (LAN, MAN, Mikrotik RouterOS, titik akses)\n- Troubleshooting dan pemeliharaan perangkat keras komputer\n- Dasar keamanan siber dan riset kerentanan\n- Pengembangan aplikasi web dan desktop\n- Desain grafis menggunakan Canva\n- Eksplorasi sistem operasi Linux dan Windows`
  ),
  'soft-skills.md': createFile(
    `- Analisis dan berpikir kritis\n- Pemecahan masalah\n- Manajemen waktu\n- Komunikasi efektif\n- Adaptif dan berorientasi pada pembelajaran berkelanjutan`
  ),
});
