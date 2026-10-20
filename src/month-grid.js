// The dates a month grid shows: whole weeks from Monday, so the grid is
// always 4 to 6 rows of 7. Shared by the admin calendar and its test.
export const shiftDate = (date, days) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function monthDays(month) {
  const first = month + "-01";
  const offset = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const rows = Math.ceil((offset + count) / 7);
  return Array.from({ length: rows * 7 }, (_, i) =>
    shiftDate(first, i - offset),
  );
}
