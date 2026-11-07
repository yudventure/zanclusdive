# Zanclus Dive Center: aturan proyek

## Keamanan paket

- **Situs tidak boleh berjalan dengan paket yang punya celah keamanan.**
  Permintaan pemilik, Oktober 2026, setelah hPanel (Keamanan,
  Vulnerabilities) menandai next 16.4.0 (kritis) dan nodemailer 10.0.10.
  Daftar di hPanel sama dengan hasil `npm audit`.
- **Periksa di awal setiap pekerjaan dengan `npm run cek:keamanan`**
  (`scripts/cek-keamanan.mjs`). Celah baru diumumkan hampir tiap minggu
  untuk paket yang kemarin masih bersih. Bila ada temuan, perbarui paketnya
  lebih dulu, sebelum mengerjakan yang diminta.
- **`npm run zip:hostinger` menjalankan pemeriksaan itu dan berhenti bila
  ada celah apa pun.** Jangan melewatinya dengan `git archive` langsung, dan
  jangan menurunkan tingkatnya.
- **Cara memperbarui.** `npm install <paket>@^<versi perbaikan>` (lihat
  keluaran pemeriksaan), baca CHANGELOG paketnya untuk perubahan yang
  memutus, `npm run build`, `npm test`, lalu tes browser
  (`scripts/verify-*.mjs`). Untuk next, pakai rilis patch terbaru di seri
  yang sama. Jangan menyematkan versi pasti di package.json, pakai `^`,
  lockfile yang menentukan versinya.
- **GitHub ikut menjaga.** `.github/dependabot.yml` membuka pull request
  pembaruan keamanan dan pembaruan kecil harian, dan
  `.github/workflows/keamanan-paket.yml` menjalankan pemeriksaan yang sama
  di setiap push dan setiap pagi 07:17 WIT. Pull request Dependabot yang
  hijau digabung secepatnya.
