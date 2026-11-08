import {
  doc,
  increment,
  runTransaction,
  DocumentData,
  UpdateData,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import { notificationTypes } from "@shared";
import {
  Fixtures,
  Game,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "@shared/types";
import {
  advanceBrackets,
  applyLeagueGameResults,
  calculatePlayerPerformance,
  canRespondToGame,
  calculateTeamPerformance,
  getGamePlayerIds,
  getOrderedApprovedGames,
  isLeagueGamePending,
  recalculateParticipantsFromFixtures,
} from "@shared/helpers";
import { buildCompetitionConfig } from "./getCompetitionConfig";

export const findGameInCompetition = (
  competitionData: { fixtures?: Fixtures[]; games?: Game[] },
  gameId: string,
  isTournament: boolean,
) => {
  if (isTournament) {
    const allGames =
      competitionData.fixtures?.flatMap((fixture: Fixtures) => fixture.games) ||
      [];
    const index = allGames.findIndex((game: Game) => game.gameId === gameId);
    return { game: allGames[index] || null, index, games: allGames };
  }

  const games = competitionData.games || [];
  const index = games.findIndex((game: Game) => game.gameId === gameId);
  return { game: games[index] || null, index, games };
};

export type GameApprovalOutcome =
  | {
      status: "approved";
      fullyApproved: boolean;
      competitionName: string;
      approverUsername: string;
    }
  | { status: "not-pending" | "already-approved" | "not-opponent" };

export const APPROVAL_REFUSED_MESSAGES = {
  "not-pending": "This game has already been approved or declined",
  "already-approved": "You have already approved this game",
  "not-opponent": "Only the reporter's opponents can approve this game",
} as const;

const replaceFixtureGame = (fixtures: Fixtures[], game: Game): Fixtures[] =>
  fixtures.map((round) => ({
    ...round,
    games: round.games.map((g) => (g.gameId === game.gameId ? game : g)),
  }));

// One transaction: the game is re-read, and approved only while it is still
// pending and this user has not approved it, so a second approval or one
// racing the auto-approval job can never apply its stats twice.
export const approveCompetitionGame = ({
  isLeague,
  competitionId,
  gameId,
  approverId,
}: {
  isLeague: boolean;
  competitionId: string;
  gameId: string;
  approverId: string;
}): Promise<GameApprovalOutcome> => {
  const config = buildCompetitionConfig(isLeague);
  const isTournament = !isLeague;
  const competitionRef = doc(db, config.collectionName, competitionId);

  return runTransaction(db, async (transaction) => {
    const competitionSnap = await transaction.get(competitionRef);
    if (!competitionSnap.exists()) throw new Error("Competition not found");
    const data = competitionSnap.data();

    const { game } = findGameInCompetition(data, gameId, isTournament);
    if (!game) throw new Error("Game not found in competition");
    if (!isLeagueGamePending(game)) return { status: "not-pending" };
    if (!canRespondToGame(game, approverId)) return { status: "not-opponent" };

    const approvers = game.approvers || [];
    if (approvers.some((a) => a.userId === approverId)) {
      return { status: "already-approved" };
    }

    const approverSnap = await transaction.get(doc(db, "users", approverId));
    if (!approverSnap.exists()) throw new Error("User not found");
    const approver = approverSnap.data() as UserProfile;

    const playerIds = getGamePlayerIds(game);
    const userSnaps = await Promise.all(
      playerIds.map((uid) => transaction.get(doc(db, "users", uid))),
    );
    const users = userSnaps
      .filter((snap) => snap.exists())
      .map((snap) => snap.data() as UserProfile);

    const updatedGame: Game = {
      ...game,
      numberOfApprovals: (game.numberOfApprovals || 0) + 1,
      approvers: [
        ...approvers,
        { userId: approver.userId, username: approver.username },
      ],
    };
    const fullyApproved =
      updatedGame.numberOfApprovals >= (data.approvalLimit || 1);
    if (fullyApproved) {
      updatedGame.approvalStatus = notificationTypes.RESPONSE.APPROVED_GAME;
    }

    const participants: ScoreboardProfile[] =
      data[config.participantsKey] ?? [];
    const teams: TeamStats[] = data[config.teamKey] ?? [];
    const isDoubles = data[config.typeKey] === "Doubles";
    const writeUsers = (toWrite: UserProfile[] | undefined) =>
      toWrite?.forEach((user) => {
        if (!user.userId) return;
        transaction.update(doc(db, "users", user.userId), {
          profileDetail: user.profileDetail,
        });
      });

    const outcome: GameApprovalOutcome = {
      status: "approved",
      fullyApproved,
      competitionName: data[config.nameKey],
      approverUsername: approver.username,
    };

    if (isLeague) {
      const games: Game[] = (data.games || []).map((g: Game) =>
        g.gameId === gameId ? updatedGame : g,
      );
      if (!fullyApproved) {
        transaction.update(competitionRef, { games });
        return outcome;
      }
      const results = await applyLeagueGameResults({
        games: [updatedGame],
        participants,
        teams,
        users,
        isDoubles,
      });
      transaction.update(competitionRef, {
        games,
        [config.participantsKey]: results.participants,
        ...(isDoubles && { [config.teamKey]: results.teams }),
      });
      writeUsers(results.users);
      return outcome;
    }

    const fixturesWithGame = replaceFixtureGame(
      data.fixtures ?? [],
      updatedGame,
    );
    if (!fullyApproved) {
      transaction.update(competitionRef, { fixtures: fixturesWithGame });
      return outcome;
    }

    const gameParticipants = participants.filter((p) =>
      playerIds.includes(p.userId!),
    );

    if (data.tournamentMode === "Knockout") {
      const { playersToUpdate, usersToUpdate } = calculatePlayerPerformance(
        updatedGame,
        gameParticipants,
        users,
      );
      const updatePayload: UpdateData<DocumentData> = {
        fixtures: advanceBrackets({
          fixtures: fixturesWithGame,
          numberOfCourts: data.numberOfCourts || 1,
        }),
        gamesCompleted: increment(1),
        [config.participantsKey]: participants.map(
          (p) => playersToUpdate.find((u) => u.userId === p.userId) ?? p,
        ),
      };
      if (isDoubles) {
        const [winnerTeam, loserTeam] = await calculateTeamPerformance({
          game: updatedGame,
          allTeams: teams,
        });
        updatePayload[config.teamKey] = teams.map((team) => {
          if (team.teamKey === winnerTeam.teamKey) return winnerTeam;
          if (team.teamKey === loserTeam.teamKey) return loserTeam;
          return team;
        });
      }
      transaction.update(competitionRef, updatePayload);
      writeUsers(usersToUpdate);
      return outcome;
    }

    const { updatedParticipants, updatedTeams } =
      await recalculateParticipantsFromFixtures(
        getOrderedApprovedGames(fixturesWithGame),
        participants,
        teams,
        isDoubles,
      );
    transaction.update(competitionRef, {
      fixtures: fixturesWithGame,
      gamesCompleted: increment(1),
      [config.participantsKey]: updatedParticipants,
      ...(isDoubles && { [config.teamKey]: updatedTeams }),
    });
    const { usersToUpdate } = calculatePlayerPerformance(
      updatedGame,
      gameParticipants,
      users,
    );
    writeUsers(usersToUpdate);
    return outcome;
  });
};
