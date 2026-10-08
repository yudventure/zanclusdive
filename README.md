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

Port default 3000; server menggunakan `PORT` yang disediakan hosting. Tidak ada ketergantungan font/CDN saat runtime. CMS default memakai penyimpanan demo; MySQL digunakan saat `CMS_MODE=mysql`. Tailwind dikompilasi melalui PostCSS; layout memakai utility Tailwind dan CSS khusus untuk desain referensi.

## Hostinger

Lihat [HOSTINGER-DEPLOY.md](./HOSTINGER-DEPLOY.md). Repository ini sudah berisi proyek Next.js di root. Di Hostinger Node.js Web App, pilih repository GitHub `yudventure/zanclusdive`, branch `main`, dan root direktori `.`. Hostinger tidak perlu mengekstrak ZIP. File `Zanclus-Website-Source.zip` dipertahankan sebagai arsip versi sebelumnya dan tidak dipakai oleh build.

Salin `.env.example` menjadi `.env.local` untuk konfigurasi lokal. `NEXT_PUBLIC_WHATSAPP_NUMBER` mengatur nomor tujuan dan label kontak. `NEXT_PUBLIC_SITE_URL` opsional untuk URL gambar share sosial. Variabel publik memerlukan rebuild saat berubah.

## Fitur & status

Layout memenuhi lebar layar tanpa bingkai luar, hero imersif, header tetap terlihat, tombol layanan cepat WhatsApp langsung, menu mobile, kartu pengalaman, kalender rencana, kuis, dialog, formulir, pesan WhatsApp, serta unduhan TXT. Formulir publik tidak mengirim pesan otomatis atau menyimpan data tamu ke server. Admin dapat mencatat konfirmasi reservasi di MySQL. Jadwal/biaya dikonfirmasi lewat tim. Nomor uji coba pengguna: 085190849237.

Gambar generatif bukan dokumentasi lokasi. Logo adalah adaptasi vektor dari aset brand sebelumnya. Font Inter dan Montserrat berlisensi SIL OFL; lisensi ada di `public/licenses`.

## Dive Shop

Halaman `/dive-shop` menyediakan katalog **Beli alat** dan **Rental alat**, pencarian, filter kategori, serta pesanan gabungan. Rental dihitung per unit per hari (1–30 hari). Pengunjung menyiapkan pesan lalu mengirim sendiri lewat WhatsApp untuk konfirmasi stok, ukuran, harga, pembayaran, serta pengambilan/pengembalian. Tidak ada checkout pembayaran atau pencatatan stok otomatis.

Kelola katalog di `/admin/shop`: tambah/hapus maksimal 20 produk, atur harga jual dan rental, ketersediaan, tampilan publik, serta foto dari media library. Harga kosong berarti perlu penawaran; alat tidak tersedia tidak dapat ditambahkan. Simpan katalog agar tampil di website tanpa rebuild. Ilustrasi SVG ringan dipakai saat foto belum diisi. Data demo mendapat delapan produk contoh; dokumen demo lama ditambahkan katalog sekali tanpa menghapus perubahan sebelumnya. Dokumen MySQL lama mendapat katalog kosong tanpa harga demo.

## Halaman aktivitas

Halaman `/diving`, `/snorkeling`, dan `/trip` menyediakan gambaran kegiatan, durasi, peserta, titik temu, alur aktivitas, persiapan, pertanyaan umum, serta formulir konsultasi WhatsApp. Kartu pada beranda, navigasi halaman detail, dan footer menghubungkan ketiga halaman. Formulir menyiapkan pesan berisi aktivitas, nama, usulan tanggal, jumlah peserta, dan catatan; pengunjung menekan tautan WhatsApp untuk melanjutkan. Reservasi dan rincian biaya tetap dikonfirmasi oleh tim.

Kelola judul, ringkasan, foto/caption, harga mulai per orang, informasi kegiatan, langkah perjalanan, dan FAQ melalui `/admin/activities`. Harga kosong menampilkan “Minta penawaran”. Nonaktifkan halaman untuk menyembunyikan kartu/tautannya dan mengembalikan 404 pada URL tersebut. Dokumen CMS lama mendapat halaman default tanpa menghapus konten atau reservasi sebelumnya; tidak ada harga aktivitas baru yang diisi otomatis. Mode demo menandai aktivitas dan alur sebagai contoh. Foto default adalah visual konsep, dapat diganti melalui media library.

Uji halaman dan CMS pada instance demo lokal khusus tes: `BASE_URL=http://127.0.0.1:3190 node scripts/verify-activities.mjs`. Tes mengubah konten lalu mengembalikannya, memeriksa tiga halaman, pesan WhatsApp, media/FAQ, perubahan CMS, status 404 untuk halaman nonaktif, header, footer, dan layout desktop/mobile. Tes tidak mengirim pesan atau membuka tautan eksternal.

## Pengujian

```sh
npm test
# Jalankan server terlebih dahulu:
npm run test:browser
# Atau arahkan ke port produksi lain:
BASE_URL=http://127.0.0.1:3001 npm run test:browser
```

Tes browser memakai Chromium di `/usr/bin/chromium`; sesuaikan `executablePath` pada `scripts/verify.mjs` jika mesin berbeda. Tes memeriksa desktop/mobile, kalender, detail, kuis, formulir, tautan WhatsApp, unduhan, menu, dialog, overflow dan error runtime. Screenshot disimpan di `artifacts/`. Pesan WhatsApp tidak dikirim oleh tes.

Uji Dive Shop pada server demo lokal dengan `BASE_URL=http://127.0.0.1:3182 node scripts/verify-shop.mjs`. Tes memeriksa jual/rental gabungan, hitungan harga, pencarian/filter, pesan WhatsApp, CRUD katalog CMS, foto, penyimpanan setelah reload, dan tampilan mobile; konten katalog dikembalikan setelah pengujian. Tes ini hanya untuk instance demo lokal khusus pengujian, karena mengubah katalog dan menambah gambar uji.

## Admin CMS

Footer bersama pada beranda dan Dive Shop memuat navigasi, WhatsApp, email, lokasi, dan ikon Instagram/Facebook/TikTok/YouTube. Ubah melalui `/admin/contact` lalu simpan; perubahan langsung tampil tanpa rebuild. Kosongkan tautan sosial untuk menyembunyikan ikonnya. Tautan sosial default pada demo membuka halaman platform, lalu dapat diganti dengan URL akun resmi. Pengaturan demo lama mendapat default ini sekali; tautan yang kemudian dikosongkan tetap tersembunyi.

Uji kontak/footer di instance demo lokal khusus tes dengan `BASE_URL=http://127.0.0.1:3186 node scripts/verify-footer.mjs`. Tes mengubah kontak sementara lalu mengembalikannya, memeriksa tautan pada beranda/Dive Shop serta layout 1440/1000/820/390/320 px, dan menyimpan screenshot kedua seksi. Tidak ada pesan atau tautan eksternal yang dikirim/dibuka.

**Mode default kini demo siap pakai**, sesuai permintaan pemilik untuk uji coba tanpa database. Deploy lalu buka `/admin` dan tekan **Masuk ke demo**; akun, konten, harga, lokasi, dan reservasi contoh sudah terisi. Lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md) untuk penyimpanan sementara dan perpindahan ke MySQL. Demo berbagi data contoh pada satu instance; jangan mengisi data tamu asli.

Buka `/admin`. Untuk produksi, aktifkan `CMS_MODE=mysql` dan setup kredensial admin/database melalui environment server; lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md). Panel menyediakan overview, kalender, CRUD reservasi, tamu, teks website, upload media, pengalaman/harga, dan kontak. Mode MySQL tidak memiliki password default. Konten publik dibaca saat request agar perubahan tidak memerlukan rebuild.

Tes integrasi CMS membutuhkan database lokal terpisah dengan nama berakhiran `_test`, kredensial admin pengujian, dan server berjalan. Jalankan `node scripts/verify-cms.mjs` dengan environment yang sesuai. Jangan menjalankan tes ini pada database produksi; tes mereset tabel pada database `_test`, membuat/menghapus catatan, dan mengubah konten sementara. Gunakan database kosong khusus pengujian.

Untuk diagnosis produksi, gunakan tombol **Periksa koneksi database** pada login admin. Email/password admin wajib benar; pemeriksaan berjalan di server aplikasi dan tidak menampilkan password atau mengubah data. Detail ada di panduan CMS.

Tes diagnosis menggunakan `scripts/verify-database-check.mjs` dengan `BASE_URL` server database yang benar dan `BAD_DATABASE_BASE_URL` server dengan password database sengaja salah (`wrong-local-db-password` hanya untuk tes lokal). Kedua server memakai kredensial admin pengujian yang sama dan MySQL lokal `_test`. Jalankan tes ini sebelum tes CMS yang mereset data; tes diagnosis memastikan snapshot data tidak berubah, akses tanpa kredensial ditolak, kode/host runtime benar, dan batas pemeriksaan bekerja. Tes diagnosis tidak memerlukan WhatsApp atau server Hostinger.
