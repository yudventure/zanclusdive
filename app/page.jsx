import HomePage from "../src/HomePage.jsx";
import { publicContent } from "../src/server/store.js";
import { requestLocale } from "../src/server/locale.js";
import { localizeContent } from "../src/content-i18n.js";
import { developerGate } from "../src/server/developer-gate.jsx";
import { paymentOptions } from "../src/server/payments.js";
export const dynamic = "force-dynamic";
export default async function Page() {
  const locale = await requestLocale();
  const content = localizeContent(await publicContent(), locale);
  const { locks, blocked } = await developerGate("home", content, locale);
  if (blocked) return blocked;
  return (
    <HomePage
      content={content}
      locale={locale}
      locks={locks}
      payments={paymentOptions(content)}
    />
  );
}
