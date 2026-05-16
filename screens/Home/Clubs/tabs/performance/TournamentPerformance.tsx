import React from "react";
import CompetitionPerformance from "./CompetitionPerformance";
import { MOCK_TOURNAMENT_PERFORMANCE } from "../../mockClubData";

const USE_MOCK_DATA = true;

interface TournamentPerformanceProps {
  clubId: string;
}

const TournamentPerformance: React.FC<TournamentPerformanceProps> = ({
  clubId,
}) => (
  <CompetitionPerformance
    clubId={clubId}
    type="tournament"
    mockData={USE_MOCK_DATA ? MOCK_TOURNAMENT_PERFORMANCE : undefined}
  />
);

export default TournamentPerformance;
