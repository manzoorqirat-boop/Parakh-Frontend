import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return format(parseISO(d), "dd MMM yyyy");
  } catch {
    return d;
  }
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  try {
    return differenceInCalendarDays(parseISO(d), new Date());
  } catch {
    return null;
  }
}

// Turns PascalCase enum values into readable labels (e.g. "InProgress" -> "In progress").
export function humanize(s: string): string {
  const spaced = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
