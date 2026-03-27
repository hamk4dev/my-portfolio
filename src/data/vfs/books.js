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
Sumber ini resmi dari OWASP dan sangat relevan untuk eksplorasi security research berbasis web.`
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
Versi online dan PDF resminya tersedia gratis dari penulis.`
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
Situs resminya menyediakan versi online yang dapat dibaca langsung.`
  ),
});
