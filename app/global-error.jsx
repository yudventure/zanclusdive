"use client";
import StatusView from "../src/components/StatusView.jsx";

// Last resort when even the root layout fails: a full page of its own.
export default function GlobalError() {
  const id =
    typeof window !== "undefined" &&
    /^\/id(\/|$)/.test(window.location.pathname);
  return (
    <html lang={id ? "id" : "en"}>
      <body style={{ margin: 0, background: "#031b29" }}>
        <StatusView
          kind="500"
          locale={id ? "id" : "en"}
          whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285190849237"}
        />
      </body>
    </html>
  );
}
