---
name: upload-foto-langsung
description: Aturan pemilik untuk setiap tempat foto atau gambar di panel admin situs miliknya (Zanclus, DAMPIER, dan situs lain). Foto dipilih langsung dari PC atau HP, otomatis dikecilkan, diunggah, terpasang, dan tersimpan dalam satu langkah tanpa tombol Simpan terpisah dan tanpa masuk hPanel atau FTP. Pakai SETIAP KALI membuat atau mengubah kolom foto, galeri, sampul, logo, foto produk, media library, atau fitur unggah apa pun di CMS, bahkan kalau pemilik hanya bilang "tambah foto", "ganti gambar", atau "bisa upload".
---

# Upload foto langsung terpasang

Pemilik tidak mau ribet. Setiap tempat gambar di admin harus bisa diisi
langsung dari komputer atau HP, dan hasilnya langsung tampil di website.
Jangan pernah meminta pemilik membuka hPanel, FTP, atau mengunggah ke tempat
lain lalu menempel URL.

## Yang wajib ada

1. **Tombol upload di setiap slot gambar.** Tombol besar "Ganti foto" /
   "Upload dari PC / HP" tepat di bawah pratinjau foto. Input
   `type="file" accept="image/*"` (di HP otomatis menawarkan galeri dan
   kamera). Bisa juga seret dan lepas file di desktop.
2. **Satu langkah.** Pilih foto, lalu foto diunggah, dipasang ke kolomnya,
   dan konten disimpan otomatis. Tampilkan "Mengunggah…" lalu "Terpasang"
   dan pesan "Foto terpasang dan sudah tampil di website." Tidak ada tombol
   Simpan tambahan untuk foto.
3. **Dikecilkan di browser.** Foto kamera (sering 5 sampai 15 MB) diperkecil
   sebelum diunggah: sisi terpanjang maksimal 2400 px, diubah ke WebP
   (cadangan JPEG), kualitas mulai 0,86 dan diturunkan sampai di bawah batas
   server. File kecil yang sudah pas diunggah apa adanya.
4. **Galeri bisa banyak sekaligus.** Tombol "Tambah foto ke galeri" dengan
   `multiple`; setiap foto menjadi item baru dan tersimpan. Tambahkan item
   lewat setter berbasis fungsi (`setContent(c => …)`) supaya unggahan
   berurutan tidak saling menimpa.
5. **Cara lama tetap ada tapi tersembunyi.** Pilih dari koleksi atau tempel
   URL disimpan di `<details>` "Pilih foto lain atau tempel URL".
6. **Penyimpanan permanen.** File disimpan di server di luar folder build
   dan di luar `/tmp`, yang bisa terhapus saat redeploy. Contoh: folder home
   akun hosting (`~/zanclus-cms-data/media/<id>`) atau database/BLOB. Simpan
   satu file per foto, bukan base64 di dalam JSON konten. Saat memindahkan
   penyimpanan, salin data lama satu kali dan jangan menimpa data pemilik.
7. **Aman.** Endpoint upload wajib login admin dan origin yang sama. Cek
   magic bytes (PNG, JPEG, WebP saja, tolak SVG), batasi ukuran per file dan
   total, lalu sajikan dengan `X-Content-Type-Options: nosniff`.
8. **Ramah HP.** Area tombol minimal 44 px tinggi, lebar penuh di layar
   kecil, tanpa scroll horizontal.

## Pola kode (Next.js, seperti di Zanclus)

- `src/admin/image-upload.js`: `prepareImage(file)` memakai
  `createImageBitmap` dan canvas `toBlob`, lalu mengembalikan `File` siap
  unggah.
- `src/admin/ImageUpload.jsx`: komponen tombol atau dropzone; prop
  `onFile(file)` (async), `multiple`, `compact`, `label`, `hint`.
- Dashboard:
  - `uploadPhoto(file)`: `prepareImage`, lalu POST `/api/admin/media`
    (FormData `file`), lalu tambahkan ke daftar media dan kembalikan `url`.
  - `placePhoto(file, apply)`: `url = await uploadPhoto(file)`, lalu
    `apply(url)` (mengubah konten lewat fungsi editor biasa), lalu
    `setAutoSave(n => n + 1)`.
  - `useEffect` pada `autoSave` memanggil simpan konten dengan pesan
    "Foto terpasang…". Efek ini membaca konten yang sudah ter-update di
    render yang sama, sehingga tidak ada closure basi.
- Setiap editor menerima `placePhoto` dan memasang
  `<ImageUpload onFile={(f) => placePhoto(f, (url) => edit("image", url))} />`.

## Cek sebelum selesai

- Tes browser dengan foto JPEG lebih dari 4 MB: foto mengecil, terpasang,
  versi konten naik satu tanpa klik Simpan, tampil di halaman publik, dan
  file ada di folder media. Di Zanclus: `scripts/verify-upload.mjs`.
- Unggah beberapa foto galeri sekaligus, lalu pastikan semuanya masuk.
- Cek tampilan 390 px (HP) tanpa scroll horizontal.
