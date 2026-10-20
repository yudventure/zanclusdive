// HRD: employees, daily attendance and monthly payslips. Pure functions
// shared by the admin pages, the API routes and the tests.
export const employmentTypes = {
  tetap: "Pegawai tetap",
  kontrak: "Kontrak",
  harian: "Harian lepas",
  magang: "Magang",
};
export const attendanceStatuses = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
  alpa: "Tanpa keterangan",
  libur: "Libur",
};
export const hrLimits = { employees: 200, lines: 8, note: 300 };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export const validDate = (value) =>
  typeof value === "string" &&
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
  new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
export const validMonth = (value) =>
  typeof value === "string" &&
  monthPattern.test(value) &&
  validDate(value + "-01");

const text = (value, max, label) => {
  const out =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (out.length > max) throw new Error(`${label} maksimal ${max} karakter.`);
  if (/[<>]/.test(out))
    throw new Error(`${label} tidak boleh berisi < atau >.`);
  return out;
};
const amount = (value, label) => {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1e12)
    throw new Error(`${label} harus angka 0 atau lebih.`);
  return Math.round(n);
};
// Allowance and deduction lines: { label, amount }.
function lines(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} tidak valid.`);
  if (value.length > hrLimits.lines)
    throw new Error(`${label} maksimal ${hrLimits.lines} baris.`);
  return value
    .map((line) => ({
      label: text(line?.label, 60, `Nama ${label.toLowerCase()}`),
      amount: amount(line?.amount, `Jumlah ${label.toLowerCase()}`),
    }))
    .filter((line) => line.label || line.amount)
    .map((line) => {
      if (!line.label) throw new Error(`Isi nama ${label.toLowerCase()}.`);
      return line;
    });
}

// A new or changed employee. "current" is the stored record when editing.
export function validateEmployee(input, current = null) {
  if (!input || typeof input !== "object")
    throw new Error("Data pegawai tidak valid.");
  const pick = (key) => (key in input ? input[key] : current?.[key]);
  const name = text(pick("name"), 80, "Nama");
  if (!name) throw new Error("Isi nama pegawai.");
  const position = text(pick("position"), 60, "Jabatan");
  if (!position) throw new Error("Isi jabatan pegawai.");
  const type = pick("type") ?? "tetap";
  if (!(type in employmentTypes)) throw new Error("Pilih jenis kepegawaian.");
  const joinDate = pick("joinDate");
  if (!validDate(joinDate)) throw new Error("Isi tanggal mulai bekerja.");
  const contractEnd = pick("contractEnd") || "";
  if (contractEnd && !validDate(contractEnd))
    throw new Error("Tanggal akhir kontrak tidak valid.");
  if (contractEnd && contractEnd < joinDate)
    throw new Error("Akhir kontrak harus setelah tanggal mulai.");
  const phone = text(pick("phone"), 30, "Nomor WhatsApp");
  if (phone && !/^[+\d][\d\s-]{5,29}$/.test(phone))
    throw new Error("Nomor WhatsApp hanya angka, spasi, dan tanda hubung.");
  const email = text(pick("email"), 120, "Email").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Alamat email tidak valid.");
  const nik = text(pick("nik"), 16, "NIK");
  if (nik && !/^\d{16}$/.test(nik))
    throw new Error("NIK terdiri dari 16 angka.");
  const active = typeof pick("active") === "boolean" ? pick("active") : true;
  const salaryIn = pick("salary") ?? {};
  const salary = {
    base: amount(salaryIn.base, "Gaji pokok"),
    dailyRate: amount(salaryIn.dailyRate, "Upah harian"),
    absentDeduction: amount(salaryIn.absentDeduction, "Potongan per hari alpa"),
    allowances: lines(salaryIn.allowances, "Tunjangan"),
    deductions: lines(salaryIn.deductions, "Potongan"),
  };
  const insuranceIn = pick("insurance") ?? {};
  const insurance = {
    bpjsKesehatan: Boolean(insuranceIn.bpjsKesehatan),
    bpjsKetenagakerjaan: Boolean(insuranceIn.bpjsKetenagakerjaan),
    other: text(insuranceIn.other, 120, "Asuransi lain"),
  };
  const bankIn = pick("bank") ?? {};
  const bank = {
    name: text(bankIn.name, 40, "Nama bank"),
    account: text(bankIn.account, 34, "Nomor rekening"),
    holder: text(bankIn.holder, 80, "Nama pemilik rekening"),
  };
  if (bank.account && !/^[\d -]+$/.test(bank.account))
    throw new Error("Nomor rekening hanya angka.");
  const leaveDays = amount(pick("leaveDays") ?? 12, "Jatah cuti");
  if (leaveDays > 60) throw new Error("Jatah cuti maksimal 60 hari.");
  const notes = text(pick("notes"), hrLimits.note, "Catatan");
  return {
    name,
    position,
    type,
    joinDate,
    contractEnd,
    phone,
    email,
    nik,
    active,
    salary,
    insurance,
    bank,
    leaveDays,
    notes,
  };
}

// One day of attendance for one employee.
export function validateAttendance(input, employees) {
  if (!input || typeof input !== "object")
    throw new Error("Data absensi tidak valid.");
  if (!validDate(input.date)) throw new Error("Tanggal absensi tidak valid.");
  const employee = employees.find((e) => e.id === input.employeeId);
  if (!employee) throw new Error("Pegawai tidak ditemukan.");
  const status = input.status ?? "hadir";
  if (!(status in attendanceStatuses))
    throw new Error("Pilih status kehadiran.");
  const time = (value, label) => {
    const out = typeof value === "string" ? value.trim() : "";
    if (out && !timePattern.test(out))
      throw new Error(`${label} ditulis sebagai JJ:MM.`);
    return out;
  };
  const timeIn = status === "hadir" ? time(input.timeIn, "Jam masuk") : "";
  const timeOut = status === "hadir" ? time(input.timeOut, "Jam pulang") : "";
  if (timeIn && timeOut && timeOut < timeIn)
    throw new Error("Jam pulang harus setelah jam masuk.");
  return {
    id: attendanceId(employee.id, input.date),
    employeeId: employee.id,
    date: input.date,
    status,
    timeIn,
    timeOut,
    note: text(input.note, hrLimits.note, "Catatan"),
  };
}
export const attendanceId = (employeeId, date) =>
  `att:${employeeId.slice(4)}:${date}`;
export const payslipId = (employeeId, month) =>
  `slip:${employeeId.slice(4)}:${month}`;

// Days per status for one employee in a month.
export function attendanceSummary(records, employeeId, month) {
  const counts = Object.fromEntries(
    Object.keys(attendanceStatuses).map((key) => [key, 0]),
  );
  for (const record of records)
    if (record.employeeId === employeeId && record.date.startsWith(month + "-"))
      counts[record.status] = (counts[record.status] ?? 0) + 1;
  return counts;
}
const sum = (list) => list.reduce((total, line) => total + line.amount, 0);
// The payslip for one employee and month, from the salary and attendance.
// Daily workers are paid per day present; monthly staff lose the absent
// deduction per day without leave.
export function computePayslip(employee, records, month) {
  const days = attendanceSummary(records, employee.id, month);
  const salary = employee.salary ?? {};
  const daily = employee.type === "harian";
  const basePay = daily
    ? (salary.dailyRate ?? 0) * days.hadir
    : (salary.base ?? 0);
  const allowances = salary.allowances ?? [];
  const deductions = [...(salary.deductions ?? [])];
  if (!daily && days.alpa > 0 && salary.absentDeduction > 0)
    deductions.push({
      label: `Alpa ${days.alpa} hari`,
      amount: salary.absentDeduction * days.alpa,
    });
  const gross = basePay + sum(allowances);
  const net = Math.max(0, gross - sum(deductions));
  return {
    id: payslipId(employee.id, month),
    employeeId: employee.id,
    month,
    name: employee.name,
    position: employee.position,
    type: employee.type,
    days,
    basePay,
    dailyRate: daily ? (salary.dailyRate ?? 0) : 0,
    allowances,
    deductions,
    gross,
    net,
  };
}
// Payslips for every active employee, with locked ones kept as saved.
export function monthPayroll(employees, records, locked, month) {
  const byId = Object.fromEntries(locked.map((slip) => [slip.id, slip]));
  return employees
    .filter(
      (employee) =>
        employee.active !== false || byId[payslipId(employee.id, month)],
    )
    .map((employee) => {
      const saved = byId[payslipId(employee.id, month)];
      return saved
        ? { ...saved, locked: true }
        : { ...computePayslip(employee, records, month), locked: false };
    });
}
export const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
