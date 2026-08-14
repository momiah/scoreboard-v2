import moment, { Moment } from "moment";
import type { Ladder } from "@shared/types";

// Ladder date fields arrive from Firestore as Timestamps, but may also be
// serialized ({ seconds }) or already JS Dates. Coerce any of those shapes.
type TimestampLike =
  | Date
  | string
  | number
  | { toDate: () => Date }
  | { seconds: number }
  | null
  | undefined;

export const toMoment = (input: TimestampLike): Moment | null => {
  if (input === null || input === undefined) return null;

  if (typeof (input as { toDate?: () => Date }).toDate === "function") {
    return moment((input as { toDate: () => Date }).toDate());
  }
  if (typeof (input as { seconds?: number }).seconds === "number") {
    return moment(new Date((input as { seconds: number }).seconds * 1000));
  }
  const parsed = moment(input as string | number | Date);
  return parsed.isValid() ? parsed : null;
};

export interface LadderPhase {
  key: "registration" | "season" | "playoffs";
  label: string;
  start: Moment | null;
  end: Moment | null;
}

// Chronological phases built from the ladder's date fields.
export const getLadderPhases = (ladder: Ladder): LadderPhase[] =>
  [
    {
      key: "registration" as const,
      label: "Registration",
      start: toMoment(ladder.registrationOpensAt),
      end: toMoment(ladder.registrationClosesAt),
    },
    {
      key: "season" as const,
      label: "Season",
      start: toMoment(ladder.seasonStartsAt),
      end: toMoment(ladder.seasonEndsAt),
    },
    {
      key: "playoffs" as const,
      label: "Playoffs",
      start: toMoment(ladder.playoffStartsAt),
      end: toMoment(ladder.playoffEndsAt),
    },
  ].sort((a, b) => (a.start?.valueOf() ?? 0) - (b.start?.valueOf() ?? 0));

export const formatPhaseRange = (phase: LadderPhase): string => {
  const fmt = "Do MMM YYYY";
  const start = phase.start?.isValid() ? phase.start.format(fmt) : "TBC";
  const end = phase.end?.isValid() ? phase.end.format(fmt) : "TBC";
  return `${start} — ${end}`;
};

// Human "time left to playoffs" countdown from now to playoffStartsAt.
export const timeLeftToPlayoffs = (
  ladder: Ladder,
  now: Moment = moment(),
): string => {
  const playoffStart = toMoment(ladder.playoffStartsAt);
  if (!playoffStart || !playoffStart.isValid()) return "TBC";
  if (now.isSameOrAfter(playoffStart)) return "Started";

  const days = playoffStart.diff(now, "days");
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;

  const hours = playoffStart.diff(now, "hours");
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const minutes = Math.max(playoffStart.diff(now, "minutes"), 1);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
};
