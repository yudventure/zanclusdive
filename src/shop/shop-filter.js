// Search and filters of the gear in one homepage Dive Shop tab: words found
// in the name, summary, description or category, one category, only gear
// that can be ordered now, and an order. Items are the cards of the tab:
// { product, name, price (null asks for a price), left }.
export const sortOrders = ["default", "priceLow", "priceHigh", "name"];

const plain = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function matchesSearch(product, query, categoryName = "") {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = plain(
    [
      product.name,
      product.specification,
      product.description,
      categoryName,
    ].join(" "),
  );
  return words.every((word) => text.includes(word));
}

// Gear that can go into the cart: not marked unavailable, and with units
// left when it follows the warehouse.
export const orderable = (item) =>
  item.product.availability !== "unavailable" && item.left > 0;

// Prices to ask for go last either way.
const byPrice = (direction) => (a, b) =>
  a.price === null
    ? b.price === null
      ? 0
      : 1
    : b.price === null
      ? -1
      : direction * (a.price - b.price);

export function filterItems(
  items,
  { query = "", category = "all", available = false, sort = "default" } = {},
  { categoryName = (key) => key, locale = "id" } = {},
) {
  const out = items.filter(
    (item) =>
      (category === "all" || item.product.category === category) &&
      matchesSearch(item.product, query, categoryName(item.product.category)) &&
      (!available || orderable(item)),
  );
  if (sort === "priceLow") return [...out].sort(byPrice(1));
  if (sort === "priceHigh") return [...out].sort(byPrice(-1));
  if (sort === "name")
    return [...out].sort((a, b) => a.name.localeCompare(b.name, locale));
  return out;
}
