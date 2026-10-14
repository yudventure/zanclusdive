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

// The modules that come in the next phases. Each already has its place in
// the menu and its role, so accounts can be made now.
const modules = {
  finance: {
    phase: 3,
    role: "finance",
    intro: "Laporan keuangan: buku kas, laba rugi, dan pajak.",
    items: [
      "Buku kas: pemasukan dan pengeluaran berkategori",
      "Pembayaran Midtrans masuk otomatis sebagai pemasukan",
      "Laba rugi per bulan",
      "Rekap pajak dan ekspor Excel",
    ],
  },
  gudang: {
    phase: 4,
    role: "gudang",
    intro: "Manajemen stok dan keluar masuk barang.",
    items: [
      "Barang dan stok saat ini",
      "Barang masuk dan keluar dengan catatan",
      "Stok minimum dengan peringatan",
      "Terhubung ke Dive Shop (jual dan sewa) dan servis alat",
    ],
  },
  social: {
    phase: 5,
    role: "pr",
    intro:
      "Perencanaan sampai evaluasi konten media sosial, satu kalender untuk semua platform.",
    items: [
      "Kalender konten per platform: Instagram, TikTok, Facebook, YouTube",
      "Status tiap konten: ide → draf → jadwal → tayang → evaluasi",
      "Evaluasi: jangkauan, suka, komentar, simpan",
      "Rencana bulanan dan ringkasan hasil",
    ],
  },
};
export default function ModulePlaceholder({ module }) {
  const info = modules[module];
  if (!info) return null;
  return (
    <section className="admin-card admin-module">
      <p className="admin-phase">Tahap {info.phase} · Belum tersedia</p>
      <h2>{sections[module].title}</h2>
      <p className="admin-subtle">{info.intro}</p>
      <ul className="admin-module-list">
        {info.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="admin-subtle">
        Bagian ini sudah punya tempat di menu dan peran{" "}
        <b>{roleLabel(info.role)}</b>, jadi akunnya bisa dibuat sekarang. Isinya
        menyusul di tahap berikutnya.
      </p>
    </section>
  );
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
