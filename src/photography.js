// Local concept imagery: each placement has its own scene, without external requests.
export const photographyVersion = 1;
export const siteImageFields = [
  ["hero", "Sampul beranda"],
  ["reef", "Jelajahi laut — kehidupan terumbu"],
  ["ocean", "Jelajahi laut — laut terbuka"],
  ["galleryDive", "Galeri — scuba diving"],
  ["galleryFreedive", "Galeri — freediving"],
  ["galleryCoral", "Galeri — kehidupan karang"],
  ["galleryTurtle", "Galeri — penyu"],
  ["galleryIsland", "Galeri — pulau & pantai"],
  ["shop", "Sampul Dive Shop — perlengkapan"],
];
export const defaultSiteImages = {
  hero: "/assets/hero.webp",
  reef: "/assets/reef.webp",
  ocean: "/assets/photos/ocean-manta.webp",
  galleryDive: "/assets/photos/gallery-dive.webp",
  galleryFreedive: "/assets/photos/fan-freedive.webp",
  galleryCoral: "/assets/photos/fan-coral.webp",
  galleryTurtle: "/assets/photos/fan-turtle.webp",
  galleryIsland: "/assets/photos/fan-beach.webp",
  shop: "/assets/photos/gear.webp",
};
export const activityPhotos = {
  diving: {
    image: "/assets/photos/diving-cover.webp",
    imageAlt:
      "Visual konsep penyelam menjelajahi lengkungan batu di bawah laut",
    cardImage: "/assets/photos/diving-card.webp",
    cardImageAlt: "Visual konsep dua penyelam di atas terumbu",
  },
  snorkeling: {
    image: "/assets/photos/snorkeling-cover.webp",
    imageAlt: "Visual konsep snorkeling di perairan dangkal dekat pulau",
    cardImage: "/assets/photos/snorkeling.webp",
    cardImageAlt: "Visual konsep snorkeler di permukaan air di atas terumbu",
  },
  trip: {
    image: "/assets/photos/trip-cover.webp",
    imageAlt:
      "Visual konsep perjalanan laut dari dek kapal menuju pulau tropis",
    cardImage: "/assets/photos/trip.webp",
    cardImageAlt: "Visual konsep kapal trip melintasi laguna dan pulau karst",
  },
};
export const builtInPhotos = [
  ...siteImageFields.map(([key, label]) => [defaultSiteImages[key], label]),
  ...Object.entries(activityPhotos).flatMap(([key, photo]) => [
    [photo.cardImage, `${key} — kartu pengalaman`],
    [photo.image, `${key} — sampul halaman`],
  ]),
];
const responsivePhotos = [
  ...Object.values(activityPhotos).flatMap((photo) => [
    photo.image,
    photo.cardImage,
  ]),
  defaultSiteImages.shop,
  defaultSiteImages.ocean,
];
export function photoSrcSet(url) {
  if (!responsivePhotos.includes(url)) return undefined;
  const width = url.includes("-cover.")
    ? 1536
    : url === defaultSiteImages.shop
      ? 1000
      : url === defaultSiteImages.ocean
        ? 1200
        : 900;
  return `${url.replace(".webp", "-small.webp")} ${width === 1536 ? 768 : width / 2}w, ${url} ${width}w`;
}
const legacyActivityImages = {
  diving: "/assets/hero.webp",
  snorkeling: "/assets/reef.webp",
  trip: "/assets/ocean.webp",
};
const legacyCaptions = {
  diving: "Visual konsep petualangan menyelam di bawah laut",
  snorkeling:
    "Visual konsep terumbu dan kehidupan laut untuk pengalaman snorkeling",
  trip: "Visual konsep laut untuk inspirasi perjalanan bersama Zanclus",
};

// Upgrade only former bundled defaults. Owner uploads, URLs, copy and prices survive.
// The version prevents a later deliberate selection of an old asset being remapped.
export function withPhotography(content) {
  const current = content.photographyVersion >= photographyVersion;
  const images = { ...defaultSiteImages, ...content.images };
  if (!current && images.ocean === "/assets/ocean.webp")
    images.ocean = defaultSiteImages.ocean;
  const activities = Object.fromEntries(
    Object.entries(content.activities || {}).map(([key, activity]) => {
      const defaults = activityPhotos[key];
      if (!defaults) return [key, activity];
      const legacy = !current && activity.image === legacyActivityImages[key];
      return [
        key,
        {
          ...activity,
          ...(legacy
            ? {
                image: defaults.image,
                ...(activity.imageAlt === legacyCaptions[key]
                  ? { imageAlt: defaults.imageAlt }
                  : {}),
              }
            : {}),
          cardImage:
            activity.cardImage ||
            (legacy
              ? defaults.cardImage
              : activity.image || defaults.cardImage),
          cardImageAlt:
            activity.cardImageAlt ||
            (legacy
              ? defaults.cardImageAlt
              : activity.imageAlt || defaults.cardImageAlt),
        },
      ];
    }),
  );
  return { ...content, photographyVersion, images, activities };
}
