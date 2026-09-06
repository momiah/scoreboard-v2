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

const MAX_DAYS = 400;

/** Date-only day tabs for every day in [start, end], chronological order. */
const dayTabsBetween = (
  start: Date | null,
  end: Date | null,
): LadderDayTab[] => {
  if (!start || !end) return [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  const tabs: LadderDayTab[] = [];
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

const ladderEnd = (ladder: Ladder): Date | null =>
  toMoment(ladder.playoffStartsAt)?.toDate() ??
  toMoment(ladder.seasonEndsAt)?.toDate() ??
  null;

const ladderRegistrationOpens = (ladder: Ladder): Date | null =>
  toMoment(ladder.registrationOpensAt)?.toDate() ?? null;

/** The day key for today, used to highlight it on the strips. */
export const todayDayKey = (now: Date = new Date()): string =>
  dateToKey(startOfDay(now));

// Matchmaking strip: TODAY -> ladder end, chronological, so today is the FIRST
// tab (leftmost) and sliding forward reveals future days to the end of the
// ladder. "All" is a pinned button, so it is NOT included here.
export const buildMatchmakingDayTabs = (
  ladder: Ladder,
  now: Date = new Date(),
): LadderDayTab[] =>
  dayTabsBetween(startOfDay(now), ladderEnd(ladder) ?? startOfDay(now));

// Schedule strip: TODAY first, then previous days back to registrationOpensAt
// (descending), so today is always the first tab (leftmost) and sliding forward
// reveals earlier days back to when registration opened. "All" is a pinned
// button, so it is NOT included here.
export const buildScheduleDayTabs = (
  ladder: Ladder,
  now: Date = new Date(),
): LadderDayTab[] => {
  const today = startOfDay(now);
  const regOpens = ladderRegistrationOpens(ladder);
  const from =
    regOpens && startOfDay(regOpens).getTime() <= today.getTime()
      ? startOfDay(regOpens)
      : today;
  return dayTabsBetween(from, today).reverse();
};

/** Day keys the current user has matches on (for the schedule game dots). */
export const getMatchDayKeys = (matches: LadderMatch[]): string[] =>
  Array.from(
    new Set(matches.map((m) => normalizeDayKey(m.matchDate)).filter(Boolean)),
  );

export const filterMatchesByDay = (
  matches: LadderMatch[],
  dayKey: string,
): LadderMatch[] =>
  dayKey === ALL_DAYS_KEY
    ? matches
    : matches.filter((m) => normalizeDayKey(m.matchDate) === dayKey);
