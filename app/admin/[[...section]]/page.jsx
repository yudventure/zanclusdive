import { notFound, redirect } from "next/navigation";
import { currentAdmin, demoLoginEnabled } from "../../../src/server/auth.js";
import { configurationIssues } from "../../../src/cms-config.js";
import { isDemo } from "../../../src/cms-mode.js";
import Login from "../../../src/admin/Login.jsx";
import Dashboard from "../../../src/admin/Dashboard.jsx";
import { sectionKeys } from "../../../src/roles.js";
import "../admin.css";
import "../admin-shell.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Zanclus Admin",
  robots: { index: false, follow: false },
};
export default async function AdminPage({ params }) {
  const { section } = await params;
  const active = section?.[0] || "overview";
  // Reservasi is now the list under the reservation calendar.
  if (active === "reservations" && section.length === 1)
    redirect("/admin/calendar#daftar-reservasi");
  if (section?.length > 1 || !sectionKeys.includes(active)) notFound();
  const admin = await currentAdmin();
  if (!admin) {
    const demo = isDemo();
    const issues = demo ? [] : configurationIssues();
    return (
      <Login
        configured={issues.length === 0}
        issues={issues}
        demo={demoLoginEnabled()}
        database={!demo}
      />
    );
  }
  return (
    <Dashboard
      section={active}
      account={admin}
      today={new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Jayapura",
      })}
    />
  );
}
