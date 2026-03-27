import { createDirectory, createFile } from './helpers';

export const booksDirectory = createDirectory({
  'owasp-testing-guide.md': createFile(
    `# OWASP Web Security Testing Guide

Panduan ini cocok untuk pendalaman metodologi pengujian keamanan web secara terstruktur. Isinya relevan untuk memahami tahapan assessment, information gathering, authentication testing, authorization, configuration review, hingga business logic testing.

## Cocok Untuk
- Memperkuat fondasi web security testing
- Menyusun checklist assessment yang lebih sistematis
- Memahami cara berpikir security reviewer

## Baca Online
https://owasp.org/www-project-web-security-testing-guide/

## Catatan
Sumber ini resmi dari OWASP dan sangat relevan untuk eksplorasi security research berbasis web.`,
    {
      title: 'OWASP Testing Guide',
      author: 'OWASP Foundation',
      category: 'Web Security',
      summary:
        'Panduan resmi untuk membangun metodologi pengujian keamanan web yang lebih sistematis dan matang.',
      coverTone:
        'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border-emerald-500/30',
    }
  ),
  'security-engineering.md': createFile(
    `# Security Engineering

Buku ini membahas security engineering dari sisi sistem, infrastruktur, desain kontrol, hingga cara berpikir defensif yang lebih matang. Materinya sangat kuat untuk membangun sudut pandang strategis terhadap keamanan informasi.

## Cocok Untuk
- Memahami security engineering secara lebih mendalam
- Belajar melihat keamanan dari level sistem
- Menambah perspektif arsitektur dan threat thinking

## Baca Online
https://www.cl.cam.ac.uk/~rja14/book.html

## Catatan
Versi online resminya tersedia gratis dari penulis dan sangat bernilai untuk pembelajaran jangka panjang.`,
    {
      title: 'Security Engineering',
      author: 'Ross Anderson',
      category: 'Security Architecture',
      summary:
        'Bacaan mendalam tentang desain sistem aman, model ancaman, dan cara berpikir strategis dalam keamanan.',
      coverTone:
        'bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-950 border-sky-500/30',
    }
  ),
  'linux-command-line.md': createFile(
    `# The Linux Command Line

Buku ini membantu memperkuat pemahaman terminal Linux dari dasar sampai praktik yang lebih produktif. Sangat cocok untuk membangun kebiasaan kerja yang efisien di lingkungan development, server, dan automation.

## Cocok Untuk
- Memperdalam command line Linux
- Belajar workflow terminal yang rapi
- Meningkatkan produktivitas sistem dan automation

## Baca Online
https://linuxcommand.org/tlcl.php

## Catatan
Versi online dan PDF resminya tersedia gratis dari penulis.`,
    {
      title: 'The Linux Command Line',
      author: 'William Shotts',
      category: 'Linux & Terminal',
      summary:
        'Panduan terminal Linux dari fondasi sampai workflow harian yang lebih efisien dan rapi.',
      coverTone:
        'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-amber-500/30',
    }
  ),
  'automate-the-boring-stuff.md': createFile(
    `# Automate the Boring Stuff with Python

Buku ini bagus untuk mengasah kemampuan scripting praktis, terutama untuk pekerjaan otomatisasi yang berulang. Relevan untuk membangun utility kecil, parser data, workflow file, dan task otomatis yang mendukung riset maupun operasional teknis.

## Cocok Untuk
- Belajar otomasi dengan Python
- Membuat tool kecil yang berguna sehari-hari
- Mengubah pekerjaan manual menjadi workflow otomatis

## Baca Online
https://automatetheboringstuff.com/

## Catatan
Situs resminya menyediakan versi online yang dapat dibaca langsung.`,
    {
      title: 'Automate the Boring Stuff',
      author: 'Al Sweigart',
      category: 'Python Automation',
      summary:
        'Buku praktis untuk mengubah tugas manual menjadi workflow otomatis dengan Python.',
      coverTone:
        'bg-gradient-to-br from-violet-500/20 via-slate-900 to-slate-950 border-violet-500/30',
    }
  ),
  'web-security-academy.md': createFile(
    `# Web Security Academy

Koleksi materi ini sangat berguna untuk belajar web security secara praktis. Selain penjelasan teknis, tersedia juga lab interaktif yang membantu menghubungkan teori dengan eksploitasi dan validasi nyata dalam lingkungan yang aman.

## Cocok Untuk
- Belajar web vulnerability secara praktis
- Menghubungkan teori dengan lab interaktif
- Mengasah kemampuan AppSec dan bug hunting

## Baca Online
https://portswigger.net/web-security

## Catatan
Walau formatnya academy, materi ini sangat layak ditempatkan sebagai rak belajar utama untuk security research.`,
    {
      title: 'Web Security Academy',
      author: 'PortSwigger',
      category: 'Hands-on AppSec',
      summary:
        'Materi dan lab interaktif untuk memahami vulnerability web secara praktis dan terstruktur.',
      coverTone:
        'bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-950 border-rose-500/30',
    }
  ),
  'prompt-engineering-guide.md': createFile(
    `# Prompt Engineering Guide

Panduan ini membantu memahami cara merancang prompt yang lebih efektif untuk berbagai use case AI, termasuk reasoning, extraction, classification, coding, dan workflow agentic. Cocok untuk memperluas fondasi dalam pengembangan sistem berbasis AI/LLM.

## Cocok Untuk
- Memperdalam prompt engineering
- Mendesain workflow AI yang lebih terarah
- Menambah referensi untuk eksperimen AI/LLM

## Baca Online
https://www.promptingguide.ai/

## Catatan
Sumber ini membantu menjembatani praktik prompt sederhana menuju desain interaksi AI yang lebih matang.`,
    {
      title: 'Prompt Engineering Guide',
      author: 'DAIR.AI',
      category: 'AI / LLM',
      summary:
        'Panduan ringkas dan berkembang untuk menyusun prompt, workflow, dan eksperimen AI/LLM.',
      coverTone:
        'bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 border-cyan-500/30',
    }
  ),
});
