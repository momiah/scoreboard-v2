// helpers/processGamePerformance.ts

import { Game } from "../types/game";
import { CollectionName } from "../types/competition";
import { ScoreboardProfile, UserProfile } from "../types/player";
import { calculatePlayerPerformance } from "./calculatePlayerPerformance";
import { calculateTeamPerformance } from "./calculateTeamPerformance";
import {
  getUserById,
  retrieveTeams,
  updateUsers,
  updateTeams,
} from "../devFunctions/firebaseFunctions";
interface ProcessGamePerformanceParams {
  game: Game;
  participants: ScoreboardProfile[];
  competitionId: string;
  collectionName: CollectionName;
}

interface ProcessGamePerformanceResult {
  success: boolean;
  updatedParticipants: ScoreboardProfile[];
  message?: string;
}

export const processGamePerformance = async ({
  game,
  participants,
  competitionId,
  collectionName,
}: ProcessGamePerformanceParams): Promise<ProcessGamePerformanceResult> => {
  const playerUserIds = [
    game.team1.player1?.userId,
    game.team1.player2?.userId,
    game.team2.player1?.userId,
    game.team2.player2?.userId,
  ].filter((id): id is string => Boolean(id));

  const playersToUpdate = participants.filter((player) =>
    playerUserIds.includes(player.userId!)
  );

  if (playersToUpdate.length === 0) {
    return {
      success: false,
      updatedParticipants: participants,
      message: `No matching players found for game ${game.gameId}`,
    };
  }

  const usersToUpdate = (
    await Promise.all(playerUserIds.map(getUserById))
  ).filter((user): user is UserProfile => Boolean(user));

  const playerPerformance = calculatePlayerPerformance(
    game,
    playersToUpdate,
    usersToUpdate
  );

  const updatedParticipants = participants.map((player) => {
    const updatedPlayer = playerPerformance.playersToUpdate.find(
      (p: ScoreboardProfile) => p.userId === player.userId
    );
    return updatedPlayer ? { ...player, ...updatedPlayer } : player;
  });

  await updateUsers(playerPerformance.usersToUpdate);

  const teams = await retrieveTeams(competitionId, collectionName);
  const teamsToUpdate = await calculateTeamPerformance({
    game,
    allTeams: teams,
  });
  await updateTeams({
    updatedTeams: teamsToUpdate,
    competitionId,
    collectionName,
  });

  return {
    success: true,
    updatedParticipants,
  };
};
