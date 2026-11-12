import moment, { Moment } from "moment";
import type { Ladder, LadderStatus } from "@shared/types";
import {
  LADDER_MIN_ENTRANTS_TO_START,
  LADDER_STATUS,
  LADDER_STATUS_SEQUENCE,
  LADDER_STATUS_LABELS,
} from "@shared";

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
  status: LadderStatus;
  label: string;
  description: string;
  start: Moment | null;
  end: Moment | null;
}

const PHASE_DESCRIPTIONS: Record<LadderStatus, string> = {
  [LADDER_STATUS.REGISTRATION_OPEN]: `Players sign up. Matches open when the season starts, once ${LADDER_MIN_ENTRANTS_TO_START} have joined.`,
  [LADDER_STATUS.REGISTRATION_CLOSED]:
    "Ladder continues with no more new players.",
  [LADDER_STATUS.PLAYOFFS]: "Single-elim bracket to crown the champion.",
  [LADDER_STATUS.COMPLETED]: "Season over — prizes distributed.",
  [LADDER_STATUS.CANCELLED]: "This ladder was cancelled.",
};

export const LADDER_STATUS_TAGS: Record<string, { label: string; color: string }> = {
  [LADDER_STATUS.REGISTRATION_OPEN]: { label: "Registration Open", color: "#FAB234" },
  [LADDER_STATUS.REGISTRATION_CLOSED]: { label: "Registration Closed", color: "#FF9800" },
  [LADDER_STATUS.PLAYOFFS]: { label: "Playoffs", color: "#286EFA" },
  [LADDER_STATUS.COMPLETED]: { label: "Completed", color: "#1A6B1A" },
  [LADDER_STATUS.CANCELLED]: { label: "Cancelled", color: "#FF4757" },
};

export const getLadderPhases = (ladder: Ladder): LadderPhase[] => {
  const windows: Record<string, { start: Moment | null; end: Moment | null }> =
    {
      [LADDER_STATUS.REGISTRATION_OPEN]: {
        start: toMoment(ladder.registrationOpensAt),
        end: toMoment(ladder.registrationClosesAt),
      },
      [LADDER_STATUS.REGISTRATION_CLOSED]: {
        start: toMoment(ladder.registrationClosesAt),
        end: toMoment(ladder.playoffStartsAt),
      },
      [LADDER_STATUS.PLAYOFFS]: {
        start: toMoment(ladder.playoffStartsAt),
        end: toMoment(ladder.playoffsCompletedAt),
      },
      [LADDER_STATUS.COMPLETED]: {
        start: toMoment(ladder.playoffsCompletedAt),
        end: null,
      },
    };

  return LADDER_STATUS_SEQUENCE.map((status) => ({
    status,
    label: LADDER_STATUS_LABELS[status],
    description: PHASE_DESCRIPTIONS[status],
    start: windows[status]?.start ?? null,
    end: windows[status]?.end ?? null,
  }));
};

export const formatPhaseRange = (phase: LadderPhase): string => {
  const fmt = "MMM D";
  const start = phase.start?.isValid() ? phase.start.format(fmt) : null;
  const end = phase.end?.isValid() ? phase.end.format(fmt) : null;
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "TBC";
};

const timeLeftUntil = (target: Moment | null, now: Moment): string => {
  if (!target || !target.isValid()) return "TBC";
  if (now.isSameOrAfter(target)) return "Started";

  const days = target.diff(now, "days");
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;

  const hours = target.diff(now, "hours");
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;

  const minutes = Math.max(target.diff(now, "minutes"), 1);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
};

export const timeLeftToPlayoffs = (
  ladder: Ladder,
  now: Moment = moment(),
): string => timeLeftUntil(toMoment(ladder.playoffStartsAt), now);

/** "3 days" until the season start; "Starting" once due but not yet started. */
export const timeLeftToSeasonStart = (
  ladder: Ladder,
  now: Moment = moment(),
): string => {
  const left = timeLeftUntil(toMoment(ladder.seasonStartsAt), now);
  return left === "Started" ? "Starting" : left;
};

/** "Sat 28 Nov", or "soon" when the season start is due or unknown. */
export const formatSeasonStart = (
  ladder: Ladder,
  now: Moment = moment(),
): string => {
  const start = toMoment(ladder.seasonStartsAt);
  return start && start.isAfter(now) ? start.format("ddd D MMM") : "soon";
};
