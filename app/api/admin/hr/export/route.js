import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import {
  listEmployees,
  listAttendance,
  listPayslips,
} from "../../../../../src/server/store.js";
import {
  monthPayroll,
  attendanceSummary,
  attendanceStatuses,
  employmentTypes,
  validMonth,
} from "../../../../../src/hr-model.js";
import { workbook } from "../../../../../src/server/xlsx.js";

export const dynamic = "force-dynamic";
const currentMonth = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" })
    .slice(0, 7);
const lineText = (lines) =>
  lines.map((line) => `${line.label} ${line.amount}`).join("; ");

// ?month=YYYY-MM&kind=payroll|attendance|employees downloads an Excel file.
export async function GET(request) {
  const denied = await requireAdmin(request, "hrd");
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || currentMonth();
  const kind = params.get("kind") || "payroll";
  if (
    !validMonth(month) ||
    !["payroll", "attendance", "employees"].includes(kind)
  )
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  try {
    const employees = await listEmployees();
    let sheets, name;
    if (kind === "employees") {
      name = "pegawai";
      sheets = [
        {
          name: "Pegawai",
          widths: [28, 22, 16, 14, 14, 18, 28, 14, 14, 14, 30],
          rows: [
            [
              "Nama",
              "Jabatan",
              "Jenis",
              "Mulai",
              "Akhir kontrak",
              "WhatsApp",
              "Email",
              "Gaji pokok",
              "Upah harian",
              "Status",
              "Catatan",
            ],
            ...employees.map((e) => [
              e.name,
              e.position,
              employmentTypes[e.type] ?? e.type,
              e.joinDate,
              e.contractEnd,
              e.phone,
              e.email,
              e.salary?.base ?? 0,
              e.salary?.dailyRate ?? 0,
              e.active === false ? "Nonaktif" : "Aktif",
              e.notes,
            ]),
          ],
        },
      ];
    } else if (kind === "attendance") {
      const records = await listAttendance(month);
      name = `absensi-${month}`;
      const keys = Object.keys(attendanceStatuses);
      sheets = [
        {
          name: "Rekap",
          widths: [28, 22, ...keys.map(() => 12)],
          rows: [
            ["Nama", "Jabatan", ...keys.map((key) => attendanceStatuses[key])],
            ...employees
              .filter((e) => e.active !== false)
              .map((e) => {
                const days = attendanceSummary(records, e.id, month);
                return [e.name, e.position, ...keys.map((key) => days[key])];
              }),
          ],
        },
        {
          name: "Harian",
          widths: [14, 28, 16, 10, 10, 40],
          rows: [
            ["Tanggal", "Nama", "Status", "Masuk", "Pulang", "Catatan"],
            ...records
              .sort(
                (a, b) =>
                  a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
              )
              .map((r) => [
                r.date,
                employees.find((e) => e.id === r.employeeId)?.name ??
                  r.employeeId,
                attendanceStatuses[r.status] ?? r.status,
                r.timeIn,
                r.timeOut,
                r.note,
              ]),
          ],
        },
      ];
    } else {
      const [records, locked] = await Promise.all([
        listAttendance(month),
        listPayslips(month),
      ]);
      const slips = monthPayroll(employees, records, locked, month);
      name = `gaji-${month}`;
      sheets = [
        {
          name: "Gaji",
          widths: [28, 22, 14, 8, 8, 14, 30, 30, 14, 14, 12, 30],
          rows: [
            [
              "Nama",
              "Jabatan",
              "Jenis",
              "Hadir",
              "Alpa",
              "Gaji pokok / harian",
              "Tunjangan",
              "Potongan",
              "Kotor",
              "Bersih",
              "Status",
              "Catatan",
            ],
            ...slips.map((s) => [
              s.name,
              s.position,
              employmentTypes[s.type] ?? s.type,
              s.days.hadir,
              s.days.alpa,
              s.basePay,
              lineText(s.allowances),
              lineText(s.deductions),
              s.gross,
              s.net,
              s.locked ? "Terkunci" : "Draf",
              s.note ?? "",
            ]),
            [
              "Total",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              slips.reduce((t, s) => t + s.gross, 0),
              slips.reduce((t, s) => t + s.net, 0),
              "",
              "",
            ],
          ],
        },
      ];
    }
    return new Response(workbook(sheets), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="zanclus-${name}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
