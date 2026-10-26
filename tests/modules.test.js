import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTransaction,
  validateFinanceSettings,
  midtransIncome,
  monthTotals,
  yearReport,
} from "../src/finance-model.js";
import {
  validateItem,
  validateMovement,
  stockOf,
  stockTable,
} from "../src/inventory-model.js";
import { validatePost, monthSummary } from "../src/content-plan-model.js";

test("a cash book line is checked and tidied", () => {
  const tx = validateTransaction({
    date: "2026-10-14",
    kind: "out",
    category: "operasional",
    amount: "250000",
    description: "  BBM  perahu ",
    method: "tunai",
    reference: "Nota 12",
  });
  assert.deepEqual(tx, {
    date: "2026-10-14",
    kind: "out",
    category: "operasional",
    amount: 250000,
    description: "BBM perahu",
    method: "tunai",
    reference: "Nota 12",
    note: "",
  });
  const bad = (input, pattern) =>
    assert.throws(
      () =>
        validateTransaction({
          date: "2026-10-14",
          kind: "in",
          category: "diving",
          amount: 1,
          description: "x",
          ...input,
        }),
      { message: pattern },
    );
  bad({ date: "2026-13-01" }, /tanggal/);
  bad({ kind: "transfer" }, /pemasukan atau pengeluaran/);
  bad({ category: "gaji" }, /kategori/);
  bad({ amount: 0 }, /Jumlah/);
  bad({ description: "" }, /keterangan/);
  bad({ method: "kripto" }, /cara bayar/);
  // Editing keeps the rest; the category must fit the kind.
  const edited = validateTransaction({ amount: 300000 }, tx);
  assert.equal(edited.description, "BBM perahu");
  assert.equal(edited.amount, 300000);
  assert.deepEqual(validateFinanceSettings({ taxRate: "0.5", taxLabel: "" }), {
    taxRate: 0.5,
    taxLabel: "PPh final UMKM 0,5%",
  });
  assert.throws(() => validateFinanceSettings({ taxRate: 101 }), {
    message: /0 dan 100/,
  });
});

test("paid online orders become income and the reports add up", () => {
  const bookings = [
    {
      id: "b1",
      guestName: "Ana",
      experience: "beginner",
      amount: 900000,
      startDate: "2026-10-20",
      payment: {
        status: "paid",
        orderId: "ZC-1",
        amount: 900000,
        paidAt: "2026-10-03T08:00:00Z",
      },
    },
    {
      id: "b2",
      guestName: "Ben",
      experience: "course",
      amount: 5000000,
      startDate: "2026-11-02",
      payment: { status: "pending", orderId: "ZC-2" },
    },
    {
      id: "b3",
      guestName: "Cia",
      experience: "shop",
      amount: 150000,
      startDate: "2026-11-02",
      payment: {
        status: "paid",
        orderId: "ZC-3",
        paidAt: "2026-11-02T08:00:00Z",
      },
    },
  ];
  const auto = midtransIncome(bookings);
  assert.deepEqual(
    auto.map((tx) => [tx.id, tx.date, tx.category, tx.amount, tx.source]),
    [
      ["tx:mt:b1", "2026-10-03", "diving", 900000, "midtrans"],
      ["tx:mt:b3", "2026-11-02", "shop", 150000, "midtrans"],
    ],
  );
  const typed = [
    {
      date: "2026-10-14",
      kind: "out",
      category: "operasional",
      amount: 250000,
    },
    { date: "2026-10-15", kind: "in", category: "rental", amount: 100000 },
    { date: "2026-11-01", kind: "out", category: "gaji", amount: 4000000 },
  ];
  const all = [...typed, ...auto];
  const october = monthTotals(all, "2026-10");
  assert.equal(october.income, 1000000);
  assert.equal(october.expense, 250000);
  assert.equal(october.net, 750000);
  assert.equal(october.in.diving, 900000);
  assert.equal(october.in.rental, 100000);
  assert.equal(october.out.operasional, 250000);
  const year = yearReport(all, "2026", { taxRate: 0.5, taxLabel: "PPh" });
  assert.equal(year.months.length, 12);
  assert.equal(year.months[9].tax, 5000);
  assert.equal(year.months[10].net, 150000 - 4000000);
  assert.equal(year.income, 1150000);
  assert.equal(year.expense, 4250000);
  assert.equal(year.tax, 5750);
  assert.equal(yearReport(all, "2025").income, 0);
});

test("items are checked and stock follows the movements", () => {
  const bcd = {
    id: "item:aaaaaaaaaaaa",
    ...validateItem({
      name: " BCD  ukuran M ",
      sku: "bcd-m",
      category: "alat",
      unit: "pcs",
      minStock: "2",
      cost: "3500000",
    }),
  };
  assert.equal(bcd.name, "BCD ukuran M");
  assert.equal(bcd.sku, "BCD-M");
  assert.equal(bcd.minStock, 2);
  assert.throws(() => validateItem({ name: "" }), { message: /nama/ });
  assert.throws(() => validateItem({ name: "x", sku: "a b" }), {
    message: /Kode/,
  });
  assert.throws(() => validateItem({ name: "x", category: "makanan" }), {
    message: /kategori/,
  });
  const items = [bcd];
  const mv = (kind, qty, reason) =>
    validateMovement(
      { date: "2026-10-14", itemId: bcd.id, kind, qty, reason },
      items,
    );
  const movements = [
    { id: "m1", ...mv("in", 5, "beli") },
    { id: "m2", ...mv("out", 2, "sewa") },
    { id: "m3", ...mv("adjust", -1, "opname") },
    { id: "m4", ...mv("in", 1, "kembali") },
  ];
  assert.equal(stockOf(movements, bcd.id), 3);
  assert.throws(() => mv("out", 0, "jual"), { message: /lebih dari 0/ });
  assert.throws(() => mv("adjust", 0, "opname"), { message: /bukan nol/ });
  assert.throws(() => mv("in", 2.5, "beli"), { message: /bulat/ });
  assert.throws(() => mv("in", 2, "rusak"), { message: /alasan/ });
  assert.throws(
    () =>
      validateMovement(
        { date: "2026-10-14", itemId: "item:none", kind: "in", qty: 1 },
        items,
      ),
    { message: /tidak ditemukan/ },
  );
  const [row] = stockTable(items, movements);
  assert.equal(row.stock, 3);
  assert.equal(row.low, false);
  assert.equal(row.value, 10500000);
  const [lowRow] = stockTable(items, [
    ...movements,
    { id: "m5", ...mv("out", 1, "rusak") },
  ]);
  assert.equal(lowRow.stock, 2);
  assert.equal(lowRow.low, true);
  // Inactive items never warn.
  assert.equal(stockTable([{ ...bcd, active: false }], [])[0].low, false);
});

test("content is planned per platform and summed once it is out", () => {
  const post = validatePost({
    date: "2026-10-20",
    time: "17:00",
    platform: "instagram",
    format: "reel",
    title: " Manta di Manta Point ",
    status: "published",
    link: "https://www.instagram.com/reel/abc",
    metrics: { views: "12000", likes: "840", comments: "", saves: 55 },
  });
  assert.equal(post.title, "Manta di Manta Point");
  assert.deepEqual(post.metrics, {
    views: 12000,
    reach: 0,
    likes: 840,
    comments: 0,
    saves: 55,
    shares: 0,
  });
  const bad = (input, pattern) =>
    assert.throws(
      () => validatePost({ date: "2026-10-20", title: "x", ...input }),
      { message: pattern },
    );
  bad({ date: "" }, /tanggal/);
  bad({ time: "5pm" }, /JJ:MM/);
  bad({ platform: "threads" }, /platform/);
  bad({ format: "podcast" }, /format/);
  bad({ title: "" }, /judul/);
  bad({ status: "viral" }, /status/);
  bad({ link: "http://x.y" }, /https/);
  bad({ metrics: { likes: -1 } }, /Suka/);
  const posts = [
    { ...post, id: "p1" },
    {
      ...post,
      id: "p2",
      date: "2026-10-22",
      platform: "tiktok",
      status: "idea",
      metrics: { views: 999 },
    },
    {
      ...post,
      id: "p3",
      date: "2026-10-25",
      platform: "instagram",
      status: "evaluated",
      metrics: { views: 3000, likes: 100 },
    },
    {
      ...post,
      id: "p4",
      date: "2026-11-01",
      status: "published",
      metrics: { views: 50 },
    },
  ];
  const summary = monthSummary(posts, "2026-10");
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.byStatus, {
    idea: 1,
    draft: 0,
    scheduled: 0,
    published: 1,
    evaluated: 1,
  });
  assert.deepEqual(summary.byPlatform.instagram, { planned: 2, live: 2 });
  assert.deepEqual(summary.byPlatform.tiktok, { planned: 1, live: 0 });
  // Ideas do not count towards the numbers.
  assert.equal(summary.metrics.views, 15000);
  assert.equal(summary.metrics.likes, 940);
});
