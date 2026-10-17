# CMS Zanclus — setup di Hostinger

Panduan ini untuk **mode MySQL produksi** (`CMS_MODE=mysql`). Mode deployment default saat ini adalah demo tanpa database; lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md). Akun demo hanya berlaku di mode demo.

CMS tersedia pada **https://zanclusdive.com/admin** setelah deploy branch `main`. Tampilannya mengikuti referensi admin: header putih, sidebar, kalender reservasi per pengalaman, serta editor website. Tidak ada password bawaan.

## 1. Buat database MySQL

Di hPanel, buka pengelolaan database MySQL pada layanan hosting yang mendukung database. Buat database baru dan user khusus untuk Zanclus, lalu berikan user tersebut akses ke database. Catat nama database, user, password, hostname, dan port yang ditampilkan Hostinger. Jangan kirim password melalui chat atau menyimpannya di GitHub.

Gunakan hostname MySQL yang diberikan layanan hosting; jangan mengasumsikan `localhost`. Jika database berada pada layanan berbeda, pastikan koneksi dari Node.js Web App diizinkan melalui pengaturan akses database. Detail akses/hostname bergantung pada layanan Hostinger pengguna.

Untuk akun `u509575013`, dukungan Hostinger sebelumnya menyarankan koneksi lokal pada port `3306`. Uji produksi melalui `::1` dan `127.0.0.1` tetap mendapat penolakan autentikasi. Kode memetakan `localhost` ke IPv4 `127.0.0.1` untuk TCP, tanpa mengubah alamat remote atau IPv6 eksplisit. Kode membaca `MYSQL_HOST`, bukan `DB_HOST`. Jika dukungan menyediakan path Unix socket yang tersedia bagi proses aplikasi, `MYSQL_SOCKET` dapat diisi; tanpa variabel tersebut koneksi tetap TCP. Jangan menebak path socket.

**Hasil pemeriksaan Hostinger berikutnya:** pemetaan database dikonfirmasi sebagai `srv1152.hstgr.io` / `153.92.15.57`, sementara pemetaan `localhost` dari proses Node.js belum dapat dibuktikan. Kedua uji lokal (`::1` dan `127.0.0.1`) tetap ditolak. Langkah diagnosis berikutnya adalah mengisi `MYSQL_HOST=srv1152.hstgr.io`, mempertahankan kredensial, lalu menjalankan **Periksa koneksi database** setelah redeploy. Jika penolakan remote menampilkan host asal berbentuk IP publik, izinkan IP asal tersebut pada Remote MySQL untuk database Zanclus. Alamat server database tidak membuktikan alamat asal aplikasi. Kueri identitas setelah login tidak dapat mendiagnosis autentikasi yang masih ditolak; laporan mengambil host asal dari respons penolakan MySQL yang aman. Jangan mengaktifkan semua host atau menebak IP keluar.

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

`NEXT_PUBLIC_WHATSAPP_NUMBER` tetap menjadi default awal website. Setelah CMS aktif, nomor dan konten dapat diganti melalui menu CMS tanpa rebuild. `NEXT_PUBLIC_SITE_URL=https://zanclusdivecenter.com` dipakai untuk link kanonik, sitemap, dan gambar share; tanpa variabel ini situs memakai alamat itu juga.

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

Jika phpMyAdmin berhasil masuk tetapi aplikasi mendapat error 1045, buka **Uji dengan password MySQL langsung** pada halaman login. Isi password user database secara pribadi di form (bukan password admin), lalu tekan **Periksa koneksi database**. Password ini hanya dipakai untuk koneksi uji, field segera dikosongkan, dan tidak disimpan ke environment/database maupun dikembalikan pada laporan. Laporan menyebut apakah password uji sama dengan `MYSQL_PASSWORD` runtime tanpa menampilkan nilainya. Jika uji berhasil dengan password berbeda, perbarui `MYSQL_PASSWORD` di hPanel dan deploy ulang. Jika tetap ditolak, bandingkan target/server dengan hasil phpMyAdmin melalui dukungan Hostinger; `127.0.0.1` pada dua server berbeda tidak selalu menunjuk instance MySQL yang sama.

Pada pemeriksaan akun ini melalui phpMyAdmin, hasil SQL menunjukkan akun `u509575013_zanclusadmin@127.0.0.1`, server `id-dci-web1152.main-hosting.eu`, port `3306`, dan socket `/var/lib/mysql/mysql.sock`. Hasil ini membuktikan akun tersebut dapat login pada server database phpMyAdmin, tetapi tidak membuktikan bahwa proses Node.js menjangkau instance yang sama atau membaca password yang sama. Path socket berasal dari server database; gunakan pada Node.js hanya jika Hostinger memastikan socket tersebut tersedia untuk proses aplikasi.

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

Akun staf dengan peran dibuat di **Pengguna & peran** (lihat di bawah). Belum ada MFA.

### Ganti password dengan kode OTP email

Di admin, buka **Ubah password** (menu kiri, atau menu akun di kanan atas). Tekan **Kirim kode OTP**, lalu masukkan kode 6 angka dari email bersama password baru (minimal 10 karakter). Lupa password? Di halaman login, tekan **Lupa password? Reset dengan kode OTP email**, isi email operator, lalu ikuti langkah yang sama. Setelah reset, kamu langsung masuk.

- Kode berlaku 10 menit, sekali pakai, dan batal setelah 5 kali salah. Kode baru bisa diminta 1 menit kemudian, maksimal 5 kode per jam.
- Password baru disimpan sebagai hash scrypt di penyimpanan CMS (folder data demo, atau tabel `zanclus_records` di MySQL). Password ini menggantikan password bawaan akun operator atau `ADMIN_PASSWORD` untuk email yang sama.
- Setelah password diganti, login di perangkat lain berakhir.
- Halaman lupa password tidak memberi tahu apakah sebuah email terdaftar.

Kode dikirim lewat akun email SMTP yang diisi di hPanel → Variabel environment, lalu deploy ulang:

| Nama | Isi |
| --- | --- |
| `SMTP_HOST` | Server SMTP. Email Hostinger: `smtp.hostinger.com`. Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | `465` (SSL, bawaan). Untuk port 587 isi juga `SMTP_SECURE=false` |
| `SMTP_USER` | Alamat email pengirim lengkap, mis. `admin@zanclusdive.com` |
| `SMTP_PASS` | Password email itu. Untuk Gmail pakai *App Password*, bukan password akun |
| `SMTP_FROM` | Opsional. Nama dan alamat pengirim, mis. `Zanclus Dive Center <admin@zanclusdive.com>` |
| `ADMIN_OTP_EMAIL` | Opsional. Email yang menerima kode. Tanpa ini, kode dikirim ke email login |

Isi `ADMIN_OTP_EMAIL` dengan email yang benar-benar kamu buka. Alamat login operator belum tentu punya kotak masuk. Selama SMTP belum diisi, halaman **Ubah password** menampilkan variabel yang masih kurang. Jika server email menolak login, halaman menampilkan alasannya. Jangan menetapkan `CMS_COOKIE_SECURE=false` di Hostinger; pengaturan tersebut hanya dipakai untuk pengujian HTTP localhost.

## Peran dan pengguna

Admin dibagi per kategori, dan setiap akun punya satu peran yang menentukan menu dan API yang bisa dipakainya:

| Peran | Dipakai oleh | Menu yang terlihat |
| --- | --- | --- |
| **Superadmin** | Owner, developer, manager | Semua menu, termasuk **Pengguna & peran** dan **Mode developer** |
| **HRD** | Urusan pegawai | **HRD**: Pegawai, Absensi, Slip gaji (lihat Modul HRD) |
| **Finance** | Keuangan | **Keuangan**: Pembayaran online, Buku kas, Laba rugi & pajak (lihat Modul Keuangan) |
| **Gudang** | Stok | **Gudang**: Barang & stok, Keluar masuk (lihat Modul Gudang) |
| **PR** | Media sosial dan website | Kalender reservasi, Reservasi, Tamu, **Situs web**, **PR & mitra** (Kalender konten, Agen & kalender) |

Setiap peran juga bisa mengganti password sendiri lewat **Ubah password**.

- Akun dari hPanel (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) dan akun operator bawaan selalu superadmin dan tidak bisa dihapus dari admin, jadi pemilik tidak pernah terkunci.
- Superadmin membuat akun di **Pengaturan → Pengguna & peran**: nama, email login, peran, dan password awal (minimal 10 karakter). Beri tahu password awalnya; orang itu lalu menggantinya di **Ubah password** dengan kode OTP yang dikirim ke emailnya sendiri (bukan `ADMIN_OTP_EMAIL`, yang hanya berlaku untuk akun bawaan).
- Superadmin bisa mengganti peran, menonaktifkan, mengatur ulang password, dan menghapus akun. Menonaktifkan atau mengatur ulang password langsung mengakhiri sesi akun itu. Akun yang sedang dipakai tidak bisa menonaktifkan atau menurunkan perannya sendiri.
- Halaman di luar peran menampilkan pemberitahuan, dan API-nya menjawab 403. Data admin yang dimuat pun mengikuti peran: HRD dan Gudang tidak menerima reservasi, media, atau agen; Finance hanya menerima reservasi dengan pembayaran online.
- Saat PR menyimpan isi website, bagian yang bukan haknya (kunci mode developer, saklar pembayaran) tetap seperti tersimpan.
- Data akun tersimpan sebagai record `user` di tabel `zanclus_records` (atau folder data demo); password sebagai hash scrypt seperti password yang diganti. Tidak ada tabel baru. Maksimal 50 akun.

## Modul HRD

Peran **HRD** (dan superadmin) mengelola tiga halaman di grup **HRD**:

- **Pegawai**: nama, jabatan, jenis (pegawai tetap, kontrak, harian lepas, magang), tanggal mulai dan akhir kontrak, WhatsApp, email, NIK, status aktif. Di kartu yang sama: gaji pokok per bulan atau upah per hari hadir (harian lepas), potongan per hari tanpa keterangan, tunjangan tetap dan potongan tetap (maksimal 8 baris masing-masing), jatah cuti, BPJS Kesehatan/Ketenagakerjaan, asuransi lain, dan rekening bank. Pegawai nonaktif tidak masuk absensi dan slip gaji baru; hapus hanya menghapus data pegawainya.
- **Absensi**: satu tanggal untuk semua pegawai aktif (hadir, izin, sakit, cuti, tanpa keterangan, libur) dengan jam masuk/pulang dan catatan; simpan sekali untuk semua. Tanggal yang sudah diisi bisa dibuka dan diubah lagi. Di bawahnya rekap per bulan.
- **Slip gaji**: per bulan, satu slip per pegawai aktif. Pegawai tetap/kontrak: gaji pokok + tunjangan − potongan − (hari tanpa keterangan × potongan per hari). Harian lepas: upah harian × hari hadir + tunjangan − potongan. Slip bersifat **draf** dan mengikuti data terbaru sampai ditekan **Kunci (dibayar)**; setelah itu angkanya tersimpan dan tidak berubah walau gaji atau absensi diubah. **Buka** mengembalikannya menjadi draf.
- **Unduh Excel** di tiap halaman: daftar pegawai, rekap dan rincian absensi per bulan, dan daftar gaji per bulan (`.xlsx`, dibuat server tanpa pustaka tambahan).

Data tersimpan di tabel `zanclus_records` sebagai record `employee`, `attendance` (satu per pegawai per hari), dan `payslip` (slip terkunci). Tidak ada tabel baru. Data gaji termasuk data pribadi; jaga backup database seperti data tamu.

## Modul Keuangan

Peran **Finance** (dan superadmin), grup **Keuangan**:

- **Pembayaran online**: pengaturan Midtrans dan riwayat pembayaran (sudah ada).
- **Buku kas**: pemasukan dan pengeluaran per bulan dengan kategori (diving, snorkeling, trip, kursus, Dive Shop, sewa alat, servis; gaji, operasional, perlengkapan, sewa/listrik, pemasaran, konsumsi, pajak), cara bayar, referensi nota, dan catatan. **Pembayaran online yang lunas masuk sendiri** sebagai baris "Otomatis" (dari data reservasi, tidak diketik ulang dan tidak bisa diubah di sini). Total masuk, keluar, dan bersih per bulan, serta unduhan Excel.
- **Laba rugi & pajak**: dua belas bulan dalam setahun (pemasukan, pengeluaran, laba, pajak), rincian per kategori, dan rekap pajak. Pajak dihitung dari pemasukan kotor dengan tarif yang bisa diatur; bawaannya PPh final UMKM 0,5% (PP 55/2022). Ini perkiraan untuk setoran, bukan pengganti perhitungan konsultan pajak. Unduhan Excel per tahun.

## Modul Gudang

Peran **Gudang** (dan superadmin), grup **Gudang**:

- **Barang & stok**: nama, kode, kategori (alat selam, suku cadang, bahan habis pakai, merchandise, perahu & mesin), satuan, stok minimum, harga beli, lokasi simpan. Stok dihitung dari catatan masuk/keluar, bukan diketik; nilai stok = stok × harga beli. Barang dengan stok 0 ditandai **Habis**, dan barang dengan stok di bawah atau sama dengan minimum ditandai **Menipis**. Keduanya dihitung di atas daftar. Tombol **Masuk** dan **Keluar** di tiap baris mencatat mutasi tanpa pindah halaman.
- **Produk Dive Shop**: produk, ukuran, dan stoknya diatur di **Dive Shop**, pada detail produk, dengan stok jual di bagian **Untuk dijual** dan stok sewa di bagian **Untuk disewa**. Setiap produk otomatis punya barang di daftar ini untuk jual dan untuk sewa, per ukuran, dengan label seperti "Dive Shop · Wetsuit 3 mm · Sewa · M", dan angka stok yang diketik di Dive Shop tercatat sebagai stock opname saat katalog disimpan. Pembelian online yang lunas tercatat sendiri sebagai **Keluar · Penjualan** pada barang jual, dan sewa online memakai unit barang sewa pada tanggal sewanya tanpa perlu dicatat Keluar. Kolom **Produk Dive Shop** di formulir barang hanya untuk memindahkan produk ke barang yang sudah ada.
- **Keluar masuk**: catatan per bulan (masuk: pembelian, sewa kembali; keluar: penjualan, sewa keluar, dipakai, rusak/hilang; koreksi stok ± dari stock opname). Mutasi yang salah dihapus lalu dicatat ulang supaya riwayatnya jujur. Unduhan Excel untuk stok dan mutasi per bulan.

## Modul PR: Kalender konten

Peran **PR** (dan superadmin), grup **PR & mitra** → **Kalender konten**:

- Satu kalender bulanan untuk Instagram, TikTok, Facebook, YouTube, dan website. Tiap konten punya judul/ide, format (reel, foto, carousel, story, video panjang, artikel, live), tanggal dan jam tayang, penanggung jawab, caption/catatan produksi, dan tautan setelah tayang.
- Status mengikuti alur kerja: **Ide → Draf → Terjadwal → Tayang → Dievaluasi**. Di kalender, konten ide/draf tampil pudar dan konten yang tayang tampil tebal, dengan warna per platform.
- Saat status Tayang atau Dievaluasi, isi angka hasilnya (tayangan, jangkauan, suka, komentar, simpan, bagikan) dan catatan evaluasi. Kartu **Hasil bulan ini** menjumlahkan konten yang tayang per platform dan angkanya, dan unduhan Excel memuat semua konten bulan itu beserta ringkasannya.

Data ketiga modul tersimpan sebagai record `transaction`, `setting`, `item`, `movement`, dan `post` di tabel `zanclus_records`; tidak ada tabel baru.

## Google Search Console

Situs sudah menyiapkan semua yang dibaca Google:

- **`/sitemap.xml`**: semua halaman publik dalam bahasa Inggris dan Indonesia (`/id/...`) dengan hreflang. Halaman yang dimatikan di CMS (aktivitas, kursus, servis) otomatis keluar dari sitemap.
- **`/robots.txt`**: halaman publik boleh dirayapi; `/admin`, `/api/admin/`, `/partner/`, dan `/payment/` tidak. Foto upload di `/api/media/` tetap boleh dirayapi. Keduanya tetap terbuka saat mode developer mengunci situs.
- **Link kanonik, hreflang, dan gambar share** memakai alamat lengkap `https://zanclusdivecenter.com`. Bila domain utama lain, isi `SITE_URL=https://domain-utama` di hPanel → Variabel environment (dibaca saat berjalan).
- **Data bisnis (schema.org)** di beranda: nama, WhatsApp, email, alamat (Waisai, Papua Barat Daya), dan tautan sosial media dari menu **Kontak & sosial media**.

Langkah mendaftarkan situs (perlu akun Google pemilik):

1. Buka [search.google.com/search-console](https://search.google.com/search-console), **Tambahkan properti**, pilih **Domain**, isi `zanclusdivecenter.com` (tanpa `https://` dan `www`). Properti Domain mencakup www, non-www, http, dan https.
2. Salin catatan TXT dari Google. Di hPanel → **Domain → DNS**, tambah catatan **TXT** dengan nama `@` dan isi catatan tadi. Kembali ke Search Console dan tekan **Verifikasi**; bila belum berhasil, tunggu DNS menyebar lalu coba lagi. Catatan TXT jangan dihapus. Cara ini tidak memakai kolom tag HTML di admin.
   - Tanpa akses DNS: properti **Awalan URL** `https://zanclusdivecenter.com/` dengan metode **Tag HTML**. Tempel tag `<meta name="google-site-verification" …>` (atau `content`-nya saja) di admin **Situs web → SEO & Search Console → Tag HTML (opsional)**, simpan, lalu tekan **Verifikasi**. Kode juga bisa diisi lewat `GOOGLE_SITE_VERIFICATION` di hPanel.
3. Buka **Sitemap**, isi `https://zanclusdivecenter.com/sitemap.xml`, tekan **Kirim**. Status **Couldn't fetch** sesaat setelah dikirim biasanya berubah menjadi **Success** dalam beberapa jam. Sitemap tidak perlu dikirim ulang saat halaman di CMS berubah.
4. Di **Pemeriksaan URL**, periksa `https://zanclusdivecenter.com/` dan `/id`, lalu **Minta pengindeksan**.

Halaman **SEO & Search Console** bisa dibuka superadmin dan PR. Halaman itu juga memperingatkan bila admin dibuka di domain lain dari alamat yang dipakai untuk Google.

## Tentang kami: profil perusahaan

Halaman **Tentang kami** memuat bagian **Profil perusahaan** setelah cerita: nama perusahaan (PT Zanclus Daya Cipta), profil singkat, kalimat sorotan, portofolio (sampai 6 bidang), dan mitra kerja, dalam bahasa Indonesia dan Inggris. Isinya diubah di **Situs web → Tentang kami → Profil perusahaan**. Halaman yang tersimpan sebelum bagian ini ada otomatis memakai isi bawaan dari company profile.

## Daftar harga, add-on, dan slot di keranjang

Daftar harga diatur di **Situs web → Daftar harga**. Setiap aktivitas (Diving, Snorkeling, Trip laut) berisi layanan utamanya. Untuk diving itu Discovery Dive dan Pemandu selam.

Alat dan layanan lain ditawarkan sebagai **add-on**, diambil dari daftar yang sudah ada, jadi nama dan harganya cukup diubah di satu tempat.

- Daftar sewa Dive Shop (masker, scuba, tabung, dive computer, kamera) tetap tampil di Dive Shop beranda dan bisa dipakai sebagai add-on.
- Daftar baru **Layanan tambahan** untuk layanan yang bukan alat, misalnya dokumentasi, antar jemput mobil, atau catering. Daftar ini hanya tampil sebagai add-on.
- Di tab setiap aktivitas ada kartu **Add-on**. Centang item dari daftar lain (maksimal 16), lalu tekan **Simpan add-on**.
- Item yang dihapus dari daftarnya otomatis hilang dari add-on.

Di halaman aktivitas, add-on tampil di bawah paket utama dengan nama daftar asalnya, dan di jendela checkout di bagian **Mau tambah sesuatu?**. Add-on dibayar bersama minimal satu paket utama. Harga dihitung ulang di server dari CMS.

Saat pembaruan ini dipasang, daftar diving yang tersimpan dipindahkan sekali secara otomatis. Perlengkapan scuba masuk ke daftar sewa BCD, regulator & wetsuit. Dokumentasi masuk ke Layanan tambahan dengan harga yang tersimpan. Tabung dan dive computer memakai item yang sudah ada di daftar sewa. Semuanya, ditambah tiga kamera sewa, menjadi add-on diving. Snorkeling dan trip tidak diubah dan belum punya add-on.

Antar jemput mobil dan catering belum ada di daftar harga mana pun. Tambahkan di **Layanan tambahan** dengan harganya, lalu centang di kartu Add-on aktivitas yang menawarkannya.

Di jendela checkout, tanggal dipilih dari kalender **Tanggal & slot** tepat di bawah keranjang. Setiap tanggal menunjukkan sisa slot hari itu, tanggal penuh atau tutup tidak bisa dipilih, dan di bawahnya tertulis tanggal yang dipilih beserta sisa slotnya.

## Email tamu & invoice

Tamu yang mengisi email menerima email ber-logo Zanclus dalam bahasa Indonesia atau Inggris. Email dikirim lewat SMTP yang sama dengan kode OTP (lihat tabel `SMTP_*` di atas). Balasan tamu masuk ke email di menu **Kontak & sosial media**.

| Email | Kapan dikirim |
| --- | --- |
| **Pesanan & batas bayar** | Pesanan website dibayar lewat Midtrans, atau reservasi di admin ditagih lewat transfer bank atau link Midtrans. Berisi batas bayar (WIT), tombol bayar atau rekening transfer, dan rincian pesanan. |
| **Invoice** | Begitu Midtrans melaporkan lunas, atau admin mencatat reservasi **Sudah lunas**. Berisi nomor invoice `INV-tanggal-kode`, metode bayar, rincian, dan status LUNAS. |
| **Pesanan dibatalkan** | Link Midtrans kedaluwarsa sebelum dibayar. Tempatnya dilepas dan tamu diajak memesan lagi. |

Pengaturan ada di **Keuangan → Pembayaran online → Email tamu & invoice** (superadmin dan keuangan):

- **Batas waktu pembayaran**: 1 jam sampai 3 hari, bawaan 24 jam. Link Midtrans kedaluwarsa pada batas ini.
- **Rekening untuk transfer bank**: sampai 3 rekening; tampil di email tagihan transfer.
- **Catatan di invoice**: mis. ketentuan pembatalan, dalam bahasa Indonesia dan Inggris.
- **Salinan setiap email ke**: email kantor yang menerima salinan (BCC) untuk arsip.
- **Pratinjau** dan **Kirim ke email saya** menampilkan contoh setiap email dengan pengaturan yang sudah disimpan.
- Sakelar di kanan atas mematikan email otomatis dari website dan Midtrans.

Reservasi dari WhatsApp, agen, atau walk-in dicatat di **Reservasi**. Isi **Email tamu** dan **Bahasa email**, lalu pilih **Pembayaran**:

- **Tanpa tagihan**: hanya dicatat.
- **Tagih lewat transfer bank**: tamu menerima rekening dan batas bayar. Setelah bukti transfer masuk, ubah ke **Sudah lunas**.
- **Tagih lewat link Midtrans**: website membuat link pembayaran Midtrans untuk nilai reservasi. Begitu dibayar, reservasi otomatis Dikonfirmasi dan invoice terkirim.
- **Sudah lunas** (transfer, tunai, kartu, QRIS): reservasi menjadi Dikonfirmasi dan invoice terkirim.

Centang **Kirim email ke tamu setelah disimpan** untuk mengirim email saat menyimpan. Saat mengedit, kotak **Email ke tamu** menampilkan riwayat kirim, **Pratinjau**, dan **Kirim ulang**. Tagihan transfer yang lewat batas ditandai **Lewat batas bayar**; tagihan transfer tidak dibatalkan otomatis. Pembayaran Midtrans yang masih berjalan atau sudah lunas hanya berubah lewat Midtrans. Pembayaran tunai dan transfer tidak otomatis masuk Buku kas; tim keuangan mencatatnya di sana. Logo dan foto email diambil dari `https://zanclusdivecenter.com/assets/email/`, jadi tampil setelah versi ini di-deploy.

## Data dan reservasi

Pesan WhatsApp **tidak otomatis menjadi reservasi**. Admin mencatat hasil konfirmasi tamu secara manual. Kalender di halaman aktivitas menampilkan sisa slot per hari dari reservasi yang dikonfirmasi dan pembayaran online yang sedang menunggu. Kuotanya diatur di **Aktivitas → Kuota peserta per hari**; diving bawaannya 30 orang per hari, dipakai bersama program diving dan kursus. Tanggal penuh atau ditutup tidak bisa dipilih dan pembayarannya ditolak server. Pesan WhatsApp tetap perlu dicatat manual.

Data berada di tabel `zanclus_records`, `zanclus_media`, dan `zanclus_login_attempts`. Backup ketiganya melalui fasilitas backup database/ekspor SQL Hostinger. Simpan backup secara aman; tabel reservasi mengandung data tamu. Media BLOB menambah ukuran database; gunakan URL gambar dari penyimpanan eksternal jika koleksi besar.

Tanpa konfigurasi CMS, website publik tetap memakai konten default dan login CMS belum aktif. Gangguan koneksi database pada website publik membuat halaman menggunakan default; admin menampilkan kesalahan koneksi.

## Hasil pengujian

Build Webpack serta pengujian konten, media, reservasi, login, dan keamanan dilakukan pada instance MySQL 8.4 lokal yang terpisah. Database Hostinger pengguna belum dibuat, sehingga koneksi produksi dan login di domain baru bisa diverifikasi setelah pengaturan di atas selesai.
