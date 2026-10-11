// Zanclus dive gallery under "Explore the ocean". Editable in the CMS; each
// photo has an Indonesian and English caption.
export const galleryLimit = 24;
const photo = (src, id, en) => ({ src, caption: { id, en } });
export const defaultGallery = {
  items: [
    photo(
      "/assets/photos/gallery-dive.webp",
      "Menyelam bersama tim Zanclus",
      "Diving with the Zanclus team",
    ),
    photo(
      "/assets/reef.webp",
      "Penyu di antara terumbu",
      "A turtle among the reefs",
    ),
    photo(
      "/assets/photos/ocean-manta.webp",
      "Manta di laut terbuka",
      "A manta in open water",
    ),
    photo(
      "/assets/photos/fan-coral.webp",
      "Warna karang Raja Ampat",
      "The colours of Raja Ampat coral",
    ),
    photo(
      "/assets/photos/fan-turtle.webp",
      "Bertemu penyu",
      "Meeting a turtle",
    ),
    photo(
      "/assets/photos/fan-freedive.webp",
      "Freediving di air jernih",
      "Freediving in clear water",
    ),
    photo(
      "/assets/photos/diving-cover.webp",
      "Lengkungan batu bawah laut",
      "An underwater rock arch",
    ),
    photo(
      "/assets/photos/snorkeling-cover.webp",
      "Snorkeling dekat pulau",
      "Snorkeling near the islands",
    ),
    photo(
      "/assets/photos/fan-beach.webp",
      "Pulau dan pantai",
      "Islands and beaches",
    ),
    photo(
      "/assets/photos/trip-cover.webp",
      "Perjalanan ke pulau",
      "Heading out to the islands",
    ),
  ],
};

export const galleryCaption = (item, locale) =>
  (locale === "en" && item.caption.en) || item.caption.id;
