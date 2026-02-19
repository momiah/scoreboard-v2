import { getPlayerRankInCompetition } from "./getPlayerRankInCompetition";
import { NormalizedCompetition } from "../types/competition";

interface ProcessedCompetition extends NormalizedCompetition {
  wins?: number;
  userRank?: number;
}

interface ProcessCompetitionsParams {
  competitions: NormalizedCompetition[];
  setRankData: (data: ProcessedCompetition[]) => void;
  setRankLoading: (loading: boolean) => void;
  profile: { userId: string };
  competitionType: string;
}

export const processCompetitions = ({
  competitions,
  setRankData,
  setRankLoading,
  profile,
  competitionType,
}: ProcessCompetitionsParams): void => {
  const processed = competitions.map((competition) => {
    // Use normalized 'participants' key
    const rank = getPlayerRankInCompetition(
      competition,
      profile.userId,
      "participants", // Always use 'participants' for normalized data
    );

    const participant = competition.participants?.find(
      (p) => p.userId === profile.userId,
    );

    const wins = participant ? participant.numberOfWins : 0;

    return {
      ...competition,
      userRank: rank ?? undefined,
      wins,
    };
  });

  setRankData(processed);
  setRankLoading(false);
};
