import { legalMetadata, legalRoute } from "../../src/server/legal-route.jsx";

export const dynamic = "force-dynamic";
export const generateMetadata = () => legalMetadata("terms");
export default function Page() {
  return legalRoute("terms");
}
