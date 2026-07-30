export const number = new Intl.NumberFormat("en-MY");

export function formatPrice(value: number) {
  return `RM ${number.format(Math.round(value))}`;
}

export function formatMileage(value: number) {
  return `${number.format(value)} km`;
}

export function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
