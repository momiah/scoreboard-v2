import { LADDER_STATUS, TEAM_STATUS } from "@shared/types";
import type { TeamStats } from "@shared/types";

export type LadderRegistrationBlock = "closed" | "not_open" | "full";
export type TeamRegistrationBlock =
  | "team_not_found"
  | "team_pending"
  | "team_incomplete";

type DateLike = Date | { toDate: () => Date } | string | number | null | undefined;

const toMs = (value: DateLike): number | null => {
  if (value == null) return null;
  const ms =
    typeof value === "object" && "toDate" in value
      ? value.toDate().getTime()
      : new Date(value as string | number | Date).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const getLadderRegistrationBlock = (
  ladder: {
    status?: string;
    registrationOpensAt?: DateLike;
    registrationClosesAt?: DateLike;
    participantCount?: number;
    maxPlayers?: number;
  },
  nowMs: number,
): LadderRegistrationBlock | null => {
  if (ladder.status && ladder.status !== LADDER_STATUS.REGISTRATION_OPEN) {
    return "closed";
  }
  const opensAt = toMs(ladder.registrationOpensAt);
  if (opensAt !== null && nowMs < opensAt) return "not_open";
  const closesAt = toMs(ladder.registrationClosesAt);
  if (closesAt !== null && nowMs >= closesAt) return "closed";
  if (
    (ladder.maxPlayers ?? 0) > 0 &&
    (ladder.participantCount ?? 0) >= (ladder.maxPlayers ?? 0)
  ) {
    return "full";
  }
  return null;
};

export const getTeamRegistrationBlock = (
  team: Pick<TeamStats, "status" | "playerIds" | "team"> | null | undefined,
): TeamRegistrationBlock | null => {
  if (!team) return "team_not_found";
  if (team.status === TEAM_STATUS.PENDING) return "team_pending";
  const memberCount = team.playerIds?.length ?? (team.team ?? []).length;
  return memberCount >= 2 ? null : "team_incomplete";
};
