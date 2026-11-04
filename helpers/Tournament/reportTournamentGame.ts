import moment from "moment";
import { calculateWin } from "../calculateWin";
import { formatDisplayName } from "../formatDisplayName";
import { notificationSchema, notificationTypes } from "@shared";
import { Game, GameResult, GameTeam, UserProfile } from "@shared/types";

type ReportTournamentGameArgs = {
  game: Game;
  score1: number;
  score2: number;
  tournamentType: string;
  tournamentName: string;
  tournamentId: string;
  reporter: UserProfile;
  getUserById: (userId: string) => Promise<unknown>;
  sendNotification: (payload: Record<string, unknown>) => Promise<unknown>;
  updateTournamentGame: (args: {
    tournamentId: string;
    gameId: string;
    updatedGame: Game;
  }) => Promise<unknown>;
};

export const reportTournamentGame = async ({
  game,
  score1,
  score2,
  tournamentType,
  tournamentName,
  tournamentId,
  reporter,
  getUserById,
  sendNotification,
  updateTournamentGame,
}: ReportTournamentGameArgs) => {
  const team1: GameTeam = {
    player1: game?.team1?.player1 ?? null,
    player2: game?.team1?.player2 ?? null,
    score: score1,
  };

  const team2: GameTeam = {
    player1: game?.team2?.player1 ?? null,
    player2: game?.team2?.player2 ?? null,
    score: score2,
  };

  const result = calculateWin(team1, team2, tournamentType) as GameResult;
  const gamescore = `${score1}-${score2}`;
  const date = moment().format("DD-MM-YYYY");

  const gameResult: Game = {
    gameId: game.gameId,
    gamescore,
    date,
    reportedAt: new Date(),
    reportedTime: moment().format("HH:mm"),
    team1,
    team2,
    result,
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    approvalStatus: "Pending",
    reporter: reporter?.userId || "",
    court: game?.court,
    gameNumber: game?.gameNumber,
    createdAt: game?.createdAt,
    createdTime: game?.createdTime,
    approvers: game?.approvers || [],
  };

  const isReporterTeam1 = [team1.player1?.userId, team1.player2?.userId].includes(
    reporter?.userId,
  );

  const opponentUserIds = isReporterTeam1
    ? [team2.player1?.userId, team2.player2?.userId].filter(Boolean)
    : [team1.player1?.userId, team1.player2?.userId].filter(Boolean);

  const requestForOpponentApprovals = (await Promise.all(
    opponentUserIds.map((userId) => getUserById(userId as string)),
  )) as Array<{ userId: string; [key: string]: unknown }>;

  for (const user of requestForOpponentApprovals) {
    await sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: user.userId,
      senderId: reporter?.userId,
      message: `${formatDisplayName(reporter)} has just reported a score in ${tournamentName} tournament`,
      type: notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
      data: { tournamentId, gameId: game.gameId },
    });
  }

  await updateTournamentGame({
    tournamentId,
    gameId: game.gameId,
    updatedGame: gameResult,
  });

  return { gameResult, gamescore, date, team1, team2 };
};
