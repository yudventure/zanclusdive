"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminIcon } from "./icons.jsx";
import { areas, sections, roleLabel, roles } from "../roles.js";
import { greeting } from "./Overview.jsx";

// The hour in WIT, after hydration so the server and browser agree.
function useHour() {
  const [hour, setHour] = useState(null);
  useEffect(() => {
    setHour(
      Number(
        new Date().toLocaleString("en-US", {
          hour: "numeric",
          hourCycle: "h23",
          timeZone: "Asia/Jayapura",
        }),
      ),
    );
  }, []);
  return hour;
}

// The overview for a role without the reservation desk: a greeting and a
// card for every page the role may open.
export function RoleHome({ account, menu }) {
  const hour = useHour();
  const name = account.name || account.email.split("@")[0];
  const items = menu.flatMap((group) => group.items);
  return (
    <div className="admin-role-home">
      <section className="admin-card">
        <h2>
          {hour === null ? "Halo" : greeting(hour)}, {name}
        </h2>
        <p className="admin-subtle">
          Peran <b>{roleLabel(account.role)}</b>: {roles[account.role]?.who}
        </p>
      </section>
      <div className="admin-role-grid">
        {items
          .filter((key) => key !== "overview")
          .map((key) => (
            <Link key={key} href={"/admin/" + key} className="admin-role-card">
              <AdminIcon name={key} />
              <strong>{sections[key].title}</strong>
              <span>{areas[sections[key].area] ?? "Akun Anda sendiri"}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
