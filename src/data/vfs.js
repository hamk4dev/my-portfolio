import profileImage from '@/profile.jpg';

export const initialVFS = {
  type: 'dir',
  name: 'root',
  children: {
    'about.md': { 
      type: 'file', 
      image: profileImage.src,
      content: `# Profil Lengkap\n\nHalo! Saya adalah seorang profesional dengan latar belakang Teknik Komputer dan Jaringan yang memiliki minat besar pada teknologi informasi, pengembangan perangkat lunak berbasis AI, dan analisis data. Saat ini saya juga aktif dalam pelayanan masyarakat dan administrasi desa.\n\n## PENGALAMAN KERJA\n**1. Kepala Seksi Kesejahteraan - Pemerintah Desa Ulu Baula (2022 – Sekarang)**\n- Melaksanakan pembangunan sarana prasarana desa (kesehatan, pendidikan, dll).\n- Pengelolaan data sosial (BLT, PKH, BPNT) secara tepat sasaran.\n- Menyusun dokumen perencanaan (RKPDes, RPJMDes) & Dokumen Pelaksanaan Anggaran (DPA).\n- Pemberdayaan UMKM, kelompok tani, pemuda, dan kemasyarakatan.\n\n**2. Kurir Ekspedisi dan Marketing (2021 – Awal 2022)**\n- Distribusi barang secara tepat waktu dan interaksi langsung dengan pelanggan.\n- Mendukung kegiatan pemasaran dan promosi produk di lapangan.\n\n## PENDIDIKAN\n- **SMKN 2 Kolaka (Eks SMKN 1 Baula)** | Teknik Komputer dan Jaringan (Lulus 2020)\n\n## KEAHLIAN UTAMA\n- **Hard Skill:** MS Office, Analisis Data Excel, Python, Golang, Jaringan (LAN, Mikrotik), Cyber Security Basic, Web/Desktop dev dengan AI Tools, Linux OS.\n- **Soft Skill:** Problem Solving, Berpikir Kritis, Manajemen Waktu, Komunikasi Efektif.\n\n## PROYEK & KARYA\n- **Mikrotik Voucher Tester:** Alat bantu pengujian voucher jaringan (GitHub).\n- **Init.CV Portfolio:** Eksperimen web interaktif sistem operasi mini.\n- **Web Perpustakaan & Recycle Center App:** Prototipe sistem informasi mandiri.\n\n## SERTIFIKAT & BAHASA\n- **Sertifikat:** Mahir MS Excel, Pelatihan Marketing (26 Hari), Backend Golang.\n- **Bahasa:** Indonesia (Aktif), Bugis (Aktif), Melayu (Aktif), Inggris (Dasar).` 
    },
    'contact.md': { 
      type: 'file', 
      content: `Hubungi saya melalui saluran berikut:\n\nEmail: muh.hamka.id@proton.me\nGitHub: https://github.com/hamk4dev` 
    },
    'projects': {
      type: 'dir',
      children: {
        'mikrotik-voucher.md': { type: 'file', content: `# Mikrotik Voucher Tester\nURL: https://github.com/hamk4dev/Mikrotik-voucher-tester\n\nPengembangan alat bantu sederhana untuk pengujian voucher jaringan berbasis Mikrotik dalam rangka mendukung efisiensi pengelolaan jaringan.` },
        'web-perpustakaan.md': { type: 'file', content: `# Website Perpustakaan (Prototype)\n\nPengembangan sistem informasi perpustakaan sederhana sebagai sarana pembelajaran mandiri di bidang pengembangan web.` },
        'portfolio-web.md': { type: 'file', content: `# Pengembangan Website dan Portfolio\n\nPembuatan berbagai website sebagai media eksplorasi dan peningkatan kompetensi teknis (Eksperimen Mandiri), termasuk sistem Init.CV ini.` },
        'recycle-center.md': { type: 'file', content: `# Aplikasi Desktop Recycle Center\n\nPerancangan sistem pengelolaan data untuk mendukung operasional pusat daur ulang (dalam tahap pengembangan konsep).` }
      }
    },
    'books': { type: 'dir', children: {} },
    'notes': { 
      type: 'dir', 
      children: {
        'learning-log.txt': { type: 'file', content: '25 Maret 2026: Terus mengeksplorasi penggunaan AI tools dalam pengembangan aplikasi web dan desktop.' }
      } 
    },
    'skills': { 
      type: 'dir', 
      children: {
        'hard-skills.md': { type: 'file', content: `- Penguasaan Microsoft Office (Word, Excel, PowerPoint)\n- Pengolahan dan analisis data administrasi\n- Pemrograman dasar Python & Golang\n- Jaringan komputer (LAN, MAN, Mikrotik RouterOS, Access Point)\n- Troubleshooting dan pemeliharaan perangkat keras komputer\n- Dasar Cyber Security dan Vulnerability Research\n- Pengembangan web & desktop berbasis AI tools\n- Desain grafis menggunakan Canva\n- Eksplorasi sistem operasi (Linux dan Windows)` },
        'soft-skills.md': { type: 'file', content: `- Kemampuan analisis dan berpikir kritis\n- Kemampuan pemecahan masalah (problem solving)\n- Manajemen waktu\n- Komunikasi efektif\n- Adaptif dan memiliki orientasi pada pembelajaran berkelanjutan` }
      } 
    },
    'experience': { 
      type: 'dir', 
      children: {
        'desa-ulu-baula.md': { type: 'file', content: `# Kepala Seksi Kesejahteraan\nPemerintah Desa Ulu Baula (2022 – Sekarang)\n\n## Tugas dan Tanggung Jawab:\n- Melaksanakan kegiatan pembangunan dan rehabilitasi sarana dan prasarana desa (kesehatan, pendidikan, sanitasi, fasum)\n- Mengelola data sosial masyarakat (pendataan rumah tangga miskin, fasilitasi BLT, PKH, BPNT)\n- Menyusun dokumen perencanaan pembangunan desa (RKPDes, RPJMDes, Profil Desa)\n- Pengolahan, analisis, dan penyajian data administrasi menggunakan Microsoft Excel\n- Pemberdayaan masyarakat (pembinaan UMKM, kelompok tani, pemuda, sosial)\n- Menyusun Dokumen Pelaksanaan Anggaran (DPA) & laporan pertanggungjawaban\n\n## Pencapaian:\n- Berhasil menyusun dokumen perencanaan dan administrasi desa secara tepat waktu dan sistematis\n- Meningkatkan kualitas pengelolaan dan kerapian data administrasi desa sebagai dasar pengambilan kebijakan` },
        'kurir-marketing.md': { type: 'file', content: `# Kurir Ekspedisi dan Marketing\n(2021 – Awal 2022)\n\n## Tugas dan Tanggung Jawab:\n- Melaksanakan distribusi barang secara tepat waktu, efektif, dan efisien sesuai SOP\n- Melakukan interaksi langsung dengan pelanggan dalam rangka menjaga kualitas pelayanan\n- Mendukung kegiatan pemasaran dan promosi produk di lapangan\n- Mengembangkan kemampuan komunikasi interpersonal dan manajemen waktu dalam pelaksanaan tugas operasional` }
      } 
    },
    'tools': {
      type: 'dir',
      children: {
        'web-security-scanner.html': {
          type: 'file',
          app: 'web-security-scanner',
          content: `# Web Security Scanner\n\nAplikasi scanner keamanan bawaan Init.CV.\n\nFitur utama:\n- Validasi resolusi DNS publik\n- Pemeriksaan redirect target\n- Inspeksi header keamanan HTTP dasar\n- Ringkasan skor dan grade hasil scan`
        }
      }
    }
  }
};
