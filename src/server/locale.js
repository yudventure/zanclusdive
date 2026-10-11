import "server-only";
import { headers } from "next/headers";
import { localeHeader, normalizeLocale } from "../i18n.js";

// Set by proxy.js: "id" for /id pages, "en" everywhere else.
export async function requestLocale() {
  return normalizeLocale((await headers()).get(localeHeader));
}

// hreflang alternates for a public path given without the /id prefix.
export function languageAlternates(path) {
  const id = path === "/" ? "/id" : "/id" + path;
  return { en: path, id: id, "x-default": path };
}
