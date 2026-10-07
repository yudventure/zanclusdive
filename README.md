# Zanclus Dive Center — Next.js + Tailwind CSS

Website diving responsif sesuai referensi visual pengguna. Stack: Next.js 16 App Router, React 19, Tailwind CSS 4. Seluruh aset logo, font, dan foto konsep disimpan lokal.

## Development

Node.js 22 atau 24.

```sh
npm ci --include=dev
npm run dev
```

## Produksi Node.js

```sh
npm ci --include=dev
npm run build
npm start
```

Port default 3000; server menggunakan `PORT` yang disediakan hosting. Tidak ada ketergantungan font/CDN saat runtime. Tailwind dikompilasi melalui PostCSS; layout memakai utility Tailwind dan CSS khusus untuk desain referensi.

## Hostinger

Lihat [HOSTINGER-DEPLOY.md](./HOSTINGER-DEPLOY.md). Repository ini sudah berisi proyek Next.js di root. Di Hostinger Node.js Web App, pilih repository GitHub `yudventure/zanclusdive`, branch `main`, dan root direktori `.`. Hostinger tidak perlu mengekstrak ZIP. File `Zanclus-Website-Source.zip` dipertahankan sebagai arsip versi sebelumnya dan tidak dipakai oleh build.

Salin `.env.example` menjadi `.env.local` untuk konfigurasi lokal. `NEXT_PUBLIC_WHATSAPP_NUMBER` mengatur nomor tujuan dan label kontak. `NEXT_PUBLIC_SITE_URL` opsional untuk URL gambar share sosial. Variabel publik memerlukan rebuild saat berubah.

## Fitur & status

Hero imersif, menu mobile, kartu pengalaman, kalender rencana, kuis, dialog, formulir, pesan WhatsApp, serta unduhan TXT. Formulir tidak mengirim pesan otomatis dan tidak menyimpan data ke server. Jadwal/biaya dikonfirmasi lewat tim. Nomor uji coba pengguna: 085190849237.

Gambar generatif bukan dokumentasi lokasi. Logo adalah adaptasi vektor dari aset brand sebelumnya. Font Inter dan Montserrat berlisensi SIL OFL; lisensi ada di `public/licenses`.

## Pengujian

```sh
npm test
# Jalankan server terlebih dahulu:
npm run test:browser
# Atau arahkan ke port produksi lain:
BASE_URL=http://127.0.0.1:3001 npm run test:browser
```

Tes browser memakai Chromium di `/usr/bin/chromium`; sesuaikan `executablePath` pada `scripts/verify.mjs` jika mesin berbeda. Tes memeriksa desktop/mobile, kalender, detail, kuis, formulir, tautan WhatsApp, unduhan, menu, dialog, overflow dan error runtime. Screenshot disimpan di `artifacts/`. Pesan WhatsApp tidak dikirim oleh tes.
