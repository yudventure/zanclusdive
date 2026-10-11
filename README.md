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

Layout memenuhi lebar layar tanpa bingkai luar, hero imersif, header tetap terlihat, tombol layanan cepat WhatsApp langsung, menu mobile, kartu pengalaman, daftar harga paket, kuis, dialog, formulir, pesan WhatsApp, serta unduhan TXT. Formulir publik tidak mengirim pesan otomatis atau menyimpan data tamu ke server. Admin dapat mencatat konfirmasi reservasi di MySQL. Jadwal/biaya dikonfirmasi lewat tim. Nomor uji coba pengguna: 085190849237.

Gambar generatif bukan dokumentasi lokasi. Logo adalah adaptasi vektor dari aset brand sebelumnya. Font Inter, Montserrat, dan Plus Jakarta Sans berlisensi SIL OFL; lisensi ada di `public/licenses`.

## Hero beranda

Hero memakai font Plus Jakarta Sans (file lokal di `public/assets`, tanpa CDN) dengan judul tebal dua baris; baris kedua bergradasi. Isinya: label kecil, judul, deskripsi, tombol booking, tombol video, dan bar cuaca live. Label, judul, deskripsi, dan teks tombol diatur dari **Teks website**. Bar di bawah hero menampilkan **cuaca live** Waisai, Selat Dampier (dekat Kri), dan Sorong: suhu, kondisi, dan kecepatan angin dari [MET Norway Locationforecast](https://api.met.no/) (gratis, tanpa API key, wajib mencantumkan sumber “Data: MET Norway”). Browser memanggil `/api/weather`; server mengambil data MET dengan User-Agent `zanclusdive.com`, menyimpannya 30 menit, menunggu 5 menit sebelum mencoba lagi bila gagal, dan memakai data terakhir hingga 6 jam. Bila belum ada data, bar menampilkan “Cuaca belum tersedia”. Server Hostinger harus bisa mengakses `api.met.no` (HTTPS keluar). Koordinat diatur di `src/weather.js`.

Judul default memuat “Raja Ampat” untuk SEO (“Di bawah laut Raja Ampat, cerita dimulai.” / “Beneath the waters of Raja Ampat, the story begins.”), begitu juga judul dan deskripsi halaman. Dokumen CMS yang masih memakai judul default lama (“Di bawah laut,” / “Beneath the sea,”) diperbarui otomatis; judul yang sudah diubah pemilik tidak disentuh.

**Video hero:** isi **Link video YouTube** di **Teks website** (youtube.com/watch, youtu.be, Shorts, atau live). Tombol kanan berubah menjadi “Watch video / Tonton video” dan membuka pemutar YouTube (youtube-nocookie) dalam dialog; pemutar baru dimuat saat dibuka dan dihentikan saat ditutup. Link dipakai di kedua bahasa. Bila kosong, tombol tampil sebagai “Segera hadir” dan tidak dapat diklik; kuis tetap tersedia di bagian Pengalaman.

## Dua bahasa

Website publik tersedia dalam bahasa Inggris sebagai default dan Bahasa Indonesia:

| Halaman | English (default) | Bahasa Indonesia |
| --- | --- | --- |
| Beranda | `/` | `/id` |
| Aktivitas | `/diving`, `/snorkeling`, `/trip` | `/id/diving`, `/id/snorkeling`, `/id/trip` |
| Dive Shop | `/dive-shop` | `/id/dive-shop` |

Tombol **EN / ID** di header berpindah ke halaman yang sama dalam bahasa lain. `proxy.js` mengarahkan URL `/id` ke halaman yang sama dengan bahasa Indonesia; atribut `lang`, metadata, dan tautan `hreflang` mengikuti bahasa. Tautan internal, kalender, kuis, formulir booking, pesan WhatsApp, pesan pesanan Dive Shop, ringkasan unduhan, serta pesan error booking ikut bahasa halaman. Harga tetap dalam rupiah (IDR). CMS admin tetap berbahasa Indonesia.

Teks yang dikelola CMS memiliki versi English. Di **Teks website**, **Pengalaman & harga**, **Halaman aktivitas**, **Dive Shop**, dan **Kontak & sosial media**, pilih **Bahasa Indonesia** atau **English** sebelum mengedit. Harga, foto, status tampil, nomor WhatsApp, email, dan sosial media dipakai bersama oleh kedua bahasa; lokasi dapat ditulis per bahasa. Dokumen CMS lama mendapat terjemahan English default sekali tanpa mengubah teks Indonesia. Kolom English yang kosong memakai teks Indonesia. Jika teks Indonesia diubah, perbarui juga versi English-nya. Produk baru yang belum diterjemahkan tampil dengan nama Indonesia di versi English.

Teks UI tetap (label tombol, formulir, dan navigasi) ada di `src/i18n.js`; terjemahan default konten CMS ada di `src/content-i18n.js`. Uji dua bahasa dengan `node scripts/verify-i18n.mjs` terhadap server demo lokal (`BASE_URL`). Skrip verifikasi lain menguji versi Indonesia di `/id`.

## Dive Shop

Halaman `/dive-shop` menyediakan katalog **Beli alat** dan **Rental alat**, pencarian, filter kategori, serta pesanan gabungan. Rental dihitung per unit per hari (1–30 hari). Pengunjung menyiapkan pesan lalu mengirim sendiri lewat WhatsApp untuk konfirmasi stok, ukuran, harga, pembayaran, serta pengambilan/pengembalian. Tidak ada checkout pembayaran atau pencatatan stok otomatis.

Kelola katalog di `/admin/shop`: tambah/hapus maksimal 20 produk, atur harga jual dan rental, ketersediaan, tampilan publik, serta foto dari media library. Harga kosong berarti perlu penawaran; alat tidak tersedia tidak dapat ditambahkan. Simpan katalog agar tampil di website tanpa rebuild. Ilustrasi SVG ringan dipakai saat foto belum diisi. Data demo mendapat delapan produk contoh; dokumen demo lama ditambahkan katalog sekali tanpa menghapus perubahan sebelumnya. Dokumen MySQL lama mendapat katalog kosong tanpa harga demo.

## Halaman aktivitas

Halaman `/diving`, `/snorkeling`, dan `/trip` menyediakan gambaran kegiatan, durasi, peserta, titik temu, alur aktivitas, persiapan, pertanyaan umum, serta formulir konsultasi WhatsApp. Ketiga kartu di seksi Pengalaman pada beranda langsung membuka halaman detail; kartu Diving tetap menyatu dengan kalender. Tidak ada seksi aktivitas tambahan di beranda. Navigasi halaman detail dan footer juga menghubungkan ketiga halaman. Formulir menyiapkan pesan berisi aktivitas, nama, usulan tanggal, jumlah peserta, dan catatan; pengunjung menekan tautan WhatsApp untuk melanjutkan. Reservasi dan rincian biaya tetap dikonfirmasi oleh tim.

Kelola judul halaman, ringkasan, foto/caption, harga mulai per orang, informasi kegiatan, langkah perjalanan, dan FAQ melalui `/admin/activities`. Foto sampul halaman dan foto kartu pengalaman memiliki pengaturan terpisah. Kartu beranda menggunakan ringkasan, harga, durasi, dan status aktif dari halaman yang sama. Harga kosong menampilkan “Minta penawaran” pada halaman detail. Nonaktifkan halaman untuk menyembunyikan kartu/tautannya dan mengembalikan 404 pada URL tersebut; kalender beranda tetap tersedia. Dokumen CMS lama mendapat halaman default tanpa menghapus konten atau reservasi sebelumnya; tidak ada harga aktivitas baru yang diisi otomatis. Mode demo menandai aktivitas dan alur sebagai contoh. Foto default adalah visual konsep, dapat diganti melalui media library. `/admin/experiences` tetap mengatur program diving untuk kuis dan formulir rencana.

## Foto & efek scroll

Beranda menggunakan foto berbeda untuk sampul, Diving, Snorkeling, Trip Laut, lima foto galeri, dan dua kartu Jelajahi Laut. Halaman detail memiliki sampul tersendiri; Dive Shop memakai foto konsep perlengkapan. Tiga belas visual tambahan di `public/assets/photos` dibuat dengan image generation sebagai ilustrasi, bukan dokumentasi kegiatan atau destinasi Zanclus. WebP lokal, varian resolusi kecil, dan lazy loading menjaga ukuran unduhan. Ilustrasi katalog tetap berbeda sesuai jenis alat dan dapat diganti dengan foto produk asli melalui CMS.

Ubah foto beranda, galeri, laut, dan sampul Dive Shop di `/admin/media`; foto kartu dan sampul aktivitas ada di `/admin/activities`. Versi foto memperbarui hanya aset bawaan lama satu kali tanpa menghapus URL/upload pemilik, harga, kontak, atau reservasi. Demo menyimpan migrasi; MySQL menerapkannya saat membaca dan menyimpan versi baru saat konten disimpan berikutnya.

Konten muncul bertahap saat memasuki layar, disertai indikator progres dan parallax tipis pada sampul desktop. Scroll tetap mengikuti browser. Ponsel tidak memakai parallax; reduced motion menonaktifkan efek. Tanpa JavaScript atau IntersectionObserver, konten tetap terlihat. Admin dan dialog tidak memakai animasi scroll. Uji dengan `BASE_URL=http://127.0.0.1:3196 node scripts/verify-photography-motion.mjs` pada server lokal.

Uji halaman dan CMS pada instance demo lokal khusus tes: `BASE_URL=http://127.0.0.1:3190 node scripts/verify-activities.mjs`. Tes mengubah konten lalu mengembalikannya, memeriksa tiga halaman, pesan WhatsApp, media/FAQ, perubahan CMS, status 404 untuk halaman nonaktif, header, footer, dan layout desktop/mobile. Tes tidak mengirim pesan atau membuka tautan eksternal.

## Pengujian

```sh
npm test
# Jalankan server terlebih dahulu:
npm run test:browser
# Atau arahkan ke port produksi lain:
BASE_URL=http://127.0.0.1:3001 npm run test:browser
```

Tes browser memakai Chromium di `/usr/bin/chromium`; sesuaikan `executablePath` pada `scripts/verify.mjs` jika mesin berbeda. Tes memeriksa desktop/mobile, daftar harga, detail, kuis, formulir, tautan WhatsApp, unduhan, menu, dialog, overflow dan error runtime. Screenshot disimpan di `artifacts/`. Pesan WhatsApp tidak dikirim oleh tes.

Uji Dive Shop pada server demo lokal dengan `BASE_URL=http://127.0.0.1:3182 node scripts/verify-shop.mjs`. Tes memeriksa jual/rental gabungan, hitungan harga, pencarian/filter, pesan WhatsApp, CRUD katalog CMS, foto, penyimpanan setelah reload, dan tampilan mobile; konten katalog dikembalikan setelah pengujian. Tes ini hanya untuk instance demo lokal khusus pengujian, karena mengubah katalog dan menambah gambar uji.

## Admin CMS

Footer bersama pada beranda dan Dive Shop memuat navigasi, WhatsApp, email, lokasi, dan ikon Instagram/Facebook/TikTok/YouTube. Ubah melalui `/admin/contact` lalu simpan; perubahan langsung tampil tanpa rebuild. Kosongkan tautan sosial untuk menyembunyikan ikonnya. Tautan sosial default pada demo membuka halaman platform, lalu dapat diganti dengan URL akun resmi. Pengaturan demo lama mendapat default ini sekali; tautan yang kemudian dikosongkan tetap tersembunyi.

Uji kontak/footer di instance demo lokal khusus tes dengan `BASE_URL=http://127.0.0.1:3186 node scripts/verify-footer.mjs`. Tes mengubah kontak sementara lalu mengembalikannya, memeriksa tautan pada beranda/Dive Shop serta layout 1440/1000/820/390/320 px, dan menyimpan screenshot kedua seksi. Tidak ada pesan atau tautan eksternal yang dikirim/dibuka.

**Mode default kini demo siap pakai**, sesuai permintaan pemilik untuk uji coba tanpa database. Deploy lalu buka `/admin` dan tekan **Masuk ke demo**; akun, konten, harga, lokasi, dan reservasi contoh sudah terisi. Lihat [DEMO-HOSTINGER.md](DEMO-HOSTINGER.md) untuk penyimpanan sementara dan perpindahan ke MySQL. Demo berbagi data contoh pada satu instance; jangan mengisi data tamu asli.

Buka `/admin`. Untuk produksi, aktifkan `CMS_MODE=mysql` dan setup kredensial admin/database melalui environment server; lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md). Panel menyediakan overview, kalender, CRUD reservasi, tamu, teks website, upload media, pengalaman/harga, dan kontak. Mode MySQL tidak memiliki password default. Konten publik dibaca saat request agar perubahan tidak memerlukan rebuild.

Tes integrasi CMS membutuhkan database lokal terpisah dengan nama berakhiran `_test`, kredensial admin pengujian, dan server berjalan. Jalankan `node scripts/verify-cms.mjs` dengan environment yang sesuai. Jangan menjalankan tes ini pada database produksi; tes mereset tabel pada database `_test`, membuat/menghapus catatan, dan mengubah konten sementara. Gunakan database kosong khusus pengujian.

Untuk diagnosis produksi, gunakan tombol **Periksa koneksi database** pada login admin. Email/password admin wajib benar; pemeriksaan berjalan di server aplikasi dan tidak menampilkan password atau mengubah data. Detail ada di panduan CMS.

Tes diagnosis menggunakan `scripts/verify-database-check.mjs` dengan `BASE_URL` server database yang benar dan `BAD_DATABASE_BASE_URL` server dengan password database sengaja salah (`wrong-local-db-password` hanya untuk tes lokal). Kedua server memakai kredensial admin pengujian yang sama dan MySQL lokal `_test`. Jalankan tes ini sebelum tes CMS yang mereset data; tes diagnosis memastikan snapshot data tidak berubah, akses tanpa kredensial ditolak, kode/host runtime benar, dan batas pemeriksaan bekerja. Tes diagnosis tidak memerlukan WhatsApp atau server Hostinger.

## Daftar harga paket

Seksi Pengalaman di beranda berupa akordeon tiga kartu (Diving, Snorkeling, Trip laut) dengan daftar harga paket (Price List Zanclus Dive Center 2025). Bawaannya kartu Diving terbuka lebar dengan panel harganya; saat pointer atau fokus keyboard berada di kartu lain, kartu itu melebar dengan animasi dan menampilkan harganya, sementara kartu lain menyempit. Saat pointer keluar dari seksi, Diving kembali terbuka. Di layar ≤860px dan layar sentuh kartu bertumpuk; hanya satu panel harga terbuka dan kartu lain memiliki tombol “Lihat harga …”. Panel yang tertutup bersifat `inert` sehingga dilewati keyboard dan pembaca layar. Setiap daftar berisi maksimal 8 item (nama, keterangan, harga rupiah, satuan) dalam Bahasa Indonesia dan English, dikelola di `/admin/prices` (**Daftar harga**). Dokumen CMS lama mendapat daftar harga default sekali. Aktivitas yang dinonaktifkan tidak ditampilkan di panel.

## Booking

Pengunjung membuka formulir booking dari tombol hero atau bagian kontak, memilih program dan tanggal, lalu mengisi nama, nomor WhatsApp, jumlah peserta, dan catatan. Permintaan tersimpan di CMS dengan sumber **Website** dan status **Belum dikonfirmasi**. Ringkasan memuat nomor referensi yang juga terlihat di daftar reservasi admin; pengunjung dapat mengunduhnya atau melanjutkan ke WhatsApp.

Tanggal menggunakan WIT (Asia/Jayapura), mulai hari ini sampai 365 hari ke depan. Penutupan tanggal di kalender admin berlaku pada program dan rentang tanggal terkait; permintaan pada tanggal tertutup ditolak dengan pesan yang jelas. Pengajuan masih perlu konfirmasi jadwal, biaya, dan kondisi laut oleh tim; belum ada pembayaran atau jaminan kapasitas otomatis. Nilai reservasi awal Rp0 adalah nilai pencatatan yang belum diisi, bukan penawaran gratis.

API publik `/api/bookings` hanya mengembalikan rentang tanggal yang ditutup dan bukti pengajuan tanpa identitas tamu. Pengiriman ulang memakai ID permintaan yang sama untuk mencegah duplikasi. Formulir membatasi peserta, memvalidasi nomor kontak dan tanggal di server, serta membatasi percobaan pengajuan. Di mode demo data tersimpan pada penyimpanan demo yang sama dengan CMS (gunakan data contoh); di mode MySQL data masuk ke tabel CMS yang sudah ada. Tidak perlu environment variable tambahan atau mengimpor ulang SQL.

Pengujian alur booking: `BASE_URL=http://127.0.0.1:3202 node scripts/verify-booking.mjs`. Jalankan hanya pada server lokal dengan data uji; mode MySQL memerlukan database khusus berakhiran `_test`.
