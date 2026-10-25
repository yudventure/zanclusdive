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

Salin `.env.example` menjadi `.env.local` untuk konfigurasi lokal. `NEXT_PUBLIC_WHATSAPP_NUMBER` mengatur nomor tujuan dan label kontak. `NEXT_PUBLIC_SITE_URL` (atau `SITE_URL` saat berjalan) mengatur alamat lengkap untuk link kanonik, sitemap, dan gambar share; bawaannya `https://zanclusdivecenter.com`. Variabel publik memerlukan rebuild saat berubah.

## Fitur & status

Layout memenuhi lebar layar tanpa bingkai luar, hero imersif, header tetap terlihat, tombol layanan cepat WhatsApp langsung, menu mobile, kartu pengalaman, daftar harga paket, kuis, dialog, formulir, pesan WhatsApp, serta unduhan TXT. Formulir publik tidak mengirim pesan otomatis atau menyimpan data tamu ke server. Admin dapat mencatat konfirmasi reservasi di MySQL. Jadwal/biaya dikonfirmasi lewat tim. Nomor uji coba pengguna: 085190849237.

Gambar generatif bukan dokumentasi lokasi. Logo adalah adaptasi vektor dari aset brand sebelumnya. Font Inter, Montserrat, dan Plus Jakarta Sans berlisensi SIL OFL; lisensi ada di `public/licenses`.

## Hero beranda

Hero memakai font Plus Jakarta Sans (file lokal di `public/assets`, tanpa CDN) dengan judul tebal dua baris; baris kedua bergradasi. Isinya: label kecil, judul, deskripsi, tombol booking, dan bar cuaca live. Label, judul, deskripsi, dan teks tombol diatur dari **Teks website**. Bar di bawah hero menampilkan **cuaca live** Waisai, Selat Dampier (dekat Kri), dan Sorong: suhu, kondisi, dan kecepatan angin dari [MET Norway Locationforecast](https://api.met.no/) (gratis, tanpa API key, wajib mencantumkan sumber “Data: MET Norway”). Browser memanggil `/api/weather`; server mengambil data MET dengan User-Agent `zanclusdive.com`, menyimpannya 30 menit, menunggu 5 menit sebelum mencoba lagi bila gagal, dan memakai data terakhir hingga 6 jam. Bila belum ada data, bar menampilkan “Cuaca belum tersedia”. Server Hostinger harus bisa mengakses `api.met.no` (HTTPS keluar). Koordinat diatur di `src/weather.js`.

Judul default memuat “Raja Ampat” untuk SEO (“Di bawah laut Raja Ampat, cerita dimulai.” / “Beneath the waters of Raja Ampat, the story begins.”), begitu juga judul dan deskripsi halaman. Dokumen CMS yang masih memakai judul default lama (“Di bawah laut,” / “Beneath the sea,”) diperbarui otomatis; judul yang sudah diubah pemilik tidak disentuh.


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

## Mode developer, halaman perawatan, dan halaman error

Buka `/admin/developer` (**Mode developer** di menu admin). Saat mode developer **aktif**, kamu bisa mengunci:

- **Seluruh website**: semua halaman publik menampilkan halaman perawatan dengan status 503 dan `Retry-After`, supaya Google tahu ini sementara. Halaman admin tetap terbuka.
- **Per halaman**: Beranda, Diving, Snorkeling, Trip laut, Kursus, Tentang kami, Servis alat, Dive Shop. Halaman terkunci menampilkan halaman perawatan dengan tombol kembali ke beranda. Kartu aktivitas di beranda ikut ditandai dan tidak bisa diklik.
- **Per bagian beranda**: pengalaman & harga, panel kursus, peta titik selam, galeri laut, video YouTube, Dive Shop, cara menuju ke sini, dan toko & kontak. Bagian terkunci diganti kartu "Sedang diperbarui" dengan tombol WhatsApp.
- **Per item**: produk Dive Shop dan servis alat selam. Item tetap terlihat dengan tanda "Sedang diperbarui", tapi tidak bisa dimasukkan ke keranjang atau dipilih di formulir.

Pesan untuk pengunjung (ID/EN) dan perkiraan selesai (WIT) tampil di halaman perawatan. Mematikan mode developer membuka semuanya sekaligus, dan pilihan kunci tetap tersimpan untuk lain kali.

- **Langsung tersimpan.** Saklar **Mode developer** dan centang **Tutup seluruh website untuk pengunjung** tersimpan begitu diklik, dengan pemberitahuan. Menutup seluruh website atau mencentang kunci apa pun saat saklar masih Mati ikut menyalakan saklarnya, karena kunci tanpa mode developer tidak berlaku. Kunci per halaman, bagian, dan item tetap disimpan dengan **Simpan mode developer**.
- **Admin melihat website lengkap.** Admin yang sedang masuk tetap melihat website, dengan bar "Mode developer aktif" di bawah layar, jadi website yang tertutup tampak terbuka di browser admin. Tombol **Lihat seperti pengunjung** (di halaman Mode developer dan di bar itu) membuka website seperti pengunjung yang tidak masuk, lengkap dengan halaman perawatan, selama 30 menit (`/?pratinjau=pengunjung`, cookie `zanclus_pratinjau`). Bar oranye **Pratinjau pengunjung** atau tombol di halaman perawatan, **Kembali ke tampilan admin** (`?pratinjau=admin`), mengakhirinya. Halaman admin tetap terbuka selama pratinjau.

Cara kerjanya: setiap halaman memeriksa kunci dan sesi admin. `proxy.js` juga menjawab halaman terkunci dengan 503 dari status kunci yang diingat proses server setiap kali konten dibaca atau disimpan. Setelah server baru menyala, permintaan pertama tetap mendapat halaman perawatan dari halaman itu sendiri.

Halaman status memakai ilustrasi jendela kapal selam dengan ikan Moorish idol (*Zanclus cornutus*), dalam Bahasa Indonesia dan English:

| Halaman | Kapan tampil | Alamat |
| --- | --- | --- |
| Perawatan | Mode developer mengunci website atau halaman | `/maintenance` (503) |
| 404 | Alamat tidak ditemukan | otomatis, juga `/status/404.html` |
| 403 | Akses ditolak | `/status/403.html` |
| 500 | Halaman gagal dimuat | otomatis (`app/error.jsx`), juga `/status/500.html` |
| 502, 503, 504 | Server Hostinger tidak menjawab dengan benar | `/status/502.html`, `/status/503.html`, `/status/504.html` |
| Offline | Internet pengunjung terputus | `/status/offline.html` |

Tambahkan `?lang=id` untuk versi Indonesia. Service worker (`public/sw.js`) menyimpan halaman offline, 502, 503, dan 504 di browser pengunjung yang pernah membuka website. Saat internet pengunjung putus, halaman offline tampil dan dimuat ulang otomatis begitu koneksi kembali. Saat hosting menjawab 502, 503, atau 504, halaman Zanclus yang tampil. Service worker hanya menangani pemuatan halaman dan tidak menyimpan isi website. Halaman yang sedang terbuka juga menampilkan pemberitahuan kecil saat koneksi putus dan tersambung lagi.

Uji dengan `BASE_URL=http://127.0.0.1:3210 node scripts/verify-developer.mjs` pada build produksi server demo lokal dengan `CMS_DEMO_LOGIN=true` dan `CMS_COOKIE_SECURE=false`. Tes ini mengubah mode developer lalu mematikannya lagi.

## Video di galeri (YouTube, TikTok, Instagram, Facebook)

Di bawah dua kartu Jelajahi laut dan di atas tombol **Buka galeri** tampil deretan video vertikal 9:16. Isi link di `/admin/media` → **Video vertikal (9:16)** (maksimal 8), lalu tekan **Simpan video**. Tanpa video, deretan ini tidak tampil. Link yang dikenali:

- **YouTube**: Shorts, `watch?v=`, `youtu.be`.
- **TikTok**: `tiktok.com/@akun/video/…`. Link pendek dari tombol Bagikan (`vt.tiktok.com/…`, `vm.tiktok.com/…`) otomatis dibuka server menjadi link lengkap.
- **Instagram**: Reels atau postingan video (`instagram.com/reel/…`, `/p/…`).
- **Facebook**: Reels dan video (`facebook.com/reel/…`, `watch/?v=…`, `/halaman/videos/…`). Link `fb.watch/…` dan `facebook.com/share/…` dibuka otomatis seperti TikTok. Videonya harus publik.

Jika link pendek tidak bisa dibuka dari server, admin menampilkan petunjuk: buka link itu di browser, lalu salin alamat lengkap dari kolom alamat. Link pendek yang belum terbuka tidak bisa disimpan.

Video tetap dihosting platformnya, jadi tidak membebani server. **Sampul** tampil seketika di setiap kartu dan menutupi pemutar sampai videonya benar-benar berputar (TikTok `onStateChange`/`onCurrentTime`, YouTube `infoDelivery`, atau paling lambat 8 detik setelah pemutar dimuat), jadi tidak ada layar hitam selama pemutar dimuat. Sampul YouTube dari `i.ytimg.com`; sampul TikTok diambil server sekali dari oEmbed TikTok (`/api/video-poster/tiktok/<id>`, hanya untuk video yang ada di situs), dikecilkan ke 540 px, disimpan, dan dikirim dengan cache seminggu; Instagram dan Facebook tidak memberi sampul. Di admin setiap video punya **Upload sampul** (foto 9:16, langsung terpasang dan tersimpan) yang menggantikan sampul otomatis, berguna untuk Instagram dan Facebook. Situs sudah menyapa `tiktok.com` dan YouTube (`preconnect`) saat halaman dimuat, dan pemutar mulai dimuat satu layar sebelum deretan terlihat, setelah foto halaman selesai dimuat (video di ujung kanan dimuat saat digeser). YouTube (`youtube-nocookie.com`) dan TikTok (pemutar resmi `tiktok.com/player/v1`) berputar tanpa suara secara loop tanpa tombol, dan dijeda saat keluar layar. Instagram dan Facebook memakai pemutar resmi mereka di dalam kartu: Instagram tidak mengizinkan putar otomatis, jadi pengunjung mengetuk untuk memutar dan bingkai Instagram ikut tampil; Facebook mulai tanpa suara bila browser mengizinkan. Dengan reduced motion, YouTube dan TikTok menunggu diketuk. Tombol di pojok kartu membuka video di platformnya. Uji dengan `BASE_URL=http://127.0.0.1:3210 node scripts/verify-videos.mjs` pada server demo lokal dengan `CMS_DEMO_LOGIN=true` dan `TIKTOK_OEMBED_URL=http://127.0.0.1:3497/oembed`; semua pemutar dan oEmbed TikTok diganti tiruan sehingga tidak ada permintaan keluar.

## Dive Shop

Halaman `/dive-shop` menyediakan katalog **Beli alat** dan **Rental alat**, pencarian, filter kategori, serta pesanan gabungan. Rental dihitung per unit per hari (1–30 hari). Pengunjung membayar online lewat Midtrans, atau menyiapkan pesan lalu mengirim sendiri lewat WhatsApp untuk konfirmasi ukuran, harga, serta pengambilan/pengembalian.

Di beranda, panel Dive Shop punya kolom cari dan filter yang sama di tab Beli dan setiap tab Sewa (`src/shop/shop-filter.js`). Kata dicari di nama, ringkasan, deskripsi, dan kategori, tanpa peduli huruf besar atau tanda aksen. **Semua kategori** muncul kalau tab punya lebih dari satu kategori, **Urutkan** memilih Urutan toko, Harga terendah, Harga tertinggi, atau Nama A–Z (harga penawaran selalu di akhir), dan **Hanya yang tersedia** menyembunyikan alat yang ditandai tidak tersedia atau stoknya habis. Jumlah hasil tampil dengan tombol **Hapus filter**, dan tab lain yang juga punya alat dengan kata itu muncul sebagai tombol berisi jumlahnya. Kata pencarian tetap saat pindah tab, sedangkan kategori kembali ke semua. Halaman `/dive-shop` memakai pencarian, urutan, dan Hanya yang tersedia yang sama untuk Beli alat dan Rental alat. Kartu yang sendirian di baris terakhir melebar penuh dengan foto di kiri, dan dua kartu di baris terakhir berbagi barisnya.

Di beranda, banner **Servis alat selam** di bawah daftar Beli/Rental membuka `/service`. Harga "Mulai" pada banner diambil dari harga servis termurah yang aktif di CMS; judul dan teks banner ada di `src/i18n.js` (`shop.teaser.serviceBanner`).

Seksi **Cara menuju ke sini** (`#getting-here`) berada di atas toko Waisai: ilustrasi rute Sorong → kapal cepat → Waisai, tiga langkah, dan tips perjalanan. Teksnya ada di `src/i18n.js` (`home.travel*`), belum diatur dari CMS; ilustrasinya di `src/components/TravelRoute.jsx`.

Kelola katalog di `/admin/shop`: tambah/hapus maksimal 80 produk (barang jual dan barang sewa), atur harga, ketersediaan, tampilan publik, serta foto dari media library. Harga kosong berarti perlu penawaran; alat tidak tersedia tidak dapat ditambahkan. Simpan katalog agar tampil di website tanpa rebuild. Ilustrasi SVG ringan dipakai saat foto belum diisi. Data demo mendapat tujuh barang jual contoh, versi sewanya masing-masing, dan tabung untuk disewa; dokumen demo lama ditambahkan katalog sekali tanpa menghapus perubahan sebelumnya. Dokumen MySQL lama mendapat katalog kosong tanpa harga demo.

### Dive Shop dan Gudang

Produk, ukuran, dan stok diatur di satu tempat, yaitu detail produk di `/admin/shop` (`src/shop-stock.js`, `src/server/shop-stock.js`). Barang jual dan barang sewa adalah produk yang berbeda (lihat [Barang jual dan barang sewa terpisah](#barang-jual-dan-barang-sewa-terpisah)), masing-masing dengan ukuran, harga, stok per ukuran, dan fotonya sendiri.

- **Ukuran.** Di bagian **Ukuran & ketersediaan**, ketik ukuran (S, M, L, XL, 38–39, dan seterusnya, maksimal 12) lalu Enter atau **Tambah ukuran**. Ukuran milik produk itu saja, jadi barang jual dan barang sewanya bisa punya ukuran berbeda. Produk tanpa ukuran dipesan tanpa memilih.
- **Stok jual dan stok sewa.** Isi **Stok jual** di barang jual dan **Stok sewa** di barang sewa, tiap ukuran (atau satu angka untuk produk tanpa ukuran). Saat katalog disimpan, angkanya dicatat di Gudang sebagai **Koreksi stok · Stock opname** dengan catatan "Diatur dari Dive Shop". Mengisi stok mengubah Ketersediaan dari "Konfirmasi ketersediaan" menjadi **Ikuti stok gudang**.
- **Gudang ikut sendiri.** Setiap produk punya satu barang di **Gudang → Barang & stok** untuk tiap ukurannya (`item.productId`, `item.mode`, `item.size`), dengan label seperti "Dive Shop · Wetsuit 3 mm · Sewa · M". Barangnya dibuat otomatis, ikut berganti nama, dan barang buatan gudang yang belum pernah dicatat dihapus saat ukurannya atau produknya dihapus. Kolom **Produk Dive Shop** di formulir barang hanya untuk memindahkan produk ke barang yang sudah ada di gudang.
- **Stok lama.** Barang yang dibuat sebelum jual dan sewa dipisah dihitung sebagai stok jual (atau stok sewa untuk alat yang hanya disewakan, misalnya tabung). Stok sewanya mulai dari 0, jadi isi sekali di barang sewanya.
- **Website.** Dengan Ikuti stok gudang, kartu menampilkan **Tersedia**, **Sisa 3** (tiga atau kurang), atau **Stok habis**, keranjang berhenti di sisa stok, dan server menolak pesanan online yang melebihinya, per ukuran. Tab Beli memakai stok jual, tab Sewa memakai stok sewa.
- **Pembelian dan sewa.** Pembelian yang lunas lewat Midtrans menjadi **Keluar · Penjualan** "Pesanan online ZC-…" pada barang jual ukurannya, sekali per pesanan (`payment.stockRecorded`). Pembelian yang menunggu pembayaran menahan unit jualnya. Sewa tidak membuat catatan keluar masuk, tetapi memakai unit stok sewa pada tanggal sewa selama reservasinya berlaku, jadi tanggal baru atau pembatalan langsung membebaskannya. Sewa tidak pernah mengambil unit jual, dan pembelian tidak mengambil unit sewa. Tamu Comfort atau Flexi tidak bisa memindah sewa ke tanggal yang alatnya penuh.
- Pembelian lewat WhatsApp tidak mengubah stok. Catat sendiri lewat tombol Keluar. Sewa lewat WhatsApp dicatat di reservasi, bagian **Alat sewa** (lihat [Sewa alat di Dive Shop dan kalender](#sewa-alat-di-dive-shop-dan-kalender)).

### Barang jual dan barang sewa terpisah

Barang jual adalah barang baru yang dibeli tamu dan tidak kembali. Barang sewa adalah alat milik dive center yang dipinjamkan lalu kembali, dengan foto alat yang sebenarnya, harga per hari, dan stok yang dihitung per tanggal di Kalender reservasi. Karena itu satu produk hanya bisa salah satunya (`saleEnabled` atau `rentalEnabled`, tidak keduanya, dicek di `validateShop`).

- **Dua daftar.** Di `/admin/shop`, tab besar **Barang jual** dan **Barang sewa** memisahkan daftarnya, masing-masing dengan jumlah produk, pencarian, dan tombol **+ Tambah barang jual** atau **+ Tambah barang sewa**. Detail barang jual hanya berisi harga jual, stok jual, dan foto barang jual. Detail barang sewa hanya berisi harga sewa per hari, stok sewa, foto barang sewa, dan tautan **Lihat di Kalender reservasi**.
- **Model yang sama.** Barang sewa boleh menunjuk barang jual dengan model yang sama (`product.pair`, `pairOf` di `src/shop-model.js`). Di bawah detail produk ada kartu **Juga disewakan** atau **Juga dijual** dengan tombol untuk membukanya. Kalau belum ada, tombol **+ Buat barang sewa** (atau **+ Buat barang jual**) membuatnya dari produk ini: nama, kategori, deskripsi, deskripsi lengkap, spesifikasi, video, ukuran, dan teks English ikut tersalin, sedangkan foto, harga, dan stok diisi sendiri. Produk baru itu masih Draft. Di website, jendela produk menulis "Bisa juga disewa Rp… per hari" atau "Bisa juga dibeli Rp…" dari pasangannya.
- **Produk lama otomatis dipisah.** Produk yang tersimpan sebagai jual sekaligus sewa dipecah saat konten dibaca (`withSplitProducts`, `splitProducts`). Produk itu tetap barang jual dengan id, foto, dan harga jualnya. Sisi sewanya menjadi barang sewa `<id>-sewa` dengan harga sewa, foto sewa, nama, deskripsi, ukuran, ketersediaan, dan teks English yang sama. Add-on aktivitas dan kunci mode developer yang menunjuk produk itu ikut pindah ke barang sewanya. Halaman admin lama yang menyimpan produk gabungan juga dipecah saat disimpan, tanpa menggandakan barang sewa yang sudah ada.
- **Stok dan jadwal lama ikut.** Barang Gudang untuk sewa dan sewa yang sudah tercatat (pesanan online, add-on, dan alat yang dicatat tim) masih menyebut id produk jualnya. Lewat `pair` semuanya dihitung pada barang sewa (`rentalPairs` di `src/shop-stock.js`), jadi stok sewa, sisa per tanggal, dan Kalender reservasi tidak berubah. Sinkron Gudang berikutnya memindahkan barang Gudangnya ke barang sewa, walaupun namanya sudah diganti tim.

### Sewa alat di Dive Shop dan kalender

Daftar sewa yang dulu ada di **Daftar harga** (masker, snorkel, fin, scuba, tabung, dive computer, senter, pelampung, kamera) sekarang produk Dive Shop untuk disewa saja, masing-masing dengan harga per hari, foto sewa, dan stok sewanya sendiri. Pemindahannya otomatis dan sekali (`withRentalProducts` di `src/price-list.js`, penanda `priceList.rentals: "shop"`):

- Setiap item menjadi produk `sewa-…` dengan nama dan keterangan dua bahasa, harga sewa per hari dari daftar harga, dan kategori sesuai tabnya. Kategori baru **Pemberat**, **Pelampung**, dan **Kamera** ditambahkan. Katalog sekarang maksimal 80 produk.
- Ketersediaannya mulai dari **Tersedia** (bisa dipesan seperti sebelumnya). Begitu stok sewanya diisi di **Barang sewa**, ketersediaan berubah menjadi **Ikuti stok gudang** dan website berhenti di sisa stok per tanggal.
- Add-on aktivitas yang menunjuk item sewa ikut pindah ke produknya. Tab sewa di beranda (Sewa masker, snorkel & fin, sampai Sewa kamera bawah air) tetap sama, isinya produk sewa menurut kategori, lengkap dengan foto sewa, ukuran, dan sisa stok.
- Halaman admin lama yang masih menyimpan daftar sewa tetap aman: daftar itu dipindahkan saat disimpan dan produk yang sudah ada tidak digandakan.

**Kalender reservasi → Sewa alat** menampilkan alat sewa yang keluar setiap hari dibanding stok sewanya, misalnya "Masker 3/3". Hari yang alatnya penuh diberi warna. Klik tanggal untuk melihat setiap alat (disewa, sisa, penuh, atau lebih dari stok), reservasi yang memakainya, dan sisa semua alat sewa pada tanggal itu. Yang dihitung adalah sewa online (Dive Shop dan add-on aktivitas) dan alat yang dicatat tim, selama reservasinya dikonfirmasi atau pembayarannya masih berjalan (`rentalCalendar`, `gearLines` di `src/shop-stock.js`, stok dari `/api/admin/rental-gear`).

Formulir reservasi punya bagian **Alat sewa** untuk tamu dari WhatsApp atau yang datang langsung (`booking.gear`, maksimal 20 baris). Di samping setiap baris tampil sisa alat itu pada tanggal reservasi, dihitung tanpa reservasi itu sendiri. Alat yang dicatat tim menahan stok sewa seperti pesanan online, jadi website menolak sewa online yang melebihi sisa, dan tamu Comfort atau Flexi tidak bisa memindah sewa ke tanggal yang penuh.

Uji dengan `node scripts/verify-rentals.mjs` pada server demo yang dijalankan seperti untuk `verify-fares`.

### Halaman produk seperti marketplace

Setiap produk di `/admin/shop` bisa diisi seperti barang di marketplace.

- **Foto.** **Foto barang jual** dan **Foto barang sewa** terpisah, masing-masing sampai 8 foto, bisa dipilih sekaligus dari PC atau HP. Foto langsung terpasang dan tersimpan (`product.images` untuk jual, `product.rentalImages` untuk sewa). Foto pertama menjadi foto utama di kartu, dan bisa diganti lewat tombol **Utama**, digeser, atau dihapus. Tab Beli dan jendela produknya memakai foto barang jual, tab Sewa memakai foto barang sewa. Tanpa foto sewa, website menampilkan ilustrasi alat, bukan foto barang jual.
- **Video.** Sampai 4 link video YouTube, TikTok, Instagram, atau Facebook (`product.videos`) untuk memperlihatkan barang aslinya. Link pendek dibuka dulu di server.
- **Deskripsi lengkap dan tabel spesifikasi.** Deskripsi ditulis dengan Markdown sampai 20.000 karakter (`product.details`), lihat bagian berikutnya. Tabel berisi sampai 16 baris nama dan isi, misalnya Merek dan Bahan (`product.specs`). Keduanya punya versi English lewat pilihan bahasa di admin.
- **Jendela produk.** Nama atau foto di kartu membuka jendela besar (`src/shop/ProductDetail.jsx`). Isinya galeri foto dengan thumbnail, panah, dan geser di HP, lalu harga beli atau sewa, sisa stok, ukuran (yang habis ditandai), jumlah, dan cara pengambilan. Di bawahnya ada deskripsi, spesifikasi, dan video. Produk berukuran masuk keranjang lewat tombol **Pilih ukuran**, dan di keranjang setiap baris berukuran punya pilihan ukuran. Ukuran ikut ke pembayaran Midtrans, pesan WhatsApp, reservasi, dan stok.

### Deskripsi produk dari berkas .md

Zanclus menjual ulang produk merek lain, jadi deskripsi dan spesifikasinya paling tepat diambil dari halaman resmi pembuatnya. Di detail produk `/admin/shop`, bagian **Deskripsi lengkap** punya tombol **Isi dari berkas .md** (berkas .md, .markdown, atau .txt sampai 300 KB), tautan **Unduh contoh berkas .md**, dan **Lihat pratinjau** yang menampilkan deskripsi persis seperti di website. Pembacanya ada di `src/product-story.js`, tampilannya di `src/shop/ProductStory.jsx`.

- **Bagian depan.** Berkas boleh dibuka dengan bagian depan di antara dua baris `---` berisi `nama`, `deskripsi` (deskripsi singkat di kartu), `ringkasan` (spesifikasi singkat), `video` (link, dipisah koma atau ditulis sebagai daftar `- link`), dan `bahasa` (`id` atau `en`). Satu berkas boleh memuat dua bagian, satu `bahasa: id` dan satu `bahasa: en`, dan keduanya terisi sekaligus. Berkas tanpa tanda bahasa mengisi bahasa yang sedang dipilih di admin.
- **Tabel spesifikasi.** Tabel dua kolom di bawah judul seperti Spesifikasi, Specifications, atau Technical details (atau satu-satunya tabel dua kolom di berkas) dipindahkan ke **Tabel spesifikasi**, sampai 16 baris. Sisanya menjadi deskripsi lengkap.
- **Nama produk.** Judul `#` pertama tidak ikut deskripsi. Admin menampilkannya dengan tombol **Pakai sebagai nama produk**, dan `nama` di bagian depan langsung dipakai. Nama yang sudah ada tidak diganti diam-diam.
- **Tampilan publik.** Kalimat tebal yang berdiri sendiri (`**Pandangan luas. Kaca jernih.**`) menjadi banner slogan. Baris tebal pendek yang diikuti teks di baris berikutnya menjadi kartu fitur berikon, begitu juga judul `###`, butir daftar yang diawali teks tebal, dan `**Judul** teks` di bawah judul seperti Fitur, Keunggulan, Features, atau Highlights. Ikonnya dipilih dari judul fitur (lensa, silikon, tali, ringan, baterai, kedalaman, atau bintang). Kartu fitur yang sendirian di barisnya melebar penuh. Judul `##` dan `###`, daftar, kutipan, dan tabel lain tampil rapi tanpa garis pemisah. Garis `---` di tengah isi dan gambar diabaikan, dan link hanya yang `https://`, dibuka di tab baru. Teks tidak pernah dibaca sebagai HTML.
- **Simpan.** Mengisi dari berkas hanya mengubah isian di layar, jadi tekan **Simpan katalog Dive Shop** setelahnya.

### Pengambilan dan pengantaran

Atur di `/admin/shop`, bagian **Pengambilan & pengantaran** (`shop.delivery`). Pilihannya ambil sendiri di dive center beserta keterangannya, dan antar ke alamat dengan daftar wilayah dan ongkosnya (sampai 12 wilayah, 0 berarti gratis). Keterangan ditulis dalam dua bahasa. Saat checkout di beranda dan `/dive-shop`, tamu memilih ambil sendiri atau diantar. Kalau diantar, tamu memilih wilayah dan mengisi alamat. Ongkos antar menjadi baris sendiri di total dan di Midtrans ("Ongkos antar Waisai kota"), dan wilayah serta alamatnya tercatat di catatan reservasi dan pesan WhatsApp. Katalog lama otomatis hanya memakai ambil sendiri.

### Ukuran foto terbaik

Setiap tombol unggah foto di admin menyebut ukuran terbaiknya (`src/admin/photo-guide.js`), misalnya sampul beranda 1920 × 1080 px (16:9), foto kartu dan galeri beranda 1200 × 800 px (3:2), foto banner event 2400 × 1200 px (2:1, objek utama di kanan), foto produk 1200 × 1200 px (1:1), dan logo mitra PNG transparan dengan lebar minimal 600 px. Foto yang lebih besar tetap bisa diunggah, karena browser mengecilkannya dulu (sisi terpanjang maksimal 2400 px).

Uji dengan `node scripts/verify-shop-market.mjs` pada server demo yang dijalankan seperti untuk `verify-fares`.

## Banner event di beranda

Banner promosi foto yang lebar tampil di bagian **Temukan petualanganmu**, antara judul “Ada cerita untuk setiap level.” dan kartu Diving, Snorkeling, dan Trip laut. Banner selebar seksi lain, sejajar dengan judul dan kartu di bawahnya. Fotonya mengisi seluruh banner dan bergerak pelan. Di kirinya tampil label, tanggal, judul besar, lokasi, fakta trip, harga per orang, dan satu tombol. Banner tampil selama dinyalakan dan dalam rentang tanggalnya.

**Cara mengatur.** Buka `/admin/events` → tab **Banner event**. Isi setiap banner:
- **Foto banner**: mengisi seluruh banner, terbaik 2400 × 1200 px dengan objek utama di sisi kanan karena tulisannya di kiri. Di-upload dari PC atau HP, langsung terpasang dan tersimpan. Tanpa foto, banner memakai latar laut biru.
- **Teks**: judul, keterangan singkat, catatan (mis. `Harga spesial`), dan label kecil (bawaan `EVENT`), dalam Indonesia dan English. Keterangan singkat yang dipisah tanda `·` dibaca sebagai lokasi lalu fakta, misalnya `Raja Ampat The Last Paradise · 8 hari 7 malam · 15 log dive` menjadi lokasi dengan ikon pin dan dua chip fakta, ditambah chip minimal peserta.
- **Harga per orang (Rp)** dan **Minimal peserta**. Harga selalu tampil dalam rupiah (`Rp 27.500.000 / orang`, di English `IDR 27,500,000 / person`) dengan catatannya di atas, dan minimal peserta menjadi chip fakta.
- **Tanggal**: tanggal mulai dan selesai event, serta tanggal mulai tampil (opsional).
- **Link tombol**: opsional. Bila kosong, tombolnya membuka formulir pendaftaran.

Simpan dengan **Simpan kalender**.

**Kapan banner tampil.** Banner hanya muncul bila **Tampilkan di beranda** dicentang. Banner tampil mulai **Mulai tampil** (atau langsung) sampai **Tanggal selesai** event, menurut tanggal WIT, lalu hilang sendiri. Tanpa tanggal selesai, banner tampil sampai dimatikan. Maksimal 2 banner tampil bersamaan, yang bertanggal lebih dulu. Label di admin menunjukkan statusnya: *Tampil sekarang*, *Terjadwal / selesai*, atau *Tidak tampil*.

**Yang dilihat tamu.**
- Satu tombol **Daftar sekarang** yang membuka formulir pendaftaran event (atau **Info lengkap** bila link diisi). Seluruh banner, fotonya juga, bisa diklik dan melakukan hal yang sama. Event tanpa tanggal menampilkan *Pilih tanggalmu sendiri*.
- Formulir berisi nama, WhatsApp, email (opsional), jumlah peserta (paling sedikit minimal peserta), tanggal mulai bila event belum bertanggal, dan catatan, dengan perkiraan biaya harga per orang × peserta.
- Pendaftaran tersimpan di **Kalender reservasi** sebagai **Trip laut** dari Website yang menunggu konfirmasi, dengan nilai harga × peserta dan catatan nama event (`/api/events`, `src/event-signup.js`). Harga, minimal peserta, dan tanggal diambil dari banner di server. Setelah terkirim, tamu mendapat kode pendaftaran dan tombol untuk mengabari tim lewat WhatsApp.

**Ukuran.** Tinggi banner sekitar 380 px di desktop. Di HP fotonya di atas dan tulisan di bawahnya, dengan harga di atas tombol yang selebar banner.

**Banner bawaan.** *Dive Trip with Zanclus* (8 hari 7 malam, 15 log dive) menyala sejak awal dengan harga spesial Rp 27.500.000 per orang, minimal 4 orang, dan foto penyelam dan penyu milik pemilik sebagai foto banner. Banner yang masih memakai flyer bawaan beralih ke foto itu sekali. Tanpa tanggal, tamu memilih tanggal mulainya. Konten lama dibawa sekali oleh `withCalendar`. Dive Trip yang masih memakai harga dolar mendapat harga rupiah dan minimal pesertanya, dan bila belum pernah diubah langsung dinyalakan. Dua banner foto yang sempat dipasang sehari diambil lagi bila belum diubah.

## Halaman aktivitas

Halaman `/diving`, `/snorkeling`, dan `/trip` menyediakan gambaran kegiatan, durasi, peserta, titik temu, daftar paket & harga, alur aktivitas, persiapan, dan pertanyaan umum. Ketiga kartu di seksi Pengalaman pada beranda langsung membuka halaman detail. Tidak ada seksi aktivitas tambahan di beranda. Navigasi halaman detail dan footer juga menghubungkan ketiga halaman.

### Kalender & slot harian

Di samping isi halaman (di ponsel: di bawahnya) ada **kalender tanggal kegiatan**. Panel formulir “Ayo susun rencana” dan kalender kegiatan di bawah halaman diving sudah dihapus.

- **Slot per hari.** Setiap tanggal menampilkan sisa slot. Diving menerima **30 orang per hari**. Slot ini dipakai bersama oleh semua program diving dan kursus selam. Tanggal dengan ≤5 slot ditandai *Hampir penuh*. Tanggal penuh dan tanggal yang ditutup di kalender admin tidak bisa dipilih.
- **Yang mengurangi slot:** reservasi **Dikonfirmasi** dan pembayaran online yang sedang **Menunggu** pembayaran. Pengajuan tanpa pembayaran, pembayaran gagal/kedaluwarsa, dan reservasi batal tidak mengurangi slot.
- **Kuota bisa diatur.** Ubah di `/admin/activities` → **Kuota peserta per hari** (0 = tanpa batas). Snorkeling dan Trip laut bawaannya tanpa batas.
- **Server ikut memeriksa.** Pembayaran untuk tanggal penuh, atau yang pesertanya melebihi sisa slot, ditolak dengan pesan jelas. Pemeriksaan dilakukan di dalam kunci penyimpanan, sehingga dua tamu bersamaan tidak bisa melewati kuota.
- **Kegiatan dan bulan terbaik.** Titik pada tanggal menandai kegiatan dari `/admin/events`; memilih tanggal menampilkan daftarnya. Di halaman diving, di bawah kalender ada **Bulan terbaik untuk diving**: 12 bulan dengan penilaian dan catatan bulan yang sedang dilihat.

Tanggal yang dipilih menjadi tanggal checkout.

### Keranjang & checkout

Paket ditambahkan dari kartu **Paket & harga**. Bilah keranjang muncul di bawah isi halaman setelah paket pertama ditambahkan. Tombol **Checkout** di bilah itu, atau **Checkout untuk tanggal ini** di kalender, membuka **jendela checkout** di atas halaman: paket dipilih, data tamu, ringkasan, lalu pembayaran Midtrans atau WhatsApp. Jika aktivitas belum punya paket berharga, bilah menampilkan tombol **Isi rencana** untuk mengirim rencana lewat WhatsApp.

Kelola judul halaman, ringkasan, foto/caption, harga mulai per orang, informasi kegiatan, langkah perjalanan, dan FAQ melalui `/admin/activities`. Foto sampul halaman dan foto kartu pengalaman memiliki pengaturan terpisah. Kartu beranda menggunakan ringkasan, harga, durasi, dan status aktif dari halaman yang sama. Atur juga **Kuota peserta per hari** untuk kalender slot. Nonaktifkan halaman untuk menyembunyikan kartu/tautannya dan mengembalikan 404 pada URL tersebut. Dokumen CMS lama mendapat halaman default tanpa menghapus konten atau reservasi sebelumnya; tidak ada harga aktivitas baru yang diisi otomatis. Mode demo menandai aktivitas dan alur sebagai contoh. Foto default adalah visual konsep, dapat diganti melalui media library. `/admin/experiences` tetap mengatur program diving untuk kuis dan formulir rencana.

## Foto & efek scroll

Beranda menggunakan foto berbeda untuk sampul, Diving, Snorkeling, Trip Laut, lima foto galeri, dan dua kartu Jelajahi Laut. Halaman detail memiliki sampul tersendiri; Dive Shop memakai foto konsep perlengkapan. Tiga belas visual tambahan di `public/assets/photos` dibuat dengan image generation sebagai ilustrasi, bukan dokumentasi kegiatan atau destinasi Zanclus. WebP lokal, varian resolusi kecil, dan lazy loading menjaga ukuran unduhan. Ilustrasi katalog tetap berbeda sesuai jenis alat dan dapat diganti dengan foto produk asli melalui CMS.

**Foto unggahan seukuran layar.** Foto dari panel disimpan sampai 2400 px. `/api/media/<id>?w=480|828|1280|1920` membuat salinan WebP yang lebih kecil sekali (sharp, yang ikut terpasang bersama Next.js, satu foto sekaligus), menyimpannya di folder sementara (`MEDIA_CACHE_DIR`, bawaannya `/tmp/zanclus-image-cache`), dan mengirimnya dengan cache setahun. `photoSrcSet` memberi `srcset` itu pada sampul beranda, kartu laut, galeri, kartu dan jendela produk, banner event, sampul aktivitas, kursus, servis, dan Tentang kami, jadi HP mengunduh salinan 828 px (sekitar 85 KB, dari sekitar 500 KB). Tanpa sharp atau bila salinan gagal, foto asli dikirim seperti sebelumnya. Foto bawaan di `public/assets` disimpan browser sehari (`stale-while-revalidate` 30 hari, `next.config.mjs`); ganti nama berkas bila perlu tampil seketika.

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

Buka `/admin`. Password admin bisa diganti di **Ubah password** dengan kode OTP yang dikirim ke email, dan bisa direset dari halaman login (**Lupa password?**). Pengiriman email memakai SMTP dari hPanel (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, opsional `ADMIN_OTP_EMAIL`). SMTP yang sama mengirim email tamu: pesanan dengan batas bayar, invoice setelah lunas, dan pembatalan saat batas bayar lewat, untuk pesanan website maupun reservasi WhatsApp yang ditagih dari admin ([CMS-HOSTINGER.md](./CMS-HOSTINGER.md#email-tamu--invoice); uji dengan `node scripts/verify-guest-mail.mjs`); lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md#ganti-password-dengan-kode-otp-email). Untuk produksi, aktifkan `CMS_MODE=mysql` dan setup kredensial admin/database melalui environment server; lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md). Panel menyediakan overview, kalender, CRUD reservasi, tamu, teks website, upload media, pengalaman/harga, dan kontak. Mode MySQL tidak memiliki password default. Konten publik dibaca saat request agar perubahan tidak memerlukan rebuild.

Tes integrasi CMS membutuhkan database lokal terpisah dengan nama berakhiran `_test`, kredensial admin pengujian, dan server berjalan. Jalankan `node scripts/verify-cms.mjs` dengan environment yang sesuai. Jangan menjalankan tes ini pada database produksi; tes mereset tabel pada database `_test`, membuat/menghapus catatan, dan mengubah konten sementara. Gunakan database kosong khusus pengujian.

Untuk diagnosis produksi, gunakan tombol **Periksa koneksi database** pada login admin. Email/password admin wajib benar; pemeriksaan berjalan di server aplikasi dan tidak menampilkan password atau mengubah data. Detail ada di panduan CMS.

Tes diagnosis menggunakan `scripts/verify-database-check.mjs` dengan `BASE_URL` server database yang benar dan `BAD_DATABASE_BASE_URL` server dengan password database sengaja salah (`wrong-local-db-password` hanya untuk tes lokal). Kedua server memakai kredensial admin pengujian yang sama dan MySQL lokal `_test`. Jalankan tes ini sebelum tes CMS yang mereset data; tes diagnosis memastikan snapshot data tidak berubah, akses tanpa kredensial ditolak, kode/host runtime benar, dan batas pemeriksaan bekerja. Tes diagnosis tidak memerlukan WhatsApp atau server Hostinger.

## Peran dan pengguna (CMS per kategori)

Menu admin dikelompokkan per kategori (meja harian, Situs web, PR & mitra, HRD, Keuangan, Gudang, Sistem, Pengguna & peran) dan setiap akun punya satu peran: **Superadmin** (owner, developer, manager: semua menu), **HRD**, **Finance** (pembayaran online dan keuangan), **Gudang**, atau **PR** (media sosial, website, reservasi, kalender mitra). Peran ditetapkan di `src/roles.js`, yang dipakai sidebar untuk menyusun menu dan setiap route `/api/admin/*` untuk menolak peran lain dengan 403. Superadmin membuat akun di `/admin/users` (**Pengguna & peran**); akun dari hPanel selalu superadmin. Modul **HRD** sudah berisi Pegawai (data, gaji, tunjangan, potongan, BPJS, rekening), Absensi harian dengan rekap bulanan, dan Slip gaji bulanan yang bisa dikunci setelah dibayar, masing-masing dengan unduhan Excel (`src/hr-model.js`, `src/server/xlsx.js`, `/api/admin/hr/*`). Modul **Keuangan** berisi Buku kas (pembayaran Midtrans yang lunas masuk otomatis), Laba rugi dua belas bulan per kategori, dan rekap pajak dengan tarif yang bisa diatur (`src/finance-model.js`, `/api/admin/finance/*`). Modul **Gudang** menghitung stok tiap barang dari catatan masuk/keluar/koreksi dengan peringatan stok menipis (`src/inventory-model.js`, `/api/admin/inventory/*`). **Kalender konten** untuk PR merencanakan konten per platform dari ide sampai tayang dan mencatat angka hasilnya (`src/content-plan-model.js`, `/api/admin/social/*`). Semua modul punya unduhan Excel dan menyimpan record di tabel yang sama. Rincian di [CMS-HOSTINGER.md](./CMS-HOSTINGER.md#peran-dan-pengguna). Uji dengan `node scripts/verify-users.mjs`, `node scripts/verify-hr.mjs`, dan `node scripts/verify-modules.mjs` pada server demo yang dijalankan seperti untuk `verify-password`.

## Google Search Console

`/sitemap.xml` (`app/sitemap.js`, halaman publik ID/EN dengan hreflang) dan `/robots.txt` (`app/robots.js`) dibuat dari konten CMS. Link kanonik, hreflang, dan gambar share memakai alamat lengkap dari `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, atau bawaan `https://zanclusdivecenter.com` (`src/seo.js`). Beranda memuat data bisnis schema.org. Search Console memakai properti Domain yang diverifikasi lewat catatan TXT di DNS. Untuk properti Awalan URL, tag verifikasi bisa ditempel di admin **Situs web → SEO & Search Console** dan tampil sebagai `<meta name="google-site-verification">` di semua halaman. Langkah lengkap di [CMS-HOSTINGER.md](./CMS-HOSTINGER.md#google-search-console). Uji dengan `node scripts/verify-seo.mjs`.

## Daftar harga paket

Seksi Pengalaman di beranda berupa akordeon tiga kartu (Diving, Snorkeling, Trip laut) dengan daftar harga paket. Judul di atas setiap daftar (**PRICE LIST 2026** / **DAFTAR HARGA 2026**) memakai tahun dari `/admin/prices` → **Tahun di judul daftar harga** (`priceList.year`, 2020–2100). Daftar tanpa tahun yang disimpan memakai 2026 (`defaultPriceYear`). Bawaannya kartu Diving terbuka lebar dengan panel harganya; saat pointer atau fokus keyboard berada di kartu lain, kartu itu melebar dengan animasi dan menampilkan harganya, sementara kartu lain menyempit. Saat pointer keluar dari seksi, Diving kembali terbuka. Di layar ≤860px kartu bertumpuk dengan daftar harga masing-masing terbuka, dan bergulir seperti tumpukan yang terlipat. Setiap kartu menempel setelah dibaca sampai bawah (atau di bawah header bila muat di layar), lalu kartu berikutnya naik menutupinya sementara kartu itu terlipat ke belakang, sedikit mengecil, dan meredup. Yang berubah saat menggulir hanya variabel CSS `--stick` dan `--fold` (`useFoldingStack` di `src/HomePage.jsx`), jadi halaman tidak melompat, termasuk di iPhone. Dengan pengaturan kurangi gerakan, kartu tetap menumpuk tanpa lipatan. Panel yang tertutup bersifat `inert` sehingga dilewati keyboard dan pembaca layar. Setiap daftar berisi maksimal 8 item (nama, keterangan, harga rupiah, satuan) dalam Bahasa Indonesia dan English, dikelola di `/admin/prices` (**Daftar harga**). Dokumen CMS lama mendapat daftar harga default sekali. Aktivitas yang dinonaktifkan tidak ditampilkan di panel.

Daftar setiap aktivitas berisi layanan utamanya. Alat dan layanan lain ditawarkan sebagai **add-on** (`priceList.addOns`, per aktivitas, maksimal 16): alat sewa Dive Shop (`shop:` dan id produknya), item daftar aktivitas lain, atau daftar **Layanan tambahan** (`extras`) yang hanya tampil sebagai add-on. Alat sewa sebagai add-on disewa untuk tanggal aktivitasnya dan memakai stok sewanya, sama seperti sewa di Dive Shop. Produk yang punya ukuran disewa lewat Dive Shop, tidak sebagai add-on. Setiap item punya `id` tetap (dari daftar dan namanya, atau dibuat saat ditambahkan di admin), sehingga add-on tidak bergeser saat daftar diurutkan atau item diganti nama. Konten lama dipindahkan sekali oleh `withPriceList` (`src/price-list.js`). Perlengkapan scuba, tabung, dive computer, dan dokumentasi keluar dari daftar diving ke daftar asalnya dan menjadi add-on diving bersama kamera sewa. Lihat [CMS-HOSTINGER.md](./CMS-HOSTINGER.md#daftar-harga-add-on-dan-slot-di-keranjang).

## Booking

Pengunjung membuka formulir booking dari tombol hero atau bagian kontak, memilih program dan tanggal, lalu mengisi nama, nomor WhatsApp, jumlah peserta, dan catatan. Permintaan tersimpan di CMS dengan sumber **Website** dan status **Belum dikonfirmasi**. Ringkasan memuat nomor referensi yang juga terlihat di daftar reservasi admin; pengunjung dapat mengunduhnya atau melanjutkan ke WhatsApp.

Tanggal menggunakan WIT (Asia/Jayapura), mulai hari ini sampai 365 hari ke depan. Penutupan tanggal di kalender admin berlaku pada program dan rentang tanggal terkait; permintaan pada tanggal tertutup ditolak dengan pesan yang jelas. Pengajuan masih perlu konfirmasi jadwal, biaya, dan kondisi laut oleh tim. Kuota harian (diving 30 orang) diperiksa saat pengajuan dan pembayaran; lihat **Kalender & slot harian**. Pembayaran langsung tersedia di formulir halaman aktivitas bila diaktifkan (lihat di bawah). Nilai reservasi awal Rp0 adalah nilai pencatatan yang belum diisi, bukan penawaran gratis.

API publik `/api/bookings` hanya mengembalikan rentang tanggal yang ditutup dan bukti pengajuan tanpa identitas tamu. Pengiriman ulang memakai ID permintaan yang sama untuk mencegah duplikasi. Formulir membatasi peserta, memvalidasi nomor kontak dan tanggal di server, serta membatasi percobaan pengajuan. Di mode demo data tersimpan pada penyimpanan demo yang sama dengan CMS (gunakan data contoh); di mode MySQL data masuk ke tabel CMS yang sudah ada. Tidak perlu environment variable tambahan atau mengimpor ulang SQL.

### Kalender reservasi dan booking manual

`/admin/calendar` menampilkan bulan di kiri dan **Agenda** tanggal yang dipilih di kanan (`src/admin/MonthCalendar.jsx`, `src/calendar-day.js`). Di HP, agenda ada di bawah kalender dan digulir ke layar saat tanggal diketuk.

- **Kalender.** Setiap tanggal menunjukkan jumlah orang yang berkegiatan dan nama tamunya, berwarna menurut status (Dikonfirmasi, Belum dikonfirmasi, Lunas, Agen, Tutup). Ketuk di mana saja pada tanggal untuk membukanya di Agenda. Mengetuk nama di kalender juga menandai orang itu di Agenda.
- **Agenda.** Siapa saja yang berkegiatan pada hari itu, dikelompokkan per kegiatan (Diving, Snorkeling, Trip laut, Kursus, Dive Shop, Servis). Ada jumlah orang, hari ke berapa dari trip yang lebih dari sehari, sumber, status, dan tombol WhatsApp kalau nomornya ada. Ada juga kelompok **Sewa alat** (siapa menyewa apa, dari pesanan online, add-on aktivitas, atau alat yang dicatat tim), **Agen & OTA**, dan **Ditutup**. Mengetuk nama membuka reservasinya di formulir lengkap. Reservasi yang dibatalkan tidak tampil. Tampilan **Sewa alat** tetap menampilkan sisa alat sewa per hari di panel yang sama.
- **Catat booking tanggal ini.** Formulir singkat di Agenda untuk booking dari WhatsApp atau tamu yang datang langsung. Isinya nama tamu atau grup, kegiatan, jumlah orang, sampai tanggal, WhatsApp, status (bawaan Dikonfirmasi), sumber (bawaan WhatsApp), dan catatan. Booking langsung tersimpan dan tampil di Agenda. **Formulir lengkap** membawa isian itu ke formulir lengkap, untuk email tamu, nilai, alat sewa, dan tagihan. **Tutup tanggal ini** membuka formulir lengkap dengan status Ditutup.
- **Formulir lengkap hanya saat diminta.** Halaman kalender tidak lagi menampilkan formulir lengkap di bawah kalender, karena booking biasa dicatat dari Agenda. Formulir muncul tepat di bawah kalender saat **Formulir lengkap**, **Tutup tanggal ini**, atau **Catat sewa tanggal ini** ditekan, atau saat nama tamu diketuk untuk mengubah reservasinya, lalu hilang lagi setelah disimpan atau ditutup dengan **Tutup**. Isinya dikelompokkan menjadi Kegiatan dan tanggal, Tamu, Nilai dan catatan, Alat sewa, lalu Pembayaran & email tamu.
- **Satu halaman untuk reservasi.** Halaman Reservasi digabung ke Kalender reservasi dan menunya dihapus. **Daftar reservasi** (semua reservasi, dengan pencarian, filter status, **Edit**, dan **Hapus**) ada di bawah kalender, lalu panel Tempel jadwal. Alamat lama `/admin/reservations` dialihkan ke `/admin/calendar#daftar-reservasi`. Reservasi di lonceng notifikasi, catatan booking di pojok, dan tombol **Buka di panel** di email tim membuka **pemberitahuan singkat** (`BookingNotice`, `/admin/calendar?booking=<id>` dari email): kegiatan, tanggal, peserta, kontak, nilai, pembayaran, catatan, dan satu tombol sesuai keadaannya (`noticeKind` di `src/booking-notice.js`). Permintaan tanpa pembayaran mendapat **Konfirmasi booking**, transfer bank dari website **Transfer sudah masuk, konfirmasi** (tercatat lunas, invoice ke tamu), sedangkan pembayaran online yang berjalan dan booking yang sudah dikonfirmasi hanya ditampilkan. Formulir lengkap tetap dibuka lewat **Edit** di Daftar reservasi, nama tamu di Agenda, atau `/admin/calendar?ubah=<id>`.
- **Nilai dari paket.** Di formulir lengkap, bagian Nilai dan catatan punya **Paket dari daftar harga** (`src/booking-price.js`, `src/admin/BookingPackages.jsx`). Pilihannya Program diving, Diving, Snorkeling, Trip laut, Layanan tambahan, Kursus selam, Sewa alat Dive Shop, Barang Dive Shop, dan Servis alat, dengan kelompok program reservasi di urutan pertama. Jumlah awal mengikuti satuannya (per orang mengikuti peserta, per hari mengikuti lama reservasi, per malam satu kurang, lainnya 1) dan bisa diubah. Selama **Hitung dari paket** dicentang, Nilai reservasi adalah total paket dan dihitung ulang di server. Tanpa centang, nilainya diketik sendiri, misalnya setelah diskon (`booking.amountManual`). Paket disimpan dengan nama, harga, dan satuannya saat dipilih (`booking.packages`, maksimal 20), jadi perubahan harga nanti tidak mengubah reservasi lama. Kolom nilai menerima 1.500.000, Rp 1.500.000, atau 1500000.
- **Pesan galat yang jelas.** Jawaban server yang bukan dari website (misalnya halaman galat hosting saat aplikasi dimulai ulang atau terlalu lama) menyebut kodenya dan meminta memeriksa dulu apakah perubahan sudah tersimpan. Koneksi yang putus diberi pesan sendiri. Di mode demo, galat apa pun saat menyimpan dicatat utuh di log runtime (`CMS demo failure`) dan jenisnya ikut di pesan, misalnya "Penyimpanan belum dapat diakses (ENOSPC)".
- **Tulisan panel lebih besar.** Ukuran huruf panel naik sekitar 2 px (teks biasa 16 px), judul tetap.
- **Perbarui kalender agen & OTA.** Tombol di kepala kalender (selalu tampil, juga untuk peran yang tidak membuka halaman Agen) membaca ulang semua kalender agen dan OTA sekarang, tanpa menunggu 30 menit (`POST /api/admin/agents/sync`, peran yang membuka reservasi). Pemberitahuan menyebut jumlah kalender dan acara yang terbaca, dan kalender yang gagal disebut namanya beserta alasannya. Bila belum ada kalender yang tersambung, pemberitahuannya menunjuk ke **PR & mitra → Agen & kalender**.
- **Menu di pojok kanan atas.** Notifikasi dan menu akun tertutup saat mengetuk di mana saja di luarnya, atau dengan tombol Esc (`src/admin/useOutsideClose.js`).

Uji dengan `node scripts/verify-calendar-day.mjs` pada server demo.

### Tempel jadwal dari WhatsApp

Di **Kalender reservasi**, panel **Tempel jadwal** mengubah jadwal yang ditempel dari WhatsApp atau catatan menjadi reservasi, satu trip per baris (`src/schedule-paste.js`, `src/admin/SchedulePaste.jsx`). Contoh yang terbaca: `29 Okt sd 01 Nov (12 Divers)`, `15-19 Nov (2 Divers)`, `30 nov - 05 des (2 Divers) Keluarga Budi`, `3 Nov s/d 5 Nov 2026 4 pax`, `12 November (5 divers)`.

- **Tanggal.** Nama bulan Indonesia atau Inggris, lengkap atau singkat (Okt, Agu, Des, Oct, Dec). Pemisah sd, s/d, s.d., sampai, hingga, to, atau tanda hubung. Tanggal selesai ikut dihitung sebagai hari trip. Tanpa tahun, dipakai tahun ini, kecuali tanggalnya sudah lewat lebih dari sebulan (berarti tahun depan). 30 Des sd 3 Jan menyeberang ke tahun berikutnya. Kalau tanggal selesai lebih awal dari tanggal mulai di bulan yang sama (27 Des sd 01 Des), dibaca sampai bulan berikutnya dan diberi peringatan untuk diperiksa.
- **Peserta dan nama.** Angka sebelum divers, penyelam, pax, orang, tamu, atau peserta menjadi jumlah peserta (1–100). Sisa teks menjadi nama grup, atau "Grup 12 penyelam" kalau kosong. Kata snorkel, trip atau pulau, dan kursus atau open water memilih pengalamannya, selain itu Diving.
- **Periksa dulu.** Setiap baris tampil dengan tanggal, lama hari, dan isian Mulai, Selesai, Pengalaman, Peserta, dan Nama grup yang bisa diubah, plus centang untuk melewatinya. Status (bawaan Dikonfirmasi) dan sumber (bawaan WhatsApp) berlaku untuk semua. Baris yang tidak terbaca ditandai dan dilewati.
- **Simpan sekaligus.** **Simpan N reservasi** menyimpan semuanya dengan catatan "Dari jadwal yang ditempel." dan baris aslinya, tanpa email ke tamu. Trip yang tanggal dan jumlah pesertanya sudah ada di kalender tidak dicentang, jadi menempel dua kali tidak menggandakan. Reservasi Dikonfirmasi langsung memakai kuota harian di halaman aktivitas.

Uji dengan `node scripts/verify-schedule-paste.mjs` pada server demo.

Pengujian alur booking: `BASE_URL=http://127.0.0.1:3202 node scripts/verify-booking.mjs`. Jalankan hanya pada server lokal dengan data uji; mode MySQL memerlukan database khusus berakhiran `_test`.

## Pembayaran online (Midtrans)

Saat pembayaran online aktif, **semua pemesanan dibayar lewat Midtrans**:

- **Paket Diving, Snorkeling, Trip laut**: seperti Dive Shop. Setiap kartu di **Paket & harga** punya tombol **Keranjang** (lalu − / + untuk jumlah), dan bilah keranjang di bawah daftar harga menampilkan jumlah paket, total, serta tombol **Checkout** yang membuka jendela checkout. Jendela itu menampilkan **Paket dipilih** (bisa diubah atau ditambah dari pilihan **+ Tambah paket…**, dan add-on dari **Mau tambah sesuatu?**), kalender **Tanggal & slot** dengan sisa slot setiap hari, lalu tiga langkah **Isi data → Ringkasan → Pembayaran**. Paket per orang mengikuti jumlah peserta; beberapa paket dibayar dalam satu transaksi. Add-on dibayar bersama minimal satu paket utama. Pembayaran online dibatasi 30 peserta dan sisa slot tanggal yang dipilih.
- **Dive Shop** (keranjang di beranda dan halaman `/dive-shop`): beli dan sewa alat dalam satu pembayaran; sewa dihitung harga per hari × lama sewa. Jika ada alat yang harganya dikonfirmasi tim (tanpa harga), pesanan itu dikirim lewat WhatsApp. Alat yang mengikuti stok gudang diperiksa sisa stoknya (lihat [Dive Shop dan Gudang](#dive-shop-dan-gudang)).
- **Kursus selam** (`/course`): harga kursus × jumlah peserta (1–20). Halaman kursus tidak punya panel samping lagi. Tombol **Pilih kursus ini** membuka jendela pendaftaran lengkap:
  - **Jadwal & peserta**: tanggal mulai (dengan sisa slot diving harian) dan jumlah peserta.
  - **Data peserta utama**: nama, tanggal lahir (dicek terhadap syarat usia kursus, mis. 12+), kewarganegaraan, WhatsApp, dan email (wajib, untuk sertifikasi).
  - **Pengalaman & kesehatan**: lisensi, jumlah penyelaman, kemampuan berenang, dan kondisi kesehatan (kondisi medis wajib dijelaskan di catatan).
  - **Perlengkapan & penjemputan**: ukuran wetsuit dan kaki, penginapan, bahasa pengantar, dan catatan.

  Setelah ringkasan, tamu yang yakin memilih **Yakin? Bayar penuh Rp …**. Yang belum yakin memilih **Belum yakin? Tanya dulu lewat WhatsApp**. Jawaban pendaftaran ikut tersimpan di catatan reservasi.
- **Servis alat** (`/service`): jumlah harga servis yang dipilih.

Setiap formulir menampilkan ringkasan dan tombol **Bayar Rp …** yang membuka halaman pembayaran Midtrans (QRIS, e-wallet, virtual account, kartu, dll. sesuai akun Midtrans). Tamu yang masih ragu memilih **Masih ragu? Kirim lewat WhatsApp** dengan ringkasan yang sama. Selama pembayaran online belum aktif, semua formulir tetap berakhir di WhatsApp seperti sebelumnya. Harga selalu dihitung ulang di server dari CMS, bukan dari browser. Pesanan Dive Shop, kursus, dan servis tercatat sebagai reservasi **Dive Shop**, **Kursus selam**, dan **Servis alat** pada tanggalnya (sewa: tanggal mulai sampai selesai; beli saja: tanggal pemesanan); pesanan Dive Shop dan servis tidak dikirim ke kalender travel agent.

Saat tombol bayar ditekan, reservasi tersimpan dengan status **Belum dikonfirmasi** dan pembayaran **Menunggu**. Begitu Midtrans mengirim notifikasi lunas (`settlement`, atau `capture` dengan fraud `accept`), reservasi otomatis menjadi **Dikonfirmasi** pada tanggal kegiatan yang dipilih, tampil dengan tanda ✓ di kalender reservasi, dan masuk riwayat di `/admin/payments`. Pembayaran kedaluwarsa atau gagal membatalkan reservasinya. Notifikasi wajib bertanda tangan SHA512 yang sah, jumlahnya harus sama dengan tagihan, dan status lunas dicek ulang ke API Midtrans. Jika notifikasi terlambat, tombol **Cek status** di riwayat pembayaran menarik status terbaru.

Aktifkan dari `/admin/payments` setelah environment berikut diisi di hPanel (lalu deploy ulang):

| Variabel | Isi |
| --- | --- |
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard Midtrans (Settings → Access Keys), dan hanya key itu. Mulai dengan key sandbox `SB-Mid-server-…`. |
| `MIDTRANS_PRODUCTION` | Variabel tersendiri berisi `true`, hanya saat memakai server key production (`Mid-server-…`). Kosongkan untuk sandbox. Jangan ditulis di belakang server key. |
| `NEXT_PUBLIC_SITE_URL` | Disarankan, mis. `https://zanclusdivecenter.com`, agar Midtrans kembali ke domain yang benar. |

Di dashboard Midtrans isi **Payment Notification URL** dengan `https://domain-kamu/api/payments/midtrans`. Halaman kembali `/payment/finish` dikirim otomatis pada setiap transaksi; mengisinya juga sebagai Finish Redirect URL tidak masalah. Pembayaran sungguhan (`MIDTRANS_PRODUCTION=true`) ditawarkan dengan `CMS_MODE=mysql`, atau dengan penyimpanan demo di folder akun hosting (`~/zanclus-cms-data`, tetap ada saat deploy ulang). Bila penyimpanan demo jatuh ke folder sementara (`/tmp`), tombol bayar disembunyikan dan `/admin/payments` menjelaskan alasannya. Halaman itu juga menyebut folder tempat pesanan dan pembayaran disimpan, yang sebaiknya dicadangkan berkala. Tidak ada tabel baru; data pembayaran tersimpan di catatan reservasi.

**Jika tamu melihat "Pembayaran belum bisa dibuat"**, buka `/admin/payments`. Di sana tampil peringatan bila server key keliru (Client Key, atau key sandbox/production tidak sesuai mode), **penolakan terakhir dari Midtrans** beserta kodenya, dan tombol **Tes koneksi Midtrans** untuk mengecek server key langsung dari server website. Kode 401 berarti server key ditolak: pakai Server Key (bukan Client Key), key sandbox berawalan `SB-Mid-server-` tanpa `MIDTRANS_PRODUCTION`, key production berawalan `Mid-server-` dengan `MIDTRANS_PRODUCTION=true`, tanpa spasi atau tanda kutip, lalu deploy ulang. Tanda kutip atau spasi di awal/akhir key diabaikan otomatis. Teks lain yang ikut tertempel di kolom key (misalnya `=true)` dari `MIDTRANS_PRODUCTION=true`) disebut di halaman itu, begitu juga isi `MIDTRANS_PRODUCTION` selain `true`. Halaman itu juga menampilkan empat karakter terakhir key yang dibaca server, untuk memastikan perubahan di hPanel sudah sampai setelah deploy ulang.

Uji tanpa menghubungi Midtrans: jalankan server demo dengan `CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false MIDTRANS_SERVER_KEY=SB-Mid-server-TEST MIDTRANS_SNAP_URL=http://127.0.0.1:3499 MIDTRANS_API_URL=http://127.0.0.1:3499`, lalu `BASE_URL=… node scripts/verify-payments.mjs`. Tes memakai Midtrans tiruan (`scripts/mock-midtrans.mjs`). Tarif Standard, Comfort, Flexi, halaman pesanan tamu, ganti tanggal, refund, dan Buku kas diuji dengan `node scripts/verify-fares.mjs` di server yang sama.

## Transfer bank dan PayPal di checkout

Selain Midtrans, checkout website bisa menawarkan **Transfer bank** dan **PayPal**. Semuanya diatur di `/admin/payments`, masing-masing dengan kartu dan sakelarnya sendiri. Bila lebih dari satu cara aktif, tamu memilih di ringkasan pembayaran (**Pilih cara bayar**), dan teks tombol serta keterangan di bawahnya ikut berubah. Bila hanya satu, tidak ada pilihan yang ditanyakan. Berlaku di semua checkout: paket aktivitas, Dive Shop (beranda dan `/dive-shop`), kursus, dan servis alat.

- **Transfer bank** butuh minimal satu rekening di **Email tamu & invoice → Rekening untuk transfer bank**. Website tidak menarik uang. Setelah memesan, tamu dibawa ke `/payment/finish` yang menampilkan rekening, total transfer, batas transfer (dari **Batas waktu pembayaran**), dan tombol WhatsApp dengan pesan bukti transfer berisi kode pesanan. Email **Pesanan & batas bayar** dengan rekening yang sama terkirim bila tamu mengisi email. Pesanan menahan tempatnya sampai batas transfer. Begitu uang masuk, buka reservasinya di Kalender reservasi, pilih **Pembayaran → Sudah lunas**, lalu simpan. Reservasi menjadi Dikonfirmasi, invoice terkirim, dan barang Dive Shop yang dibeli keluar dari gudang.
- **PayPal** memakai PayPal Orders API v2. Kuncinya dari hosting: `PAYPAL_CLIENT_ID` dan `PAYPAL_CLIENT_SECRET` dari developer.paypal.com (Apps & Credentials), plus `PAYPAL_MODE=live` untuk pembayaran sungguhan (tanpa itu sandbox). PayPal tidak menerima rupiah, jadi pesanan ditagih dalam dolar AS dengan **Kurs, rupiah per 1 USD** dari admin, dibulatkan ke atas per sen. Tamu menyetujui di halaman PayPal, kembali ke `/api/payments/paypal/return`, pembayaran ditarik (sekali saja, walau tamu kembali dua kali), dicek mata uang dan jumlahnya, lalu reservasi Dikonfirmasi dengan invoice. Batal di PayPal (`/api/payments/paypal/cancel`) membatalkan pesanannya. Tidak ada alamat yang perlu ditempel di dashboard PayPal. **Tes koneksi PayPal** mengecek kunci dari server, dan penolakan terakhir dari PayPal tampil di kartunya. Bila tamu menutup halaman sebelum kembali, **Cek status** di riwayat pembayaran menarik pembayarannya. Pemasukan PayPal masuk Buku kas dengan cara bayar PayPal.

## Pemberitahuan booking masuk

Setiap booking dari website (bayar Midtrans, transfer, PayPal, atau permintaan lewat formulir dan banner event) mengirim email ke tim berisi nama tamu, kegiatan, tanggal, peserta, nilai, cara bayar, catatan, tombol **Buka di panel** (`/admin/calendar?ubah=…`) dan **WhatsApp tamu**. Balasan email langsung ke tamu. Pesanan yang lunas lewat Midtrans atau PayPal mengirim email **Lunas** juga (bisa dimatikan). Penerimanya diatur di **Pembayaran online → Pemberitahuan booking masuk**, sampai 3 alamat, atau email di menu Kontak bila dikosongkan. Butuh SMTP yang sama dengan email tamu.

Panel admin yang terbuka (juga di tab lain) mengecek reservasi tiap 45 detik lewat `GET /api/admin/bookings` dan saat tab dibuka lagi. Booking baru dari website atau pembayaran yang baru lunas membunyikan nada, menampilkan catatan di pojok kanan bawah (ketuk untuk membuka reservasinya), dan menambah angka di judul tab, misalnya `(1)`. Simpanan admin sendiri tidak berbunyi. Bunyinya diatur per perangkat di lonceng kanan atas (**Bunyi saat booking masuk**, **Tes bunyi**). Peramban baru memutar suara setelah halaman disentuh atau diklik sekali.

Uji tanpa menghubungi Midtrans, PayPal, atau kotak surat: jalankan server demo seperti untuk `verify-guest-mail` ditambah `PAYPAL_CLIENT_ID=test-client-AB12 PAYPAL_CLIENT_SECRET=test-secret PAYPAL_API_URL=http://127.0.0.1:3498`, lalu `BASE_URL=… node scripts/verify-checkout-methods.mjs`. Tes memakai PayPal tiruan (`scripts/mock-paypal.mjs`).

## Tarif Standard, Comfort, Flexi

Paket Diving, Snorkeling, Trip laut, dan sewa alat Dive Shop yang dipesan lewat website punya tiga tarif. Tamu memilih saat checkout, dan kenaikan dihitung dari harga paket atau sewa (tidak dari add-on dan pembelian alat).

| Tarif | Harga | Yang boleh |
| --- | --- | --- |
| Standard | harga dasar | Tanggal hanya diganti tim bila cuaca atau kondisi laut tidak memungkinkan (lewat kolom tanggal di Reservasi). Tanpa refund. |
| Comfort | +10% | Tamu mengganti tanggal sendiri paling lambat 2 hari sebelum tanggal kegiatan. Tanpa refund. |
| Flexi | +20% | Ganti tanggal seperti Comfort, atau batalkan dan dapat refund paling lambat 7 hari sebelumnya. Refund sebesar harga dasar, kenaikan Flexi ditahan (aturan yang sama dengan DAMPIER). |

- **Pengaturan** di **Situs web → Daftar harga → Tarif Standard, Comfort, Flexi**: tawarkan atau tidak, kenaikan Comfort dan Flexi (1–100%), batas refund (1–60 hari), dan batas ganti tanggal (0–30 hari). Di bawahnya tampil teks yang dibaca tamu. Dimatikan, semua pesanan memakai Standard.
- **Server** menghitung tarif dari CMS (`src/fare-model.js`, `priceOrder`). Kenaikan menjadi baris tersendiri di Midtrans (`fare-comfort`, `fare-flexi`). Tarif dan aturannya dibekukan di pesanan (`payment.fare`), jadi perubahan pengaturan tidak mengubah pesanan lama.
- **Halaman pesanan tamu** `/booking/<id>?t=<kunci>` dibuka dari tombol **Manage booking / Kelola pesanan** di halaman hasil pembayaran dan dari invoice email. Tamu Comfort dan Flexi memilih tanggal baru dari kalender sisa tempat. Tanggal baru diperiksa lagi di server, di dalam kunci yang sama dengan pesanan baru, tanpa menghitung pesanan itu sendiri. Tamu Flexi bisa membatalkan dan meminta refund. Kunci yang salah memberi halaman 404, dan permintaan dari situs lain ditolak.
- **Email** ke tamu saat tanggal diganti dan saat refund diminta. Invoice memuat tarif, aturannya, dan tombol Kelola pesanan.
- **Admin**: daftar Reservasi menandai tarif dan refund. Editor reservasi menampilkan tarif, batas waktunya, tanggal yang diganti tamu, dan permintaan refund dengan tombol **Tandai refund sudah dikirim** (catatan transfer opsional). Refund yang sudah dikirim masuk **Buku kas** sebagai pengeluaran otomatis kategori Refund tamu.

## Kalender bersama travel agent

Di `/admin/agents` (**Agen & kalender**) tambahkan setiap travel agent. Kalender tersambung dua arah:

- **Zanclus → agen.** Setiap agen mendapat halaman partner pribadi (`/partner/<token>`) dengan tombol **Tambahkan ke Google Calendar**, link Apple Calendar/Outlook (`webcal://`), dan link `.ics`. Kalender berisi reservasi Zanclus sebagai jumlah tamu (tanpa nama atau nomor), tanggal tutup, dan kegiatan dari kalender kegiatan; reservasi pembayaran online baru muncul setelah lunas. Aplikasi kalender agen memperbaruinya sendiri (Google biasanya beberapa jam sekali).
- **Agen → Zanclus.** Isi link kalender agen (Google Calendar: Setelan kalender → *Alamat rahasia dalam format iCal*, atau link `.ics` dari Outlook/Apple). Kalender dibaca saat disimpan, lalu setiap 30 menit saat admin atau feed dibuka, dan tampil sebagai baris **Agen & partner** di kalender reservasi.
- **Antaragen.** Agen yang mengaktifkan *Bagikan hari sibuk* tampil sebagai “Nama agen · terisi” di kalender agen lain, tanpa detail acara.

### OTA dengan sinkron iCal / ICS

Pilih **Jenis: OTA** saat menambah. Sinkron berjalan dua arah:

1. **Zanclus → OTA.** Salin **Link kalender (.ics)** dari kartu OTA, lalu tempel di extranet OTA pada menu impor kalender (iCal / ICS). Link ini hanya berisi tanggal yang perlu berhenti dijual, sebagai acara seharian “Not available”:
   - tanggal tutup untuk aktivitas itu;
   - tanggal dengan sisa slot di bawah **Tandai penuh bila sisa slot kurang dari** (bawaan 4, supaya OTA tidak menjual grup yang tidak muat).

   Pesanan dari OTA itu sendiri tidak dikirim balik kepadanya. Link ini tidak memuat nama atau jumlah tamu.
2. **OTA → Zanclus.** Ambil link ekspor iCal / ICS dari extranet OTA, lalu isi di **Link iCal / ICS dari extranet OTA**. Atur **Acara dari link ini**:
   - **Memakai slot harian**: setiap pesanan memakai slot sejumlah tamu yang tertulis di judul atau catatan acara (mis. “3 pax”, “Guests: 2”). Bila tidak tertulis, dipakai **Slot per acara** (bawaan 2).
   - **Menutup tanggal (penuh)**: setiap tanggal di kalender OTA dianggap penuh.
   - **Hanya tampil di kalender reservasi**: acara hanya tampil, tidak memakai slot.

Slot yang dipakai OTA ikut dihitung di kalender halaman aktivitas dan kursus, di pembayaran online, dan di permintaan booking website. Jadi gabungan tamu website dan OTA tidak melewati kuota harian (diving 30 orang). Format yang dibaca:
- acara seharian dengan tanggal akhir eksklusif (gaya Airbnb / Booking.com);
- acara berjam (dengan TZID atau UTC), termasuk yang berakhir tepat tengah malam;
- `DURATION`;
- acara bebas (`TRANSP:TRANSPARENT`, tidak memakai slot);
- acara batal (`STATUS:CANCELLED`, diabaikan).

Batas sinkron iCal:
- **Tidak seketika.** Zanclus membaca kalender OTA setiap 30 menit (atau lewat **Baca kalender sekarang**). OTA membaca link Zanclus menurut jadwalnya sendiri, biasanya setiap beberapa jam.
- **Tidak membawa sisa slot.** iCal hanya mengirim tanggal buka atau tutup, karena itu ada batas **Tandai penuh**.
- **Tidak semua OTA punya iCal.** Cek di extranet tiap OTA apakah ada menu impor/ekspor iCal / ICS. Yang tidak punya perlu channel manager atau API.

**Buat link baru** langsung mematikan link lama; **Nonaktifkan** dan **Hapus** menutup feed dan halaman partner. Hanya link `https://` publik yang dibaca (maksimal 2 MB, 10 detik, 3 pengalihan); alamat jaringan lokal ditolak. Acara berulang (RRULE) dihitung sekali pada tanggal pertamanya. Tidak perlu environment variable tambahan.

Uji dengan server demo `CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false AGENT_CALENDAR_ALLOW_LOCAL=true` pada folder data baru, lalu `BASE_URL=… node scripts/verify-agents.mjs`. `AGENT_CALENDAR_ALLOW_LOCAL` hanya untuk tes lokal; jangan diisi di hosting.
