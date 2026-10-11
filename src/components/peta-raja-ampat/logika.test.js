// Uji fungsi murni dan data peta Raja Ampat. Jalankan: node --test <folder>/logika.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kameraPas, kameraTanda, keSatuan, dariSatuan, dalamPeta, migrasiTanda, renggangkan, skalaGaris, tempatkanLabel, wilayahTerdekat } from "./logika.js";

const baca = (n) => JSON.parse(readFileSync(new URL(`./data/${n}.json`, import.meta.url), "utf8"));
const GARIS = baca("garis-pantai"), WILAYAH = baca("wilayah"), TANDA = baca("tanda"), TATA = baca("tata"), TEKS = baca("teks");

test("proyeksi bolak-balik", () => {
  const [x, y] = keSatuan(GARIS.bingkai, -0.5625, 130.6771);
  assert.deepEqual(dariSatuan(GARIS.bingkai, x, y), { lat: -0.5625, lng: 130.6771 });
  assert.ok(dalamPeta(GARIS, -0.43, 130.82));
  assert.ok(!dalamPeta(GARIS, -0.88, 131.25 + 1));
});

test("kamera memuat kotak dengan rasio wadah", () => {
  const k = kameraPas([100, 100, 200, 100], 1.5);
  assert.ok(Math.abs(k.w / k.h - 1.5) < 1e-9);
  assert.ok(k.w >= 200 && k.h >= 100);
  const t = kameraTanda({ x: 50, y: 60 }, { w: 1180 }, 1.2);
  assert.equal(t.w, 210);
  assert.equal(kameraTanda({ x: 0, y: 0 }, { w: 12 }, 1).w, 9);
});

test("perenggang tanda tidak menggeser tanda terpilih", () => {
  const g = renggangkan([{ id: "a", px: 0, py: 0, tetap: true }, { id: "b", px: 5, py: 0, tetap: false }], 30);
  assert.deepEqual(g.get("a"), { dx: 0, dy: 0 });
  assert.ok(g.get("b").dx >= 24);
});

test("label tidak keluar bingkai dan yang utama selalu tampil", () => {
  const h = tempatkanLabel([
    { id: "a", cx: 790, cy: 300, r: 15, lebar: 120, utama: false },
    { id: "b", cx: 400, cy: 300, r: 20, lebar: 120, utama: true },
  ], [], 800, 600);
  assert.equal(h.get("a").sisi, "kiri");
  assert.ok(h.get("b").tampil);
});

test("skala garis memilih panjang bulat", () => {
  const s = skalaGaris(1180, 800);
  assert.ok([5000, 10000, 20000].includes(s.meter) && s.px <= 110);
});

test("data lengkap dan konsisten", () => {
  const idWilayah = new Set(WILAYAH.map((w) => w.id));
  const jenis = new Set(TATA.jenis.map((j) => j.id));
  assert.equal(new Set(TANDA.map((t) => t.id)).size, TANDA.length, "id tanda unik");
  for (const t of TANDA) {
    assert.ok(idWilayah.has(t.wilayah), `${t.id} wilayah ${t.wilayah}`);
    assert.ok(jenis.has(t.jenis), `${t.id} jenis ${t.jenis}`);
    assert.ok(dalamPeta(GARIS, t.lat, t.lng), `${t.id} di dalam bingkai`);
    for (const l of ["id", "en", "zh", "ru"]) assert.ok(t.keterangan[l], `${t.id} keterangan ${l}`);
  }
  for (const w of WILAYAH) {
    assert.ok(!w.pulau || GARIS.pulau[w.pulau], `${w.id} pulau ${w.pulau}`);
    for (const l of ["id", "en", "zh", "ru"]) assert.ok(w.keterangan[l], `${w.id} keterangan ${l}`);
  }
  for (const l of ["id", "en", "zh", "ru"]) for (const k of Object.keys(TATA.pulauKecil)) assert.ok(TEKS[l].pulau[k], `${l} pulau.${k}`);
});

test("teks tampil tanpa titik dua, titik koma, dan tanda pisah panjang", () => {
  const bersih = (s) => !/[;—：；]|:\s/.test(s.replace(/https?:\/\/\S+/g, ""));
  const semua = [...TANDA.flatMap((t) => Object.values(t.keterangan)), ...WILAYAH.flatMap((w) => Object.values(w.keterangan))];
  for (const s of semua) assert.ok(bersih(s), s);
});

test("tanda bawaan masuk wilayah yang kotaknya memuatnya atau terdekat", () => {
  const kri = TANDA.find((t) => t.id === "cape-kri") ?? TANDA.find((t) => t.wilayah === "kri");
  const [x, y] = keSatuan(GARIS.bingkai, kri.lat, kri.lng);
  assert.ok(["kri", "mansuar"].includes(wilayahTerdekat(WILAYAH, x, y)));
});

test("migrasi simpanan lama", () => {
  const bawaan = [{ id: "a", lat: 1, lng: 1, wilayah: "w", sejak: 1 }, { id: "b", lat: 2, lng: 2, wilayah: "w", sejak: 2 }];
  const hasil = migrasiTanda([{ id: "a", lat: 0, lng: 0, wilayah: "w" }], 1, bawaan, { 1: { a: [0, 0] } }, 2);
  assert.deepEqual(hasil.map((t) => [t.id, t.lat]), [["a", 1], ["b", 2]]);
  assert.deepEqual(migrasiTanda([{ id: "a", lat: 5, lng: 5 }], 1, bawaan, { 1: { a: [0, 0] } }, 2)[0].lat, 5);
});
