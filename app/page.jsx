import HomePage from "../src/HomePage.jsx";
import { publicContent } from "../src/server/store.js";
import { isDemo } from "../src/cms-mode.js";
export const dynamic = "force-dynamic";
export default async function Page() {
  return <HomePage content={await publicContent()} demo={isDemo()} />;
}
