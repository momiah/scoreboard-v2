import moment from "moment";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { notificationSchema, notificationTypes } from "@shared";
import {
  Game,
  GameResult,
  GameTeam,
  League,
  Player,
  UserProfile,
} from "@shared/types";
import { getGameOpponentIds, getGamePlayerIds } from "@shared/helpers";
import { calculateWin } from "../calculateWin";
import { formatDisplayName } from "../formatDisplayName";
import { generateUniqueGameId } from "../generateUniqueId";
import { validateBadmintonScores } from "../validateBadmintonScores";

type ReportLeagueGameArgs = {
  leagueId: string;
  team1Players: (Player | null)[];
  team2Players: (Player | null)[];
  score1: number;
  score2: number;
  reporter: UserProfile;
  sendNotification: (payload: Record<string, unknown>) => Promise<unknown>;
};

export type ReportLeagueGameResult =
  { game: Game; error?: undefined } | { error: string; game?: undefined };

export const reportLeagueGameError = (
  team1Players: (Player | null)[],
  team2Players: (Player | null)[],
  score1: number,
  score2: number,
  reporterId: string,
): string | null => {
  const ids = [...team1Players, ...team2Players].map((p) => p?.userId);
  if (ids.some((id) => !id)) return "Please select every player.";
  if (new Set(ids).size !== ids.length) {
    return "A player can only be on one team.";
  }
  if (Number.isNaN(score1) || Number.isNaN(score2)) {
    return "Please enter scores for both teams.";
  }
  const scoreError = validateBadmintonScores(score1, score2);
  if (scoreError) return scoreError;
  if (!ids.includes(reporterId)) {
    return "You must be a participant in the game to report it.";
  }
  return null;
};

// Saves the reported game in a transaction against the league's current
// games, then asks the reporter's opponents to approve it. Nobody is
// notified about a game that was not saved.
export const reportLeagueGame = async ({
  leagueId,
  team1Players,
  team2Players,
  score1,
  score2,
  reporter,
  sendNotification,
}: ReportLeagueGameArgs): Promise<ReportLeagueGameResult> => {
  const inputError = reportLeagueGameError(
    team1Players,
    team2Players,
    score1,
    score2,
    reporter.userId,
  );
  if (inputError) return { error: inputError };

  const leagueRef = doc(db, "leagues", leagueId);
  let leagueName = "";

  const outcome = await runTransaction(
    db,
    async (transaction): Promise<ReportLeagueGameResult> => {
      const snap = await transaction.get(leagueRef);
      if (!snap.exists()) return { error: "League not found." };
      const league = snap.data() as League;
      leagueName = league.leagueName;

      if (moment(league.startDate, "DD-MM-YYYY").isAfter()) {
        return { error: "This league has not started yet." };
      }
      if (moment(league.endDate, "DD-MM-YYYY").endOf("day").isBefore()) {
        return { error: "This league has ended." };
      }

      const isDoubles = league.leagueType === "Doubles";
      const team1: GameTeam = {
        player1: team1Players[0],
        player2: isDoubles ? team1Players[1] : null,
        score: score1,
      };
      const team2: GameTeam = {
        player1: team2Players[0],
        player2: isDoubles ? team2Players[1] : null,
        score: score2,
      };

      const existingGames: Game[] = league.games || [];
      const game: Game = {
        gameId: generateUniqueGameId({
          existingGames,
          competitionId: leagueId,
        }),
        gamescore: `${score1} - ${score2}`,
        createdAt: new Date(),
        date: moment().format("DD-MM-YYYY"),
        createdTime: moment().format("HH:mm"),
        team1,
        team2,
        result: calculateWin(team1, team2, league.leagueType) as GameResult,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        approvalStatus: "Pending",
        reporter: reporter.userId,
        approvers: [],
      };

      const participantIds = (league.leagueParticipants || []).map(
        (p) => p.userId,
      );
      if (getGamePlayerIds(game).some((id) => !participantIds.includes(id))) {
        return { error: "Every player must be in the league." };
      }

      transaction.update(leagueRef, { games: [...existingGames, game] });
      return { game };
    },
  );

  if (!outcome.game) return outcome;

  for (const recipientId of getGameOpponentIds(outcome.game, reporter.userId)) {
    await sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId,
      senderId: reporter.userId,
      message: `${formatDisplayName(reporter)} has just reported a score in ${leagueName} league`,
      type: notificationTypes.ACTION.ADD_GAME.LEAGUE,
      data: { leagueId, gameId: outcome.game.gameId },
    });
  }

  return outcome;
};
