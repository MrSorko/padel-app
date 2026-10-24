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
