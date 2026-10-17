// The best size for each photo slot in the admin, shown with its upload
// button: width × height in pixels and the shape it is shown in. Larger
// photos are fine, the browser makes them smaller before the upload (the
// longest side at most 2400 px), but a smaller or differently shaped photo
// looks soft or is cropped.
export const photoGuides = {
  hero: { size: "1920 × 1080", ratio: "16:9", tip: "objek utama di tengah" },
  reef: { size: "1200 × 800", ratio: "3:2" },
  ocean: { size: "1200 × 800", ratio: "3:2" },
  gallery: { size: "1200 × 800", ratio: "3:2" },
  shop: { size: "1600 × 1067", ratio: "3:2" },
  course: {
    size: "1920 × 1080",
    ratio: "16:9",
    tip: "foto gelap supaya teks terbaca",
  },
  activityCover: { size: "1920 × 1080", ratio: "16:9" },
  activityCard: { size: "1200 × 800", ratio: "3:2" },
  courseCard: { size: "1600 × 900", ratio: "16:9" },
  bannerBackground: {
    size: "2400 × 1200",
    ratio: "2:1",
    tip: "objek utama di sisi kanan, sisi kiri untuk tulisan",
  },
  diveGallery: {
    size: "1600 × 1067",
    ratio: "3:2",
    tip: "foto tegak juga bisa",
  },
  service: { size: "1600 × 1067", ratio: "3:2" },
  about: { size: "1600 × 1067", ratio: "3:2" },
  product: {
    size: "1200 × 1200",
    ratio: "1:1",
    tip: "latar polos, alat terlihat utuh",
  },
  logo: {
    size: "lebar minimal 600 px",
    tip: "PNG latar transparan, tepi kosong dipotong otomatis",
  },
  collection: { size: "sisi panjang 1600–2400 px" },
};

// "Terbaik 1920 × 1080 px, rasio 16:9, objek utama di tengah"
export function photoGuide(key) {
  const guide = photoGuides[key];
  if (!guide) return "";
  const size = /^\d/.test(guide.size)
    ? `Terbaik ${guide.size} px`
    : guide.size[0].toUpperCase() + guide.size.slice(1);
  return [size, guide.ratio && `rasio ${guide.ratio}`, guide.tip]
    .filter(Boolean)
    .join(", ");
}
