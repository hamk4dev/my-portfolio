import { createDirectory, createFile } from './helpers';

export const skillsDirectory = createDirectory({
  'hard-skills.md': createFile(
    `- Penguasaan Microsoft Office (Word, Excel, PowerPoint)\n- Pengolahan dan analisis data administrasi\n- Pemrograman dasar Python & Golang\n- Jaringan komputer (LAN, MAN, Mikrotik RouterOS, Access Point)\n- Troubleshooting dan pemeliharaan perangkat keras komputer\n- Dasar Cyber Security dan Vulnerability Research\n- Pengembangan web & desktop berbasis AI tools\n- Desain grafis menggunakan Canva\n- Eksplorasi sistem operasi (Linux dan Windows)`
  ),
  'soft-skills.md': createFile(
    `- Kemampuan analisis dan berpikir kritis\n- Kemampuan pemecahan masalah (problem solving)\n- Manajemen waktu\n- Komunikasi efektif\n- Adaptif dan memiliki orientasi pada pembelajaran berkelanjutan`
  ),
});
