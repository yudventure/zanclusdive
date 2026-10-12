"use client";
// Peta interaktif Raja Ampat, versi berdiri sendiri dari peta di situs DAMPIER
// (components/PetaDampier.tsx). Tanpa ketergantungan selain React. Gaya di
// peta-raja-ampat.css, diberi tema lewat variabel CSS --prj-* supaya tiap
// situs bisa membedakan desainnya tanpa menyentuh berkas ini.
//
// Pulau diketuk: kamera (viewBox SVG) membesar halus ke kotak wilayah, lalu
// tanda di dalamnya tampil sebagai ikon berwarna. Tanda diketuk: kamera
// membesar ke tanda itu dan keterangannya tampil di samping peta (di bawah
// peta di ponsel). Peta penuh dan tombol Esc kembali selangkah.
//
// Tanda, label, dan nama perairan adalah elemen HTML di atas peta, diletakkan
// dari kamera yang sama, supaya ukurannya tetap dalam piksel saat peta
// membesar dan semuanya bisa dijangkau papan ketik.
import { useEffect, useMemo, useRef, useState } from "react";
import GARIS from "./data/garis-pantai.json";
import WILAYAH from "./data/wilayah.json";
import TANDA from "./data/tanda.json";
import TATA from "./data/tata.json";
import TEKS from "./data/teks.json";
import { kameraPas, kameraTanda, keSatuan, lebarTeks, renggangkan, skalaGaris, tempatkanLabel, wilayahTerdekat } from "./logika.js";
import { IKON_JENIS, IkonPanah, IkonPerahu, IkonPin } from "./ikon.jsx";

const WARNA = Object.fromEntries(TATA.jenis.map((j) => [j.id, j.warna]));
const URUTAN_JENIS = TATA.jenis.map((j) => j.id);
const PULAU = Object.keys(GARIS.pulau);
const BCP47 = { id: "id-ID", en: "en-GB", zh: "zh-CN", ru: "ru-RU" };

/** Teks dalam bahasa tamu: {var} diganti, objek jamak (one, few, many, other) dipilih dengan Intl.PluralRules. */
function buatTeks(bahasa, timpa) {
  const dasar = TEKS[bahasa] ?? TEKS.id;
  const sumber = { ...dasar, ...timpa };
  const isi = (s, v = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
  const ambil = (kunci) => kunci.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), sumber);
  const jamak = new Intl.PluralRules(BCP47[bahasa] ?? bahasa);
  const t = (kunci, v) => { const s = ambil(kunci); return typeof s === "string" ? isi(s, v) : kunci; };
  const tn = (kunci, n, v) => {
    const s = ambil(kunci);
    if (typeof s === "string") return isi(s, { ...v, n });
    const pilih = s && (s[jamak.select(n)] ?? s.other);
    return typeof pilih === "string" ? isi(pilih, { ...v, n }) : kunci;
  };
  return { t, tn };
}

/** Teks dalam bahasa tamu dari objek {id, en, zh, ru}, bahasa Indonesia kalau kosong. */
const dalam = (obj, bahasa) => (typeof obj === "string" ? obj : (obj?.[bahasa] || obj?.id || ""));

/** Kamera yang berpindah halus: tengahnya bergeser lurus, lebarnya berlipat. Tanpa animasi kalau gerak dikurangi. */
function useKamera(sasaran) {
  const [k, setK] = useState(sasaran);
  const kini = useRef(sasaran);
  useEffect(() => {
    const dari = kini.current, ke = sasaran;
    if (Math.abs(dari.x - ke.x) + Math.abs(dari.y - ke.y) + Math.abs(dari.w - ke.w) < 0.01) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { kini.current = ke; setK(ke); return; }
    const mulai = performance.now(), lama = 650;
    const cx0 = dari.x + dari.w / 2, cy0 = dari.y + dari.h / 2, cx1 = ke.x + ke.w / 2, cy1 = ke.y + ke.h / 2;
    let raf = 0;
    const langkah = (now) => {
      const t = Math.min(1, (now - mulai) / lama);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const w = dari.w * (ke.w / dari.w) ** e, h = dari.h * (ke.h / dari.h) ** e;
      const c = { x: cx0 + (cx1 - cx0) * e - w / 2, y: cy0 + (cy1 - cy0) * e - h / 2, w, h };
      kini.current = c;
      setK(c);
      if (t < 1) raf = requestAnimationFrame(langkah);
    };
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [sasaran.x, sasaran.y, sasaran.w, sasaran.h]); // eslint-disable-line react-hooks/exhaustive-deps
  return k;
}

/** Ukuran wadah peta dalam piksel. */
function useUkuran(ref) {
  const [ukuran, setUkuran] = useState({ w: 760, h: 760 * (GARIS.tinggi / GARIS.lebar) });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const baca = () => { if (el.clientWidth && el.clientHeight) setUkuran({ w: el.clientWidth, h: el.clientHeight }); };
    baca();
    const ro = new ResizeObserver(baca);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return ukuran;
}

/**
 * @param {object} props
 * @param {"id"|"en"|"zh"|"ru"} [props.bahasa] Bahasa tamu. Bahasa tanpa teks memakai bahasa Indonesia.
 * @param {object} [props.teks] Menimpa sebagian teks (kunci sama dengan data/teks.json).
 * @param {Array} [props.wilayah] Daftar wilayah (bawaan data/wilayah.json). Urutannya urutan tombol.
 * @param {Array} [props.tanda] Daftar tanda (bawaan data/tanda.json). Tanda situs sendiri boleh ditambahkan.
 * @param {string[]} [props.sorot] Id tanda yang ditonjolkan (milik situs atau mitra), bercincin aksen.
 * @param {(tanda) => string|undefined} [props.tautan] Alamat halaman layanan untuk sebuah tanda.
 * @param {boolean} [props.judul] Tampilkan judul dan petunjuk di atas peta.
 */
export default function PetaRajaAmpat({ bahasa = "id", teks: timpa, wilayah = WILAYAH, tanda = TANDA, sorot = [], tautan, judul = true, className = "" }) {
  const { t, tn } = useMemo(() => buatTeks(bahasa, timpa), [bahasa, timpa]);
  const wadah = useRef(null);
  const ukuran = useUkuran(wadah);
  const rasio = ukuran.w / ukuran.h;
  const [pilih, setPilih] = useState(null);
  const [titikPilih, setTitikPilih] = useState(null);
  const [arah, setArah] = useState(null);
  const [arahTitik, setArahTitik] = useState(null);
  const [sembunyi, setSembunyi] = useState([]);
  const [huruf, setHuruf] = useState("");
  const [layarLebar, setLayarLebar] = useState(false);

  const wilayahDi = useMemo(() => new Map(wilayah.map((w) => [w.id, w])), [wilayah]);
  const wilayahPulau = useMemo(() => new Map(wilayah.filter((w) => w.pulau).map((w) => [w.pulau, w.id])), [wilayah]);
  const semuaTanda = useMemo(() => tanda.map((x) => {
    const [px, py] = keSatuan(GARIS.bingkai, x.lat, x.lng);
    return { ...x, x: px, y: py, wilayah: x.wilayah && wilayahDi.has(x.wilayah) ? x.wilayah : wilayahTerdekat(wilayah, px, py), sorot: sorot.includes(x.id) };
  }), [tanda, wilayah, wilayahDi, sorot]);
  const tampak = semuaTanda.filter((x) => !sembunyi.includes(x.jenis));
  const jenisAda = URUTAN_JENIS.filter((j) => semuaTanda.some((x) => x.jenis === j));
  const adaSelam = semuaTanda.some((x) => x.selam && x.jenis !== "dive" && x.jenis !== "selam");
  const adaSorot = semuaTanda.some((x) => x.sorot);

  const aktif = pilih ? wilayahDi.get(pilih) ?? null : null;
  const titik = titikPilih ? semuaTanda.find((x) => x.id === titikPilih) ?? null : null;
  const kameraWilayah = aktif ? kameraPas(aktif.kotak, rasio) : kameraPas([0, 0, GARIS.lebar, GARIS.tinggi], rasio, 1);
  const sasaran = titik ? kameraTanda(titik, kameraWilayah, rasio) : kameraWilayah;
  const k = useKamera(sasaran);
  const dekat = GARIS.lebar / k.w >= 1.7;
  const diam = Math.abs(k.x - sasaran.x) + Math.abs(k.y - sasaran.y) + Math.abs(k.w - sasaran.w) < 0.05;

  useEffect(() => {
    if (wadah.current) setHuruf(`600 11.5px ${getComputedStyle(wadah.current).fontFamily}`);
    const mq = window.matchMedia("(min-width: 640px)");
    const baca = () => setLayarLebar(mq.matches);
    baca();
    mq.addEventListener("change", baca);
    return () => mq.removeEventListener("change", baca);
  }, []);

  const pilihWilayah = (id) => { setPilih(id); setTitikPilih(null); };
  const pilihTitik = (x) => { setPilih(x.wilayah); setTitikPilih(x.id); };
  const mundur = () => { if (titikPilih) setTitikPilih(null); else pilihWilayah(null); };
  useEffect(() => {
    if (!pilih && !titikPilih) return;
    const esc = (e) => { if (e.key === "Escape") mundur(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [pilih, titikPilih]); // eslint-disable-line react-hooks/exhaustive-deps

  const letak = (x, y) => ({ left: `${((x - k.x) / k.w) * 100}%`, top: `${((y - k.y) / k.h) * 100}%` });
  const terlihat = (x, y, tepi = 0.02) => x > k.x - k.w * tepi && x < k.x + k.w * (1 + tepi) && y > k.y - k.h * tepi && y < k.y + k.h * (1 + tepi);
  const keLayar = (x, y) => [((x - k.x) / k.w) * ukuran.w, ((y - k.y) / k.h) * ukuran.h];
  const [depan, belakang] = t("judul", { sorot: "\u0000" }).split("\u0000");
  const tandaWilayah = aktif ? tampak.filter((x) => x.wilayah === aktif.id) : [];
  const tandaTerlihat = dekat ? tampak.filter((x) => terlihat(x.x, x.y)) : [];
  const pulauTerlihat = dekat ? Object.entries(TATA.pulauKecil).filter(([, [x, y]]) => terlihat(x, y, -0.04)) : [];
  const geser = renggangkan(tandaTerlihat.map((x) => { const [px, py] = keLayar(x.x, x.y); return { id: x.id, px, py, tetap: x.id === titik?.id }; }), 30);
  const skala = skalaGaris(k.w, ukuran.w);
  const teksSkala = skala.meter >= 1000 ? t("km", { n: skala.meter / 1000 }) : t("m", { n: skala.meter });
  const menit = aktif?.dariWaisai ?? 0;
  const teksWaisai = menit > 0 ? t("dariWaisai", {
    waktu: menit < 60 ? tn("menit", menit) : menit % 60 ? `${tn("jam", Math.floor(menit / 60))} ${tn("menit", menit % 60)}` : tn("jam", menit / 60),
  }) : "";

  const labelTanda = (() => {
    if (!dekat || !diam) return new Map();
    // Halangan: atribusi kanan bawah, skala kiri bawah, utara kanan atas, waktu dari Waisai kiri atas, nama pulau kecil, nama wilayah lain.
    const lebarAtribusi = lebarTeks(t("atribusi"), huruf) * 0.9 + 22;
    const halangan = [[ukuran.w - lebarAtribusi, ukuran.h - 28, lebarAtribusi, 28], [0, ukuran.h - 44, skala.px + 30, 44], [ukuran.w - 50, 0, 50, 58]];
    if (teksWaisai) halangan.push([0, 0, lebarTeks(teksWaisai, huruf) + 52, 42]);
    for (const [id, [x, y]] of pulauTerlihat) {
      const [cx, cy] = keLayar(x, y);
      const lw = lebarTeks(t(`pulau.${id}`), huruf) + 6;
      halangan.push([cx - lw / 2, cy - 9, lw, 18]);
    }
    if (layarLebar) for (const w of wilayah) {
      if (w.id === aktif?.id) continue;
      const [lx, ly] = keLayar(...w.label);
      const lw = lebarTeks(w.nama.toUpperCase(), huruf) * 0.95 + w.nama.length * 1.1 + 18;
      halangan.push([lx - lw / 2, ly - 10, lw, 20]);
    }
    return tempatkanLabel(tandaTerlihat.map((x) => {
      const g = geser.get(x.id) ?? { dx: 0, dy: 0 };
      const [cx, cy] = keLayar(x.x, x.y);
      const on = x.id === titik?.id;
      return { id: x.id, cx: cx + g.dx, cy: cy + g.dy, r: on ? 20 : x.sorot ? 18 : 15, lebar: lebarTeks(x.nama, huruf) + 17, utama: on };
    }), halangan, ukuran.w, ukuran.h);
  })();
  const alihJenis = (j) => setSembunyi((s) => (s.includes(j) ? s.filter((x) => x !== j) : [...s, j]));

  return (
    <div className={`prj ${className}`} data-peta data-peta-wilayah={aktif?.id ?? ""} data-peta-titik={titik?.id ?? ""}>
      {judul && (
        <div className="prj-kepala">
          <p className="prj-label">{t("label")}</p>
          <h2 className="prj-judul">{depan}<span className="prj-sorot">{t("sorot")}</span>{belakang}</h2>
          <p className="prj-petunjuk">{t("petunjuk")}</p>
        </div>
      )}

      <div className="prj-kisi">
        <div className="prj-kiri">
          {/* Jejak: di mana kamera sekarang, dan jalan kembali. */}
          <nav aria-label={t("sorot")} className="prj-jejak" data-peta-jejak>
            {aktif || titik ? (
              <button type="button" onClick={() => pilihWilayah(null)} className="prj-tombol-penuh" data-peta-penuh>
                <span className="prj-putar-90"><IkonPanah size={14} /></span>{t("petaPenuh")}
              </button>
            ) : (
              <span aria-current="location" className="prj-jejak-kini"><IkonPin size={14} />{t("sorot")}</span>
            )}
            {aktif && (
              <>
                <span aria-hidden className="prj-putar-min90 prj-redup"><IkonPanah size={13} /></span>
                {titik
                  ? <button type="button" onClick={mundur} className="prj-jejak-tautan" data-jejak-wilayah>{aktif.nama}</button>
                  : <span aria-current="location" className="prj-jejak-kini">{aktif.nama}</span>}
              </>
            )}
            {titik && (
              <>
                <span aria-hidden className="prj-putar-min90 prj-redup"><IkonPanah size={13} /></span>
                <span aria-current="location" className="prj-jejak-kini prj-potong">{titik.nama}</span>
              </>
            )}
          </nav>

          <div ref={wadah} className="prj-wadah" data-peta-wadah>
            <svg viewBox={`${k.x} ${k.y} ${k.w} ${k.h}`} preserveAspectRatio="xMidYMid meet" className="prj-svg" aria-hidden
              data-kamera={`${Math.round(k.x)} ${Math.round(k.y)} ${Math.round(k.w)} ${Math.round(k.h)}`} onMouseLeave={() => setArah(null)}>
              {/* Karang dangkal di pesisir: bentuk daratan digaris tebal di bawahnya, tebalnya tetap di layar. */}
              <g fill="none" className="prj-karang" strokeLinejoin="round" pointerEvents="none">
                {PULAU.map((p) => <path key={p} d={GARIS.pulau[p].d} strokeWidth={7} opacity={0.45} vectorEffect="non-scaling-stroke" />)}
                {PULAU.map((p) => <path key={`${p}-2`} d={GARIS.pulau[p].d} strokeWidth={3} opacity={0.75} vectorEffect="non-scaling-stroke" />)}
              </g>
              {PULAU.map((p) => {
                const id = wilayahPulau.get(p);
                const w = id ? wilayahDi.get(id) : undefined;
                const sorot = !!w && w.id === aktif?.id, arahkan = !!w && w.id === arah;
                return (
                  <path key={p} d={GARIS.pulau[p].d} data-pulau={p} fillRule="evenodd" vectorEffect="non-scaling-stroke"
                    className={`prj-darat ${sorot ? "prj-darat-sorot" : arahkan ? "prj-darat-arah" : ""} ${w ? "prj-bisa" : ""}`}
                    onClick={w ? () => pilihWilayah(w.id) : undefined} onMouseEnter={w ? () => setArah(w.id) : undefined} />
                );
              })}
              {!dekat && (
                <g pointerEvents="none" className="prj-jangkar-garis">
                  {wilayah.map((w) => w.jangkar && <line key={w.id} x1={w.jangkar[0]} y1={w.jangkar[1]} x2={w.label[0]} y2={w.label[1]} vectorEffect="non-scaling-stroke" />)}
                </g>
              )}
            </svg>

            {/* Nama perairan, hanya di peta penuh. */}
            {!dekat && Object.entries(TATA.laut).map(([id, [x, y]]) => (
              <span key={id} style={letak(x, y)} aria-hidden className={`prj-laut ${id === "selat" ? "prj-laut-besar" : ""}`}>{t(`laut.${id}`)}</span>
            ))}
            {/* Nama pulau kecil di laut sampingnya, saat dibesarkan. */}
            {pulauTerlihat.map(([id, [x, y]]) => (
              <span key={id} style={letak(x, y)} aria-hidden data-nama-pulau={id} className="prj-nama-pulau">{t(`pulau.${id}`)}</span>
            ))}
            {/* Peta penuh: tanda hanya titik warna. */}
            {!dekat && tampak.map((x) => (
              <span key={x.id} aria-hidden style={{ ...letak(x.x, x.y), background: WARNA[x.jenis] }} className="prj-titik-kecil" />
            ))}

            {/* Label wilayah: pil di peta penuh, nama kecil saat dibesarkan. */}
            {wilayah.map((w) => {
              const [lx, ly] = w.label;
              if (!terlihat(lx, ly, -0.03) || (dekat && w.id === aktif?.id)) return null;
              return (
                <span key={w.id} className="prj-isi">
                  {!dekat && w.jangkar && <span aria-hidden style={letak(w.jangkar[0], w.jangkar[1])} className="prj-jangkar" />}
                  <button type="button" onClick={() => pilihWilayah(w.id)} onMouseEnter={() => setArah(w.id)} onMouseLeave={() => setArah(null)}
                    style={letak(lx, ly)} data-label-wilayah={w.id} aria-pressed={w.id === aktif?.id}
                    className={`prj-label-wilayah ${dekat ? "prj-label-wilayah-kecil" : ""}`}>
                    {w.nama}
                  </button>
                </span>
              );
            })}

            {/* Tanda yang bisa diketuk, setelah dibesarkan. */}
            {tandaTerlihat.map((x) => {
              const on = x.id === titik?.id, sorot = on || x.id === arahTitik;
              const g = geser.get(x.id) ?? { dx: 0, dy: 0 };
              const Ikon = IKON_JENIS[x.jenis] ?? IKON_JENIS.menarik;
              const label = labelTanda.get(x.id);
              const jenis = TATA.jenis.find((j) => j.id === x.jenis);
              return (
                <button key={x.id} type="button" onClick={() => pilihTitik(x)} onMouseEnter={() => setArahTitik(x.id)} onMouseLeave={() => setArahTitik(null)}
                  onFocus={() => setArahTitik(x.id)} onBlur={() => setArahTitik(null)}
                  style={{ ...letak(x.x, x.y), marginLeft: g.dx, marginTop: g.dy }} aria-pressed={on}
                  aria-label={`${x.nama}, ${dalam(jenis?.nama, bahasa)}${x.selam ? `, ${t("selamDiTempat")}` : ""}`}
                  data-tanda={x.id} data-jenis={x.jenis} className={`prj-tanda ${on ? "prj-tanda-on" : sorot ? "prj-tanda-arah" : ""}`}>
                  <span style={{ background: WARNA[x.jenis] }} className={`prj-bulat ${x.sorot ? "prj-bulat-sorot" : ""}`}>
                    <Ikon size={on ? 17 : 14} />
                    {x.selam && x.jenis !== "dive" && x.jenis !== "selam" && <TandaSelam />}
                  </span>
                  {(sorot || label?.tampil) && (
                    <span data-label-tanda={label?.sisi ?? "kanan"} className={`prj-nama-tanda prj-sisi-${label?.sisi ?? "kanan"} ${on ? "prj-nama-tanda-on" : ""}`}>{x.nama}</span>
                  )}
                </button>
              );
            })}

            {teksWaisai && dekat && (
              <span data-dari-waisai={menit} className="prj-waisai"><span className="prj-aksen"><IkonPerahu size={15} /></span>{teksWaisai}</span>
            )}
            <span aria-hidden data-utara className="prj-utara">
              <span>{t("utara")}</span>
              <svg viewBox="0 0 16 20" width={12} height={15}><path d="M8 1l5 12-5-3-5 3z" fill="currentColor" /><path d="M8 19l-5-6 5-3 5 3z" fill="currentColor" opacity={0.3} /></svg>
            </span>
            <span aria-hidden data-skala={skala.meter} className="prj-skala">
              {teksSkala}
              <svg width={Math.round(skala.px) + 2} height={6}><path d={`M1 0V5H${Math.round(skala.px) + 1}V0`} fill="none" stroke="currentColor" strokeOpacity={0.7} strokeWidth={1.5} /></svg>
            </span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="prj-atribusi" data-atribusi-osm>{t("atribusi")}</a>
          </div>

          {/* Ponsel: pilihan wilayah sebagai baris tombol di bawah peta. */}
          <div role="group" aria-label={t("pilihWilayah")} className="prj-pilihan-hp">
            {wilayah.map((w) => (
              <button key={w.id} type="button" onClick={() => pilihWilayah(w.id)} aria-pressed={w.id === aktif?.id} data-pilih-wilayah={w.id}
                className={`prj-chip ${w.id === aktif?.id ? "prj-chip-on" : ""}`}>{w.nama}</button>
            ))}
          </div>

          {/* Legenda sekaligus saringan. */}
          {jenisAda.length > 0 && (
            <div role="group" aria-label={t("legenda")} className="prj-legenda" data-legenda>
              {jenisAda.map((j) => {
                const Ikon = IKON_JENIS[j];
                const on = !sembunyi.includes(j);
                return (
                  <button key={j} type="button" onClick={() => alihJenis(j)} aria-pressed={on} data-legenda-jenis={j} className={`prj-legenda-butir ${on ? "" : "prj-legenda-mati"}`}>
                    <span style={{ background: on ? WARNA[j] : "#9AA3BF" }} className="prj-legenda-ikon"><Ikon size={13} /></span>
                    {dalam(TATA.jenis.find((x) => x.id === j)?.nama, bahasa)}
                  </button>
                );
              })}
              {adaSelam && <span className="prj-legenda-butir" data-legenda-selam><span className="prj-legenda-ikon prj-polos"><TandaSelam besar /></span>{t("selamSingkat")}</span>}
              {adaSorot && <span className="prj-legenda-butir"><span className="prj-legenda-ikon prj-polos"><span className="prj-cincin-contoh" /></span>{t("mitra")}</span>}
              <span className="prj-legenda-butir"><span aria-hidden className="prj-karang-contoh" />{t("karang")}</span>
              {sembunyi.length > 0 && <button type="button" onClick={() => setSembunyi([])} className="prj-tampil-semua">{t("tampilSemua")}</button>}
            </div>
          )}
        </div>

        <div aria-live="polite" className="prj-info" data-peta-info style={{ "--prj-tinggi-peta": `${Math.round(ukuran.h)}px` }}>
          {titik ? (
            <KartuTanda key={titik.id} x={titik} bahasa={bahasa} t={t} wilayah={wilayahDi.get(titik.wilayah)} href={tautan?.(titik)} onKembali={mundur} />
          ) : aktif ? (
            <InfoWilayah key={aktif.id} w={aktif} bahasa={bahasa} t={t} tanda={tandaWilayah} onPilih={pilihTitik} onPetaPenuh={() => pilihWilayah(null)} />
          ) : (
            <div className="prj-kartu" data-peta-awal>
              <p className="prj-kartu-judul">{t("awalJudul")}</p>
              <p className="prj-teks">{t("awalTeks")}</p>
              <div className="prj-pilihan-awal">
                {wilayah.map((w) => <button key={w.id} type="button" onClick={() => pilihWilayah(w.id)} data-pilih-wilayah-info={w.id} className="prj-chip">{w.nama}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lencana kecil tabung selam: tempat ini punya layanan selam sendiri. */
function TandaSelam({ besar = false }) {
  const Tabung = IKON_JENIS.dive;
  return <span aria-hidden style={{ background: WARNA.dive }} className={`prj-lencana-selam ${besar ? "prj-lencana-besar" : ""}`}><Tabung size={besar ? 11 : 9} /></span>;
}

/**
 * Wadah yang digulir di dalam kartu (layar lebar). Tepi atas dan bawahnya
 * memudar selama masih ada isi tersembunyi, sebagai tanda bisa digulir,
 * tanpa garis pemisah.
 */
function Gulir({ children, ...lain }) {
  const ref = useRef(null);
  const [ujung, setUjung] = useState({ atas: false, bawah: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const baca = () => setUjung({ atas: el.scrollTop > 2, bawah: el.scrollTop + el.clientHeight < el.scrollHeight - 2 });
    baca();
    el.addEventListener("scroll", baca, { passive: true });
    const ro = new ResizeObserver(baca);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", baca); ro.disconnect(); };
  }, []);
  const pudar = ujung.atas || ujung.bawah
    ? `linear-gradient(to bottom, ${ujung.atas ? "transparent" : "#000"} 0, #000 ${ujung.atas ? 28 : 0}px, #000 calc(100% - ${ujung.bawah ? 36 : 0}px), ${ujung.bawah ? "transparent" : "#000"} 100%)`
    : undefined;
  return (
    <div ref={ref} {...lain} data-gulir-atas={ujung.atas || undefined} data-gulir-bawah={ujung.bawah || undefined}
      style={{ maskImage: pudar, WebkitMaskImage: pudar }} className="prj-gulir">
      {children}
    </div>
  );
}

function InfoWilayah({ w, bahasa, t, tanda, onPilih, onPetaPenuh }) {
  const ket = dalam(w.keterangan, bahasa);
  return (
    <div className="prj-kartu prj-kartu-wilayah" data-info-wilayah={w.id}>
      <p className="prj-kartu-judul">{w.nama}</p>
      {ket && <p className="prj-teks">{ket}</p>}
      <p className="prj-label prj-label-daftar">{t("diWilayah", { wilayah: w.nama })}</p>
      {tanda.length === 0 ? (
        <p className="prj-teks">{t("belumAdaTanda")}</p>
      ) : (
        <Gulir data-gulir-tanda={w.id}>
          <ul className="prj-daftar" data-daftar-tanda={w.id}>
            {URUTAN_JENIS.flatMap((j) => tanda.filter((x) => x.jenis === j)).map((x) => {
              const Ikon = IKON_JENIS[x.jenis];
              const jenis = TATA.jenis.find((j) => j.id === x.jenis);
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => onPilih(x)} data-pilih-tanda={x.id} className="prj-butir">
                    <span style={{ background: WARNA[x.jenis] }} className={`prj-legenda-ikon prj-butir-ikon ${x.sorot ? "prj-bulat-sorot" : ""}`}><Ikon size={14} /></span>
                    <span className="prj-butir-teks">
                      <span className="prj-butir-nama">{x.nama}</span>
                      <span className="prj-butir-jenis">{dalam(jenis?.nama, bahasa)}{x.selam && x.jenis !== "dive" && x.jenis !== "selam" ? ` · ${t("selamSingkat")}` : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Gulir>
      )}
      <button type="button" onClick={onPetaPenuh} className="prj-kembali prj-kembali-penuh" data-kembali-peta-penuh>
        <span className="prj-putar-90"><IkonPanah size={13} /></span>{t("kembaliPetaPenuh")}
      </button>
    </div>
  );
}

function KartuTanda({ x, bahasa, t, wilayah, href, onKembali }) {
  const Ikon = IKON_JENIS[x.jenis] ?? IKON_JENIS.menarik;
  const jenis = TATA.jenis.find((j) => j.id === x.jenis);
  const maps = `https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`;
  const ket = dalam(x.keterangan, bahasa);
  return (
    <div className="prj-kartu prj-kartu-tanda" data-kartu-tanda={x.id}>
      {x.foto && <img src={x.foto} alt={x.nama} className="prj-foto" loading="lazy" />}
      <div className="prj-kartu-isi">
        <span style={{ background: WARNA[x.jenis] }} className="prj-jenis"><Ikon size={13} />{dalam(jenis?.nama, bahasa)}</span>
        <p className="prj-kartu-judul">{x.nama}</p>
        {ket && <p className="prj-teks">{ket}</p>}
        {x.selam && x.jenis !== "dive" && x.jenis !== "selam" && (
          <p className="prj-selam" data-kartu-selam><span className="prj-legenda-ikon prj-polos"><TandaSelam besar /></span>{t("selamDiTempat")}</p>
        )}
        <div className="prj-aksi">
          {href && <a href={href} className="prj-tombol" data-tanda-layanan>{t("lihatLayanan")}</a>}
          <a href={maps} target="_blank" rel="noopener noreferrer" className="prj-tombol-garis" data-tanda-maps><IkonPin size={14} />{t("bukaMaps")}</a>
        </div>
        {wilayah && (
          <button type="button" onClick={onKembali} className="prj-kembali" data-kembali-wilayah>
            <span className="prj-putar-90"><IkonPanah size={13} /></span>{t("kembaliKe", { wilayah: wilayah.nama })}
          </button>
        )}
      </div>
    </div>
  );
}
