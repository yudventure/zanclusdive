// How a warehouse item is named in Gudang. A Dive Shop item is called by
// its product, with whether it is for sale or for rent and its size beside
// it, unless the team gave it a name of its own. "shop" is what the
// items API says about its product.
export const itemMode = (item) =>
  item?.shop?.mode ?? (item?.productId ? item.mode || "sale" : "");

export function itemLabel(item) {
  if (!item) return { title: "", detail: [] };
  const shop = item.shop;
  if (!shop) return { title: item.name, detail: ["Bukan dari Dive Shop"] };
  const named = item.auto && item.name === item.shopName;
  return {
    title: named || !item.name ? shop.productName : item.name,
    detail: [
      shop.mode === "rental" ? "Barang sewa" : "Barang jual",
      shop.size && `Ukuran ${shop.size}`,
      !shop.shown && "Draft di Dive Shop",
    ].filter(Boolean),
  };
}

// One line for a list to pick from: "BCD jacket · Sewa · M".
export function itemLine(item) {
  const shop = item?.shop;
  if (!shop) return item?.name ?? "";
  return [
    itemLabel(item).title,
    shop.mode === "rental" ? "Sewa" : "Jual",
    shop.size,
  ]
    .filter(Boolean)
    .join(" · ");
}
