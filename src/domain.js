export const experiences = {
  beginner: {
    title: "Mulai menyelam",
    description:
      "Langkah pertama untuk mengenal dunia bawah laut. Diskusikan pengalaman dan kebutuhanmu agar tim dapat membantu memilih aktivitas yang sesuai.",
    items: [
      "Pengenalan persiapan dan perlengkapan",
      "Diskusi pengalaman dan kenyamanan di air",
      "Rencana aktivitas sesuai kemampuan",
    ],
  },
  explorer: {
    title: "Jelajah laut",
    description:
      "Untuk kamu yang ingin lebih dekat dengan kehidupan laut. Susun rencana bersama tim berdasarkan pengalaman diving dan kondisi yang sesuai.",
    items: [
      "Eksplorasi kehidupan bawah laut",
      "Penyesuaian rencana dengan pengalaman",
      "Diskusi kondisi laut dan persiapan",
    ],
  },
  specialty: {
    title: "Pengalaman spesial",
    description:
      "Ikuti rasa ingin tahumu. Ceritakan minat khusus seperti fotografi bawah laut atau pengamatan kehidupan laut untuk mendiskusikan pilihan yang tersedia.",
    items: [
      "Diskusi minat dan tujuan penyelaman",
      "Persiapan peralatan yang dibutuhkan",
      "Konfirmasi program dan persyaratan dengan tim",
    ],
  },
};
export function monthCells(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
}
export function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function recommendation(level, interest) {
  if (level === "new") return "beginner";
  return interest === "creative" ? "specialty" : "explorer";
}
export function planSummary(plan, catalog = experiences) {
  return `Nama: ${plan.name}\nTanggal rencana: ${plan.date}\nPeserta: ${plan.people}\nPengalaman: ${catalog[plan.experience].title}\nCatatan: ${plan.notes || "—"}`;
}
