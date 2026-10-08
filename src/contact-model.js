export const socialPlatforms = {
  instagram: {
    label: "Instagram",
    url: "https://www.instagram.com/",
    hosts: ["instagram.com", "www.instagram.com"],
  },
  facebook: {
    label: "Facebook",
    url: "https://www.facebook.com/",
    hosts: ["facebook.com", "www.facebook.com"],
  },
  tiktok: {
    label: "TikTok",
    url: "https://www.tiktok.com/",
    hosts: ["tiktok.com", "www.tiktok.com"],
  },
  youtube: {
    label: "YouTube",
    url: "https://www.youtube.com/",
    hosts: ["youtube.com", "www.youtube.com"],
  },
};
export const blankSocials = Object.fromEntries(
  Object.keys(socialPlatforms).map((key) => [key, ""]),
);
export const demoSocials = Object.fromEntries(
  Object.entries(socialPlatforms).map(([key, platform]) => [key, platform.url]),
);
export function withContactFields(content) {
  return { ...content, contact: { ...blankSocials, ...content.contact } };
}
export function phoneLabel(phone) {
  return phone.startsWith("62") ? "0" + phone.slice(2) : "+" + phone;
}
