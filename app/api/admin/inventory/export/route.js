import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { listRecords } from "../../../../../src/server/store.js";
import { bad } from "../../../../../src/server/records.js";
import {
  stockTable,
  itemCategories,
  movementKinds,
  movementReasons,
  delta,
} from "../../../../../src/inventory-model.js";
import { validMonth } from "../../../../../src/money.js";
import { workbook } from "../../../../../src/server/xlsx.js";

export const dynamic = "force-dynamic";
// ?kind=stock, or ?kind=movements&month=YYYY-MM.
export async function GET(request) {
  const denied = await requireAdmin(request, "gudang");
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") || "stock";
  try {
    const [items, movements] = await Promise.all([
      listRecords("item"),
      listRecords("movement"),
    ]);
    let name, sheets;
    if (kind === "stock") {
      name = "stok";
      sheets = [
        {
          name: "Stok",
          widths: [30, 14, 18, 10, 10, 10, 14, 16, 20, 30],
          rows: [
            [
              "Barang",
              "Kode",
              "Kategori",
              "Satuan",
              "Stok",
              "Minimum",
              "Status",
              "Harga beli",
              "Lokasi",
              "Catatan",
            ],
            ...stockTable(items, movements).map((i) => [
              i.name,
              i.sku,
              itemCategories[i.category] ?? i.category,
              i.unit,
              i.stock,
              i.minStock,
              i.active === false ? "Nonaktif" : i.low ? "Menipis" : "Cukup",
              i.cost,
              i.location,
              i.note,
            ]),
          ],
        },
      ];
    } else if (kind === "movements") {
      const month = params.get("month") || "";
      if (!validMonth(month)) return bad("Bulan tidak valid.");
      name = `mutasi-${month}`;
      sheets = [
        {
          name: "Mutasi",
          widths: [12, 30, 14, 10, 12, 22, 30],
          rows: [
            [
              "Tanggal",
              "Barang",
              "Jenis",
              "Jumlah",
              "Perubahan",
              "Alasan",
              "Catatan",
            ],
            ...movements
              .filter((m) => m.date.startsWith(month + "-"))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((m) => [
                m.date,
                items.find((i) => i.id === m.itemId)?.name ?? m.itemId,
                movementKinds[m.kind],
                m.qty,
                delta(m),
                movementReasons[m.kind]?.[m.reason] ?? m.reason,
                m.note,
              ]),
          ],
        },
      ];
    } else return bad("Permintaan tidak valid.");
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
