import { notFound } from "next/navigation";
import { currentAdmin, authConfigured } from "../../../src/server/auth.js";
import Login from "../../../src/admin/Login.jsx";
import Dashboard from "../../../src/admin/Dashboard.jsx";
import "../admin.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Zanclus Admin",
  robots: { index: false, follow: false },
};
export default async function AdminPage({ params }) {
  const { section } = await params;
  const active = section?.[0] || "overview";
  if (
    section?.length > 1 ||
    ![
      "overview",
      "calendar",
      "reservations",
      "customers",
      "website",
      "media",
      "experiences",
      "contact",
    ].includes(active)
  )
    notFound();
  const admin = await currentAdmin();
  if (!admin) return <Login configured={authConfigured()} />;
  return (
    <Dashboard
      section={active}
      email={admin.email}
      today={new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jayapura",
      })}
    />
  );
}
