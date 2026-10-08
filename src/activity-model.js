import { activityPhotos } from "./photography.js";
export const activityLabels = {
  diving: "Diving",
  snorkeling: "Snorkeling",
  trip: "Trip laut",
};
export const activityKeys = Object.keys(activityLabels);

const common = {
  enabled: true,
  price: null,
  duration: "Disesuaikan dengan rencana kegiatan",
  meetingPoint: "Dikonfirmasi bersama tim Zanclus",
};
export const defaultActivities = {
  diving: {
    ...common,
    title: "Temukan cerita di bawah permukaan.",
    summary:
      "Dari pengalaman pertama hingga petualangan berikutnya, susun rencana menyelam yang sesuai denganmu.",
    description:
      "Mulai dengan bercerita tentang pengalamanmu di air dan apa yang ingin kamu jelajahi. Tim Zanclus akan membantu mendiskusikan pilihan aktivitas, kebutuhan peralatan, dan persiapan sebelum menyelam. Program, lokasi, serta persyaratan peserta dikonfirmasi sebelum perjalanan.",
    ...activityPhotos.diving,
    audience: "Pemula & penyelam berpengalaman",
    highlights: [
      "Rencana sesuai pengalaman menyelam",
      "Diskusi peralatan dan persiapan",
      "Eksplorasi kehidupan bawah laut",
    ],
    preparations: [
      "Ceritakan pengalaman menyelam dan kenyamanan di air.",
      "Siapkan informasi sertifikasi jika sudah memilikinya.",
      "Diskusikan kondisi kesehatan dan persyaratan peserta dengan tim.",
      "Konfirmasi perlengkapan, lokasi, dan jadwal sebelum berangkat.",
    ],
    itinerary: [
      {
        title: "Kenali rencanamu",
        description:
          "Diskusikan pengalaman, tujuan, dan pilihan tanggal bersama tim.",
      },
      {
        title: "Persiapan & briefing",
        description:
          "Konfirmasi perlengkapan serta arahan kegiatan sesuai program yang dipilih.",
      },
      {
        title: "Jelajahi bawah laut",
        description:
          "Aktivitas mengikuti rencana yang sudah dikonfirmasi dan kondisi laut saat itu.",
      },
      {
        title: "Bawa pulang cerita",
        description:
          "Berbagi pengalaman dan mendiskusikan langkah berikutnya bersama tim.",
      },
    ],
    faqs: [
      {
        question: "Apakah pemula bisa ikut?",
        answer:
          "Sampaikan bahwa ini pengalaman pertamamu. Tim akan mendiskusikan program pengenalan dan persyaratannya; kelayakan peserta dikonfirmasi sebelum aktivitas.",
      },
      {
        question: "Apakah peralatan sudah termasuk?",
        answer:
          "Kebutuhan dan biaya perlengkapan mengikuti program. Konfirmasikan dengan tim, atau lihat pilihan rental di Dive Shop.",
      },
      {
        question: "Apakah tanggal di formulir langsung terpesan?",
        answer:
          "Tanggal merupakan usulan. Reservasi berlaku setelah tim mengonfirmasi jadwal, program, biaya, dan ketentuan perjalanan.",
      },
    ],
  },
  snorkeling: {
    ...common,
    title: "Dekat dengan laut, dari permukaannya.",
    summary:
      "Nikmati warna dan kehidupan laut dengan rencana snorkeling yang nyaman untukmu dan teman perjalananmu.",
    description:
      "Snorkeling membuka cara lain untuk menikmati laut. Ceritakan tingkat kenyamananmu di air, jumlah peserta, dan kebutuhan kelompokmu. Kita diskusikan area aktivitas, perlengkapan, serta pendampingan yang sesuai sebelum menentukan rencana bersama.",
    ...activityPhotos.snorkeling,
    audience: "Individu, teman & keluarga",
    highlights: [
      "Menikmati kehidupan laut dari permukaan",
      "Rencana sesuai kenyamanan di air",
      "Pilihan perlengkapan lewat tim Zanclus",
    ],
    preparations: [
      "Sampaikan kemampuan berenang dan kenyamanan di air.",
      "Informasikan usia peserta serta kebutuhan anak atau kelompok.",
      "Konfirmasi masker, snorkel, fins, dan kebutuhan alat apung.",
      "Siapkan pakaian ganti dan perlindungan matahari; ikuti arahan tim.",
    ],
    itinerary: [
      {
        title: "Susun rencana bersama",
        description: "Pilih usulan tanggal dan ceritakan kebutuhan peserta.",
      },
      {
        title: "Kenali perlengkapan",
        description:
          "Diskusikan pemakaian masker, snorkel, fins, dan alat apung sesuai kebutuhan.",
      },
      {
        title: "Nikmati laut dengan tenang",
        description:
          "Area dan kegiatan mengikuti konfirmasi tim serta kondisi laut.",
      },
      {
        title: "Kembali & beristirahat",
        description:
          "Akhiri kegiatan sesuai rencana dan pastikan perlengkapan kembali lengkap.",
      },
    ],
    faqs: [
      {
        question: "Haruskah sudah bisa berenang?",
        answer:
          "Sampaikan kemampuan dan kenyamananmu di air kepada tim. Kebutuhan pendampingan, alat apung, serta kelayakan mengikuti aktivitas perlu dikonfirmasi terlebih dahulu.",
      },
      {
        question: "Bisakah ikut bersama anak?",
        answer:
          "Informasikan usia anak dan jumlah pendamping. Tim akan mendiskusikan persyaratan peserta serta pilihan kegiatan yang sesuai.",
      },
      {
        question: "Apakah bisa menyewa alat saja?",
        answer:
          "Bisa mengajukan kebutuhan rental lewat Dive Shop. Ukuran, ketersediaan alat, harga, dan waktu pengambilan dikonfirmasi melalui WhatsApp.",
      },
    ],
  },
  trip: {
    ...common,
    title: "Satu perjalanan, banyak cerita laut.",
    summary:
      "Susun trip laut bersama teman atau keluarga, dengan aktivitas dan rute yang mengikuti caramu menikmati perjalanan.",
    description:
      "Mulai dari ide sederhana: ingin menikmati laut, snorkeling, atau menyelam dalam satu perjalanan. Ceritakan jumlah peserta, waktu yang tersedia, serta tujuanmu. Tim Zanclus membantu mendiskusikan rute, transportasi, dan aktivitas; rincian akhir disepakati sebelum keberangkatan.",
    ...activityPhotos.trip,
    audience: "Trip pribadi & kelompok",
    highlights: [
      "Diskusi rute dan tujuan perjalanan",
      "Pilihan aktivitas untuk kelompokmu",
      "Koordinasi kebutuhan dan jadwal trip",
    ],
    preparations: [
      "Tentukan jumlah peserta dan rentang tanggal perjalanan.",
      "Ceritakan aktivitas yang diminati dan kebutuhan kelompok.",
      "Konfirmasi titik temu, transportasi, akomodasi, dan perlengkapan.",
      "Periksa rincian biaya, kebijakan perubahan, serta rencana saat cuaca berubah.",
    ],
    itinerary: [
      {
        title: "Pilih arah petualangan",
        description:
          "Diskusikan tujuan, waktu, dan aktivitas yang ingin dilakukan.",
      },
      {
        title: "Konfirmasi rincian trip",
        description:
          "Sepakati rute, titik temu, transportasi, biaya, dan kebutuhan peserta.",
      },
      {
        title: "Berangkat & jelajahi",
        description:
          "Perjalanan mengikuti itinerary yang disepakati; penyesuaian kondisi laut dibahas dengan tim.",
      },
      {
        title: "Kembali dengan cerita baru",
        description:
          "Waktu dan titik kembali mengikuti rencana perjalanan yang dikonfirmasi.",
      },
    ],
    faqs: [
      {
        question: "Bisakah rute dibuat khusus?",
        answer:
          "Sampaikan tujuan, jumlah peserta, dan waktu yang tersedia. Ketersediaan rute, transportasi, dan aktivitas akan diperiksa oleh tim sebelum penawaran dikonfirmasi.",
      },
      {
        question: "Apakah transportasi dan penginapan termasuk?",
        answer:
          "Komponen biaya mengikuti penawaran trip. Minta rincian yang termasuk dan tidak termasuk sebelum menyetujui perjalanan.",
      },
      {
        question: "Bagaimana jika cuaca berubah?",
        answer:
          "Jadwal dan rute dapat menyesuaikan kondisi laut. Diskusikan opsi perubahan serta ketentuannya dengan tim sebelum melakukan reservasi.",
      },
    ],
  },
};

// Fill new pages on older CMS documents, preserving saved fields and visibility.
export function withActivities(content) {
  return {
    ...content,
    activities: Object.fromEntries(
      activityKeys.map((key) => [
        key,
        {
          ...structuredClone(defaultActivities[key]),
          ...content.activities?.[key],
        },
      ]),
    ),
  };
}

export function activityInquiry(key, activity, details, today, demo = false) {
  if (!activityKeys.includes(key) || !activity?.enabled)
    throw new Error("Aktivitas belum tersedia.");
  const name = typeof details.name === "string" ? details.name.trim() : "";
  const notes = typeof details.notes === "string" ? details.notes.trim() : "";
  const participants = Number(details.participants);
  const date = details.date;
  if (!name || name.length > 120)
    throw new Error("Isi nama, maksimal 120 karakter.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    Number.isNaN(new Date(date + "T12:00:00Z").valueOf()) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    date < today
  )
    throw new Error("Pilih tanggal yang valid, hari ini atau setelahnya.");
  if (!Number.isInteger(participants) || participants < 1 || participants > 100)
    throw new Error("Jumlah peserta harus 1–100 orang.");
  if (notes.length > 1000) throw new Error("Catatan maksimal 1.000 karakter.");
  return [
    `Halo Zanclus! Saya ingin konsultasi ${activityLabels[key]}.`,
    `Program: ${activity.title}`,
    `Nama: ${name}`,
    `Usulan tanggal: ${date}`,
    `Peserta: ${participants} orang`,
    ...(notes ? [`Catatan: ${notes}`] : []),
    ...(demo
      ? ["Permintaan dari halaman demo; rincian aktivitas adalah contoh."]
      : []),
    "Mohon konfirmasi jadwal, persyaratan, perlengkapan, dan biaya. Ini belum menjadi reservasi.",
  ].join("\n");
}
