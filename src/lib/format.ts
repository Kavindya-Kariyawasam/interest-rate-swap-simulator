import type { CurrencyCode } from "./form";

/** Avoids "-0.00" artefacts: values that round to zero at 2 decimals display as 0. */
function clean(value: number): number {
  return Math.abs(value) < 0.005 ? 0 : value;
}

export function formatMoney(value: number, currency: CurrencyCode, signed = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: currency === "LKR" ? "code" : "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(clean(value));
}

export function formatRate(valuePct: number, digits = 3, signed = false): string {
  const rounded = Math.abs(valuePct) < 0.5 * 10 ** -digits ? 0 : valuePct;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(rounded)}%`;
}
