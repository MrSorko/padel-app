const dateFormat = new Intl.DateTimeFormat("sv-SE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Stockholm",
});

/** T.ex. "fre 24 okt. 19:30" i svensk tid. */
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

const decimal = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

/** T.ex. "12,5", eller "–" om värdet saknas. */
export function formatDecimal(value: number | null) {
  return value === null ? "–" : decimal.format(value);
}

/** Andel 0–1 som procent, t.ex. "67 %", eller "–" om värdet saknas. */
export function formatPercent(value: number | null) {
  return value === null ? "–" : `${Math.round(value * 100)} %`;
}

const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Stockholm",
});

/** T.ex. "fre 24 okt. 2026" i svensk tid. */
export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso));
}
