# Init.CV

Init.CV adalah portofolio interaktif yang dirancang seperti sebuah permukaan sistem kerja digital, bukan sekadar halaman profil biasa. Proyek ini memadukan navigasi terminal, panel pratinjau visual, presentasi proyek, koleksi bacaan, dan utilitas keamanan berbasis web dalam satu pengalaman yang terasa lebih hidup, terarah, dan profesional.

Repositori ini dibangun untuk merepresentasikan cara berpikir engineering, perhatian pada detail antarmuka, serta pendekatan yang lebih matang terhadap struktur informasi, keamanan, dan pengalaman pengguna.

## Karakter Proyek

- Antarmuka utama menggabungkan terminal interaktif dan panel GUI dalam satu layout yang saling terhubung.
- Struktur konten menggunakan virtual file system agar portofolio terasa seperti workstation mini yang dapat dijelajahi.
- Presentasi proyek, bacaan, dan profil disusun agar informatif tanpa kehilangan identitas visual.
- Fitur AI dipakai sebagai utilitas pendukung, bukan gimmick utama.
- Tool keamanan dibatasi untuk use case yang legal, terarah, dan relevan.

## Fitur Utama

- Navigasi terminal untuk berpindah direktori, membuka file, dan menjalankan utilitas tertentu.
- Panel pratinjau untuk menampilkan dokumen, profil, kontak, dan aplikasi mini tanpa meninggalkan halaman utama.
- Elevator pitch generator dan ringkasan file berbasis AI.
- Web Security Scanner untuk baseline assessment pada target lab legal yang sudah dikurasi.
- Email Auth Analyzer untuk audit pasif SPF dan DMARC.
- Contact hub dengan email, GitHub, lokasi, dan peta.
- Gate verifikasi akses menggunakan Turnstile untuk membatasi fitur sensitif.

## Stack

- Next.js 15
- React 18
- Tailwind CSS
- Lucide React
- Upstash Redis untuk rate limiting
- Cloudflare Turnstile
- Resend untuk pengiriman email
- Gemini API untuk fitur AI

## Menjalankan Secara Lokal

Pastikan Anda menggunakan Node.js `>= 18.18.0`.

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run start
```

## Variabel Environment

Salin nilai yang dibutuhkan dari file `.env.example`, lalu isi dengan kredensial yang sesuai:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SESSION_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ABUSEIPDB_API_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`

## Struktur Ringkas

```text
src/
  app/
    api/                endpoint AI, kontak, dan utilitas keamanan
    globals.css         tema visual utama
    layout.jsx          metadata dan wrapper aplikasi
    page.jsx            shell utama terminal + preview panel
  components/           aplikasi mini dan komponen interaktif
  data/                 virtual file system, contact data, scanner policy
  lib/                  utilitas client dan helper server
  services/             wrapper request ke API internal
public/
  images/               aset visual
  robots.txt            aturan crawler dasar
```

## Catatan Operasional

- Scanner keamanan di proyek ini tidak dirancang untuk pemindaian bebas terhadap target acak.
- Domain yang diperbolehkan dibatasi pada target legal yang memang disediakan untuk pengujian.
- Fitur AI, email, dan rate limiting memerlukan konfigurasi environment yang valid agar berjalan penuh.

## Arah Desain

README ini mengikuti filosofi proyeknya: tenang, tegas, dan tidak berlebihan. Init.CV tidak dibangun sebagai template generik, melainkan sebagai portofolio teknis yang mencoba menyatukan presentasi identitas, eksplorasi antarmuka, dan utilitas praktis dalam satu sistem yang koheren.

## Author

Muh. Hamka
