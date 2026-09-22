import { COMPETITION_TYPES } from "@shared";
import { calculatePlayerPerformance } from "@shared/helpers";
import type { Game, ScoreboardProfile, UserProfile } from "@shared/types";

import { teamUserIds } from "./ladderMatchResult";

type TeamLabel = "Team 1" | "Team 2";

export interface SinglesScoreInput {
  game: Game;
  /** The two players' per-ladder participant docs. */
  participants: ScoreboardProfile[];
  /** The two players' global user docs. */
  users: UserProfile[];
  /** True when this game clinches the match (best-of decided, first time). */
  matchDecided: boolean;
  /** Which side won the match overall, or null when undecided. */
  matchWinnerSide: TeamLabel | null;
}

export interface SinglesScoreResult {
  participants: ScoreboardProfile[];
  matchCompleted: boolean;
}

/**
 * Pure singles ladder scoring: the ladder competitionType makes the upset
 * multiplier use each participant's per-ladder CP as the basis (not global XP),
 * so prevGameXP is the CP this game earned in THIS ladder. Global profileDetail
 * XP still accumulates that same delta; the per-ladder CP is accumulated here,
 * floored at 0. Mutates participants and users in place; does no I/O.
 */
export const scoreSinglesLadderGame = ({
  game,
  participants,
  users,
  matchDecided,
  matchWinnerSide,
}: SinglesScoreInput): SinglesScoreResult => {
  calculatePlayerPerformance(game, participants, users, COMPETITION_TYPES.LADDER);
  participants.forEach((p) => {
    p.competitionXP = Math.max(0, (p.competitionXP ?? 0) + (p.prevGameXP ?? 0));
  });

  let matchCompleted = false;
  if (matchDecided && matchWinnerSide) {
    const winnerIds = teamUserIds(game, matchWinnerSide);
    participants.forEach((p) => {
      const won = p.userId ? winnerIds.includes(p.userId) : false;
      p.matchResultLog = [...(p.matchResultLog ?? []), won ? "W" : "L"].slice(
        -20,
      );
    });
    matchCompleted = true;
  }

  return { participants, matchCompleted };
};
