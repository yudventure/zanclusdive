const messages = {
  ER_ACCESS_DENIED_ERROR: "MySQL menolak login database. Periksa MYSQL_USER dan MYSQL_PASSWORD di hPanel, lalu pastikan user diizinkan mengakses dari server Node.js.",
  ER_DBACCESS_DENIED_ERROR: "User MySQL tidak memiliki akses ke database. Hubungkan user ke database yang sesuai dan berikan izin di hPanel.",
  ER_HOST_NOT_PRIVILEGED: "Server Node.js belum diizinkan mengakses MySQL. Tambahkan IP keluar aplikasi ke Remote MySQL untuk database Zanclus. IP yang diizinkan adalah IP aplikasi, bukan IP database.",
  ER_BAD_DB_ERROR: "Database tidak ditemukan. Periksa MYSQL_DATABASE dan gunakan nama lengkap termasuk prefix Hostinger.",
  ER_TABLEACCESS_DENIED_ERROR: "Izin tabel MySQL ditolak. User memerlukan CREATE, SELECT, INSERT, UPDATE, dan DELETE pada database Zanclus.",
  ER_SPECIFIC_ACCESS_DENIED_ERROR: "Operasi MySQL ditolak karena izin user. Periksa izin user pada database Zanclus di hPanel.",
  ENOTFOUND: "Hostname MySQL tidak ditemukan. Periksa MYSQL_HOST; isi hostname saja, tanpa https:// atau nomor port.",
  EAI_AGAIN: "Hostname MySQL belum dapat di-resolve. Coba lagi; jika berlanjut, periksa hostname dan DNS layanan hosting.",
  ECONNREFUSED: "Koneksi MySQL ditolak oleh server. Periksa MYSQL_HOST, MYSQL_PORT, dan akses koneksi dari Node.js Web App dengan Hostinger.",
  ETIMEDOUT: "Koneksi MySQL melewati batas waktu. Periksa akses jaringan; jika koneksi remote diperlukan, izinkan IP keluar Node.js Web App pada Remote MySQL.",
  EHOSTUNREACH: "Server MySQL tidak dapat dijangkau. Periksa akses jaringan dari aplikasi Node.js dengan Hostinger.",
  ENETUNREACH: "Jaringan menuju MySQL tidak dapat dijangkau. Periksa akses jaringan dari aplikasi Node.js dengan Hostinger.",
  PROTOCOL_CONNECTION_LOST: "Koneksi MySQL terputus. Coba lagi; jika berlanjut, periksa layanan database di Hostinger.",
  HANDSHAKE_SSL_ERROR: "Negosiasi TLS MySQL gagal. Periksa persyaratan MYSQL_SSL dari penyedia database.",
  DEPTH_ZERO_SELF_SIGNED_CERT: "Sertifikat TLS MySQL tidak dipercaya. Minta konfigurasi sertifikat yang benar dari penyedia database; jangan menonaktifkan verifikasi.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "Sertifikat TLS MySQL belum dapat diverifikasi. Periksa konfigurasi sertifikat dengan penyedia database.",
};

export function databaseFailure(error) {
  // Never forward SQL, addresses, usernames, passwords, or raw driver messages.
  const code = Object.hasOwn(messages, error?.code) ? error.code : "DATABASE_UNAVAILABLE";
  return {
    code,
    error: messages[code] || "Database belum dapat diakses. Periksa konfigurasi MySQL di hPanel dan hubungi Hostinger jika koneksi tetap gagal.",
  };
}

export function connectingHost(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  const pattern = error?.code === "ER_ACCESS_DENIED_ERROR"
    ? /Access denied for user '[^']*'@'([A-Za-z0-9_.:%-]{1,255})'/
    : error?.code === "ER_HOST_NOT_PRIVILEGED"
      ? /Host '([A-Za-z0-9_.:%-]{1,255})' is not allowed/
      : null;
  return pattern ? message.match(pattern)?.[1] : undefined;
}
