import test from "node:test";
import assert from "node:assert/strict";
import {
  ageOn,
  courseInquiry,
  courseMinAge,
  courseProfile,
  defaultCourses,
} from "../src/course-model.js";

const advanced = defaultCourses.items.find((c) => c.id === "advanced");
const details = {
  name: "Tamu Kursus",
  whatsapp: "081234567890",
  email: "tamu@example.com",
  date: "2030-05-10",
  participants: 2,
  certification: "Open Water",
  birthDate: "1995-04-12",
  nationality: " Indonesia ",
  dives: "1-20",
  swim: "comfortable",
  health: "fit",
  wetsuit: "M",
  fins: "42",
  stay: "Homestay Waisai",
  language: "en",
  notes: "",
};

test("ages count whole years up to the start date", () => {
  assert.equal(ageOn("2018-05-11", "2030-05-10"), 11);
  assert.equal(ageOn("2018-05-10", "2030-05-10"), 12);
  assert.equal(courseMinAge(advanced), 12);
  assert.equal(courseMinAge({ age: { id: "" } }), 8);
});

test("a course sign-up asks what the course needs", () => {
  assert.deepEqual(courseProfile(advanced, details, "id"), [
    ["Tanggal lahir", "1995-04-12"],
    ["Kewarganegaraan", "Indonesia"],
    ["Penyelaman tercatat", "1–20 kali"],
    ["Berenang", "Nyaman berenang 200 m"],
    ["Kesehatan", "Sehat, tidak ada kondisi medis"],
    ["Ukuran wetsuit", "M"],
    ["Ukuran kaki", "42"],
    ["Menginap di", "Homestay Waisai"],
    ["Bahasa pengantar", "English"],
  ]);
  const refused = (change, reason) =>
    assert.throws(
      () => courseProfile(advanced, { ...details, ...change }, "id"),
      reason,
    );
  refused({ birthDate: "" }, /tanggal lahir/);
  refused({ birthDate: "2030-02-31" }, /tanggal lahir/);
  refused({ birthDate: "2018-05-11" }, /minimal 12 tahun/);
  refused({ swim: "" }, /berenang/);
  refused({ health: "" }, /kondisi kesehatan/);
  refused({ health: "condition" }, /Ceritakan kondisi medisnya/);
  refused({ fins: "60" }, /Ukuran kaki/);
  refused({ stay: "x".repeat(121) }, /terlalu panjang/);
  // Optional answers can stay empty; a condition explained in the notes
  // is accepted.
  const lean = courseProfile(
    advanced,
    {
      ...details,
      nationality: "",
      wetsuit: "",
      fins: "",
      stay: "",
      health: "condition",
      notes: "Asma ringan, pakai inhaler.",
    },
    "en",
  );
  assert.deepEqual(
    lean.map(([label]) => label),
    [
      "Date of birth",
      "Logged dives",
      "Swimming",
      "Health",
      "Language of instruction",
    ],
  );
});

test("the WhatsApp message carries the answers and needs an email", () => {
  const message = courseInquiry(advanced, details, "2030-01-01", "id");
  for (const line of [
    "Email: tamu@example.com",
    "Lisensi saat ini: Open Water",
    "Tanggal lahir: 1995-04-12",
    "Berenang: Nyaman berenang 200 m",
    "Bahasa pengantar: English",
  ])
    assert.ok(message.includes(line), line);
  assert.throws(
    () =>
      courseInquiry(advanced, { ...details, email: "" }, "2030-01-01", "id"),
    /Isi email/,
  );
});
