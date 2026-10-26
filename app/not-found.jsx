import StatusView from "../src/components/StatusView.jsx";
import { publicContent } from "../src/server/store.js";
import { requestLocale } from "../src/server/locale.js";

export const metadata = {
  title: "404 · Zanclus Dive Center",
  robots: { index: false },
};
export default async function NotFound() {
  const locale = await requestLocale();
  const content = await publicContent();
  return (
    <StatusView
      kind="404"
      locale={locale}
      whatsapp={content.contact?.whatsapp}
    />
  );
}
