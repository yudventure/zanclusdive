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

Port default 3000; server menggunakan `PORT` yang disediakan hosting. Tidak ada ketergantungan font/CDN saat runtime. CMS membutuhkan MySQL untuk konten, media, dan reservasi. Tailwind dikompilasi melalui PostCSS; layout memakai utility Tailwind dan CSS khusus untuk desain referensi.

## Hostinger

Lihat [HOSTINGER-DEPLOY.md](./HOSTINGER-DEPLOY.md). Repository ini sudah berisi proyek Next.js di root. Di Hostinger Node.js Web App, pilih repository GitHub `yudventure/zanclusdive`, branch `main`, dan root direktori `.`. Hostinger tidak perlu mengekstrak ZIP. File `Zanclus-Website-Source.zip` dipertahankan sebagai arsip versi sebelumnya dan tidak dipakai oleh build.

Salin `.env.example` menjadi `.env.local` untuk konfigurasi lokal. `NEXT_PUBLIC_WHATSAPP_NUMBER` mengatur nomor tujuan dan label kontak. `NEXT_PUBLIC_SITE_URL` opsional untuk URL gambar share sosial. Variabel publik memerlukan rebuild saat berubah.

## Fitur & status

Layout memenuhi lebar layar tanpa bingkai luar, hero imersif, header tetap terlihat, tombol layanan cepat WhatsApp langsung, menu mobile, kartu pengalaman, kalender rencana, kuis, dialog, formulir, pesan WhatsApp, serta unduhan TXT. Formulir publik tidak mengirim pesan otomatis atau menyimpan data tamu ke server. Admin dapat mencatat konfirmasi reservasi di MySQL. Jadwal/biaya dikonfirmasi lewat tim. Nomor uji coba pengguna: 085190849237.

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

## Admin CMS

**Mode default kini demo siap pakai**, sesuai permintaan pemilik untuk uji coba tanpa database. Deploy lalu buka `/admin` dan tekan **Masuk ke demo**; akun, konten, harga, lokasi, dan reservasi contoh sudah terisi. Lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md) untuk penyimpanan sementara dan perpindahan ke MySQL. Demo berbagi data contoh pada satu instance; jangan mengisi data tamu asli.

Buka `/admin`. Untuk produksi, aktifkan `CMS_MODE=mysql` dan setup kredensial admin/database melalui environment server; lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md). Panel menyediakan overview, kalender, CRUD reservasi, tamu, teks website, upload media, pengalaman/harga, dan kontak. Mode MySQL tidak memiliki password default. Konten publik dibaca saat request agar perubahan tidak memerlukan rebuild.

Tes integrasi CMS membutuhkan database lokal terpisah dengan nama berakhiran `_test`, kredensial admin pengujian, dan server berjalan. Jalankan `node scripts/verify-cms.mjs` dengan environment yang sesuai. Jangan menjalankan tes ini pada database produksi; tes mereset tabel pada database `_test`, membuat/menghapus catatan, dan mengubah konten sementara. Gunakan database kosong khusus pengujian.

Untuk diagnosis produksi, gunakan tombol **Periksa koneksi database** pada login admin. Email/password admin wajib benar; pemeriksaan berjalan di server aplikasi dan tidak menampilkan password atau mengubah data. Detail ada di panduan CMS.

Tes diagnosis menggunakan `scripts/verify-database-check.mjs` dengan `BASE_URL` server database yang benar dan `BAD_DATABASE_BASE_URL` server dengan password database sengaja salah (`wrong-local-db-password` hanya untuk tes lokal). Kedua server memakai kredensial admin pengujian yang sama dan MySQL lokal `_test`. Jalankan tes ini sebelum tes CMS yang mereset data; tes diagnosis memastikan snapshot data tidak berubah, akses tanpa kredensial ditolak, kode/host runtime benar, dan batas pemeriksaan bekerja. Tes diagnosis tidak memerlukan WhatsApp atau server Hostinger.
