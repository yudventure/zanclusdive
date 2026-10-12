# CMS Zanclus tanpa MySQL

Deploy branch `main` dengan Node.js 22/24, build `npm run build`, dan start `npm start`. Mode default sekarang **demo**; tidak membutuhkan MySQL atau kredensial database. Jika ada variabel `CMS_MODE` di hPanel, isi `demo` agar konsisten. Variabel MySQL lama tidak dipakai dalam mode demo.

1. Buka `https://zanclusdive.com/admin` atau tekan **Masuk operator** di footer.
2. Masuk dengan akun operator `operator@zanclusdive.com` dan password yang diberikan kepada pemilik. Password tidak disimpan di repository, hanya hash scrypt-nya (`src/server/operator-account.js`).
3. Kelola kalender, reservasi, tamu, teks, harga, kontak, gambar, galeri, dan **Dive Shop**.

Untuk menambah akun admin tanpa mengubah kode, isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` (dan sebaiknya `SESSION_SECRET` minimal 32 karakter) di hPanel. Akun itu bisa dipakai di samping akun operator; akun operator tetap berlaku.

Akun demo publik (`demo@zanclusdive.com`) **tidak lagi bisa dipakai** di server publik. Akun itu hanya aktif bila `CMS_DEMO_LOGIN=true`, yang dipakai untuk pengujian lokal. Website tidak menampilkan label demo. Reservasi contoh hanya dibuat di server pengujian lokal (`CMS_DEMO_LOGIN=true`); di server publik daftar reservasi dimulai kosong, dan reservasi contoh dari versi lama dihapus otomatis.

Data CMS (teks, harga, reservasi) disimpan sebagai JSON di folder `~/zanclus-cms-data` pada akun hosting, di luar folder aplikasi, supaya tidak hilang saat redeploy. Setiap foto yang diunggah disimpan sebagai file terpisah di `~/zanclus-cms-data/media`. Data lama di `/tmp/zanclus-demo-cms-v1` disalin otomatis satu kali saat aplikasi pertama kali berjalan dengan versi ini. Jika folder home tidak bisa ditulis, aplikasi kembali memakai `/tmp/zanclus-demo-cms-v1`. Folder lain dapat diatur melalui `CMS_DEMO_DATA_DIR`. Total foto dibatasi 400 MB; foto dari kamera otomatis dikecilkan di browser sebelum diunggah (maksimal 4 MB per file setelah dikecilkan).

## Upload foto

Di admin, setiap tempat foto (Foto & media, galeri, Dive Shop, halaman aktivitas) punya tombol **Ganti foto / Upload dari PC / HP**. Pilih foto dari komputer atau HP, foto langsung diunggah, terpasang, dan tersimpan; tidak perlu tombol Simpan dan tidak perlu masuk hPanel.

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
