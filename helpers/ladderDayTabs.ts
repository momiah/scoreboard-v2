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

const ladderStart = (ladder: Ladder): Date | null =>
  toMoment(ladder.seasonStartsAt)?.toDate() ?? null;

const ladderEnd = (ladder: Ladder): Date | null =>
  toMoment(ladder.playoffStartsAt)?.toDate() ??
  toMoment(ladder.seasonEndsAt)?.toDate() ??
  null;

/** The day key for today, used to anchor/highlight the strips. */
export const todayDayKey = (now: Date = new Date()): string =>
  dateToKey(startOfDay(now));

// Matchmaking strip: today -> ladder end only (no past). "All" is rendered
// separately as a pinned button, so it is NOT included here.
export const buildMatchmakingDayTabs = (
  ladder: Ladder,
  now: Date = new Date(),
): LadderDayTab[] => {
  const seasonStart = ladderStart(ladder);
  let from = startOfDay(now);
  if (seasonStart && startOfDay(seasonStart).getTime() > from.getTime()) {
    from = startOfDay(seasonStart);
  }
  return dayTabsBetween(from, ladderEnd(ladder));
};

// Schedule strip: every day of the ladder (start -> end), chronological, so the
// strip anchors on today with past to the left (slide right) and future to the
// right (slide left). "All" is rendered separately as a pinned button.
export const buildScheduleDayTabs = (
  ladder: Ladder,
  now: Date = new Date(),
): LadderDayTab[] => {
  const tabs = dayTabsBetween(ladderStart(ladder), ladderEnd(ladder));
  if (tabs.length) return tabs;
  const key = todayDayKey(now);
  return [{ key, label: labelForKey(key) }];
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
