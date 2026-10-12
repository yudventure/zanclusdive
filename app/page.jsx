import HomePage from "../src/HomePage.jsx";
import { publicContent } from "../src/server/store.js";
import { requestLocale } from "../src/server/locale.js";
import { localizeContent } from "../src/content-i18n.js";
export const dynamic = "force-dynamic";
export default async function Page() {
  const locale = await requestLocale();
  return (
    <HomePage
      content={localizeContent(await publicContent(), locale)}
      locale={locale}
    />
  );
}
