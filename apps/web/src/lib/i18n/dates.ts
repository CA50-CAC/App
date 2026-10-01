/**
 * Found dates as people say them: "Today", "Yesterday", "3 days ago", then a
 * plain date for anything older than a week.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export function foundAgo(iso: string, now = new Date(), timeZone = "UTC"): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const days = Math.round((Date.parse(day(now)) - Date.parse(day(new Date(iso)))) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso, timeZone);
}

export function formatDate(iso: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

/** yyyy-mm-dd in the given time zone, for date inputs. */
export function isoDay(d: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
