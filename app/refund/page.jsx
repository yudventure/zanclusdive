import { legalMetadata, legalRoute } from "../../src/server/legal-route.jsx";

export const dynamic = "force-dynamic";
export const generateMetadata = () => legalMetadata("refund");
export default function Page() {
  return legalRoute("refund");
}
