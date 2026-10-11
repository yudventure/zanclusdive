// Fungsi murni peta Raja Ampat: proyeksi, kamera, perenggang tanda, penempat
// label. Tanpa React dan tanpa DOM (kecuali lebarTeks), jadi bisa diuji dengan
// `node --test`. Diturunkan dari components/PetaDampier.tsx dan data/peta.ts
// di repo DAMPIER.

/** Satuan peta dari lintang dan bujur. 1 satuan = 0,001 derajat, sekitar 111 m. */
export const keSatuan = (bingkai, lat, lng) => [(lng - bingkai.barat) * bingkai.skala, (bingkai.utara - lat) * bingkai.skala];

/** Lintang dan bujur dari satuan peta, dibulatkan ke 5 desimal (sekitar 1 m). */
export const dariSatuan = (bingkai, x, y) => ({
  lat: Math.round((bingkai.utara - y / bingkai.skala) * 1e5) / 1e5,
  lng: Math.round((bingkai.barat + x / bingkai.skala) * 1e5) / 1e5,
});

/** Titik di dalam bingkai peta. */
export const dalamPeta = (garis, lat, lng) => {
  const [x, y] = keSatuan(garis.bingkai, lat, lng);
  return x >= 0 && x <= garis.lebar && y >= 0 && y <= garis.tinggi;
};

/** Kamera (viewBox) yang memuat sebuah kotak [x, y, lebar, tinggi] dengan rasio wadah, diberi sedikit kelonggaran. */
export function kameraPas([x, y, w, h], rasio, longgar = 1.08) {
  const cx = x + w / 2, cy = y + h / 2;
  let lw = w * longgar, lh = h * longgar;
  if (lw / lh > rasio) lh = lw / rasio; else lw = lh * rasio;
  return { x: cx - lw / 2, y: cy - lh / 2, w: lw, h: lh };
}

/**
 * Kamera saat sebuah tanda dipilih: membesar sedikit dari kamera wilayahnya,
 * berpusat di tanda itu. Paling dekat sekitar 1 km (9 satuan), paling jauh
 * 210 satuan, supaya wilayah besar seperti Waigeo tetap membesar cukup.
 */
export function kameraTanda(tanda, kameraWilayah, rasio) {
  const w = Math.max(9, Math.min(kameraWilayah.w * 0.62, 210)), h = w / rasio;
  return { x: tanda.x - w / 2, y: tanda.y - h / 2, w, h };
}

/** Wilayah terdekat dari sebuah titik: yang kotaknya memuat titik itu dan paling kecil. */
export function wilayahTerdekat(daftarWilayah, x, y) {
  let terbaik = daftarWilayah[0]?.id, luas = Infinity, jarak = Infinity;
  for (const w of daftarWilayah) {
    const [kx, ky, kw, kh] = w.kotak;
    const dalam = x >= kx && x <= kx + kw && y >= ky && y <= ky + kh;
    const d = Math.hypot(x - (kx + kw / 2), y - (ky + kh / 2));
    if (dalam && kw * kh < luas) { terbaik = w.id; luas = kw * kh; }
    else if (luas === Infinity && d < jarak) { terbaik = w.id; jarak = d; }
  }
  return terbaik;
}

/**
 * Tanda yang terlalu rapat di layar didorong saling menjauh sampai tidak
 * bertumpuk, dalam piksel layar. Tanda `tetap` (yang terpilih) tidak ikut
 * bergeser. Hasilnya geseran {dx, dy} per id.
 */
export function renggangkan(titik, jarak) {
  const pos = titik.map((x) => ({ ...x }));
  for (let ulang = 0; ulang < 6; ulang++) {
    let geser = false;
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i], b = pos[j];
      let dx = b.px - a.px, dy = b.py - a.py;
      let d = Math.hypot(dx, dy);
      if (d >= jarak) continue;
      if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
      const kurang = jarak - d, ux = dx / d, uy = dy / d;
      const ka = a.tetap ? 0 : b.tetap ? 1 : 0.5, kb = 1 - ka;
      a.px -= ux * kurang * ka; a.py -= uy * kurang * ka;
      b.px += ux * kurang * kb; b.py += uy * kurang * kb;
      geser = true;
    }
    if (!geser) break;
  }
  return new Map(pos.map((x, i) => [x.id, { dx: x.px - titik[i].px, dy: x.py - titik[i].py }]));
}

export const SISI = ["kanan", "kiri", "bawah", "atas"];
export const TINGGI_LABEL = 20;
const tumpang = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/**
 * Nama tanda hanya ditulis kalau ada tempatnya: dicoba di kanan, kiri, bawah,
 * lalu atas tanda, tidak boleh menimpa tanda lain, nama yang sudah ditulis,
 * halangan (skala, arah utara, nama pulau), atau keluar dari peta. Tanda
 * `utama` (terpilih) didahulukan dan selalu bernama. Hasil per id {sisi, tampil}.
 */
export function tempatkanLabel(tanda, halangan, w, h) {
  const kotakSisi = (x, s) => {
    const lw = x.lebar, lh = TINGGI_LABEL;
    if (s === "kanan") return [x.cx + x.r + 6, x.cy - lh / 2, lw, lh];
    if (s === "kiri") return [x.cx - x.r - 6 - lw, x.cy - lh / 2, lw, lh];
    if (s === "bawah") return [x.cx - lw / 2, x.cy + x.r + 4, lw, lh];
    return [x.cx - lw / 2, x.cy - x.r - 4 - lh, lw, lh];
  };
  const dalam = ([x, y, lw, lh]) => x >= 4 && y >= 4 && x + lw <= w - 4 && y + lh <= h - 4;
  const lingkar = tanda.map((x) => [x.cx - x.r, x.cy - x.r, x.r * 2, x.r * 2]);
  const terisi = [...halangan];
  const hasil = new Map();
  const urut = tanda.map((x, i) => ({ x, i })).sort((a, b) => Number(b.x.utama) - Number(a.x.utama));
  for (const { x, i } of urut) {
    const tabrak = (p) => terisi.some((q) => tumpang(p, q)) || lingkar.some((q, j) => j !== i && tumpang(p, q));
    const muat = SISI.find((s) => { const p = kotakSisi(x, s); return dalam(p) && !tabrak(p); });
    if (muat) { terisi.push(kotakSisi(x, muat)); hasil.set(x.id, { sisi: muat, tampil: true }); continue; }
    const cadangan = SISI.find((s) => dalam(kotakSisi(x, s))) ?? "kanan";
    if (x.utama) terisi.push(kotakSisi(x, cadangan));
    hasil.set(x.id, { sisi: cadangan, tampil: x.utama });
  }
  return hasil;
}

/** Panjang skala yang enak dibaca, dalam meter. */
export const PILIHAN_SKALA = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
/** Satuan peta dalam meter di dekat khatulistiwa. */
export const METER_PER_SATUAN = 111.32;

/** Panjang skala bulat terpanjang yang muat `maksPx` piksel pada kamera sekarang. */
export function skalaGaris(kameraW, lebarPx, maksPx = 110) {
  const meterPerPx = (kameraW / lebarPx) * METER_PER_SATUAN;
  const m = PILIHAN_SKALA.reduce((a, x) => (x / meterPerPx <= maksPx ? x : a), PILIHAN_SKALA[0]);
  return { meter: m, px: m / meterPerPx };
}

let kanvas;
/** Lebar teks dalam piksel, diukur dengan huruf situs. Tanpa DOM, perkiraan 6,8 px per huruf. */
export function lebarTeks(teks, huruf) {
  if (kanvas === undefined) kanvas = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!kanvas || !huruf) return teks.length * 6.8;
  kanvas.font = huruf;
  return kanvas.measureText(teks).width;
}

/**
 * Pindahkan tanda bawaan simpanan lama ke letak barunya. `letakLama[versi][id]`
 * adalah letak tanda itu di versi tersebut. Tanda yang letaknya masih persis
 * letak lama ikut pindah, yang sudah digeser tim tetap, tanda bawaan baru
 * (sejak > versi) ditambahkan, yang dihapus tim tetap terhapus.
 */
export function migrasiTanda(simpanan, versi, bawaan, letakLama, versiSekarang) {
  if (versi >= versiSekarang) return simpanan;
  const peta = new Map(bawaan.map((t) => [t.id, t]));
  const hasil = simpanan.map((t) => {
    const lama = letakLama[versi]?.[t.id], baru = peta.get(t.id);
    return lama && baru && t.lat === lama[0] && t.lng === lama[1] ? { ...t, lat: baru.lat, lng: baru.lng, wilayah: baru.wilayah } : t;
  });
  const ada = new Set(hasil.map((t) => t.id));
  for (const t of bawaan) if ((t.sejak ?? 1) > versi && !ada.has(t.id)) hasil.push(t);
  return hasil;
}
