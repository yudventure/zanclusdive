# Deployment Zanclus ke Hostinger Node.js Web App

Paket ini adalah proyek Next.js App Router, React, dan Tailwind CSS. Menggunakan server Node.js dengan `npm start`; bukan paket HTML Vite sebelumnya.

## Pengaturan build dan runtime

| Pengaturan | Nilai |
| --- | --- |
| Framework | Next.js |
| Versi Node.js | 22.x (24.x juga memenuhi engines dan telah diuji di cloud) |
| Package manager | npm |
| Direktori proyek | Folder yang berisi `package.json` |
| Install command, jika tersedia | `npm ci --include=dev` |
| Build command | `npm run build` |
| Start command, jika tersedia | `npm start` |
| Output directory, jika diminta | `.next` |
| PORT | Gunakan nilai dari platform; tidak perlu menetapkan 3000 di produksi |

`npm start` menjalankan `next start --hostname 0.0.0.0`, yang memakai `PORT` dari environment. Tidak memakai `output: export` atau standalone custom server. Kolom dan mekanisme start yang ditampilkan dapat berbeda pada hPanel; jika preset Next.js mengelolanya otomatis, gunakan preset tersebut.

## Deploy langsung dari GitHub

1. Di hPanel, tambahkan website melalui **Node.js Web App** dan pilih GitHub sebagai sumber.
2. Hubungkan GitHub serta berikan akses ke repository `yudventure/zanclusdive`.
3. Pilih repository tersebut, branch `main`, dan root proyek `.` (folder yang berisi `package.json`).
4. Gunakan preset Next.js, Node.js 22.x atau 24.x, install `npm ci --include=dev`, build `npm run build`, dan start `npm start` jika kolomnya ditampilkan.
5. Isi environment variable pada bagian berikut sebelum deploy.
6. Jalankan deployment, periksa log, dan uji domain website.

File ZIP lama di repository hanya arsip dan tidak diperlukan untuk build. Tidak perlu memasukkan file proyek dalam subfolder atau mengekstrak ZIP di Hostinger.

## Alternatif upload ZIP

1. Di hPanel, tambahkan website melalui **Node.js Web App**.
2. Pilih sumber upload file jika tersedia, lalu unggah `Zanclus-Nextjs-Hostinger.zip`. Arsip ini menaruh `package.json` di akar arsip. Jangan unggah ZIP Vite lama.
3. Pilih Next.js dan Node.js 22.x, lalu periksa pengaturan build di tabel.
4. Tambahkan environment variable publik berikut sebelum build:
   - `NEXT_PUBLIC_WHATSAPP_NUMBER=6285190849237`
   - `NEXT_PUBLIC_SITE_URL=https://domain-kamu` — ganti dengan domain asli lengkap, tanpa path. Variabel ini opsional; tanpanya gambar share sosial tidak dikonfigurasi.
5. Jalankan deployment/build dari hPanel, lalu periksa log build dan runtime. Upload kode saja belum berarti aplikasi telah online.
6. Hubungkan domain menggunakan instruksi DNS yang ditampilkan Hostinger dan aktifkan/periksa HTTPS.
7. Uji website live: tampilan mobile, logo, kalender, kuis, formulir, serta nomor WhatsApp pada pesan yang disiapkan. Tidak perlu mengirim pesan untuk menguji tautan.

Jika memilih GitHub sebagai sumber, proyek harus lebih dulu dipush ke repository. Kode proyek di repository siap digunakan sebagai sumber build. Deployment dan pengaitan akun GitHub ke Hostinger dilakukan melalui hPanel pengguna.

## Setelah mengganti nomor atau domain

Variabel `NEXT_PUBLIC_*` ditanam ke bundle pada waktu build. Perubahan memerlukan build/deployment ulang. Nomor harus berupa kode negara dan angka saja, misalnya `6285190849237`, tanpa `+`, spasi, atau angka 0 di depan.

## Kompatibilitas build Hostinger

Script `npm run build` memakai `next build --webpack`. Turbopack default Next.js 16 dapat gagal pada host Linux yang tidak memenuhi versi GLIBC native compiler. Webpack dipilih melalui flag CLI resmi; tidak perlu menambahkan `webpack: true` atau `turbopack: false` ke konfigurasi Next.js. Jika build command pada hPanel diatur manual ke `next build`, ganti menjadi `npm run build` atau `next build --webpack`.

## Diagnosis singkat

- Build gagal: pastikan Node 22/24, root proyek benar, dan `package-lock.json` ikut diunggah. Lihat error pertama pada log.
- Server tidak dimulai: pastikan `npm run build` selesai, start command `npm start`, serta PORT dari platform tersedia.
- Halaman 404 setelah upload: jangan meletakkan proyek Node di `public_html` sebagai file statis; gunakan Node.js Web App.
- Aset gagal: proyek ini dipasang pada akar domain, bukan path subfolder; direktori `public` harus ikut paket.
- Nomor masih lama: ubah environment variable kemudian rebuild. Label kontak pada halaman juga mengikuti variabel ini.

## Batas fitur

Reservasi publik dilakukan melalui pesan WhatsApp yang dikirim pengguna. CMS kini memakai mode demo secara default, tanpa MySQL; akun serta data contoh terisi otomatis. Lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md). Lokasi, harga, dan reservasi pada demo merupakan contoh. Untuk produksi, isi `CMS_MODE=mysql` dan ikuti [CMS-HOSTINGER.md](CMS-HOSTINGER.md). Belum ada pembayaran atau kalender ketersediaan otomatis. Nomor masih nomor uji coba pengguna. Gambar laut merupakan ilustrasi generatif.

Instruksi ini berdasarkan pengaturan aplikasi yang telah diuji lokal dan keberadaan fitur Node.js Web App yang dikonfirmasi pengguna. Dokumentasi Hostinger tidak dapat diakses dari jaringan sesi ini, sehingga nama/letak kolom hPanel belum diverifikasi langsung.
