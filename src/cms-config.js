// Return variable names and validation messages only, never credential values.
export function databaseIssues(env = process.env) {
  return ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]
    .filter((name) => !env[name]?.trim())
    .map((name) => ({ name, reason: "Belum diisi atau belum terbaca oleh aplikasi." }));
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
    }
  }
  return issues;
}
