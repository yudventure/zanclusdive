import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEmployee,
  validateAttendance,
  attendanceSummary,
  computePayslip,
  monthPayroll,
  attendanceId,
  payslipId,
  validMonth,
} from "../src/hr-model.js";
import { workbook, zipStore } from "../src/server/xlsx.js";

const siti = () => ({
  id: "emp:0123456789ab",
  ...validateEmployee({
    name: " Siti  Rahma ",
    position: "Divemaster",
    joinDate: "2026-01-10",
    type: "tetap",
    phone: "+62 812-3456-7890",
    email: "Siti@Zanclus.ID",
    salary: {
      base: "4000000",
      absentDeduction: 100000,
      allowances: [
        { label: "Makan", amount: "500000" },
        { label: "", amount: "" },
      ],
      deductions: [{ label: "Kasbon", amount: 250000 }],
    },
    insurance: { bpjsKesehatan: true },
    bank: { name: "BRI", account: "1234 5678 90", holder: "Siti Rahma" },
  }),
});
const budi = () => ({
  id: "emp:ba9876543210",
  ...validateEmployee({
    name: "Budi",
    position: "Kapten",
    joinDate: "2026-03-01",
    type: "harian",
    salary: { dailyRate: 150000 },
  }),
});

test("an employee is tidied and checked", () => {
  const e = siti();
  assert.equal(e.name, "Siti Rahma");
  assert.equal(e.email, "siti@zanclus.id");
  assert.equal(e.salary.base, 4000000);
  // Empty lines are dropped; amounts become numbers.
  assert.deepEqual(e.salary.allowances, [{ label: "Makan", amount: 500000 }]);
  assert.equal(e.active, true);
  assert.equal(e.leaveDays, 12);
  assert.equal(e.insurance.bpjsKetenagakerjaan, false);
  const bad = (input, pattern) =>
    assert.throws(
      () =>
        validateEmployee({
          name: "A",
          position: "B",
          joinDate: "2026-01-01",
          ...input,
        }),
      { message: pattern },
    );
  bad({ name: "" }, /nama/);
  bad({ joinDate: "2026-02-30" }, /tanggal mulai/);
  bad({ contractEnd: "2025-12-31" }, /setelah tanggal mulai/);
  bad({ type: "freelance" }, /jenis/);
  bad({ phone: "abc" }, /WhatsApp/);
  bad({ email: "bukan" }, /email/i);
  bad({ nik: "123" }, /16 angka/);
  bad({ salary: { base: -1 } }, /Gaji pokok/);
  bad(
    { salary: { allowances: [{ label: "", amount: 100 }] } },
    /nama tunjangan/,
  );
  bad(
    { salary: { allowances: Array(9).fill({ label: "x", amount: 1 }) } },
    /maksimal 8/,
  );
  bad({ bank: { account: "12ab" } }, /rekening/);
  bad({ leaveDays: 99 }, /cuti/);
  // Editing keeps what is not sent.
  const changed = validateEmployee({ position: "Instruktur" }, e);
  assert.equal(changed.name, "Siti Rahma");
  assert.equal(changed.position, "Instruktur");
  assert.deepEqual(changed.salary, e.salary);
});

test("attendance is one record per employee and day", () => {
  const employees = [siti(), budi()];
  const record = validateAttendance(
    {
      employeeId: "emp:0123456789ab",
      date: "2026-10-14",
      status: "hadir",
      timeIn: "08:00",
      timeOut: "17:30",
      note: " telat 5 menit ",
    },
    employees,
  );
  assert.deepEqual(record, {
    id: "att:0123456789ab:2026-10-14",
    employeeId: "emp:0123456789ab",
    date: "2026-10-14",
    status: "hadir",
    timeIn: "08:00",
    timeOut: "17:30",
    note: "telat 5 menit",
  });
  assert.equal(attendanceId("emp:0123456789ab", "2026-10-14"), record.id);
  // Times only matter when present.
  const leave = validateAttendance(
    {
      employeeId: "emp:ba9876543210",
      date: "2026-10-14",
      status: "cuti",
      timeIn: "09:00",
    },
    employees,
  );
  assert.equal(leave.timeIn, "");
  assert.throws(
    () =>
      validateAttendance(
        { employeeId: "emp:x", date: "2026-10-14" },
        employees,
      ),
    { message: /tidak ditemukan/ },
  );
  assert.throws(
    () =>
      validateAttendance(
        { employeeId: "emp:0123456789ab", date: "2026-10-14", status: "bolos" },
        employees,
      ),
    { message: /status/ },
  );
  assert.throws(
    () =>
      validateAttendance(
        { employeeId: "emp:0123456789ab", date: "2026-10-14", timeIn: "9am" },
        employees,
      ),
    { message: /JJ:MM/ },
  );
  assert.throws(
    () =>
      validateAttendance(
        {
          employeeId: "emp:0123456789ab",
          date: "2026-10-14",
          timeIn: "17:00",
          timeOut: "08:00",
        },
        employees,
      ),
    { message: /setelah jam masuk/ },
  );
  assert.ok(
    validMonth("2026-10") && !validMonth("2026-13") && !validMonth("2026-1"),
  );
});

const records = [
  { employeeId: "emp:0123456789ab", date: "2026-10-01", status: "hadir" },
  { employeeId: "emp:0123456789ab", date: "2026-10-02", status: "hadir" },
  { employeeId: "emp:0123456789ab", date: "2026-10-03", status: "alpa" },
  { employeeId: "emp:0123456789ab", date: "2026-10-04", status: "alpa" },
  { employeeId: "emp:0123456789ab", date: "2026-10-05", status: "cuti" },
  { employeeId: "emp:0123456789ab", date: "2026-09-30", status: "alpa" },
  { employeeId: "emp:ba9876543210", date: "2026-10-01", status: "hadir" },
  { employeeId: "emp:ba9876543210", date: "2026-10-02", status: "hadir" },
  { employeeId: "emp:ba9876543210", date: "2026-10-03", status: "hadir" },
  { employeeId: "emp:ba9876543210", date: "2026-10-04", status: "sakit" },
];

test("the month's days per status count one employee and one month", () => {
  assert.deepEqual(attendanceSummary(records, "emp:0123456789ab", "2026-10"), {
    hadir: 2,
    izin: 0,
    sakit: 0,
    cuti: 1,
    alpa: 2,
    libur: 0,
  });
  assert.equal(
    attendanceSummary(records, "emp:ba9876543210", "2026-10").hadir,
    3,
  );
  assert.equal(attendanceSummary(records, "emp:none", "2026-10").hadir, 0);
});

test("a payslip comes from the salary and the month's attendance", () => {
  const slip = computePayslip(siti(), records, "2026-10");
  assert.equal(slip.id, payslipId("emp:0123456789ab", "2026-10"));
  assert.equal(slip.basePay, 4000000);
  assert.equal(slip.gross, 4500000);
  // Fixed deduction plus two days without leave.
  assert.deepEqual(slip.deductions, [
    { label: "Kasbon", amount: 250000 },
    { label: "Alpa 2 hari", amount: 200000 },
  ]);
  assert.equal(slip.net, 4050000);
  // A daily worker is paid per day present, with no absence deduction.
  const daily = computePayslip(budi(), records, "2026-10");
  assert.equal(daily.basePay, 450000);
  assert.equal(daily.dailyRate, 150000);
  assert.deepEqual(daily.deductions, []);
  assert.equal(daily.net, 450000);
  // Never below zero.
  const broke = computePayslip(
    { ...siti(), salary: { ...siti().salary, base: 100000, allowances: [] } },
    records,
    "2026-10",
  );
  assert.equal(broke.gross, 100000);
  assert.equal(broke.net, 0);
});

test("the month's payroll keeps locked slips as saved", () => {
  const employees = [siti(), { ...budi(), active: false }];
  const open = monthPayroll(employees, records, [], "2026-10");
  assert.deepEqual(
    open.map((s) => [s.name, s.locked]),
    [["Siti Rahma", false]],
  );
  const locked = {
    ...computePayslip(siti(), records, "2026-10"),
    net: 1,
    lockedAt: "2026-10-31T00:00:00Z",
  };
  const withLocked = monthPayroll(employees, records, [locked], "2026-10");
  assert.equal(withLocked[0].net, 1);
  assert.equal(withLocked[0].locked, true);
  // A locked slip keeps an employee that was switched off since.
  const budiLocked = { ...computePayslip(budi(), records, "2026-10") };
  assert.equal(
    monthPayroll(employees, records, [budiLocked], "2026-10").length,
    2,
  );
});

test("the xlsx writer makes a zip Excel can open", () => {
  const file = workbook([
    {
      name: "Gaji",
      rows: [
        ["Nama", "Bersih"],
        ["Siti", 4050000],
        ["Budi <&>", 450000],
      ],
    },
    { name: "Rekap", rows: [["A"]] },
  ]);
  assert.equal(file.slice(0, 4).toString("hex"), "504b0304");
  const text = file.toString("latin1");
  assert.ok(text.includes("[Content_Types].xml"));
  assert.ok(text.includes("xl/worksheets/sheet2.xml"));
  assert.ok(text.includes("Budi &lt;&amp;&gt;"));
  assert.ok(text.includes('<c r="B2"><v>4050000</v></c>'));
  // End of central directory: two entries per file list, six parts + 2 sheets.
  const end = file.lastIndexOf(Buffer.from("504b0506", "hex"));
  assert.equal(file.readUInt16LE(end + 10), 7);
  // Store only: a one-file zip is the file plus its headers.
  const one = zipStore([["a.txt", "hello"]]);
  assert.equal(one.length, 30 + 5 + 5 + 46 + 5 + 22);
});
