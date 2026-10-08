// Return variable names and validation messages only, never credential values.
export function mysqlSettings(env = process.env) {
  const host = env.MYSQL_HOST?.trim();
  const socketPath = env.MYSQL_SOCKET?.trim();
  return {
    // IPv6 localhost (::1) can match different MySQL grants from IPv4.
    host: !socketPath && host?.toLowerCase() === "localhost" ? "127.0.0.1" : host,
    port: Number(env.MYSQL_PORT?.trim() || 3306),
    database: env.MYSQL_DATABASE?.trim(),
    user: env.MYSQL_USER?.trim(),
    // Password bytes must be preserved, including intentional spaces and #/$.
    password: env.MYSQL_PASSWORD,
    ...(socketPath ? { socketPath } : {}),
    connectTimeout: 10000,
    ...(env.MYSQL_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

export function databaseIssues(env = process.env) {
  const issues = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]
    .filter((name) => !env[name]?.trim())
    .map((name) => ({ name, reason: "Belum diisi atau belum terbaca oleh aplikasi." }));
  for (const name of ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]) {
    if (env[name]?.trim().startsWith("GANTI_DENGAN_"))
      issues.push({ name, reason: "Masih memakai teks contoh; isi nilai yang sebenarnya." });
  }
  const host = env.MYSQL_HOST?.trim();
  if (host && (host.includes("://") || host.includes("/") || /^["']|["']$/.test(host)))
    issues.push({ name: "MYSQL_HOST", reason: "Isi hostname saja, tanpa URL, path, atau tanda kutip." });
  const port = mysqlSettings(env).port;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    issues.push({ name: "MYSQL_PORT", reason: "Isi port angka antara 1 dan 65535." });
  return issues;
}

export function configurationIssues(env = process.env) {
  const issues = databaseIssues(env);
  if (!env.ADMIN_EMAIL?.trim()) {
    issues.push({ name: "ADMIN_EMAIL", reason: "Belum diisi atau belum terbaca oleh aplikasi." });
  }
  for (const [name, minimum] of [["ADMIN_PASSWORD", 12], ["SESSION_SECRET", 32]]) {
    if (!env[name]?.trim()) {
      issues.push({ name, reason: "Belum diisi atau belum terbaca oleh aplikasi." });
    } else if (env[name].length < minimum) {
      issues.push({ name, reason: `Harus memiliki minimal ${minimum} karakter.` });
    } else if (env[name].trim().startsWith("GANTI_DENGAN_")) {
      issues.push({ name, reason: "Masih memakai teks contoh; buat nilai rahasia sendiri." });
    }
  }
  return issues;
}
