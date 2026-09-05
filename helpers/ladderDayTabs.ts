import type { Ladder, LadderMatch } from "@shared/types";

import { toMoment } from "./ladderPhases";

export const ALL_DAYS_KEY = "ALL";

export interface LadderDayTab {
  key: string;
  label: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad2 = (n: number): string => String(n).padStart(2, "0");

const dateToKey = (d: Date): string =>
  `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;

export const dayKeyToDate = (key: string): Date | null => {
  const [day, month, year] = (key ?? "").split("-").map(Number);
  if (![day, month, year].every(Number.isFinite) || !day || !month || !year) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const normalizeDayKey = (raw: string): string => {
  const d = dayKeyToDate(raw);
  return d ? dateToKey(d) : raw;
};

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const labelForDate = (d: Date): string =>
  `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;

const labelForKey = (key: string): string => {
  const d = dayKeyToDate(key);
  return d ? labelForDate(d) : key;
};

const allTab: LadderDayTab = { key: ALL_DAYS_KEY, label: "All" };

const MAX_DAYS = 400;

export const buildMatchmakingDayTabs = (
  ladder: Ladder,
  now: Date = new Date(),
): LadderDayTab[] => {
  const seasonStart = toMoment(ladder.seasonStartsAt)?.toDate() ?? null;
  const end =
    toMoment(ladder.playoffStartsAt)?.toDate() ??
    toMoment(ladder.seasonEndsAt)?.toDate() ??
    null;
  if (!end) return [allTab];

  let cursor = startOfDay(now);
  if (seasonStart && startOfDay(seasonStart).getTime() > cursor.getTime()) {
    cursor = startOfDay(seasonStart);
  }
  const last = startOfDay(end);

  const tabs: LadderDayTab[] = [allTab];
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < MAX_DAYS) {
    tabs.push({ key: dateToKey(cursor), label: labelForDate(cursor) });
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    );
    guard += 1;
  }
  return tabs;
};

/** The day key for today, used to anchor/highlight the schedule strip. */
export const todayDayKey = (now: Date = new Date()): string =>
  dateToKey(startOfDay(now));

// Date-only tabs for the schedule strip, in chronological order (past → today →
// future). "All" is rendered separately as a pinned button, so it is NOT
// included here.
export const buildScheduleDayTabs = (
  matches: LadderMatch[],
): LadderDayTab[] => {
  const keys = Array.from(
    new Set(matches.map((m) => normalizeDayKey(m.matchDate)).filter(Boolean)),
  ).sort(
    (a, b) => (dayKeyToDate(a)?.getTime() ?? 0) - (dayKeyToDate(b)?.getTime() ?? 0),
  );
  return keys.map((key) => ({ key, label: labelForKey(key) }));
};

export const filterMatchesByDay = (
  matches: LadderMatch[],
  dayKey: string,
): LadderMatch[] =>
  dayKey === ALL_DAYS_KEY
    ? matches
    : matches.filter((m) => normalizeDayKey(m.matchDate) === dayKey);
