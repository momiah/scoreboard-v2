import moment, { Moment } from "moment";
import type { Ladder, LadderStatus } from "@shared/types";
import {
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
  [LADDER_STATUS.REGISTRATION_OPEN]:
    "Players sign up & start posting or accepting games",
  [LADDER_STATUS.REGISTRATION_CLOSED]:
    "Ladder continues with no more new players.",
  [LADDER_STATUS.PLAYOFFS]: "Single-elim bracket to crown the champion.",
  [LADDER_STATUS.COMPLETED]: "Season over — prizes distributed.",
  [LADDER_STATUS.CANCELLED]: "This ladder was cancelled.",
};

export const getLadderPhases = (ladder: Ladder): LadderPhase[] => {
  const windows: Record<string, { start: Moment | null; end: Moment | null }> =
    {
      [LADDER_STATUS.REGISTRATION_OPEN]: {
        start: toMoment(ladder.registrationOpensAt),
        end: toMoment(ladder.registrationClosesAt),
      },
      [LADDER_STATUS.REGISTRATION_CLOSED]: {
        start: toMoment(ladder.seasonStartsAt),
        end: toMoment(ladder.seasonEndsAt),
      },
      [LADDER_STATUS.PLAYOFFS]: {
        start: toMoment(ladder.playoffStartsAt),
        end: toMoment(ladder.playoffEndsAt),
      },
      [LADDER_STATUS.COMPLETED]: {
        start: toMoment(ladder.playoffEndsAt),
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
