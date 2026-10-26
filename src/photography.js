// Local concept imagery: each placement has its own scene, without external requests.
export const photographyVersion = 1;
export const siteImageFields = [
  // [key, label, best size in src/admin/photo-guide.js]
  ["hero", "Sampul beranda", "hero"],
  ["reef", "Jelajahi laut, kehidupan terumbu", "reef"],
  ["ocean", "Jelajahi laut, laut terbuka", "ocean"],
  ["galleryDive", "Galeri, scuba diving", "gallery"],
  ["galleryFreedive", "Galeri, freediving", "gallery"],
  ["galleryCoral", "Galeri, kehidupan karang", "gallery"],
  ["galleryTurtle", "Galeri, penyu", "gallery"],
  ["galleryIsland", "Galeri, pulau & pantai", "gallery"],
  ["shop", "Sampul Dive Shop, perlengkapan", "shop"],
  ["course", "Latar bagian kursus beranda (foto selam gelap)", "course"],
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
  course: "/assets/photos/course-cover.webp",
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
// The owner's photos behind the homepage banners.
export const bannerPhotos = {
  turtle: "/assets/photos/banner-penyu.webp",
  cave: "/assets/photos/banner-gua.webp",
};
export const builtInPhotos = [
  ...siteImageFields.map(([key, label]) => [defaultSiteImages[key], label]),
  [bannerPhotos.turtle, "Banner, penyelam dan penyu"],
  [bannerPhotos.cave, "Banner, penyelam di gua bawah laut"],
  ...Object.entries(activityPhotos).flatMap(([key, photo]) => [
    [photo.cardImage, `${key}, kartu pengalaman`],
    [photo.image, `${key}, sampul halaman`],
  ]),
];
const responsivePhotos = [
  ...Object.values(activityPhotos).flatMap((photo) => [
    photo.image,
    photo.cardImage,
  ]),
  defaultSiteImages.shop,
  defaultSiteImages.ocean,
  defaultSiteImages.course,
  ...Object.values(bannerPhotos),
];
// Uploaded photos (/api/media/<id>) also come smaller, from ?w=, so a
// phone loads a photo the size of its screen.
export const mediaWidths = [480, 828, 1280, 1920];
export const isMediaPath = (url) =>
  /^\/api\/media\/[a-f0-9-]{36}$/.test(url ?? "");
export function photoSrcSet(url) {
  if (isMediaPath(url))
    return mediaWidths.map((width) => `${url}?w=${width} ${width}w`).join(", ");
  if (!responsivePhotos.includes(url)) return undefined;
  const width = url.includes("-cover.")
    ? 1536
    : url.includes("/banner-")
      ? 1600
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
