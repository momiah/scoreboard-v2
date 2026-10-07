import { LADDER_PLAYOFF_TIE_STATUS } from "@shared";
import type { GameTeam, LadderPlayoffTie } from "@shared/types";

const sideIncludes = (
  side: LadderPlayoffTie["side1"],
  userId: string,
): boolean => !!side?.playerIds?.includes(userId);

export const isUserInPlayoffTie = (
  tie: LadderPlayoffTie,
  userId: string | undefined,
): boolean =>
  !!userId && (sideIncludes(tie.side1, userId) || sideIncludes(tie.side2, userId));

/** The user's current playoff game: the latest round they're in that isn't finished. */
export const findUserPlayoffTie = (
  ties: LadderPlayoffTie[],
  userId: string | undefined,
): LadderPlayoffTie | null =>
  ties
    .filter(
      (tie) =>
        isUserInPlayoffTie(tie, userId) &&
        tie.status !== LADDER_PLAYOFF_TIE_STATUS.COMPLETED,
    )
    .sort((a, b) => b.round - a.round)[0] ?? null;

export const playoffTieLabel = (
  tie: Pick<LadderPlayoffTie, "round" | "isThirdPlacePlayoff">,
): string =>
  tie.isThirdPlacePlayoff
    ? "Playoffs 3rd Place"
    : `Playoffs Round ${tie.round}`;

export const getPlayoffTieTeams = (
  tie: LadderPlayoffTie,
  userId: string | undefined,
): { userTeam: GameTeam; opponentTeam: GameTeam } =>
  userId && sideIncludes(tie.side2, userId)
    ? { userTeam: tie.team2, opponentTeam: tie.team1 }
    : { userTeam: tie.team1, opponentTeam: tie.team2 };
