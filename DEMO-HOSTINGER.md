# Demo Zanclus siap pakai

Deploy branch `main` dengan Node.js 22/24, build `npm run build`, dan start `npm start`. Mode default sekarang **demo**; tidak membutuhkan MySQL atau kredensial database. Jika ada variabel `CMS_MODE` di hPanel, isi `demo` agar konsisten. Variabel MySQL lama tidak dipakai dalam mode demo.

1. Buka `https://zanclusdive.com/admin`.
2. Tekan **Masuk ke demo**. Akun contoh sudah terisi otomatis.
3. Coba kalender, reservasi, tamu, teks, harga, kontak, dan upload gambar.
4. Simpan perubahan teks dan buka website utama untuk melihat hasilnya.

Akun demo publik adalah `demo@zanclusdive.com` / `ZanclusDemo2026!`. Akun ini khusus mode demo dan **tidak berlaku pada MySQL**. Setiap pengunjung dapat mencoba data demo bersama. Gunakan nama/data tamu contoh saja. Tampilan memberi label demo; harga, lokasi, dan reservasi awal merupakan contoh, bukan informasi operasional terverifikasi.

Penyimpanan demo berupa JSON dan gambar base64 pada direktori `/tmp/zanclus-demo-cms-v1` di server aplikasi. Perubahan bertahan setelah reload dan restart proses jika direktori masih ada. Redeploy, penggantian instance, atau pembersihan `/tmp` dapat menghapus data demo; ini bukan penyimpanan produksi atau sistem untuk beberapa instance. Direktori lain dapat diatur melalui `CMS_DEMO_DATA_DIR` jika tersedia volume persisten dari hosting. Total gambar demo dibatasi 24 MB; setiap upload tetap maksimal 4 MB.

Login memakai sesi cookie yang sama dengan CMS, tetapi secret demo dibuat acak di proses server. Restart dapat mengakhiri sesi; tekan **Masuk ke demo** lagi. API perubahan tetap memerlukan sesi dan origin yang sesuai. Demo tidak membuka data MySQL, tidak menjalankan pemeriksaan MySQL, dan tidak menulis ke tabel produksi.

## Saat siap memakai database produksi

Isi **`CMS_MODE=mysql`** di hPanel, lengkapi `MYSQL_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `SESSION_SECRET`, lalu deploy ulang. Ikuti [panduan MySQL](CMS-HOSTINGER.md). Akun demo berhenti berlaku. Data demo tidak otomatis dipindahkan ke MySQL; konten produksi berasal dari tabel database yang sudah ada atau konten awal CMS. Koneksi MySQL Hostinger masih perlu diselesaikan dan diverifikasi sebelum beralih.

## Pengujian lokal

Jalankan server demo pada direktori sementara khusus tes:

```sh
CMS_MODE=demo CMS_DEMO_DATA_DIR=/tmp/zanclus-demo-verification CMS_COOKIE_SECURE=false npm start -- --port 3172
BASE_URL=http://127.0.0.1:3172 node scripts/verify-demo.mjs
```

Tes membuat/mengubah data demo, bukan data MySQL. Jangan arahkan tes ini ke server publik yang sedang dipakai pengunjung. Pengujian MySQL menggunakan `CMS_MODE=mysql` secara eksplisit.
