import type { LadderMatch } from "@shared/types";

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

type MatchTimeFields = Pick<LadderMatch, "matchDate" | "matchTime">;

export const getMatchStart = (match: MatchTimeFields): Date | null => {
  const dateParts = (match.matchDate ?? "").split("-").map(Number);
  const timeParts = (match.matchTime?.start ?? "").split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length !== 2) return null;

  const [day, month, year] = dateParts;
  const [hours, minutes] = timeParts;
  if (![day, month, year, hours, minutes].every(Number.isFinite)) return null;
  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export const isMatchStarted = (
  match: MatchTimeFields,
  now: Date = new Date(),
): boolean => {
  const start = getMatchStart(match);
  return start ? now.getTime() >= start.getTime() : true;
};

export const formatMatchDateShort = (matchDate: string): string => {
  const [day, month] = (matchDate ?? "").split("-").map(Number);
  if (!day || !month) return matchDate ?? "";
  return `${day} ${SHORT_MONTHS[month - 1] ?? ""}`.trim();
};
