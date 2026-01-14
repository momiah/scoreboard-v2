import {
  notificationTypes,
  COLLECTION_NAMES,
  COMPETITION_TYPES,
} from "@/schemas/schema";

interface CompetitionConfig {
  isLeague: boolean;
  navRoute: "League" | "Tournament";
  nameKey: "leagueName" | "tournamentName";
  typeKey: "leagueType" | "tournamentType";
  participantsKey: "leagueParticipants" | "tournamentParticipants";
  collectionName: string;
}

export const getCompetitionConfig = (
  notificationType: string
): CompetitionConfig => {
  const isLeague: boolean =
    notificationType === notificationTypes.ACTION.ADD_GAME.LEAGUE;

  return {
    isLeague,
    navRoute: isLeague ? "League" : "Tournament",
    nameKey: isLeague ? "leagueName" : "tournamentName",
    typeKey: isLeague ? "leagueType" : "tournamentType",
    participantsKey: isLeague ? "leagueParticipants" : "tournamentParticipants",
    collectionName: isLeague
      ? COLLECTION_NAMES.leagues
      : COLLECTION_NAMES.tournaments,
  };
};

export const getCompetitionTypeAndId = ({
  collectionName,
  leagueId,
  tournamentId,
}: {
  collectionName: string;
  leagueId: string;
  tournamentId: string;
}) => {
  const competitionId =
    collectionName === COLLECTION_NAMES.leagues ? leagueId : tournamentId;
  const competitionType =
    collectionName === COLLECTION_NAMES.leagues
      ? COMPETITION_TYPES.LEAGUE
      : COMPETITION_TYPES.TOURNAMENT;

  return { competitionId, competitionType };
};
