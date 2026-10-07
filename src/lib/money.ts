const formatter = new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:2});
export const MAX_PAISE = 2147483647;

/** Parse decimal form text without multiplying a binary floating-point value. */
export function rupeesToPaise(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid rupee amount");
    // Numeric callers may contain binary arithmetic noise (for example 0.1 + 0.2).
    const rounded = Math.round((value + Number.EPSILON * value) * 100);
    if (!Number.isSafeInteger(rounded) || rounded > MAX_PAISE) throw new Error("Amount is too large");
    return rounded;
  }
  const text = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Use rupees with up to two decimals");
  const [whole, fraction = ""] = text.split(".");
  const paise = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (paise > BigInt(MAX_PAISE)) throw new Error("Amount is too large");
  return Number(paise);
}

export function paiseToRupees(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error("Invalid stored amount");
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}
export function money(paise: number) { return formatter.format(paise / 100); }
