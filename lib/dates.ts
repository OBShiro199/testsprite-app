// Every "what time is it?" question in the app goes through this file, so time
// can be faked in development by setting localStorage["signalboard:now"] to an
// ISO date (for example "2027-02-28T12:00:00.000Z"). Ignored in production.

const FAKE_NOW_KEY = "signalboard:now";

export function now(): Date {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    try {
      const fake = window.localStorage.getItem(FAKE_NOW_KEY);
      if (fake) {
        const d = new Date(fake);
        if (!Number.isNaN(d.getTime())) return d;
      }
    } catch {
      // storage unavailable: fall through to the real clock
    }
  }
  return new Date();
}

export function nowIso(): string {
  return now().toISOString();
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Adds calendar months, clamping to the last day of the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(targetYear, targetMonth));
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** True when a card expiring at the end of month/year (2-digit year) is still usable now. */
export function isExpiryCurrentOrFuture(month: number, twoDigitYear: number): boolean {
  const today = now();
  const year = 2000 + twoDigitYear;
  const thisYear = today.getUTCFullYear();
  const thisMonth = today.getUTCMonth() + 1;
  if (year > thisYear) return true;
  if (year < thisYear) return false;
  return month >= thisMonth;
}
