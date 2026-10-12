import { redirect } from "next/navigation";
import { requestLocale } from "../../src/server/locale.js";
import { localeHref } from "../../src/i18n.js";

// The activity calendar moved into the diving page.
export default async function Page() {
  redirect(localeHref(await requestLocale(), "/diving#calendar"));
}
