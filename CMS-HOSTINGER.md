# CMS Zanclus — setup di Hostinger

CMS tersedia pada **https://zanclusdive.com/admin** setelah deploy branch `main`. Tampilannya mengikuti referensi admin: header putih, sidebar, kalender reservasi per pengalaman, serta editor website. Tidak ada password bawaan.

## 1. Buat database MySQL

Di hPanel, buka pengelolaan database MySQL pada layanan hosting yang mendukung database. Buat database baru dan user khusus untuk Zanclus, lalu berikan user tersebut akses ke database. Catat nama database, user, password, hostname, dan port yang ditampilkan Hostinger. Jangan kirim password melalui chat atau menyimpannya di GitHub.

Gunakan hostname MySQL yang diberikan layanan hosting; jangan mengasumsikan `localhost`. Jika database berada pada layanan berbeda, pastikan koneksi dari Node.js Web App diizinkan melalui pengaturan akses database. Detail akses/hostname bergantung pada layanan Hostinger pengguna.

Untuk akun `u509575013`, dukungan Hostinger telah memeriksa bahwa aplikasi Zanclus dan database berada pada hosting yang sama dan menyarankan **`MYSQL_HOST=localhost`, `MYSQL_PORT=3306`**. Gunakan nilai itu untuk deployment ini. Kode membaca `MYSQL_HOST`, bukan `DB_HOST`. Jika dukungan menyediakan path Unix socket, `MYSQL_SOCKET` dapat diisi; tanpa variabel tersebut koneksi tetap TCP. Jangan menebak path socket.

**Struktur database sudah disiapkan.** Kamu hanya perlu membuat database kosong dan user di hPanel, lalu mengisi kredensial pada langkah 2. Aplikasi otomatis membuat tiga tabel beserta konten awal saat pertama terhubung; tidak perlu impor SQL. Pembuatan database dan user di akun Hostinger tetap harus dilakukan melalui hPanel.

Jika ingin menyiapkan tabel lebih dulu melalui phpMyAdmin, gunakan [file SQL siap impor](database/zanclus-cms.sql):

1. Buka file tersebut di GitHub, lalu unduh menggunakan tombol **Download raw file**.
2. Di hPanel, buka phpMyAdmin untuk database Zanclus yang baru dibuat.
3. Pilih database tersebut, buka tab **Import**, pilih `zanclus-cms.sql`, lalu jalankan impor.
4. Lanjutkan pengisian environment variable pada langkah 2 dan deploy ulang.

SQL membuat `zanclus_records`, `zanclus_media`, dan `zanclus_login_attempts`, serta mengisi konten awal website. Tidak berisi password atau reservasi contoh. Impor ulang tidak menghapus tabel, tidak menimpa konten yang sudah ada, dan tidak mengubah reservasi. File tidak memakai `CREATE DATABASE` atau `CREATE USER`, sehingga mengikuti nama database/user berprefix yang dibuat Hostinger. Akun admin berasal dari environment variable, bukan dari tabel database.

## 2. Isi environment variable aplikasi Node.js

| Nama | Isi |
| --- | --- |
| `MYSQL_HOST` | Hostname database yang diberikan Hostinger |
| `MYSQL_PORT` | Port database; umumnya 3306 |
| `MYSQL_DATABASE` | Nama lengkap database, termasuk prefix jika ada |
| `MYSQL_USER` | Nama user database, termasuk prefix jika ada |
| `MYSQL_PASSWORD` | Password user database |
| `ADMIN_EMAIL` | Email untuk login pemilik |
| `ADMIN_PASSWORD` | Password admin unik, minimal 12 karakter; disarankan 16+ |
| `SESSION_SECRET` | String acak kriptografis, minimal 32 karakter |

Buat `SESSION_SECRET` menggunakan password manager, atau jalankan perintah berikut di terminal pribadi lalu simpan hasilnya secara aman ke hPanel:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Tidak perlu memasukkan nilai tersebut ke file repository. Jangan menggunakan contoh pendek atau password umum. Variabel CMS bersifat server-only: **jangan menambahkan prefix NEXT_PUBLIC_**.

Jika penyedia database mensyaratkan TLS, atur `MYSQL_SSL=true`. Sertifikat tetap diverifikasi; aplikasi tidak menonaktifkan verifikasi TLS.

`NEXT_PUBLIC_WHATSAPP_NUMBER` tetap menjadi default awal website. Setelah CMS aktif, nomor dan konten dapat diganti melalui menu CMS tanpa rebuild. `NEXT_PUBLIC_SITE_URL=https://zanclusdive.com` tetap dipakai untuk metadata sosial pada waktu build.

## 3. Deploy dan masuk

1. Deploy commit terbaru branch `main` menggunakan Next.js, Node 22/24, build `npm run build`, dan start `npm start`.
2. Pastikan domain menggunakan HTTPS. Cookie login otomatis memakai flag Secure pada produksi.
3. Buka `/admin`, lalu login menggunakan email/password yang diisi di hPanel.
4. Tabel database dibuat otomatis ketika koneksi pertama berhasil. User database harus memiliki izin CREATE, SELECT, INSERT, UPDATE, DELETE pada database khusus tersebut.
5. Uji mengganti satu teks, simpan, lalu buka website publik pada tab baru. Perubahan akan tampil pada kunjungan berikutnya.

Jika halaman menunjukkan **CMS perlu dikonfigurasi**, lengkapi variabel yang diwajibkan. Jika login menampilkan database tidak dapat diakses, periksa hostname, user, password, izin, dan akses jaringan MySQL di hPanel. Menambah nilai environment biasanya membutuhkan restart/redeploy aplikasi mengikuti alur hPanel.

Halaman admin kini menampilkan nama variabel yang belum terbaca dan syarat panjang yang belum terpenuhi, tanpa menampilkan nilai kredensial. Jika masih muncul **Konfigurasi CMS belum lengkap** setelah redeploy, periksa hanya nama yang tercantum: gunakan nama variabel persis seperti tabel di atas, isi nilai tanpa tanda kutip pembungkus, pastikan variabel dipasang pada aplikasi `zanclusdive.com` yang sedang dijalankan, lalu simpan dan deploy ulang. File `.env` lokal atau `.env.example` di GitHub tidak otomatis mengisi variabel runtime Hostinger. Pesan konfigurasi tersebut belum merupakan hasil pengecekan koneksi database; error koneksi baru diperiksa ketika konfigurasi lengkap dan aplikasi mengakses MySQL.

## Jika login menampilkan error database

Isi email/password admin pada `/admin`, lalu tekan **Periksa koneksi database**. Pemeriksaan dijalankan pada proses aplikasi yang sedang berjalan di Hostinger, memakai konfigurasi yang sama dengan CMS, tanpa membuat/menghapus tabel atau mengubah data. Kredensial admin diverifikasi sebelum informasi koneksi ditampilkan; pemeriksaan tetap dapat digunakan saat MySQL menolak koneksi. Tidak ada sesi login yang diterbitkan melalui pemeriksaan ini.

Laporan menampilkan hostname, port, nama database, user, transport, dan kode error; password tidak disertakan. Pada penolakan login MySQL, laporan juga menampilkan host asal koneksi jika tersedia pada respons driver. Setelah koneksi berhasil, laporan menampilkan akun/klien MySQL, server yang dijangkau, dan jumlah tabel CMS. Salin laporan untuk diagnosis atau dukungan Hostinger. Pemeriksaan dibatasi 8 kali per 15 menit pada masing-masing proses aplikasi dan memerlukan origin yang sama. Batas ini terpisah dari batas login yang disimpan di MySQL.

Jika laporan masih menunjukkan hostname lama setelah perubahan ke `localhost`, deployment yang sedang berjalan belum memakai perubahan environment: simpan variabel pada aplikasi/domain yang benar dan pastikan deployment terbaru aktif. Jika host sudah `localhost` tetapi akses tetap ditolak, laporan host asal/akun merupakan bukti untuk pemeriksaan kredensial atau grant Hostinger. Jangan mengubah lagi hostname tanpa hasil pemeriksaan atau instruksi penyedia.

Kode memangkas spasi pada hostname/nama database/user, namun mempertahankan password persis. Laporan memberikan peringatan jika password mengandung spasi tepi atau tanda kutip pembungkus; peringatan tidak membuktikan password salah. Nilai `GANTI_DENGAN_...` pada kredensial dan port yang tidak valid ditolak sebelum koneksi.

Pesan login menyertakan kode diagnosis aman; nilai password, SQL, dan pesan driver mentah tidak ditampilkan. Kode yang sama dicatat di **Log runtime** hPanel.

- `ER_ACCESS_DENIED_ERROR`: periksa user/password database (bukan password admin) dan izin koneksi user dari aplikasi.
- `ER_HOST_NOT_PRIVILEGED`: server aplikasi belum diizinkan. Pada **Remote MySQL**, izinkan IP keluar aplikasi Node.js untuk database Zanclus. Jangan mengisi kolom IP dengan IP server database. Jika IP keluar tidak tersedia, minta Hostinger memberikannya beserta konfigurasi koneksi yang didukung.
- `ETIMEDOUT`, `ECONNREFUSED`, `EHOSTUNREACH`, `ENETUNREACH`: periksa hostname, port, dan jalur jaringan dengan Hostinger. Untuk koneksi remote yang dibatasi, aplikasi memerlukan izin IP keluar.
- `ENOTFOUND`: isi hostname saja pada `MYSQL_HOST`, tanpa `https://`, port, atau tanda kutip pembungkus.
- `ER_BAD_DB_ERROR`: gunakan nama database lengkap termasuk prefix.
- `ER_DBACCESS_DENIED_ERROR`, `ER_TABLEACCESS_DENIED_ERROR`, `ER_SPECIFIC_ACCESS_DENIED_ERROR`: user harus memiliki akses dan izin CREATE/SELECT/INSERT/UPDATE/DELETE pada database Zanclus.

Perubahan kredensial perlu disimpan dan aplikasi di-deploy ulang. Berhasil membuka phpMyAdmin menunjukkan akses panel; hal itu belum membuktikan bahwa server Node.js dapat terhubung ke MySQL.

## Menu yang tersedia

- **Overview:** ringkasan catatan reservasi, pengalaman aktif, nilai terkonfirmasi, dan reservasi terbaru. Nilai bukan bukti pembayaran masuk.
- **Kalender:** catatan per pengalaman dan per tanggal, navigasi bulan, tambah/edit reservasi, serta penutupan tanggal. Tanggal akhir termasuk hari terakhir.
- **Reservasi:** pencarian, filter status, edit, dan hapus catatan.
- **Tamu:** daftar yang dihimpun dari reservasi. Tidak ada data tamu contoh.
- **Teks website:** hero, tagline, judul bagian, deskripsi, dan CTA.
- **Foto & media:** upload PNG/JPEG/WebP maksimal 4 MB, atau gunakan URL HTTPS. Gambar disimpan dalam MySQL agar tidak hilang saat redeploy.
- **Pengalaman & harga:** nama, deskripsi, poin, harga opsional, durasi, serta visibilitas. Minimal satu pengalaman tetap aktif.
- **Kontak & sosial media:** WhatsApp, email, lokasi, dan Instagram.

Upload gambar saja belum mengganti gambar website: pilih gambar pada slot hero/reef/ocean lalu tekan **Simpan gambar website**. Teks diperlakukan sebagai teks biasa; HTML/script tidak dijalankan.

## Sesi dan pengamanan

Login memakai cookie HttpOnly, SameSite=Lax, Secure pada HTTPS produksi, dan sesi 8 jam. API admin memerlukan sesi sah, perubahan memerlukan origin yang sesuai, serta login dibatasi setelah 8 kegagalan selama jendela 15 menit. Mengganti password atau SESSION_SECRET membatalkan sesi lama.

Tidak ada akun staf, password reset melalui email, MFA, atau integrasi OTA otomatis. Pengguna pemilik dapat mengganti kredensial dari environment variable hPanel lalu restart/redeploy. Jangan menetapkan `CMS_COOKIE_SECURE=false` di Hostinger; pengaturan tersebut hanya dipakai untuk pengujian HTTP localhost.

## Data dan reservasi

Pesan WhatsApp **tidak otomatis menjadi reservasi**. Admin mencatat hasil konfirmasi tamu secara manual. Kalender website publik tetap kalender rencana; kalender CMS merupakan catatan operasional, belum sistem kapasitas/ketersediaan otomatis. Penutupan tanggal CMS tidak otomatis memblokir formulir WhatsApp publik.

Data berada di tabel `zanclus_records`, `zanclus_media`, dan `zanclus_login_attempts`. Backup ketiganya melalui fasilitas backup database/ekspor SQL Hostinger. Simpan backup secara aman; tabel reservasi mengandung data tamu. Media BLOB menambah ukuran database; gunakan URL gambar dari penyimpanan eksternal jika koleksi besar.

Tanpa konfigurasi CMS, website publik tetap memakai konten default dan login CMS belum aktif. Gangguan koneksi database pada website publik membuat halaman menggunakan default; admin menampilkan kesalahan koneksi.

## Hasil pengujian

Build Webpack serta pengujian konten, media, reservasi, login, dan keamanan dilakukan pada instance MySQL 8.4 lokal yang terpisah. Database Hostinger pengguna belum dibuat, sehingga koneksi produksi dan login di domain baru bisa diverifikasi setelah pengaturan di atas selesai.
