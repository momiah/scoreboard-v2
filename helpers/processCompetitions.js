import { getPlayerRankInCompetition } from "./getPlayerRankInCompetition";
import { COMPETITION_TYPES } from "../schemas/schema";

const COMPETITION_CONFIG = {
  [COMPETITION_TYPES.LEAGUE]: {
    participantsKey: "leagueParticipants",
  },
  [COMPETITION_TYPES.TOURNAMENT]: {
    participantsKey: "tournamentParticipants",
  },
};

export const processCompetitions = ({
  competitions,
  setRankData,
  setRankLoading,
  profile,
  competitionType,
}) => {
  const { participantsKey } = COMPETITION_CONFIG[competitionType];

  const processed = competitions.map((competition) => {
    const rank = getPlayerRankInCompetition(
      competition,
      profile.userId,
      participantsKey
    );
    const participant = competition[participantsKey]?.find(
      (p) => p.userId === profile.userId
    );
    const wins = participant ? participant.numberOfWins : 0;
    return { ...competition, userRank: rank, wins };
  });

  setRankData(processed);
  setRankLoading(false);
};
