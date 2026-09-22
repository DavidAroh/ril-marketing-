/** RIL number formatting — adapted from @efferd/formater patterns, no copy.
 *  Single locale for dashboard numbers (counts, compact, percent).
 *  Real data only; no synthetic benchmarks.
 */

export const RIL_LOCALE = "en-US";

export function formatInteger(value: number): string {
  return new Intl.NumberFormat(RIL_LOCALE, { maximumFractionDigits: 0 }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(RIL_LOCALE, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function formatPercentDelta(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Wire numbers carry every decision queue (DESIGN: "Wire 01"). */
export function wireLabel(index: number): string {
  return `Wire ${String(index + 1).padStart(2, "0")}`;
}

/** Dateline date for list rows: "12 Sep 2026". */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today's dateline header, shared by every dashboard surface. */
export function todayDateline(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
