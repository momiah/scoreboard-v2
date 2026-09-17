import {
  calculatePlayerPerformance,
  calculateTeamPerformance,
  normalizeTeamKey,
} from "@shared/helpers";
import type {
  Game,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "@shared/types";

import { buildLadderParticipant } from "./ladderParticipants";
import { teamUserIds } from "./ladderMatchResult";
import { applyLadderTeamGameXp } from "./ladderTeamScoring";

type TeamLabel = "Team 1" | "Team 2";

export interface DoublesScoreInput {
  game: Game;
  /** Existing per-ladder participant docs for the players (may be partial). */
  participants: ScoreboardProfile[];
  /** Global user docs for every player in the game. */
  users: UserProfile[];
  /** The two ladder team docs (by teamKey) for this match. */
  ladderTeams: TeamStats[];
  /** True when this game clinches the match (best-of decided, first time). */
  matchDecided: boolean;
  /** Which game side won the match overall, or null when undecided. */
  matchWinnerSide: TeamLabel | null;
}

export interface DoublesScoreResult {
  /** Participant docs to persist (existing or freshly seeded), mutated. */
  scoringParticipants: ScoreboardProfile[];
  /** [winnerTeam, loserTeam] to persist, mutated. */
  teams: TeamStats[];
  /** True when the match transitioned to completed this call. */
  matchCompleted: boolean;
}

/**
 * Pure doubles ladder scoring: the team earns per-ladder CP (team standings)
 * and each player earns global rank XP + achievement medals. Player global
 * scoring runs through calculatePlayerPerformance, which needs a participant doc
 * per player as its streak carrier — one is seeded from the user profile when a
 * player has no participant doc yet. Mutates `users`, the participant docs and
 * the two team docs in place; does no I/O so the caller owns persistence.
 */
export const scoreDoublesLadderGame = async ({
  game,
  participants,
  users,
  ladderTeams,
  matchDecided,
  matchWinnerSide,
}: DoublesScoreInput): Promise<DoublesScoreResult> => {
  const participantById = new Map(participants.map((p) => [p.userId, p]));
  const scoringParticipants = users
    .filter((u) => u.userId)
    .map((u) => participantById.get(u.userId) ?? buildLadderParticipant(u));

  calculatePlayerPerformance(game, scoringParticipants, users);

  const [winnerTeam, loserTeam] = await calculateTeamPerformance({
    game,
    allTeams: ladderTeams,
  });
  applyLadderTeamGameXp(winnerTeam, loserTeam, game);

  let matchCompleted = false;
  if (matchDecided && matchWinnerSide) {
    const matchWinnerKey = normalizeTeamKey(teamUserIds(game, matchWinnerSide));
    [winnerTeam, loserTeam].forEach((team) => {
      const won = team.teamKey === matchWinnerKey;
      team.matchResultLog = [
        ...(team.matchResultLog ?? []),
        won ? "W" : "L",
      ].slice(-20);
    });
    matchCompleted = true;
  }

  return {
    scoringParticipants,
    teams: [winnerTeam, loserTeam],
    matchCompleted,
  };
};
