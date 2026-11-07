"use client";
import { usePathname } from "next/navigation";
import StatusView from "../src/components/StatusView.jsx";

// Shown when a page fails while rendering (HTTP 500).
export default function Error() {
  const path = usePathname() ?? "/";
  return (
    <StatusView
      kind="500"
      locale={/^\/id(\/|$)/.test(path) ? "id" : "en"}
      whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285190969308"}
    />
  );
}
