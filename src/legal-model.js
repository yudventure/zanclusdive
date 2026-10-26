// The policy pages: terms and conditions (/terms), privacy policy
// (/privacy) and the reschedule and refund policy (/refund), in Indonesian
// and English, editable in the admin (Situs web, Halaman kebijakan). Each
// page has a title, a short introduction and sections; a section's text
// is paragraphs split by an empty line, and lines starting with "- " make
// a list. The defaults are a starting draft for the owner to check. The
// refund page also shows the fares from the price list's fare settings.
import { pickText, cleanText } from "./bilingual.js";

const t = (id, en) => ({ id, en });
export const legalKeys = ["terms", "privacy", "refund"];
export const legalPaths = {
  terms: "/terms",
  privacy: "/privacy",
  refund: "/refund",
};
export const legalLabels = {
  terms: t("Syarat dan ketentuan", "Terms and conditions"),
  privacy: t("Kebijakan privasi", "Privacy policy"),
  refund: t("Kebijakan reschedule & refund", "Reschedule & refund policy"),
};
export const sectionLimit = 16;
const lines = (...rows) => rows.join("\n");
const paras = (...rows) => rows.join("\n\n");
const section = (headingId, headingEn, bodyId, bodyEn) => ({
  heading: t(headingId, headingEn),
  body: t(bodyId, bodyEn),
});

export const defaultLegal = {
  updated: "2026-10-26",
  terms: {
    title: legalLabels.terms,
    intro: t(
      "Syarat ini berlaku untuk setiap pemesanan diving, snorkeling, trip laut, kursus, sewa alat, servis, dan pembelian di Zanclus Dive Center, yang dikelola PT Zanclus Daya Cipta. Dengan memesan lewat website, WhatsApp, atau agen, kamu menyetujui syarat ini.",
      "These terms apply to every booking for diving, snorkeling, sea trips, courses, gear rental, servicing and purchases at Zanclus Dive Center, run by PT Zanclus Daya Cipta. By booking on the website, on WhatsApp or through an agent, you agree to these terms.",
    ),
    sections: [
      section(
        "Pemesanan dan konfirmasi",
        "Bookings and confirmation",
        paras(
          "Pemesanan lewat website atau WhatsApp menjadi reservasi setelah kami konfirmasi atau setelah pembayarannya lunas. Permintaan yang belum dibayar atau belum dikonfirmasi belum menahan tempat.",
          "Pastikan nama, nomor WhatsApp, email, tanggal, dan jumlah peserta sudah benar. Kami menghubungimu lewat WhatsApp atau email bila ada yang perlu dipastikan.",
        ),
        paras(
          "A booking made on the website or on WhatsApp becomes a reservation once we confirm it or once it is paid in full. A request that is not paid or confirmed does not hold a place yet.",
          "Please check that your name, WhatsApp number, email, dates and number of guests are right. We contact you on WhatsApp or by email when something needs checking.",
        ),
      ),
      section(
        "Harga dan pembayaran",
        "Prices and payment",
        paras(
          "Harga dalam rupiah dan berlaku sesuai daftar harga di website saat kamu memesan. Isi setiap paket tertulis di kartu paketnya. Biaya yang tidak tertulis di paket, misalnya tiket masuk kawasan konservasi Raja Ampat, ditanggung tamu kecuali disebut termasuk.",
          "Pembayaran bisa lewat Midtrans (kartu, virtual account, QRIS, e-wallet), transfer bank, atau PayPal dalam dolar AS dengan kurs yang tertulis saat membayar. Pesanan yang belum lunas sampai batas waktu bayar dapat dibatalkan dan tempatnya kami lepas untuk tamu lain.",
          "Kami tidak menyimpan nomor kartu. Data kartu diproses langsung oleh penyedia pembayaran.",
        ),
        paras(
          "Prices are in Indonesian rupiah and follow the price list on the website at the time you book. What each package includes is written on its card. Costs not written in a package, such as the Raja Ampat marine park entry fee, are paid by the guest unless the package says they are included.",
          "You can pay with Midtrans (card, virtual account, QRIS, e-wallet), by bank transfer, or with PayPal in US dollars at the rate shown when you pay. A booking not paid in full by its payment deadline may be cancelled, and its place given to other guests.",
          "We never store card numbers. Card details are handled by the payment provider directly.",
        ),
      ),
      section(
        "Tarif, ganti tanggal, dan pembatalan",
        "Fares, date changes and cancellation",
        "Saat memesan kegiatan atau sewa alat, kamu memilih tarif Standard, Comfort, atau Flexi. Tarif itu menentukan apakah tanggal bisa diganti dan apakah pesanan bisa dibatalkan dengan refund. Rinciannya ada di halaman Kebijakan reschedule & refund.",
        "When you book an activity or gear rental, you choose the Standard, Comfort or Flexi fare. The fare decides whether you can change the date and whether you can cancel for a refund. The details are on the Reschedule & refund policy page.",
      ),
      section(
        "Persyaratan peserta",
        "Who can take part",
        lines(
          "- Fun dive hanya untuk penyelam bersertifikat. Bawa kartu sertifikat dan logbook bila ada.",
          "- Discovery Dive untuk yang belum bersertifikat, dengan pemandu sepanjang penyelaman.",
          "- Setiap penyelam mengisi pernyataan kesehatan. Kondisi tertentu memerlukan izin dokter sebelum menyelam.",
          "- Peserta di bawah 18 tahun didampingi dan diizinkan orang tua atau wali.",
          "- Batas usia, kedalaman, dan pengalaman mengikuti standar agensi pelatihan selam dan dipastikan tim kami.",
        ),
        lines(
          "- Fun dives are for certified divers only. Please bring your certification card and logbook if you have one.",
          "- Discovery Dive is for non-certified guests, with a guide through the whole dive.",
          "- Every diver fills in a medical statement. Some conditions need a doctor's approval before diving.",
          "- Guests under 18 join with the consent and company of a parent or guardian.",
          "- Age, depth and experience limits follow the standards of the dive training agency and are checked by our team.",
        ),
      ),
      section(
        "Keselamatan",
        "Safety",
        paras(
          "Keselamatan menjadi pertimbangan utama. Pemandu atau kapten boleh mengganti titik selam, mempersingkat, atau membatalkan kegiatan bila cuaca, arus, kondisi laut, atau kondisi peserta tidak memungkinkan. Ikuti briefing dan arahan pemandu selama kegiatan.",
          "Peserta yang dalam pengaruh alkohol atau obat, atau yang mengabaikan arahan keselamatan, dapat tidak diikutkan tanpa refund.",
          "Kami menyarankan tidak terbang dalam 24 jam setelah menyelam, dan memiliki asuransi perjalanan yang menanggung kegiatan menyelam.",
        ),
        paras(
          "Safety comes first. The guide or captain may change the dive site, shorten or cancel an activity when the weather, currents, sea conditions or a guest's condition do not allow it. Please follow the briefing and the guide's directions throughout.",
          "Guests under the influence of alcohol or drugs, or who ignore safety directions, may be left out without a refund.",
          "We recommend not flying within 24 hours after diving, and having travel insurance that covers diving.",
        ),
      ),
      section(
        "Sewa alat",
        "Gear rental",
        "Alat sewa dipakai untuk tanggal yang dipesan dan dikembalikan dalam keadaan bersih. Kerusakan di luar pemakaian wajar atau kehilangan alat ditagih sesuai biaya perbaikan atau penggantiannya.",
        "Rental gear is used for the dates booked and returned clean. Damage beyond normal use, or a lost item, is charged at its repair or replacement cost.",
      ),
      section(
        "Dive Shop",
        "Dive Shop",
        "Stok barang di website diperbarui dari gudang kami. Bila stok ternyata habis setelah kamu membayar, kami menawarkan barang pengganti atau mengembalikan pembayaran barang itu. Barang yang rusak saat diterima dilaporkan lewat WhatsApp paling lambat 3 hari setelah diterima.",
        "Stock on the website follows our warehouse. If an item turns out to be sold out after you pay, we offer a replacement or refund that item. Please report an item that arrives damaged on WhatsApp within 3 days of receiving it.",
      ),
      section(
        "Foto dan video",
        "Photos and videos",
        "Tim kami kadang memotret atau merekam selama kegiatan dan memakainya untuk dokumentasi dan promosi Zanclus. Beri tahu kami bila kamu tidak ingin wajahmu tampil.",
        "Our team sometimes takes photos or videos during activities and uses them to document and promote Zanclus. Let us know if you would rather not appear in them.",
      ),
      section(
        "Tanggung jawab",
        "Liability",
        paras(
          "Menyelam dan kegiatan di laut punya risiko. Dengan ikut, kamu memahami risiko itu. Tanggung jawab kami sebatas nilai yang kamu bayar untuk kegiatan terkait, kecuali kerugian yang timbul karena kelalaian kami.",
          "Kami tidak bertanggung jawab atas barang pribadi yang hilang atau rusak selama kegiatan, kecuali yang dititipkan kepada tim kami.",
        ),
        paras(
          "Diving and activities at sea carry risks. By taking part, you accept those risks. Our liability is limited to what you paid for the activity concerned, except for loss caused by our negligence.",
          "We are not responsible for personal belongings lost or damaged during an activity, unless they were left in our team's care.",
        ),
      ),
      section(
        "Perubahan syarat dan hukum yang berlaku",
        "Changes and governing law",
        "Syarat ini dapat kami perbarui, dan tanggal pembaruannya tertulis di atas halaman ini. Syarat ini tunduk pada hukum Republik Indonesia. Perselisihan diselesaikan secara musyawarah lebih dulu.",
        "We may update these terms, and the date of the latest update is shown at the top of this page. These terms are governed by the laws of the Republic of Indonesia. Disputes are first settled by discussion in good faith.",
      ),
    ],
  },
  privacy: {
    title: legalLabels.privacy,
    intro: t(
      "Kebijakan ini menjelaskan data apa yang kami kumpulkan saat kamu memakai website Zanclus Dive Center dan memesan layanan kami, untuk apa data itu dipakai, dan hak-hakmu sesuai Undang-Undang Pelindungan Data Pribadi.",
      "This policy explains what data we collect when you use the Zanclus Dive Center website and book our services, what we use it for, and your rights under Indonesia's Personal Data Protection Law.",
    ),
    sections: [
      section(
        "Data yang kami kumpulkan",
        "What we collect",
        lines(
          "- Nama, nomor WhatsApp, dan email yang kamu isi di formulir.",
          "- Rincian pesanan, yaitu kegiatan, tanggal, jumlah peserta, catatan, dan alamat pengiriman untuk pembelian Dive Shop.",
          "- Status pembayaran dan kode pesanan dari Midtrans atau PayPal. Nomor kartu tidak pernah sampai ke kami.",
          "- Pesan yang kamu kirim lewat WhatsApp atau email.",
          "- Data kesehatan dan sertifikasi yang kamu isi sebelum menyelam, hanya untuk keselamatan.",
        ),
        lines(
          "- Your name, WhatsApp number and email from the forms.",
          "- Booking details, such as the activity, dates, number of guests, notes, and the delivery address for Dive Shop orders.",
          "- Payment status and order code from Midtrans or PayPal. Card numbers never reach us.",
          "- Messages you send us on WhatsApp or by email.",
          "- Health and certification details you fill in before diving, used only for safety.",
        ),
      ),
      section(
        "Untuk apa data dipakai",
        "How we use it",
        paras(
          lines(
            "- Memproses dan mengonfirmasi pesanan, termasuk mengirim email pesanan, tagihan, dan invoice.",
            "- Menghubungimu tentang jadwal, cuaca, dan perubahan pesanan.",
            "- Menjaga keselamatan selama kegiatan.",
            "- Pembukuan dan kewajiban hukum.",
          ),
          "Kami tidak menjual data pribadimu.",
        ),
        paras(
          lines(
            "- To process and confirm bookings, including order, payment and invoice emails.",
            "- To contact you about schedules, weather and changes to your booking.",
            "- To keep you safe during activities.",
            "- For bookkeeping and legal obligations.",
          ),
          "We never sell your personal data.",
        ),
      ),
      section(
        "Dengan siapa data dibagikan",
        "Who we share it with",
        lines(
          "- Midtrans dan PayPal, untuk memproses pembayaran.",
          "- Penyedia hosting dan email kami, untuk menyimpan data dan mengirim email.",
          "- Agen perjalanan atau mitra yang terkait dengan pesananmu, sebatas yang diperlukan.",
          "- Instansi berwenang bila diwajibkan hukum.",
        ),
        lines(
          "- Midtrans and PayPal, to process payments.",
          "- Our hosting and email providers, to store data and send emails.",
          "- The travel agent or partner involved in your booking, only as needed.",
          "- Authorities, where the law requires it.",
        ),
      ),
      section(
        "Cookie dan konten pihak ketiga",
        "Cookies and third-party content",
        "Website ini tidak memakai cookie iklan atau pelacak analitik. Cookie hanya dipakai untuk login tim di halaman admin. Video YouTube, TikTok, Instagram, atau Facebook yang kamu putar di website dimuat dari layanan tersebut dan mengikuti kebijakan privasi mereka.",
        "This website does not use advertising cookies or analytics trackers. Cookies are used only for our team's sign-in to the admin. YouTube, TikTok, Instagram or Facebook videos you play on the website load from those services and follow their privacy policies.",
      ),
      section(
        "Penyimpanan dan keamanan",
        "Storage and security",
        "Data disimpan di server penyedia hosting kami dan hanya dibuka tim yang berwenang, dengan akun dan kata sandi masing-masing. Data pesanan disimpan selama diperlukan untuk layanan dan pembukuan, sesuai jangka waktu yang diwajibkan hukum.",
        "Data is kept on our hosting provider's servers and opened only by authorised team members, each with their own account and password. Booking records are kept as long as needed for our services and bookkeeping, as the law requires.",
      ),
      section(
        "Hakmu",
        "Your rights",
        "Kamu berhak meminta salinan data pribadimu, memperbaiki data yang salah, meminta penghapusan data yang tidak lagi wajib kami simpan, dan menarik persetujuan untuk dihubungi. Kirim permintaanmu lewat WhatsApp atau email di bawah halaman ini.",
        "You may ask for a copy of your personal data, correct data that is wrong, ask us to delete data we no longer have to keep, and withdraw your consent to be contacted. Send your request on WhatsApp or by email, below on this page.",
      ),
      section(
        "Anak-anak",
        "Children",
        "Pemesanan untuk peserta di bawah 18 tahun dilakukan oleh orang tua atau wali.",
        "Bookings for guests under 18 are made by a parent or guardian.",
      ),
      section(
        "Perubahan kebijakan",
        "Changes to this policy",
        "Kebijakan ini dapat kami perbarui, dan tanggal pembaruannya tertulis di atas halaman ini.",
        "We may update this policy, and the date of the latest update is shown at the top of this page.",
      ),
    ],
  },
  refund: {
    title: legalLabels.refund,
    intro: t(
      "Apa yang bisa kamu lakukan bila rencana berubah bergantung pada tarif yang kamu pilih saat memesan. Tarif dan aturannya tersimpan di pesananmu, jadi perubahan tarif di kemudian hari tidak mengubah pesanan yang sudah dibayar.",
      "What you can do when plans change depends on the fare you chose when booking. Your fare and its rules are saved with your booking, so later changes to our fares do not change a booking already paid.",
    ),
    sections: [
      section(
        "Cara mengganti tanggal atau membatalkan",
        "How to change the date or cancel",
        "Buka tautan Kelola pesanan di email pesananmu. Di sana tertulis batas ganti tanggal dan batas refund untuk pesananmu. Pilih tanggal baru, atau batalkan bila tarifmu Flexi. Bila tidak menerima email, hubungi kami lewat WhatsApp dengan kode pesananmu.",
        "Open the Manage booking link in your booking email. It shows the last day to change the date and the last day for a refund on your booking. Pick a new date, or cancel if your fare is Flexi. If you did not get the email, message us on WhatsApp with your booking code.",
      ),
      section(
        "Besar refund",
        "How much is refunded",
        paras(
          "Refund Flexi sebesar yang kamu bayar dikurangi kenaikan tarif Flexi. Add-on ikut dikembalikan utuh. Pembelian barang di Dive Shop tidak termasuk refund pesanan kegiatan.",
          "Refund dikirim ke rekening atau metode bayar yang kamu pakai. Tim kami menghubungimu lewat WhatsApp untuk memastikannya.",
        ),
        paras(
          "A Flexi refund is what you paid less the Flexi fare increase. Add-ons are refunded in full. Dive Shop purchases are not part of an activity refund.",
          "The refund goes back to the account or payment method you used. Our team contacts you on WhatsApp to arrange it.",
        ),
      ),
      section(
        "Bila kami membatalkan",
        "If we cancel",
        "Bila kegiatan kami batalkan karena cuaca, kondisi laut, atau alasan keselamatan, kamu bisa memilih tanggal pengganti tanpa biaya, apa pun tarifmu. Bila tidak ada tanggal pengganti yang cocok, hubungi kami dan kita cari jalan keluarnya bersama.",
        "If we cancel an activity because of the weather, sea conditions or safety, you can choose a new date at no cost, whatever your fare. If no new date suits you, contact us and we will find a solution together.",
      ),
      section(
        "Tidak hadir",
        "No-shows",
        "Tamu yang tidak datang pada waktu yang disepakati tanpa kabar dianggap membatalkan tanpa refund. Kapal berangkat sesuai jadwal demi keselamatan dan tamu lain.",
        "Guests who do not come at the agreed time without letting us know are treated as cancelling without a refund. Boats leave on schedule, for safety and for the other guests.",
      ),
      section(
        "Pembelian Dive Shop",
        "Dive Shop purchases",
        "Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan, kecuali rusak saat diterima atau tidak sesuai pesanan. Laporkan lewat WhatsApp paling lambat 3 hari setelah barang diterima.",
        "Items bought cannot be exchanged or returned, unless they arrive damaged or are not what you ordered. Please report it on WhatsApp within 3 days of receiving the item.",
      ),
      section(
        "Pesanan lewat agen",
        "Bookings through an agent",
        "Pesanan lewat travel agent atau OTA mengikuti kebijakan agen tersebut. Hubungi agenmu untuk perubahan atau pembatalan.",
        "Bookings made through a travel agent or OTA follow that agent's policy. Please contact your agent for changes or cancellations.",
      ),
    ],
  },
};

const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + "T00:00:00Z"));

// The saved pages, checked: every page keeps a title, up to 16 sections,
// each with a heading and text in both languages (English may be empty).
export function validateLegal(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultLegal);
  if (typeof input !== "object" || Array.isArray(input))
    throw new Error("Halaman kebijakan tidak valid.");
  if (!isDate(input.updated))
    throw new Error("Tanggal pembaruan halaman kebijakan tidak valid.");
  const out = { updated: input.updated };
  for (const key of legalKeys) {
    const page = input[key] ?? defaultLegal[key];
    const name = legalLabels[key].id;
    const sections = Array.isArray(page.sections) ? page.sections : [];
    if (sections.length > sectionLimit)
      throw new Error(`${name} berisi maksimal ${sectionLimit} bagian.`);
    out[key] = {
      title: cleanText(page.title, `Judul ${name}`, 120, true),
      intro: cleanText(page.intro, `Pengantar ${name}`, 1000),
      sections: sections.map((s, i) => ({
        heading: cleanText(
          s?.heading,
          `Judul bagian ${i + 1} ${name}`,
          120,
          true,
        ),
        body: cleanText(s?.body, `Isi bagian ${i + 1} ${name}`, 4000, true),
      })),
    };
  }
  return out;
}

// Content saved before the policy pages gets the defaults.
export const withLegal = (content) =>
  content.legal
    ? content
    : { ...content, legal: structuredClone(defaultLegal) };

// A section's text as blocks: paragraphs, and lists of the lines that
// start with "- ".
export function legalBlocks(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const rows = part.split("\n").map((row) => row.trim());
      const blocks = [];
      for (const row of rows) {
        const item = row.match(/^[-•]\s+(.*)$/);
        const last = blocks.at(-1);
        if (item) {
          if (last?.type === "list") last.items.push(item[1]);
          else blocks.push({ type: "list", items: [item[1]] });
        } else if (last?.type === "text") last.text += " " + row;
        else blocks.push({ type: "text", text: row });
      }
      return blocks;
    });
}

export const legalText = pickText;
