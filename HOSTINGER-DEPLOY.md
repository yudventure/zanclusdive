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

Buat ZIP dari commit terakhir dengan `npm run zip:hostinger`. Hasilnya `Zanclus-Nextjs-Hostinger.zip` di root proyek: `package.json` dan `package-lock.json` ada di akar arsip, tanpa `node_modules`, `.next`, `.git`, tes, atau ZIP lama (lihat `.gitattributes`). Perubahan yang belum di-commit tidak ikut.

1. Di hPanel, tambahkan website melalui **Node.js Web App**.
2. Pilih **Upload file** → **Lanjutkan**, lalu unggah `Zanclus-Nextjs-Hostinger.zip`. Jangan ekstrak dulu dan jangan unggah ZIP Vite lama (`Zanclus-Website-Source.zip`).
3. Pilih Next.js dan Node.js 22.x, lalu periksa pengaturan build di tabel.
4. Tambahkan environment variable publik berikut sebelum build:
   - `NEXT_PUBLIC_WHATSAPP_NUMBER=6285190969308`
   - `NEXT_PUBLIC_SITE_URL=https://zanclusdivecenter.com` — domain asli lengkap, tanpa path. Dipakai untuk link kanonik, sitemap, dan gambar share. Tanpa variabel ini situs memakai `https://zanclusdivecenter.com`; isi `SITE_URL` bila domain utamanya lain (dibaca saat berjalan, tanpa build ulang).
5. Jalankan deployment/build dari hPanel, lalu periksa log build dan runtime. Upload kode saja belum berarti aplikasi telah online.
6. Hubungkan domain menggunakan instruksi DNS yang ditampilkan Hostinger dan aktifkan/periksa HTTPS.
7. Uji website live: tampilan mobile, logo, kalender, kuis, formulir, serta nomor WhatsApp pada pesan yang disiapkan. Tidak perlu mengirim pesan untuk menguji tautan.

Jika memilih GitHub sebagai sumber, proyek harus lebih dulu dipush ke repository. Kode proyek di repository siap digunakan sebagai sumber build. Deployment dan pengaitan akun GitHub ke Hostinger dilakukan melalui hPanel pengguna.

## Setelah mengganti nomor atau domain

Variabel `NEXT_PUBLIC_*` ditanam ke bundle pada waktu build. Perubahan memerlukan build/deployment ulang. Nomor harus berupa kode negara dan angka saja, misalnya `6285190969308`, tanpa `+`, spasi, atau angka 0 di depan.

## Kompatibilitas build Hostinger

Script `npm run build` memakai `next build --webpack`. Turbopack default Next.js 16 dapat gagal pada host Linux yang tidak memenuhi versi GLIBC native compiler. Webpack dipilih melalui flag CLI resmi; tidak perlu menambahkan `webpack: true` atau `turbopack: false` ke konfigurasi Next.js. Jika build command pada hPanel diatur manual ke `next build`, ganti menjadi `npm run build` atau `next build --webpack`.

Tailwind CSS dan PostCSS berada di `dependencies`, bukan `devDependencies`, karena dibutuhkan saat build. Build tetap berhasil walaupun hosting memasang paket tanpa devDependencies.

## Halaman perawatan dan error

Mode developer diatur dari `/admin/developer`, tanpa hPanel. Halaman 404 dan 500 ditangani aplikasi. Kalau Node.js app sedang mati, server Hostinger menampilkan halamannya sendiri untuk pengunjung baru. Pengunjung yang pernah membuka website melihat halaman 502/503/504 dan offline Zanclus dari service worker. Jika hPanel menyediakan pengaturan halaman error kustom untuk website ini, arahkan ke `/status/502.html`, `/status/503.html`, atau `/status/504.html`. Pengaturan ini belum diverifikasi di hPanel.

## Pembayaran Midtrans dan kalender agen

Untuk pembayaran online, tambahkan `MIDTRANS_SERVER_KEY` (mulai dengan key sandbox) di environment variable hPanel, deploy ulang, lalu aktifkan dari `/admin/payments`. Saat siap menerima uang sungguhan, ganti dengan server key production, tambahkan variabel baru bernama `MIDTRANS_PRODUCTION` dengan value `true` (variabel sendiri, bukan ditulis di belakang server key), dan pastikan `CMS_MODE=mysql`. Di dashboard Midtrans isi **Payment Notification URL** dengan `https://domain-kamu/api/payments/midtrans`. Setelah aktif, semua pemesanan (paket aktivitas, Dive Shop, kursus, servis) dibayar lewat Midtrans. Jika tamu melihat "Pembayaran belum bisa dibuat", buka `/admin/payments`: halaman itu menampilkan penolakan terakhir dari Midtrans dan tombol **Tes koneksi Midtrans**; kode 401 berarti server key salah atau tidak sesuai mode sandbox/production. Detail ada di README bagian *Pembayaran online (Midtrans)*. Kalender travel agent di `/admin/agents` tidak memerlukan pengaturan hPanel. Server Hostinger harus bisa membuka `api.midtrans.com`/`app.midtrans.com` (sandbox: `*.sandbox.midtrans.com`) dan alamat kalender agen; ini belum diverifikasi dari sesi pengembangan.

## Diagnosis singkat

- Build gagal: pastikan Node 22/24, root proyek benar, dan `package-lock.json` ikut diunggah. Lihat error pertama pada log.
- Server tidak dimulai: pastikan `npm run build` selesai, start command `npm start`, serta PORT dari platform tersedia.
- Halaman 404 setelah upload: jangan meletakkan proyek Node di `public_html` sebagai file statis; gunakan Node.js Web App.
- Aset gagal: proyek ini dipasang pada akar domain, bukan path subfolder; direktori `public` harus ikut paket.
- Nomor masih lama: ubah environment variable kemudian rebuild. Label kontak pada halaman juga mengikuti variabel ini.

## Batas fitur

Reservasi publik dilakukan melalui pesan WhatsApp yang dikirim pengguna, atau dibayar langsung lewat Midtrans bila diaktifkan. CMS kini memakai mode demo secara default, tanpa MySQL; akun serta data contoh terisi otomatis. Lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md). Lokasi, harga, dan reservasi pada demo merupakan contoh. Untuk produksi, isi `CMS_MODE=mysql` dan ikuti [CMS-HOSTINGER.md](CMS-HOSTINGER.md). Nomor masih nomor uji coba pengguna. Gambar laut merupakan ilustrasi generatif.

Instruksi ini berdasarkan pengaturan aplikasi yang telah diuji lokal dan keberadaan fitur Node.js Web App yang dikonfirmasi pengguna. Dokumentasi Hostinger tidak dapat diakses dari jaringan sesi ini, sehingga nama/letak kolom hPanel belum diverifikasi langsung.
