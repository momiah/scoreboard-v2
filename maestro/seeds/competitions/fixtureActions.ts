import { useContext } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { notificationTypes, COLLECTION_NAMES } from "@shared";
import type { CollectionName, Game, UserProfile } from "@shared/types";
import { db } from "../../../services/firebase.config";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import { reportTournamentGame } from "../../../helpers/Tournament/reportTournamentGame";

const competitionIdKey = (collectionName: CollectionName) =>
  collectionName === COLLECTION_NAMES.leagues ? "leagueId" : "tournamentId";

export const findNotification = async ({
  userId,
  type,
  data,
}: {
  userId: string;
  type: string;
  data: Record<string, string>;
}) => {
  const snap = await getDocs(
    query(
      collection(db, "users", userId, "notifications"),
      where("type", "==", type),
    ),
  );
  const match = snap.docs.find((d) =>
    Object.entries(data).every(([key, value]) => d.data().data?.[key] === value),
  );
  return match ? { id: match.id, ...match.data() } : null;
};

// Acts as a fixture user through the same LeagueContext/UserContext calls the
// app makes when that user taps the button themselves.
export const useFixtureCompetitionActions = () => {
  const { acceptCompetitionInvite, approveGame, updateTournamentGame } =
    useContext(LeagueContext);
  const { getUserById, sendNotification } = useContext(UserContext);

  const acceptInvite = async ({
    userId,
    competitionId,
    collectionName,
  }: {
    userId: string;
    competitionId: string;
    collectionName: CollectionName;
  }) => {
    const type =
      collectionName === COLLECTION_NAMES.leagues
        ? notificationTypes.ACTION.INVITE.LEAGUE
        : notificationTypes.ACTION.INVITE.TOURNAMENT;
    const notification = await findNotification({
      userId,
      type,
      data: { [competitionIdKey(collectionName)]: competitionId },
    });
    if (!notification) {
      throw new Error(`${userId} has no invite to ${competitionId}`);
    }
    await acceptCompetitionInvite({
      userId,
      competitionId,
      notificationId: notification.id,
      collectionName,
    });
  };

  const reportGame = async ({
    reporterId,
    game,
    score1,
    score2,
    tournament,
  }: {
    reporterId: string;
    game: Game;
    score1: number;
    score2: number;
    tournament: { tournamentId: string; tournamentName: string; tournamentType: string };
  }) => {
    const reporter = (await getUserById(reporterId)) as UserProfile | null;
    if (!reporter) throw new Error(`No user ${reporterId}`);
    return reportTournamentGame({
      game,
      score1,
      score2,
      tournamentType: tournament.tournamentType,
      tournamentName: tournament.tournamentName,
      tournamentId: tournament.tournamentId,
      reporter,
      getUserById,
      sendNotification,
      updateTournamentGame,
    });
  };

  const approveTournamentGame = async ({
    userId,
    game,
    tournamentId,
  }: {
    userId: string;
    game: Game;
    tournamentId: string;
  }) => {
    const notificationType = notificationTypes.ACTION.ADD_GAME.TOURNAMENT;
    const notification = await findNotification({
      userId,
      type: notificationType,
      data: { tournamentId, gameId: game.gameId },
    });
    if (!notification) {
      throw new Error(`${userId} has no approval request for ${game.gameId}`);
    }
    await approveGame({
      gameId: game.gameId,
      competitionId: tournamentId,
      userId,
      senderId: game.reporter,
      notificationId: notification.id,
      notificationType,
    });
  };

  return { acceptInvite, reportGame, approveTournamentGame };
};
