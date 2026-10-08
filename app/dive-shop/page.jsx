import DiveShop from "../../src/shop/DiveShop.jsx";
import { publicContent } from "../../src/server/store.js";
import { isDemo } from "../../src/cms-mode.js";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dive Shop — Perlengkapan & Rental | Zanclus Dive Center",
  description:
    "Jelajahi perlengkapan diving untuk dibeli atau disewa. Susun kebutuhan alatmu dan konfirmasi bersama tim Zanclus melalui WhatsApp.",
};
export default async function ShopPage({ searchParams }) {
  const query = await searchParams;
  const content = await publicContent();
  return (
    <DiveShop
      shop={content.shop}
      contact={content.contact}
      images={content.images}
      activities={content.activities}
      demo={isDemo()}
      initialMode={query.mode === "rental" ? "rental" : "sale"}
      today={new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jayapura",
      })}
    />
  );
}
