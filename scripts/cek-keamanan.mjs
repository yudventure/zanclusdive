// Stops while any package in package-lock.json has a known security hole,
// the same list hPanel shows under Keamanan, Vulnerabilities. The owner
// asked for it in October 2026, after hPanel flagged next 16.4.0 and
// nodemailer 10.0.10. npm run zip:hostinger runs it first, so no ZIP goes
// out with one, and GitHub runs it on every push and every morning. It
// reads the lockfile only, so node_modules is not needed.
import { spawnSync } from "node:child_process";

const levels = {
  critical: "kritis",
  high: "tinggi",
  moderate: "sedang",
  low: "rendah",
};
const run = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
let report = null;
try {
  report = JSON.parse(run.stdout);
} catch {}
if (!report || report.error || !report.vulnerabilities) {
  console.error(
    "Pemeriksaan keamanan paket gagal, hasil npm audit tidak terbaca.",
  );
  console.error(report?.error?.summary || run.stderr?.trim() || "");
  console.error("Periksa koneksi ke registry npm, lalu ulangi.");
  process.exit(1);
}
const found = Object.values(report.vulnerabilities).filter(
  (v) => v.severity in levels,
);
if (!found.length) {
  console.log("Keamanan paket aman, npm audit tidak menemukan celah.");
  process.exit(0);
}
console.error(`Ada ${found.length} paket dengan celah keamanan.`);
for (const v of found) {
  const fix =
    typeof v.fixAvailable === "object"
      ? `perbarui ke ${v.fixAvailable.name} ${v.fixAvailable.version}`
      : v.fixAvailable
        ? "perbaiki dengan npm audit fix"
        : "belum ada versi perbaikan";
  console.error(`\n${v.name} ${v.range}, ${levels[v.severity]}, ${fix}`);
  for (const via of v.via)
    console.error(
      typeof via === "string"
        ? `  lewat paket ${via}`
        : `  ${via.title} ${via.url}`,
    );
}
console.error(
  "\nPerbarui paketnya, build, jalankan tes, lalu ulangi. ZIP Hostinger tidak dibuat selama masih ada celah.",
);
process.exit(1);
