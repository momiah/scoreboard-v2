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

// Schedule strip: registrationOpensAt -> ladder end, chronological, so previous
// days sit to the LEFT of today and future days to the right. Today is anchored
// into view (scrollToKey), so sliding right reveals earlier matches and sliding
// left reveals upcoming ones. "All" is a pinned button, so it is NOT included
// here.
export const buildScheduleDayTabs = (matches: LadderMatch[]): LadderDayTab[] =>
  Array.from(
    new Set(matches.map((m) => normalizeDayKey(m.matchDate)).filter(Boolean)),
  )
    .map((key) => ({ key, date: dayKeyToDate(key) }))
    .filter((entry): entry is { key: string; date: Date } => entry.date != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ key, date }) => ({ key, label: labelForDate(date) }));

/** True once matches can be posted (from registrationOpensAt onward). */
export const ladderRegistrationOpen = (
  ladder: Ladder,
  now: Date = new Date(),
): boolean => {
  const regOpens = ladderRegistrationOpens(ladder);
  if (!regOpens) return true;
  return now.getTime() >= regOpens.getTime();
};

// Posting closes this many days before playoffs so players have time to finish
// every outstanding match, and the playoff cloud function is never left waiting
// on a match posted at the last minute.
export const LADDER_POSTING_BUFFER_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The latest a match may be posted: the buffer before playoffs, or null if the
 * ladder has no playoff date set (then posting stays open to the season end). */
export const ladderPostingDeadline = (ladder: Ladder): Date | null => {
  const playoffStart = toMoment(ladder.playoffStartsAt)?.toDate() ?? null;
  if (!playoffStart) return null;
  return new Date(playoffStart.getTime() - LADDER_POSTING_BUFFER_DAYS * DAY_MS);
};

/** True once posting has closed for the season (past the buffer before playoffs). */
export const ladderPostingClosed = (
  ladder: Ladder,
  now: Date = new Date(),
): boolean => {
  const deadline = ladderPostingDeadline(ladder);
  if (!deadline) return false;
  return now.getTime() >= deadline.getTime();
};

export const filterMatchesByDay = (
  matches: LadderMatch[],
  dayKey: string,
): LadderMatch[] =>
  dayKey === ALL_DAYS_KEY
    ? matches
    : matches.filter((m) => normalizeDayKey(m.matchDate) === dayKey);
