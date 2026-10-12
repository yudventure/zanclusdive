# CMS Zanclus tanpa MySQL

Deploy branch `main` dengan Node.js 22/24, build `npm run build`, dan start `npm start`. Mode default sekarang **demo**; tidak membutuhkan MySQL atau kredensial database. Jika ada variabel `CMS_MODE` di hPanel, isi `demo` agar konsisten. Variabel MySQL lama tidak dipakai dalam mode demo.

1. Buka `https://zanclusdive.com/admin` atau tekan **Masuk operator** di footer.
2. Masuk dengan akun operator `operator@zanclusdive.com` dan password yang diberikan kepada pemilik. Password tidak disimpan di repository, hanya hash scrypt-nya (`src/server/operator-account.js`).
3. Kelola kalender, reservasi, tamu, teks, harga, kontak, gambar, galeri, dan **Dive Shop**.

Untuk mengganti akun operator tanpa mengubah kode, isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` (dan sebaiknya `SESSION_SECRET` minimal 32 karakter) di hPanel. Jika keduanya terisi, akun itu menggantikan akun operator bawaan.

Akun demo publik (`demo@zanclusdive.com`) **tidak lagi bisa dipakai** di server publik. Akun itu hanya aktif bila `CMS_DEMO_LOGIN=true`, yang dipakai untuk pengujian lokal. Gunakan nama/data tamu contoh saja. Tampilan memberi label demo; harga, lokasi, dan reservasi awal merupakan contoh, bukan informasi operasional terverifikasi.

Penyimpanan demo berupa JSON dan gambar base64 pada direktori `/tmp/zanclus-demo-cms-v1` di server aplikasi. Perubahan bertahan setelah reload dan restart proses jika direktori masih ada. Redeploy, penggantian instance, atau pembersihan `/tmp` dapat menghapus data demo; ini bukan penyimpanan produksi atau sistem untuk beberapa instance. Direktori lain dapat diatur melalui `CMS_DEMO_DATA_DIR` jika tersedia volume persisten dari hosting. Total gambar demo dibatasi 24 MB; setiap upload tetap maksimal 4 MB.

Login memakai sesi cookie. Tanpa `SESSION_SECRET`, secret sesi dibuat acak di proses server, sehingga restart dapat mengakhiri sesi dan operator perlu masuk lagi. API perubahan tetap memerlukan sesi dan origin yang sesuai. Demo tidak membuka data MySQL, tidak menjalankan pemeriksaan MySQL, dan tidak menulis ke tabel produksi.

## Saat siap memakai database produksi

Isi **`CMS_MODE=mysql`** di hPanel, lengkapi `MYSQL_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `SESSION_SECRET`, lalu deploy ulang. Ikuti [panduan MySQL](CMS-HOSTINGER.md). Akun demo berhenti berlaku. Data demo tidak otomatis dipindahkan ke MySQL; konten produksi berasal dari tabel database yang sudah ada atau konten awal CMS. Koneksi MySQL Hostinger masih perlu diselesaikan dan diverifikasi sebelum beralih.

## Pengujian lokal

Jalankan server demo pada direktori sementara khusus tes:

```sh
CMS_MODE=demo CMS_DEMO_LOGIN=true CMS_DEMO_DATA_DIR=/tmp/zanclus-demo-verification CMS_COOKIE_SECURE=false npm start -- --port 3172
BASE_URL=http://127.0.0.1:3172 node scripts/verify-demo.mjs
```

Tes membuat/mengubah data demo, bukan data MySQL. Jangan arahkan tes ini ke server publik yang sedang dipakai pengunjung. Pengujian MySQL menggunakan `CMS_MODE=mysql` secara eksplisit.

## Demo Dive Shop

Buka `/dive-shop` untuk mencoba penjualan dan rental alat. Delapan produk contoh sudah disiapkan, termasuk mask, fins, wetsuit, BCD, regulator, dive computer, tabung, dan lampu. Semua harga contoh diberi label demo. Rental memakai harga per unit per hari. Pilih alat, isi nama/tanggal/durasi dan catatan ukuran, lalu siapkan pesan WhatsApp.

Di `/admin/shop`, ubah katalog dan tekan **Simpan katalog Dive Shop**. Data demo dari versi sebelumnya ditambahkan katalog tanpa mengganti teks, kontak, reservasi, atau gambar yang sudah disimpan. Produk baru berupa draft sampai diaktifkan. Foto dapat dipilih dari media library. Saat beralih ke MySQL, isi katalog produk asli di CMS; contoh demo tidak dipindahkan otomatis.
