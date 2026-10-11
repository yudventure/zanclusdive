// Ikon garis 2 px, sudut membulat, satu warna (currentColor). Tiap jenis tanda
// dibedakan dua kali, ikon dan warna (tata.json), supaya tetap terbaca oleh
// yang sulit membedakan warna dan saat dicetak hitam putih.
const dasar = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const svg = (isi) => function Ikon({ size = 14 }) { return <svg {...dasar} width={size} height={size}>{isi}</svg>; };

export const IkonKampung = svg(<><path d="M3.5 11 12 4l8.5 7" /><path d="M5.8 9.3V19a1.5 1.5 0 0 0 1.5 1.5h9.4a1.5 1.5 0 0 0 1.5-1.5V9.3" /><path d="M10 20.5v-5.2h4v5.2" /></>);
export const IkonTidur = svg(<><path d="M3 18.5V6.5" /><path d="M3 14.5h18v4" /><path d="M21 14.5v-2.2a3 3 0 0 0-3-3h-7.5v5.2" /><circle cx="6.8" cy="11.3" r="1.9" /></>);
export const IkonTabung = svg(<><path d="M9 8.5a3 3 0 0 1 6 0V19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><path d="M12 5.5V3M10 3h4M9 12h6" /></>);
export const IkonIkan = svg(<><path d="M21 12c-2.6 3.4-5.6 5-9 5-3.1 0-5.5-1.5-7-3.3L2.5 16V8L5 10.3C6.5 8.5 8.9 7 12 7c3.4 0 6.4 1.6 9 5z" /><circle cx="16.4" cy="11.2" r="0.9" fill="currentColor" stroke="none" /></>);
export const IkonMata = svg(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IkonPayung = svg(<><path d="M3 12a9 9 0 0 1 18 0z" /><path d="M12 12v7a2 2 0 0 0 4 0" /></>);
export const IkonBurung = svg(<><path d="M3 15c3 .8 6 .3 8-2l2.6-4.2c1-1.6 3-1.9 4.2-.7L21 9l-2.8 1-.9 2.8C16 17 13 19 9 19c-2.6 0-4.6-1.3-6-4z" /><path d="M11 13l-3-5" /><circle cx="16.6" cy="9.3" r="0.8" fill="currentColor" stroke="none" /></>);
export const IkonJangkar = svg(<><circle cx="12" cy="5" r="2" /><path d="M12 7v14M8 11h8M4 13a8 8 0 0 0 16 0" /></>);
export const IkonBintang = svg(<path d="M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.1l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z" />);
export const IkonPerahu = svg(<><path d="M2.5 13.5h19l-2 4.4a2 2 0 0 1-1.82 1.1H6.32a2 2 0 0 1-1.82-1.1z" /><path d="M6.5 13.5V9a1.5 1.5 0 0 1 1.5-1.5h6.2l3.3 6" /></>);
export const IkonPanah = svg(<path d="M6 9l6 6 6-6" />);
export const IkonPin = svg(<><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>);

/** Ikon per jenis tanda (urutan dan warnanya di data/tata.json). */
export const IKON_JENIS = {
  kampung: IkonKampung,
  homestay: IkonTidur,
  dive: IkonTabung,
  selam: IkonIkan,
  pandang: IkonMata,
  pantai: IkonPayung,
  burung: IkonBurung,
  pelabuhan: IkonJangkar,
  menarik: IkonBintang,
};
