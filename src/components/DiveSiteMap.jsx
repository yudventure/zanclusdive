"use client";
import PetaRajaAmpat from "./peta-raja-ampat/PetaRajaAmpat.jsx";
import TANDA from "./peta-raja-ampat/data/tanda.json";
import { dictionary, localeHref } from "../i18n.js";

// Only the dive sites from the shared Raja Ampat map data.
const diveSites = TANDA.filter((tanda) => tanda.jenis === "selam");

export default function DiveSiteMap({ locale }) {
  const t = dictionary(locale).diveSites;
  return (
    <section
      className="dive-sites-section"
      id="dive-sites"
      aria-labelledby="dive-sites-title"
    >
      <div className="dive-sites-heading" data-reveal>
        <div>
          <p className="eyebrow">DIVE SITE RAJA AMPAT</p>
          <h2 id="dive-sites-title">{t.title}</h2>
        </div>
        <div>
          <p>{t.intro}</p>
          <p className="dive-sites-note">{t.note}</p>
        </div>
      </div>
      <PetaRajaAmpat
        bahasa={locale}
        tanda={diveSites}
        judul={false}
        teks={t.map}
        tautan={() => localeHref(locale, "/diving#prices")}
        className="peta-zanclus"
      />
    </section>
  );
}
