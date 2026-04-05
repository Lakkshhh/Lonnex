export const CURRENCIES: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  JPY: "¥",
};

export function formatAmount(amount: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const symbol = CURRENCIES[code] ?? CURRENCIES.USD;
  const maxFractionDigits = code === "JPY" ? 0 : 2;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
  return `${symbol}${formatted}`;
}
