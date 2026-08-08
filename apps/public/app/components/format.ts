export function formatPrice(price?: number) {
  if (price === undefined) {
    return "цена уточняется";
  }
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(price / 100);
}
