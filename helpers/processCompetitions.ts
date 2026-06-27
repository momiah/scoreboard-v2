import {
  getPlayerRankInCompetition,
  getTeamRankInCompetition,
} from "../shared/helpers/getRankInCompetition";
import { NormalizedCompetition, COMPETITION_TYPES } from "@shared";

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
  const isDoublesTournament = competitionType === COMPETITION_TYPES.TOURNAMENT;

  const processed = competitions.map((competition) => {
    if (isDoublesTournament && competition.type === "Doubles") {
      const team = (competition.teams || []).find((teamItem) =>
        teamItem.teamKey?.includes(profile.userId),
      );
      return {
        ...competition,
        userRank: getTeamRankInCompetition(competition.teams, profile.userId),
        wins: team?.numberOfWins ?? 0,
      };
    }

    const participant = competition.participants?.find(
      (p) => p.userId === profile.userId,
    );

    return {
      ...competition,
      userRank: getPlayerRankInCompetition(
        competition.participants,
        profile.userId,
      ),
      wins: participant?.numberOfWins ?? 0,
    };
  });

  setRankData(processed);
  setRankLoading(false);
};
